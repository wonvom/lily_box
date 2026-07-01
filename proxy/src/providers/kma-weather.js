const DATA_GO_KR_UPSTREAM_BASE_URL = "https://apis.data.go.kr";
const KMA_FORECAST_BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const KMA_FORECAST_READY_MINUTE = 10;

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function padNumber(value, length) {
  return String(value).padStart(length, "0");
}

function formatKstDate(date) {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  return `${padNumber(kstDate.getUTCFullYear(), 4)}${padNumber(kstDate.getUTCMonth() + 1, 2)}${padNumber(kstDate.getUTCDate(), 2)}`;
}

function resolveLatestKmaForecastBase(now = new Date()) {
  const kstDate = new Date(now.getTime() + KST_OFFSET_MS);
  const currentMinutes = (kstDate.getUTCHours() * 60) + kstDate.getUTCMinutes();

  for (let index = KMA_FORECAST_BASE_TIMES.length - 1; index >= 0; index -= 1) {
    const baseTime = KMA_FORECAST_BASE_TIMES[index];
    const baseHour = Number.parseInt(baseTime.slice(0, 2), 10);
    const baseMinute = Number.parseInt(baseTime.slice(2, 4), 10);
    const readyMinutes = (baseHour * 60) + baseMinute + KMA_FORECAST_READY_MINUTE;
    if (currentMinutes >= readyMinutes) {
      return { baseDate: formatKstDate(now), baseTime };
    }
  }

  return {
    baseDate: formatKstDate(new Date(now.getTime() - (24 * 60 * 60 * 1000))),
    baseTime: KMA_FORECAST_BASE_TIMES[KMA_FORECAST_BASE_TIMES.length - 1]
  };
}

function convertLatLonToKmaGrid(latitude, longitude) {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;
  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan((Math.PI * 0.25) + (slat2 * 0.5)) / Math.tan((Math.PI * 0.25) + (slat1 * 0.5));
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

  let sf = Math.tan((Math.PI * 0.25) + (slat1 * 0.5));
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;

  let ro = Math.tan((Math.PI * 0.25) + (olat * 0.5));
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan((Math.PI * 0.25) + ((latitude * DEGRAD) * 0.5));
  ra = (re * sf) / Math.pow(ra, sn);

  let theta = (longitude * DEGRAD) - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor((ra * Math.sin(theta)) + XO + 0.5),
    ny: Math.floor(ro - (ra * Math.cos(theta)) + YO + 0.5)
  };
}

function normalizeKmaForecastQuery(query = {}, now = new Date()) {
  const rawNx = parseInteger(query.nx, Number.NaN);
  const rawNy = parseInteger(query.ny, Number.NaN);
  const latitude = parseFloatValue(query.lat ?? query.latitude);
  const longitude = parseFloatValue(query.lon ?? query.longitude ?? query.lng);
  const hasGrid = Number.isFinite(rawNx) && Number.isFinite(rawNy);
  const hasLatLon = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasGrid && !hasLatLon) throw new Error("Provide nx/ny or lat/lon.");
  if ((Number.isFinite(rawNx) && !Number.isFinite(rawNy)) || (!Number.isFinite(rawNx) && Number.isFinite(rawNy))) {
    throw new Error("Provide both nx and ny.");
  }
  if ((Number.isFinite(latitude) && !Number.isFinite(longitude)) || (!Number.isFinite(latitude) && Number.isFinite(longitude))) {
    throw new Error("Provide both lat and lon.");
  }
  if (hasLatLon && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    throw new Error("Provide valid lat and lon.");
  }

  const pageNo = parseInteger(query.pageNo ?? query.page_no, 1);
  const numOfRows = parseInteger(query.numOfRows ?? query.num_of_rows, 1000);
  const dataType = trimOrNull(query.dataType ?? query.data_type)?.toUpperCase() || "JSON";
  const rawBaseDate = trimOrNull(query.baseDate ?? query.base_date);
  const rawBaseTime = trimOrNull(query.baseTime ?? query.base_time);

  if ((rawBaseDate && !rawBaseTime) || (!rawBaseDate && rawBaseTime)) throw new Error("Provide both baseDate and baseTime.");
  if (pageNo < 1 || numOfRows < 1) throw new Error("Provide valid pageNo and numOfRows.");
  if (!["JSON", "XML"].includes(dataType)) throw new Error("Provide dataType as JSON or XML.");

  const { baseDate, baseTime } = rawBaseDate && rawBaseTime
    ? { baseDate: rawBaseDate, baseTime: rawBaseTime }
    : resolveLatestKmaForecastBase(now);

  if (!/^\d{8}$/.test(baseDate) || !/^\d{4}$/.test(baseTime)) {
    throw new Error("Provide baseDate as YYYYMMDD and baseTime as HHMM.");
  }

  const grid = hasGrid ? { nx: rawNx, ny: rawNy } : convertLatLonToKmaGrid(latitude, longitude);
  return { baseDate, baseTime, nx: grid.nx, ny: grid.ny, pageNo, numOfRows, dataType };
}

async function proxyKmaWeatherRequest({
  baseDate,
  baseTime,
  nx,
  ny,
  pageNo = 1,
  numOfRows = 1000,
  dataType = "JSON",
  apiKey,
  fetchImpl = global.fetch
}) {
  if (!apiKey) {
    return {
      statusCode: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "upstream_not_configured", message: "KMA_OPEN_API_KEY is not configured on the proxy server." })
    };
  }

  const url = new URL(`${DATA_GO_KR_UPSTREAM_BASE_URL}/1360000/VilageFcstInfoService_2.0/getVilageFcst`);
  url.searchParams.set("serviceKey", apiKey);
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("dataType", dataType);
  url.searchParams.set("base_date", baseDate);
  url.searchParams.set("base_time", baseTime);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
  return {
    statusCode: response.status,
    contentType: response.headers.get("content-type") || "application/json; charset=utf-8",
    body: await response.text()
  };
}

module.exports = {
  convertLatLonToKmaGrid,
  normalizeKmaForecastQuery,
  proxyKmaWeatherRequest,
  resolveLatestKmaForecastBase
};
