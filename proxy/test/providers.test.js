const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildNaverSearchUrl,
  normalizeNaverSearchQuery
} = require("../src/providers/naver-search");
const {
  ENDPOINT_MAP,
  normalizeMolitQuery
} = require("../src/providers/molit");
const {
  normalizeNtsBusinessStatusQuery
} = require("../src/providers/nts-business");

test("Naver search URL builder targets official news and blog APIs", () => {
  const news = buildNaverSearchUrl("news", {
    query: "삼성전자",
    display: 5,
    start: 1,
    sort: "date"
  });
  const blog = buildNaverSearchUrl("blog", {
    query: "올리브영 세럼",
    display: 3,
    start: 1,
    sort: "sim"
  });

  assert.equal(news.origin, "https://openapi.naver.com");
  assert.equal(news.pathname, "/v1/search/news.json");
  assert.equal(news.searchParams.get("query"), "삼성전자");
  assert.equal(news.searchParams.get("sort"), "date");

  assert.equal(blog.origin, "https://openapi.naver.com");
  assert.equal(blog.pathname, "/v1/search/blog.json");
  assert.equal(blog.searchParams.get("display"), "3");
});

test("Naver query normalization rejects short queries and clamps display", () => {
  assert.throws(() => normalizeNaverSearchQuery({ q: "a" }), /at least 2 characters/);
  const normalized = normalizeNaverSearchQuery({ q: "금리 인상", display: "999", sort: "unknown" });
  assert.equal(normalized.display, 100);
  assert.equal(normalized.sort, "sim");
});

test("MOLIT endpoint map covers all Lily Box real-estate routes", () => {
  for (const route of [
    "apartment/trade",
    "apartment/rent",
    "officetel/trade",
    "officetel/rent",
    "villa/trade",
    "villa/rent",
    "single-house/trade",
    "single-house/rent",
    "commercial/trade"
  ]) {
    assert.ok(ENDPOINT_MAP.has(route), `${route} should be mapped`);
  }

  assert.deepEqual(normalizeMolitQuery({
    assetType: "apartment",
    dealType: "trade",
    lawd_cd: "11110",
    deal_ymd: "202607",
    numOfRows: "50"
  }), {
    assetType: "apartment",
    dealType: "trade",
    lawdCd: "11110",
    dealYmd: "202607",
    numOfRows: 50
  });
});

test("NTS status query accepts hyphenated business numbers", () => {
  assert.deepEqual(
    normalizeNtsBusinessStatusQuery({ b_no: ["123-45-67890", "220-81-62517"] }),
    { b_no: ["1234567890", "2208162517"] }
  );
});
