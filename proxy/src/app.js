const crypto = require("node:crypto");
const Fastify = require("fastify");
const { TtlCache } = require("./cache");
const { getHealthPayload, loadConfig } = require("./config");
const { errorPayload, missingKey, statusForProviderError } = require("./errors");
const {
  fetchNaverSearch,
  normalizeNaverSearchQuery
} = require("./providers/naver-search");
const {
  normalizeKoreanLawDetailQuery,
  normalizeKoreanLawSearchQuery,
  proxyKoreanLawRequest
} = require("./providers/korean-law");
const {
  normalizeKmaForecastQuery,
  proxyKmaWeatherRequest
} = require("./providers/kma-weather");
const {
  normalizeSeoulSubwayQuery,
  proxySeoulSubwayRequest
} = require("./providers/seoul-subway");
const {
  fetchTransactions,
  normalizeMolitQuery
} = require("./providers/molit");
const { searchRegionCode } = require("./providers/region-lookup");
const {
  normalizeNtsBusinessStatusQuery,
  normalizeNtsBusinessValidateQuery,
  proxyNtsBusinessRequest
} = require("./providers/nts-business");
const {
  fetchNationalPensionWorkplace,
  normalizeNationalPensionQuery
} = require("./providers/national-pension");
const {
  fetchFscCorpOutline,
  normalizeFscCorpQuery
} = require("./providers/fsc-corp");
const {
  isKstartupErrorBody,
  normalizeKstartupQuery,
  proxyKstartupRequest
} = require("./providers/kstartup");

function makeCacheKey(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function proxyMeta(config, hit = false) {
  return {
    name: config.proxyName,
    cache: {
      hit,
      ttl_ms: config.cacheTtlMs
    },
    requested_at: new Date().toISOString()
  };
}

function cachedPayload(cache, key, config) {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }
  return {
    ...cached,
    proxy: {
      ...cached.proxy,
      cache: {
        hit: true,
        ttl_ms: config.cacheTtlMs
      }
    }
  };
}

