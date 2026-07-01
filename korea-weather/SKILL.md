---
name: korea-weather
description: 한국 날씨를 기상청 단기예보 조회서비스와 프록시 경유로 조회해 요약한다.
license: MIT
metadata:
  category: weather
  locale: ko-KR
  phase: v1
---

# Korea Weather

## What this skill does

기상청 단기예보 조회서비스를 Lily Box proxy 경유로 조회해서 한국 날씨를 요약한다.
사용자는 개인 OpenAPI key를 직접 발급할 필요가 없고, proxy 서버에만 `KMA_OPEN_API_KEY` 를 둔다.

## When to use

- "서울 시청 근처 지금 날씨 어때?"
- "부산 날씨 알려줘"
- "위도/경도 기준으로 한국 단기예보 보고 싶어"

## Prerequisites

- optional: `jq`
- required: `LILY_BOX_PROXY_BASE_URL`

## Required environment variables

- `LILY_BOX_PROXY_BASE_URL` — Lily Box proxy base URL.

공공데이터포털 기상청 API key는 Lily Box proxy 서버에서만 관리한다.

## Inputs

- 격자 좌표: `nx`, `ny`
- 또는 위도/경도: `lat`, `lon`
- 선택 사항: `baseDate`, `baseTime`

`baseDate` / `baseTime` 을 생략하면 proxy 가 KST 기준 최신 단기예보 발표 시각을 자동으로 고른다.

## Workflow

### 1. Resolve the proxy base URL

`LILY_BOX_PROXY_BASE_URL` 값을 사용한다.

### 2. Query the short-term forecast endpoint

격자 좌표가 이미 있으면 그대로 넣고, 위도/경도만 있으면 proxy 에 그대로 넘긴다.

```bash
BASE="$LILY_BOX_PROXY_BASE_URL"
curl -fsS --get "${BASE}/v1/korea-weather/forecast" \
  --data-urlencode 'lat=37.5665' \
  --data-urlencode 'lon=126.9780'
```

격자 좌표 예시:

```bash
BASE="$LILY_BOX_PROXY_BASE_URL"
curl -fsS --get "${BASE}/v1/korea-weather/forecast" \
  --data-urlencode 'nx=60' \
  --data-urlencode 'ny=127' \
  --data-urlencode 'baseDate=20260405' \
  --data-urlencode 'baseTime=0500'
```

### 3. Summarize the response conservatively

가능하면 아래 항목만 먼저 요약한다.

- `TMP`: 기온
- `SKY`: 하늘상태
- `PTY`: 강수형태
- `POP`: 강수확률
- `PCP`: 강수량
- `SNO`: 적설
- `REH`: 습도
- `WSD`: 풍속

응답에는 조회 시점과 `baseDate` / `baseTime` 도 함께 적는다.

## Done when

- 요청 위치의 단기예보 응답이 정리되어 있다
- 조회 시점과 예보 발표 시각이 명시되어 있다
- upstream key가 클라이언트에 노출되지 않았다

## Failure modes

- proxy upstream key 미설정 또는 Lily Box proxy route 장애
- `nx` / `ny` 또는 `lat` / `lon` 이 불완전한 경우
- 기상청 quota 초과 또는 upstream 장애
- 선택한 발표 시각에 아직 예보가 준비되지 않은 경우

## Notes

- 공식 API는 `nx` / `ny` 격자를 쓰지만, proxy 는 `lat` / `lon` 도 받아 내부에서 격자로 변환한다.
- 단기예보 category 는 `TMP`, `SKY`, `PTY`, `POP`, `PCP`, `SNO`, `REH`, `WSD` 등을 중심으로 본다.
- proxy 운영/환경변수 설정은 `self-host proxy documentation` 를 참고한다.
