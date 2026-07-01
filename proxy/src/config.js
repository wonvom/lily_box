function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function trimOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed && trimmed !== "replace-me" ? trimmed : null;
}

function loadConfig(env = process.env) {
  return {
    host: env.LILY_BOX_PROXY_HOST || "127.0.0.1",
    port: parseInteger(env.LILY_BOX_PROXY_PORT, 4020),
    proxyName: env.LILY_BOX_PROXY_NAME || "lily-box-proxy",
    cacheTtlMs: parseInteger(env.LILY_BOX_PROXY_CACHE_TTL_MS, 300000),
    naverSearchClientId: trimOrNull(env.NAVER_SEARCH_CLIENT_ID || env.NAVER_CLIENT_ID),
    naverSearchClientSecret: trimOrNull(env.NAVER_SEARCH_CLIENT_SECRET || env.NAVER_CLIENT_SECRET),
    lawOc: trimOrNull(env.LAW_OC),
    lawReferer: trimOrNull(env.LAW_REFERER),
    lawUserAgent: trimOrNull(env.LAW_USER_AGENT),
    seoulOpenApiKey: trimOrNull(env.SEOUL_OPEN_API_KEY),
    kmaOpenApiKey: trimOrNull(env.KMA_OPEN_API_KEY),
    dataGoKrApiKey: trimOrNull(env.DATA_GO_KR_API_KEY)
  };
}

function getHealthPayload(config, now = () => new Date()) {
  return {
    name: config.proxyName,
    ok: true,
    requested_at: now().toISOString(),
    upstreams: {
      naverSearchConfigured: Boolean(config.naverSearchClientId && config.naverSearchClientSecret),
      lawConfigured: Boolean(config.lawOc),
      seoulOpenApiConfigured: Boolean(config.seoulOpenApiKey),
      kmaOpenApiConfigured: Boolean(config.kmaOpenApiKey),
      dataGoKrConfigured: Boolean(config.dataGoKrApiKey)
    }
  };
}

module.exports = {
  getHealthPayload,
  loadConfig,
  parseInteger,
  trimOrNull
};
