# Lily Box Proxy

Lily Box skills keep API secrets on this server side. The skill helpers call this proxy with `LILY_BOX_PROXY_BASE_URL`; they do not need Naver, law.go.kr, Seoul, weather, or data.go.kr keys on the client side.

## Local Run

Keep real secrets in the ignored root `.env.local` file or in your deployment platform's environment variable UI.

```bash
cd proxy
npm install
npm run start:local
```

Then set this in the shell that runs Lily Box skills:

```bash
export LILY_BOX_PROXY_BASE_URL=http://127.0.0.1:4020
```

## Required Environment Variables

- `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`: Naver blog/news search.
- `LAW_OC`: Korean law Open API OC value.
- `SEOUL_OPEN_API_KEY`: Seoul subway realtime arrival API.
- `KMA_OPEN_API_KEY`: KMA short-term forecast API.
- `DATA_GO_KR_API_KEY`: data.go.kr services for real estate, NTS business status, National Pension, FSC corporate info, and K-Startup.

Optional server settings:

- `LILY_BOX_PROXY_HOST`: default `127.0.0.1`.
- `LILY_BOX_PROXY_PORT`: default `4020`.
- `LILY_BOX_PROXY_CACHE_TTL_MS`: default `300000`.
- `LAW_REFERER`, `LAW_USER_AGENT`: override law.go.kr request headers if needed.

## Routes

- `GET /health`
- `GET /v1/naver-news/search`
- `GET /v1/naver-blog/search`
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
- `GET /v1/kstartup/business-info`
- `GET /v1/kstartup/announcements`
- `GET /v1/kstartup/contents`
- `GET /v1/kstartup/statistics`

## Safety

Do not commit `.env`, `.env.local`, or deployment secrets. `GET /health` only reports whether each upstream is configured and does not return secret values.