function parseJsonOrNull(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function routeError(reply, error) {
  const statusCode = error.statusCode && error.statusCode >= 400
    ? error.statusCode
    : statusForProviderError(error.code);
  reply.code(statusCode);
  const payload = errorPayload(error.code || "proxy_error", error.message);
  if (error.upstreamStatusCode) {
    payload.upstream = {
      status_code: error.upstreamStatusCode,
      body_snippet: error.upstreamBodySnippet || null
    };
  }
  return payload;
}

function routeException(reply, error) {
  const timeoutLike = error?.name === "AbortError" || error?.name === "TimeoutError" || error?.code === "ABORT_ERR";
  return routeError(reply, {
    code: timeoutLike ? "upstream_timeout" : "upstream_error",
    message: timeoutLike ? "Upstream request timed out." : "Upstream request failed."
  });
}

function notConfigured(reply, key) {
  reply.code(503);
  return missingKey(key);
}

async function returnUpstream(reply, upstream, config, { cache, cacheKey } = {}) {
  reply.code(upstream.statusCode);
  reply.header("content-type", upstream.contentType);

  if (!upstream.contentType.includes("json")) {
    return upstream.body;
  }

  const payload = parseJsonOrNull(upstream.body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return upstream.body;
  }

  payload.proxy = proxyMeta(config, false);
  if (upstream.statusCode >= 200 && upstream.statusCode < 300 && cache && cacheKey) {
    cache.set(cacheKey, payload, config.cacheTtlMs);
  }
  return payload;
}

function buildApp({
  config = loadConfig(),
  fetchImpl = global.fetch,
  now = () => new Date(),
  cache = new TtlCache()
} = {}) {
  const app = Fastify({ logger: false });

  app.get("/health", async () => getHealthPayload(config, now));

  async function handleNaver(type, route, request, reply) {
    let normalized;
    try {
      normalized = normalizeNaverSearchQuery(request.query || {});
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route, ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;

    try {
      const result = await fetchNaverSearch({
        type,
        ...normalized,
        clientId: config.naverSearchClientId,
        clientSecret: config.naverSearchClientSecret,
        fetchImpl
      });
      const payload = {
        items: result.items,
        query: {
          q: normalized.query,
          display: normalized.display,
          start: normalized.start,
          sort: normalized.sort
        },
        meta: result.meta,
        upstream: result.upstream,
        proxy: proxyMeta(config, false)
      };
      cache.set(cacheKey, payload, config.cacheTtlMs);
      return payload;
    } catch (error) {
      return routeError(reply, error);
    }
  }

  app.get("/v1/naver-news/search", async (request, reply) =>
    handleNaver("news", "naver-news-search", request, reply));

  app.get("/v1/naver-blog/search", async (request, reply) =>
    handleNaver("blog", "naver-blog-search", request, reply));

  async function handleKoreanLaw(endpoint, normalize, route, request, reply) {
    let normalized;
    try {
      normalized = normalize(request.query || {});
    } catch (error) {
      reply.code(error.statusCode && error.statusCode >= 400 ? error.statusCode : 400);
      return errorPayload(error.code || "bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route, target: normalized.target, type: normalized.type, params: normalized.params });
    const cached = cache.get(cacheKey);
    if (cached) {
      reply.code(cached.statusCode);
      reply.header("content-type", cached.contentType);
      return cached.body;
    }

    const upstream = await proxyKoreanLawRequest({
      endpoint,
      normalized,
      oc: config.lawOc,
      userAgent: config.lawUserAgent,
      referer: config.lawReferer,
      fetchImpl
    });

    if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
      cache.set(cacheKey, upstream, config.cacheTtlMs);
    }
    reply.code(upstream.statusCode);
    reply.header("content-type", upstream.contentType);
    return upstream.contentType.includes("json") ? parseJsonOrNull(upstream.body) || upstream.body : upstream.body;
  }

  app.get("/v1/korean-law/search", async (request, reply) =>
    handleKoreanLaw("search", normalizeKoreanLawSearchQuery, "korean-law-search", request, reply));

  app.get("/v1/korean-law/detail", async (request, reply) =>
    handleKoreanLaw("detail", normalizeKoreanLawDetailQuery, "korean-law-detail", request, reply));

  app.get("/v1/korea-weather/forecast", async (request, reply) => {
    let normalized;
    try {
      normalized = normalizeKmaForecastQuery(request.query || {}, now());
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route: "korea-weather-forecast", ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;

    try {
      const upstream = await proxyKmaWeatherRequest({ ...normalized, apiKey: config.kmaOpenApiKey, fetchImpl });
      return returnUpstream(reply, upstream, config, { cache, cacheKey });
    } catch (error) {
      return routeException(reply, error);
    }
  });

  app.get("/v1/seoul-subway/arrival", async (request, reply) => {
    let normalized;
    try {
      normalized = normalizeSeoulSubwayQuery(request.query || {});
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route: "seoul-subway-arrival", ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;

    try {
      const upstream = await proxySeoulSubwayRequest({ ...normalized, apiKey: config.seoulOpenApiKey, fetchImpl });
      return returnUpstream(reply, upstream, config, { cache, cacheKey });
    } catch (error) {
      return routeException(reply, error);
    }
  });

  app.get("/v1/real-estate/region-code", async (request, reply) => {
    const q = String(request.query?.q ?? request.query?.query ?? "").trim();
    if (!q) {
      reply.code(400);
      return errorPayload("bad_request", "Provide q (region name query).");
    }
    return {
      query: { q },
      items: searchRegionCode(q),
      proxy: proxyMeta(config, false)
    };
  });

  app.get("/v1/real-estate/:assetType/:dealType", async (request, reply) => {
    if (!config.dataGoKrApiKey) return notConfigured(reply, "DATA_GO_KR_API_KEY");
    let normalized;
    try {
      normalized = normalizeMolitQuery({ ...request.query, ...request.params });
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route: "real-estate", ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;

    const result = await fetchTransactions({ ...normalized, serviceKey: config.dataGoKrApiKey, fetchImpl });
    if (result.error) {
      reply.code(statusForProviderError(result.error));
      return { ...result, proxy: proxyMeta(config, false) };
    }
    const payload = { ...result, query: normalized, proxy: proxyMeta(config, false) };
    cache.set(cacheKey, payload, config.cacheTtlMs);
    return payload;
  });

  async function handleNts(operation, normalizer, request, reply) {
    if (!config.dataGoKrApiKey) return notConfigured(reply, "DATA_GO_KR_API_KEY");
    let normalized;
    try {
      normalized = normalizer(request.body || {});
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }
    try {
      const upstream = await proxyNtsBusinessRequest({
        operation,
        payload: normalized,
        serviceKey: config.dataGoKrApiKey,
        fetchImpl
      });
      return returnUpstream(reply, upstream, config);
    } catch (error) {
      return routeException(reply, error);
    }
  }

  app.post("/v1/nts-business/status", async (request, reply) =>
    handleNts("status", normalizeNtsBusinessStatusQuery, request, reply));

  app.post("/v1/nts-business/validate", async (request, reply) =>
    handleNts("validate", normalizeNtsBusinessValidateQuery, request, reply));

  async function handleKeyedLookup({ route, normalizer, fetcher, request, reply }) {
    if (!config.dataGoKrApiKey) return notConfigured(reply, "DATA_GO_KR_API_KEY");
    let normalized;
    try {
      normalized = normalizer(request.query || {});
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }
    const cacheKey = makeCacheKey({ route, ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;
    const result = await fetcher({ ...normalized, serviceKey: config.dataGoKrApiKey, fetchImpl });
    if (result.error) {
      reply.code(statusForProviderError(result.error));
      return { ...result, proxy: proxyMeta(config, false) };
    }
    const payload = { ...result, proxy: proxyMeta(config, false) };
    cache.set(cacheKey, payload, config.cacheTtlMs);
    return payload;
  }

  app.get("/v1/national-pension/workplace", async (request, reply) => handleKeyedLookup({
    route: "national-pension-workplace",
    normalizer: normalizeNationalPensionQuery,
    fetcher: fetchNationalPensionWorkplace,
    request,
    reply
  }));

  app.get("/v1/fsc/corp-outline", async (request, reply) => handleKeyedLookup({
    route: "fsc-corp-outline",
    normalizer: normalizeFscCorpQuery,
    fetcher: fetchFscCorpOutline,
    request,
    reply
  }));

  async function handleKstartup(operation, request, reply) {
    if (!config.dataGoKrApiKey) return notConfigured(reply, "DATA_GO_KR_API_KEY");
    let normalized;
    try {
      normalized = normalizeKstartupQuery(operation, request.query || {});
      normalized.returnType = "json";
    } catch (error) {
      reply.code(400);
      return errorPayload("bad_request", error.message);
    }

    const cacheKey = makeCacheKey({ route: `kstartup-${operation}`, ...normalized });
    const cached = cachedPayload(cache, cacheKey, config);
    if (cached) return cached;

    let upstream;
    try {
      upstream = await proxyKstartupRequest({
        operation,
        query: normalized,
        serviceKey: config.dataGoKrApiKey,
        fetchImpl
      });
    } catch (error) {
      return routeException(reply, error);
    }
    const payload = parseJsonOrNull(upstream.body);
    if (upstream.statusCode < 200 || upstream.statusCode >= 300 || !payload || isKstartupErrorBody(upstream.body)) {
      reply.code(upstream.statusCode >= 400 ? upstream.statusCode : 502);
      return {
        ...(payload && typeof payload === "object" ? payload : {}),
        error: payload?.error || "upstream_error",
        message: payload?.message || "K-Startup upstream request failed.",
        proxy: proxyMeta(config, false)
      };
    }
    const result = { ...payload, query: normalized, proxy: proxyMeta(config, false) };
    cache.set(cacheKey, result, config.cacheTtlMs);
    return result;
  }

  for (const operation of ["business-info", "announcements", "contents", "statistics"]) {
    app.get(`/v1/kstartup/${operation}`, async (request, reply) => handleKstartup(operation, request, reply));
  }

  return app;
}

module.exports = { buildApp };
