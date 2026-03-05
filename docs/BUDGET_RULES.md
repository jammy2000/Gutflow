# BUDGET_RULES.md — 예산 최적화 및 가격 정책

이 문서는 GutFlow의 예산 관리 엔진(Agent C)이 따르는 알고리즘 및 비즈니스 규칙을 정의합니다.

## 1. 예산 계산 공식 (Budget Formula)

사용자가 설정한 예산 내에 식료품 구매 가격을 수렴시키기 위해 아래 공식을 사용합니다.

```
user_budget    = 사용자 입력 총액 (세금 포함 목표치)
subtotal       = Σ (품목별 단가 × 수량)
tax_buffer     = subtotal × 0.085 (미국 평균 세율 8.5% 가정)
est_total      = subtotal + tax_buffer

[판정 기준]
- est_total ≤ user_budget + 5% (Buffer): 정상 진행
- est_total > user_budget + 5%: 자동 조정(Adjustment Tiers) 트리거
```

## 2. 자동 조정 티어 (Adjustment Tiers)

예산 초과 시 시스템은 아래 순서대로 자동 조정을 시도합니다. 각 단계 직후에는 반드시 FODMAP 안전성 재검증을 수행합니다.

| Tier | 명칭 | 전략 | 비고 |
| :--- | :--- | :--- | :--- |
| **Tier 1** | Brand Swap | 유명 브랜드 제품을 유통사 PB 상품(Great Value 등)으로 교체 | 성분표 재검증 필수 |
| **Tier 2** | Ingredient Swap | 고단가 재료를 저단가 FODMAP 대안으로 교체 | 예: 연어 → 닭가슴살, 새우 → 두부 |
| **Tier 3** | Recipe Swap | 비싼 레시피를 저렴한 레시피로 교체 | 점심 메뉴 우선 교체 |
| **Tier 4** | Day Reduction | 식단 전체 기간 단축 제안 | **사용자 승인 필수** |
| **Tier 5** | Fail | 최소 생존 예산 미달 시 실패 보고 | 최저 필요 예산 안내 |

## 3. 가격 데이터 정책

- **데이터 소스**: Walmart API, Kroger API 연동 데이터 우선.
- **캐싱 전략**: 가격 데이터 TTL은 15분으로 설정.
- **폴백(Fallback)**: API 호출 불가능 시 USDA(미 농무부) 평균 소매가 데이터(`usda_avg_prices.json`) 사용.

## 4. 절대 제약 조건

1.  **Medical First**: 어떤 가격 최적화 단계에서도 Monash University의 FODMAP 가이드를 위반할 수 없습니다.
2.  **Preference Integrity**: 사용자의 비건, 할랄 등 식이 선호도는 모든 티어에서 유지되어야 합니다.
3.  **Transparency**: 모든 조정 내역은 로그로 기록되어 사용자에게 고지되어야 합니다.
