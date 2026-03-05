# AGENT F — QA / Verification Agent
# Antigravity Agent Manager 태스크 프롬프트

## 역할
예산 준수, FODMAP 규칙 준수, 품절 fallback 자동 검증.
모든 에이전트 완료 후 최종 착수.

## 산출물
- `/docs/QA.md` — QA 시나리오 문서
- `/tests/e2e/` — Playwright E2E 테스트
- `/tests/unit/` — 핵심 로직 유닛 테스트

---

## TASK PROMPT

```
You are the QA/Verification Agent for GutFlow app.
Read ALL /docs/ files before starting.
Your job: ensure the system never ships a meal plan that violates budget OR FODMAP rules.

## DELIVERABLES

### 1. /docs/QA.md

CRITICAL TEST SCENARIOS:

Category A — FODMAP Compliance (P0 — must never fail)
```
A1: Generated meal plan contains zero Strict_Exclude ingredients
A2: Recipe substitution (budget Tier 1) maintains FODMAP safety
A3: "Natural flavors" ingredient → flagged as UNCERTAIN, not SAFE
A4: Stacking check: avocado + cherry + coconut milk → STACKING warning
A5: Vegan meal plan: no dairy, no meat → all FODMAP-validated
A6: Halal meal plan: no pork, no alcohol in cooking → FODMAP-validated
A7: User allergy exclusion overrides FODMAP-safe ingredient correctly
```

Category B — Budget Compliance (P0)
```
B1: Final cart total ≤ user_budget + 5% buffer
B2: Tier 1 brand swap reduces cost, substitute is FODMAP-safe
B3: Tier 2 quantity reduction maintains ≥1500 kcal/person/day
B4: Tier 3 recipe swap: lunch swapped before dinner
B5: Tier 4 day reduction: user prompted, not auto-applied
B6: Minimum viable budget shown correctly for impossible cases
B7: Tax (8.5%) included in all total calculations
B8: Price cache >15min triggers re-fetch before checkout
```

Category C — Integration / Cart (P0)
```
C1: Walmart cart URL contains valid affiliate tag
C2: Kroger cart URL contains valid affiliate tag
C3: Out-of-stock item → substitute found → FODMAP-validated
C4: No substitute available → item flagged, user notified
C5: Price increase >20% between plan and checkout → user alerted
C6: BlueCart API timeout → fallback to cached price + warning shown
C7: Cart deep link opens correct items in Walmart/Kroger
```

Category D — UX / Notifications (P1)
```
D1: ICS calendar file generates correctly for all meal plan days
D2: Notification scheduled 30 min before each meal
D3: Recipe card shows in Large Text Cooking Mode (font ≥18px)
D4: Offline mode: last cached plan displayed
D5: Retailer toggle (Walmart/Kroger) updates prices in <2 seconds
D6: Loading states shown during all async operations
```

### 2. /tests/e2e/meal_plan.spec.ts (Playwright)

```typescript
import { test, expect } from '@playwright/test';

const STRICT_EXCLUDE = [
  'garlic', 'onion', 'wheat', 'honey', 'apple', 'milk', 'legumes',
  'high fructose corn syrup', 'inulin', 'chicory root',
  'sorbitol', 'xylitol', 'mannitol', 'maltitol'
];

test.describe('FODMAP Compliance — Critical Path', () => {
  
  test('A1: Generated meal plan contains no Strict_Exclude ingredients', async ({ page }) => {
    await page.goto('/setup');
    await page.fill('[data-testid="budget-input"]', '100');
    await page.click('[data-testid="people-2"]');
    await page.click('[data-testid="days-5"]');
    await page.click('[data-testid="generate-btn"]');
    await page.waitForURL('/plan/**', { timeout: 30000 });
    
    const ingredientText = await page.locator('[data-testid="ingredient-list"]').textContent();
    const lowerText = ingredientText?.toLowerCase() ?? '';
    
    for (const excluded of STRICT_EXCLUDE) {
      expect(lowerText).not.toContain(excluded);
    }
  });

  test('A4: Stacking warning fires for polyol combination', async ({ request }) => {
    const res = await request.post('/api/fodmap/analyze', {
      data: { ingredients: ['avocado', 'cherry', 'coconut milk'] }
    });
    const json = await res.json();
    expect(json.stacking_warning).toBe(true);
    expect(json.verdict).toBe('AVOID');
  });

});

test.describe('Budget Compliance — Critical Path', () => {

  test('B1: Cart total within budget + 5% buffer', async ({ page, request }) => {
    // Generate plan with $80 budget
    const planRes = await request.post('/api/meal-plans/generate', {
      data: { duration_days: 5, people: 2, budget: 80, diet_preferences: [] }
    });
    const plan = await planRes.json();
    
    // Get shopping list with real prices
    const listRes = await request.get(`/api/shopping-lists/${plan.shopping_list_id}`);
    const list = await listRes.json();
    
    const MAX_ALLOWED = 80 * 1.05; // budget + 5% buffer
    expect(list.total_with_tax).toBeLessThanOrEqual(MAX_ALLOWED);
  });

  test('B7: Tax included in total', async ({ request }) => {
    const res = await request.post('/api/meal-plans/generate', {
      data: { duration_days: 3, people: 1, budget: 50, diet_preferences: [] }
    });
    const plan = await res.json();
    expect(plan.estimated_total).toBeGreaterThan(plan.estimated_subtotal);
    // tax should be ~8.5%
    const impliedTax = plan.estimated_total - plan.estimated_subtotal;
    const taxRate = impliedTax / plan.estimated_subtotal;
    expect(taxRate).toBeCloseTo(0.085, 1);
  });

});

