# INTEGRATIONS.md — 외부 리테일러 연동 명세

이 문서는 Walmart 및 Kroger API를 통한 실시간 가격 조회 및 장바구니 연동 규격을 정의합니다.

## 1. 지원 리테일러 (Supported Retailers)

현재 미국 내 주요 2개 리테일러를 지원합니다.

| Retailer | 주요 특징 | 연동 방식 |
| :--- | :--- | :--- |
| **Walmart** | 저가 PB(Great Value) 경쟁력 우수 | Walmart Partner API (Search/Order) |
| **Kroger** | 신선 식품 및 지역 기반 프로모션 강점 | Kroger Developer API (OAuth 2.0) |

## 2. API 파이프라인 (Data Pipeline)

가격조회 및 결정 로직은 아래 단계를 거칩니다.

1.  **Search**: 사용자 식단 내 재료명으로 각 리테일러 검색 호출.
2.  **Compare**: 동일 품목(또는 대용량 규격) 기준 최저가 리테일러 매칭.
3.  **Optimize**: `BudgetEngine`을 통해 예산 초과 시 PB 상품 우선 매칭.
4.  **Sync**: 15분 단위 가격 캐싱을 통해 장바구니 일관성 유지.

## 3. 인증 및 보안 (Auth & Security)

- 모든 API 키와 클라이언트 시크릿은 `.env` 파일(서버 환경변수)을 통해 관리합니다.
- 사용자 식별 및 장바구니 동기화 시 JWT 토큰 기반 세션을 사용합니다.

## 4. 장애 대응 (Error Handling)

- API 호출 실패 시 최근 캐시 데이터 사용.
- 캐시도 없을 경우 `usda_avg_prices.json`의 평균 소매가로 폴백(Fallback) 후 유저에게 "Estimating..." 상태 고지.
- 품절(Out of stock) 시 실시간으로 대체 리테일러 검색 또는 대체 상품 제안 트리거.
