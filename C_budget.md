# AGENT C — Budget Engine Agent (핵심)
# Antigravity Agent Manager 태스크 프롬프트

## 역할
장바구니 실시간 가격 기준으로 식단을 예산에 수렴시키는 핵심 알고리즘.
Agent B 완료 후 착수. Agent D와 병렬 실행 가능.

## 산출물
- `/docs/BUDGET_RULES.md` — 예산 최적화 규칙 문서
- `/lib/budget_engine.py` — 핵심 알고리즘 구현
- `/lib/budget_engine.test.py` — 테스트 케이스

---

## TASK PROMPT

```
You are the Budget Engine Agent for GutFlow app.
Read rules.md, /docs/SSOT.md, /docs/DB.md before starting.
This is the hardest part of the system. Be precise.

## THE CORE PROBLEM
User sets budget BEFORE we know real prices.
Real prices come from Walmart/Kroger API AFTER meal plan is generated.
If real total > budget → must auto-adjust without breaking FODMAP rules.

## DELIVERABLES

### 1. /docs/BUDGET_RULES.md

BUDGET CALCULATION FORMULA:
```
user_budget    = 사용자 입력 총액 (세금 포함 기준)
subtotal       = sum of all (unit_price × quantity)
tax_buffer     = subtotal × 0.085  (추정치 — 실제 결제 시 변동 가능)
est_total      = subtotal + tax_buffer

[판정 기준]: subtotal 기준으로 비교
  → est_total > user_budget + buffer(5%) = OVERAGE
  → UI 표시: subtotal / est_tax / est_total 분리 표기
  → "Final amount confirmed at checkout" 문구 항상 표시

[세금 주의]: 주/카운티/품목(식료품 비과세 주 존재)에 따라 실제 세율 다름
  → MVP: 8.5% 고정 추정치 사용
  → P1: zip_code 기반 실제 세율 조회 (TaxJar API 등)
```

COST ESTIMATION PIPELINE (before real prices available):
- Use USDA average retail prices as initial estimate
- Pre-loaded price table in /data/usda_avg_prices.json
- Accuracy target: within 15% of actual Walmart price

BUDGET ADJUSTMENT TIERS (in order — try each before escalating):
```
Tier 1: Brand swap
  → Replace name-brand with store brand (Great Value at Walmart)
  → Est. savings: 20-40% per item
  → FODMAP check: required on substitute

Tier 2: 비싼 재료 부분 교체 (MVP 단순화 버전)
  → 칼로리 계산 대신: 가장 비싼 단일 재료를 동급 저가 재료로 교체
  → 예: 연어(비쌈) → 닭가슴살(저렴) / 새우 → 두부
  → 서빙 수와 레시피 구조는 유지 (변경 최소화)
  → FODMAP 재검증 필수 + Type A(brand swap) 규칙 적용
  → [P0] 칼로리/영양 floor 계산 제외 → P1으로 이관
  → [P1] 영양 DB 연동 후 1500kcal/인/일 floor 적용

Tier 3: Recipe swap
  → Replace expensive recipe with cheaper FODMAP-safe alternative
  → Priority: keep breakfast/dinner, swap lunch first
  → Maintain diet preferences (vegan/halal)

Tier 4: Day reduction (last resort)
  → If budget is <70% of minimum viable cost
  → Suggest: "Your budget fits X days instead of Y. Adjust?"
  → Never auto-reduce — always ask user

Tier 5: Fail gracefully
  → "Budget too low for {people} people × {days} days"
  → Show minimum viable budget for their inputs
```

REAL-TIME RECONCILIATION (after price fetch):
```
If actual_total ≤ budget + buffer: ✅ proceed to checkout
If actual_total > budget + buffer: trigger Tier 1 → Tier 4 auto
If Tier 4 needed: pause, notify user, await confirmation
```

PRICE STALENESS RULE:
- Cache TTL: 15 minutes
- If price_cache.cached_at > 15min: re-fetch before checkout
- Show "Prices updated X min ago" in UI

### 2. /lib/budget_engine.py

Implement these functions:

```python
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

class AdjustmentTier(Enum):
    BRAND_SWAP = 1
    QUANTITY_REDUCTION = 2
    RECIPE_SWAP = 3
    DAY_REDUCTION = 4
    FAIL = 5

@dataclass
class BudgetResult:
    status: str  # "ok" | "adjusted" | "needs_user_input" | "impossible"
    final_total: float
    overage: float
    adjustments_applied: List[dict]
    tier_reached: AdjustmentTier
    message: str
    new_meal_plan: Optional[dict]  # if recipe swap triggered

def estimate_cost_before_api(meal_plan: dict, people: int) -> float:
    """
    Use USDA avg prices to estimate before real API call.
    Load from /data/usda_avg_prices.json
    Apply people multiplier.
    Return estimated total with tax.
    """
    pass

def reconcile_budget(
    meal_plan: dict,
    real_prices: dict,  # {ingredient_name: {walmart_price, kroger_price}}
    user_budget: float,
    people: int,
    fodmap_db: dict,
    diet_preferences: List[str]
) -> BudgetResult:
    """
    Core budget reconciliation engine.
    Runs Tier 1 → Tier 4 in sequence.
    Returns BudgetResult with all adjustments made.
    FODMAP rules must not be violated at any tier.
    """
    pass

def tier1_brand_swap(items: List[dict], budget_gap: float) -> List[dict]:
    """
    Replace name-brand with store brand.
    Must FODMAP-validate substitute.
    Return modified items list.
    """
    pass

def tier2_expensive_ingredient_swap(
    meal_plan: dict,
    budget_gap: float,
    fodmap_db: dict,
    diet_preferences: List[str]
) -> dict:
    """
    P0 MVP: 가장 비싼 재료를 동급 저가 FODMAP-safe 재료로 교체.
    칼로리 계산 없음 (P1으로 이관).
    서빙 수/레시피 구조 유지.
    예: salmon → chicken breast, shrimp → firm tofu(vegan)
    FODMAP 재검증 + Type A substitution 규칙 적용.
    Return modified meal_plan + adjustments_applied log.
    """
    pass

def tier3_recipe_swap(
    meal_plan: dict,
    budget_gap: float,
    fodmap_db: dict,
    diet_preferences: List[str]
) -> dict:
    """
    Swap expensive recipe → cheaper FODMAP-safe alternative.
    Priority: swap lunch before dinner before breakfast.
    Return modified meal_plan.
    """
    pass

def calculate_minimum_viable_budget(people: int, days: int) -> float:
    """
    Calculate absolute minimum cost for given people/days.
    Based on cheapest FODMAP-safe ingredient combinations.
    Used for Tier 5 error message.
    """
    pass
```

### 3. /lib/budget_engine.test.py

Test cases:
- Budget exactly met: no adjustment needed
- 5% overage: within buffer, proceed
- 10% overage: Tier 1 brand swap resolves
- 25% overage: Tier 1+2 combined resolves
- 40% overage: Tier 3 recipe swap resolves
- 70% underfunded: Tier 4 — day reduction suggestion
- 90% underfunded: Tier 5 — impossible, show minimum
- Vegan constraint maintained through all tiers
- Halal constraint maintained through all tiers
- FODMAP substitute in Tier 1 must pass FODMAP check

## CONSTRAINTS
- Never violate Medical_Constraint during any tier adjustment
- All substitutions must be FODMAP-validated before applying
- Log every adjustment with reason (for QA Agent F)
- All prices include tax before comparison to budget
```
