const assert = require("node:assert/strict");
const test = require("node:test");

const { loadConfig, getHealthPayload } = require("../src/config");

test("loadConfig uses lily-box defaults and reads configured upstream flags", () => {
  const config = loadConfig({
    NAVER_SEARCH_CLIENT_ID: "naver-id",
    NAVER_SEARCH_CLIENT_SECRET: "naver-secret",
    LAW_OC: "law-oc",
    SEOUL_OPEN_API_KEY: "seoul-key",
    KMA_OPEN_API_KEY: "kma-key",
    DATA_GO_KR_API_KEY: "data-key"
  });

  assert.equal(config.proxyName, "lily-box-proxy");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4020);
  assert.equal(config.cacheTtlMs, 300000);

  const health = getHealthPayload(config, () => new Date("2026-07-01T01:00:00.000Z"));
  assert.equal(health.name, "lily-box-proxy");
  assert.deepEqual(health.upstreams, {
    naverSearchConfigured: true,
    lawConfigured: true,
    seoulOpenApiConfigured: true,
    kmaOpenApiConfigured: true,
    dataGoKrConfigured: true
  });

  const serialized = JSON.stringify(health);
  assert.doesNotMatch(serialized, /naver-secret|law-oc|seoul-key|kma-key|data-key/);
});

test("loadConfig accepts lily-box host and port overrides", () => {
  const config = loadConfig({
    LILY_BOX_PROXY_HOST: "0.0.0.0",
    LILY_BOX_PROXY_PORT: "4900",
    LILY_BOX_PROXY_CACHE_TTL_MS: "1000"
  });

  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.port, 4900);
  assert.equal(config.cacheTtlMs, 1000);
});
