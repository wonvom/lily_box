const assert = require("node:assert/strict");
const test = require("node:test");

const { buildApp } = require("../src/app");
const { loadConfig } = require("../src/config");

test("health route reports upstream flags without leaking secrets", async () => {
  const app = buildApp({
    config: loadConfig({
      NAVER_SEARCH_CLIENT_ID: "id",
      NAVER_SEARCH_CLIENT_SECRET: "secret",
      LAW_OC: "law",
      SEOUL_OPEN_API_KEY: "seoul",
      KMA_OPEN_API_KEY: "kma",
      DATA_GO_KR_API_KEY: "data"
    }),
    now: () => new Date("2026-07-01T01:00:00.000Z")
  });

  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const payload = response.json();
  assert.equal(payload.name, "lily-box-proxy");
  assert.equal(payload.upstreams.naverSearchConfigured, true);
  assert.doesNotMatch(response.body, /"secret"|"law"|"seoul"|"kma"|"data"/);
});

test("missing key-backed routes return structured upstream_not_configured", async () => {
  const app = buildApp({ config: loadConfig({}) });

  const cases = [
    { method: "GET", url: "/v1/naver-news/search?q=삼성전자", key: "NAVER_SEARCH_CLIENT_ID" },
    { method: "GET", url: "/v1/naver-blog/search?q=성수동 맛집", key: "NAVER_SEARCH_CLIENT_ID" },
    { method: "GET", url: "/v1/korean-law/search?target=law&query=민법", key: "LAW_OC" },
    { method: "GET", url: "/v1/korea-weather/forecast?lat=37.5665&lon=126.9780", key: "KMA_OPEN_API_KEY" },
    { method: "GET", url: "/v1/seoul-subway/arrival?stationName=강남", key: "SEOUL_OPEN_API_KEY" },
    { method: "GET", url: "/v1/real-estate/apartment/trade?lawd_cd=11110&deal_ymd=202607", key: "DATA_GO_KR_API_KEY" },
    { method: "POST", url: "/v1/nts-business/status", payload: { b_no: ["1234567890"] }, key: "DATA_GO_KR_API_KEY" },
    { method: "GET", url: "/v1/kstartup/announcements?perPage=5", key: "DATA_GO_KR_API_KEY" }
  ];

  for (const item of cases) {
    const response = await app.inject(item);
    assert.equal(response.statusCode, 503, `${item.url} should require ${item.key}`);
    assert.equal(response.json().error, "upstream_not_configured");
    assert.match(response.json().message, new RegExp(item.key));
  }
});

test("pass-through provider exceptions return structured errors without upstream URLs", async () => {
  const abortError = new Error("fetch failed for https://example.test/secret-key");
  abortError.name = "AbortError";
  const app = buildApp({
    config: loadConfig({ KMA_OPEN_API_KEY: "weather-secret" }),
    fetchImpl: async () => {
      throw abortError;
    }
  });

  const response = await app.inject({
    method: "GET",
    url: "/v1/korea-weather/forecast?lat=37.5665&lon=126.9780"
  });

  assert.equal(response.statusCode, 504);
  assert.equal(response.json().error, "upstream_timeout");
  assert.doesNotMatch(response.body, /weather-secret|secret-key|example\.test/);
});