test.describe('Cart Integration — Critical Path', () => {

  test('C1: Walmart cart URL has affiliate tag', async ({ request }) => {
    const res = await request.post('/api/orders', {
      data: { list_id: 'test-list-id', retailer: 'walmart' }
    });
    const order = await res.json();
    expect(order.checkout_url).toContain('wmlspartner=');
    expect(order.checkout_url).toContain('walmart.com/cart');
  });

test('C3: Out-of-stock → auto-SUGGEST only, never auto-apply', async ({ request }) => {
    const res = await request.post('/api/shopping-lists/test/substitute', {
      data: { item_id: 'test-item', reason: 'out_of_stock' }
    });
    const result = await res.json();
    // Must return suggestion, NOT already-applied substitute
    expect(result.status).toBe('pending_approval');  // not 'applied'
    expect(result.substitute).toBeTruthy();
    expect(result.substitute.fodmap_grade).not.toBe('red');
    expect(result.auto_applied).toBe(false);  // never auto-applied
  });

  test('C8: ZIP code missing → estimate_mode + UI warning', async ({ request }) => {
    const res = await request.post('/api/meal-plans/generate', {
      data: { duration_days: 3, people: 2, budget: 80, diet_preferences: [], zip_code: null }
    });
    const plan = await res.json();
    expect(plan.estimate_mode).toBe(true);
    expect(plan.warning).toContain('ZIP');
  });

  test('C9: Tax shown as subtotal + est_tax separate (not combined)', async ({ request }) => {
    const res = await request.get('/api/shopping-lists/test-list');
    const list = await res.json();
    expect(list.subtotal).toBeDefined();
    expect(list.tax_estimate).toBeDefined();
    expect(list.est_total).toBeCloseTo(list.subtotal * 1.085, 1);
    expect(list.checkout_note).toContain('confirmed at checkout');
  });

});
```

### 3. /tests/unit/budget_engine.test.py

```python
import pytest
from lib.budget_engine import (
    reconcile_budget, calculate_minimum_viable_budget,
    AdjustmentTier, BudgetResult
)

MOCK_PRICES = {
    "chicken breast": {"walmart": 5.98, "kroger": 6.49},
    "salmon": {"walmart": 8.97, "kroger": 9.49},
    "spinach": {"walmart": 2.48, "kroger": 2.89},
    "rice": {"walmart": 1.98, "kroger": 2.19},
}

def test_budget_ok_no_adjustment():
    result = reconcile_budget(
        meal_plan=MOCK_5_DAY_PLAN,
        real_prices=MOCK_PRICES,
        user_budget=100.0,
        people=2,
        fodmap_db=FODMAP_DB,
        diet_preferences=[]
    )
    assert result.status == "ok"
    # tier_reached = 실제로 적용(실행)된 마지막 티어
    # 조정 불필요하면 None 또는 별도 sentinel 값
    assert result.tier_reached is None  # no tier needed
    assert result.final_total <= 100.0 * 1.05
    # subtotal과 tax_buffer가 분리되어 있는지 확인
    assert result.subtotal < result.final_total
    assert abs((result.final_total - result.subtotal) / result.subtotal - 0.085) < 0.01

def test_tier1_brand_swap_maintains_fodmap():
    # Force overage that tier 1 can fix
    result = reconcile_budget(
        meal_plan=MOCK_5_DAY_PLAN,
        real_prices=INFLATED_PRICES,  # 10% over budget
        user_budget=80.0,
        people=2,
        fodmap_db=FODMAP_DB,
        diet_preferences=[]
    )
    assert result.status == "adjusted"
    # Verify no Strict_Exclude in adjustments
    for adj in result.adjustments_applied:
        assert adj["substitute"] not in STRICT_EXCLUDE

def test_tier4_day_reduction_requires_user_input():
    result = reconcile_budget(
        meal_plan=MOCK_7_DAY_PLAN,
        real_prices=MOCK_PRICES,
        user_budget=30.0,  # impossibly low for 7 days / 2 people
        people=2,
        fodmap_db=FODMAP_DB,
        diet_preferences=[]
    )
    assert result.tier_reached == AdjustmentTier.DAY_REDUCTION
    assert result.status == "needs_user_input"

def test_minimum_viable_budget_calculation():
    mvb = calculate_minimum_viable_budget(people=2, days=5)
    assert mvb > 0
    assert mvb < 200  # sanity check
    # 2 people × 5 days × 3 meals should be at least $30
    assert mvb >= 30.0

def test_vegan_constraint_maintained_through_tiers():
    result = reconcile_budget(
        meal_plan=MOCK_VEGAN_PLAN,
        real_prices=INFLATED_PRICES,
        user_budget=70.0,
        people=2,
        fodmap_db=FODMAP_DB,
        diet_preferences=["vegan"]
    )
    for adj in result.adjustments_applied:
        # No meat or dairy substitutes
        assert "chicken" not in adj["substitute"].lower()
        assert "milk" not in adj["substitute"].lower()
```

## CONSTRAINTS
- All P0 tests must pass before any deployment
- FODMAP tests run on EVERY pull request (GitHub Actions)
- Budget tests use real BlueCart API in staging (not mock)
- Test report stored as Artifact in Antigravity Agent Manager
- Failed tests block Agent E from deploying
```
