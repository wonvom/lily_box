# lily-box

`lily-box` is a personal Korean research and lookup skill bundle.

It keeps only the skills I actually want to use:

- Naver blog, Naver news, and GeekNews research
- Korean real estate transaction, land price, and registry workflows
- Korean law, privacy policy, terms, and business due diligence workflows
- Shopping, secondhand marketplace, parcel, weather, and Seoul subway lookups

## Included Skills

- `naver-blog-research`
- `naver-news-search`
- `geeknews-search`
- `real-estate-search`
- `gongsijiga-search`
- `iros-registry-automation`
- `korean-law-search`
- `korean-privacy-terms`
- `nts-business-registration`
- `biz-health-check`
- `national-pension-workplace`
- `nts-tax-delinquency`
- `fsc-corporate-info`
- `localdata-business-status`
- `kstartup-search`
- `olive-young-search`
- `daiso-product-search`
- `ohou-today-deal`
- `bunjang-search`
- `daangn-used-goods-search`
- `daangn-realty-search`
- `daangn-jobs-search`
- `daangn-cars-search`
- `delivery-tracking`
- `korea-weather`
- `seoul-subway-arrival`

## Notes

API 키가 필요한 한국 공공데이터/검색 기능은 이 저장소의 `proxy/` 서버를 통해 동작한다.
로컬에서 사용할 때는 프록시를 켠 뒤 `LILY_BOX_PROXY_BASE_URL=http://127.0.0.1:4020`을 설정한다.

```bash
cd proxy
npm install
npm run start:local
```

운영 배포에서는 GitHub에 시크릿을 올리지 말고, 배포 플랫폼의 환경변수로 API 키를 넣는다.
필요한 변수 목록은 `proxy/.env.example`과 `proxy/README.md`에 정리되어 있다.

This bundle preserves upstream licenses and third-party notices where required.
