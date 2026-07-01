# Lily Box Proxy Design

## Goal

Build a self-owned `lily-box-proxy` inside this repository so Lily Box no longer depends on any external hosted proxy for key-backed Korean API lookups.

## Scope

The proxy will expose only the routes needed by the selected Lily Box skills:

- `GET /health`
- `GET /v1/naver-news/search`
- `GET /v1/korean-law/search`
- `GET /v1/korean-law/detail`
- `GET /v1/korea-weather/forecast`
- `GET /v1/seoul-subway/arrival`
- `GET /v1/real-estate/region-code`
- `GET /v1/real-estate/:assetType/:dealType`
- `POST /v1/nts-business/status`
- `POST /v1/nts-business/validate`
- `GET /v1/national-pension/workplace`
- `GET /v1/fsc/corp-outline`
- `GET /v1/g2b/sanctioned-supplier`
- `GET /v1/g2b/order-plans`
- `GET /v1/kstartup/business-info`
- `GET /v1/kstartup/announcements`
- `GET /v1/kstartup/contents`
- `GET /v1/kstartup/statistics`

Out of scope: unrelated public-data routes, UI, account/login flows, browser automation, payment, and any secret value committed to git.

## Architecture

Create a new `proxy/` Node.js package using Fastify. Route handlers will live in small modules grouped by provider or domain, and shared concerns such as config, cache, error responses, and request normalization will be kept in focused utility files.

The proxy owns all upstream credentials server-side. Skills and helper scripts call the proxy through `LILY_BOX_PROXY_BASE_URL`; they never receive provider API keys directly.

## Environment

The server reads these variables:

- `NAVER_SEARCH_CLIENT_ID`
- `NAVER_SEARCH_CLIENT_SECRET`
- `LAW_OC`
- `SEOUL_OPEN_API_KEY`
- `KMA_OPEN_API_KEY`
- `DATA_GO_KR_API_KEY`
- `LILY_BOX_PROXY_HOST` with default `127.0.0.1`
- `LILY_BOX_PROXY_PORT` with default `4020`
- `LILY_BOX_PROXY_CACHE_TTL_MS` with default `300000`

Local secret files stay ignored by git. The repository may include an example env file with placeholder names only.

## Data Flow

1. A Lily Box skill builds a request to `LILY_BOX_PROXY_BASE_URL`.
2. The Fastify route validates and normalizes user-facing parameters.
3. The route injects the correct server-side credential.
4. The route calls the official upstream API.
5. The proxy returns normalized JSON where useful, or passes through official JSON with a small `proxy` metadata block.

## Error Handling

Missing credentials return `503 upstream_not_configured`.

Invalid user parameters return `400 bad_request`.

Provider auth, quota, timeout, invalid JSON, and malformed XML errors return structured JSON with a provider-specific message and no secret values.

Successful cacheable GET responses are cached in memory by route and normalized query. POST validation routes are not cached unless they are non-sensitive and explicitly safe.

## Skill Updates

Proxy-backed skills will be updated to treat `LILY_BOX_PROXY_BASE_URL` as required for self-hosted operation. Any remaining default URL pointing to another hosted proxy will be removed.

Documentation will describe local execution:

```bash
cd proxy
npm install
set -a
source ../.env.local
set +a
npm test
npm start
```

## Testing

Use Node's built-in test runner for proxy modules. Unit tests will cover:

- config loading without printing secrets
- missing-key responses
- request validation
- URL construction for each upstream
- representative payload normalization
- route registration through Fastify injection

Existing Python integrity tests will be extended to reject any external hosted proxy fallback in publishable files.

## Deployment

The initial target is a portable Node server that can run locally and be deployed to Render, Railway, Fly.io, Google Cloud Run, or another Node-compatible host.

After deployment, set:

```text
LILY_BOX_PROXY_BASE_URL=https://your-deployed-proxy.example
```

in the runtime environment used by Lily Box.
