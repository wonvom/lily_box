const SEOUL_OPEN_API_BASE_URL = "http://swopenapi.seoul.go.kr";

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimOrNull(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeSeoulSubwayQuery(query = {}) {
  const stationName = trimOrNull(query.stationName ?? query.station_name ?? query.station);
  if (!stationName) {
    throw new Error("Provide stationName.");
  }
  const startIndex = parseInteger(query.startIndex ?? query.start_index, 0);
  const endIndex = parseInteger(query.endIndex ?? query.end_index, 8);
  if (startIndex < 0 || endIndex < startIndex || endIndex > 100) {
    throw new Error("Provide valid startIndex and endIndex.");
  }
  return { stationName, startIndex, endIndex };
}

async function proxySeoulSubwayRequest({
  stationName,
  startIndex = 0,
  endIndex = 8,
  apiKey,
  fetchImpl = global.fetch
}) {
  if (!apiKey) {
    return {
      statusCode: 503,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ error: "upstream_not_configured", message: "SEOUL_OPEN_API_KEY is not configured on the proxy server." })
    };
  }

  const encodedStationName = encodeURIComponent(stationName);
  const url = new URL(
    `${SEOUL_OPEN_API_BASE_URL}/api/subway/${apiKey}/json/realtimeStationArrival/${startIndex}/${endIndex}/${encodedStationName}`
  );
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
  return {
    statusCode: response.status,
    contentType: response.headers.get("content-type") || "application/json; charset=utf-8",
    body: await response.text()
  };
}

module.exports = {
  normalizeSeoulSubwayQuery,
  proxySeoulSubwayRequest
};
