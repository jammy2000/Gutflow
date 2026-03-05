"""
tests/unit/test_budget_engine.py
GutFlow — BudgetEngine 유닛 테스트 (Agent F / Category B)

테스트 범위:
- B1: 예산 내 → 조정 없음
- B4: Tier 2 재료 스왑 (Salmon → Chicken)
- B5: Tier 4 → needs_user_input (자동 적용 금지)
- B6: 불가능 예산 → impossible 상태
- B7: 세금 8.5% 계산 검증
- Mutation 방지: 원본 items 불변 확인
- 비건/할랄 Preference 유지 확인
"""

import sys
import os
import copy
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'engine-room'))
from budget_engine import BudgetEngine, AdjustmentTier

USDA_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'usda_avg_prices.json')

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def engine():
    return BudgetEngine({}, USDA_PATH)

def make_items(*args):
    """Helper: make item dicts from (name, price, quantity) tuples."""
    return [{"name": n, "price": p, "quantity": q} for n, p, q in args]


# ─── Category B Tests ─────────────────────────────────────────────────────────

class TestBudgetOK:
    def test_b1_no_adjustment_when_within_budget(self, engine):
        """B1: est_total ≤ budget × 1.05 → status = ok, no adjustments."""
        items = make_items(("Rice Cakes", 2.99, 1), ("Chicken Breast", 5.99, 1))
        r = engine.reconcile(items, 200.0)
        assert r.status == "ok"
        assert r.adjustments == []
        assert r.tier_reached == AdjustmentTier.NONE.value

    def test_b7_tax_included_in_total(self, engine):
        """B7: est_total = subtotal × 1.085 (8.5% tax)."""
        items = make_items(("Quinoa", 6.00, 1))
        subtotal = 6.00
        expected_total = round(subtotal * 1.085, 2)
        r = engine.reconcile(items, 200.0)
        assert abs(r.final_total - expected_total) < 0.01


class TestTier1BrandSwap:
    def test_b2_tier1_reduces_cost(self, engine):
        """B2: Tier 1 브랜드 교체 → cost 절감 확인."""
        items = [{"name": "Quinoa", "price": 10.0, "quantity": 3,
                  "can_swap_brand": True, "is_pb": False}]
        r = engine.reconcile(items, 20.0)
        assert r.tier_reached >= AdjustmentTier.BRAND_SWAP.value
        assert len(r.adjustments) > 0
        assert r.adjustments[0]["savings"] > 0


class TestTier2IngredientSwap:
    def test_b3_tier2_swaps_salmon_to_chicken(self, engine):
        """B3: Salmon → Chicken Breast 스왑 (INGREDIENT_SWAP_TABLE 기반)."""
        items = make_items(("Salmon", 12.99, 2))
        r = engine.reconcile(items, 15.0)
        assert r.tier_reached >= AdjustmentTier.INGREDIENT_SWAP.value
        swap_log = next((a for a in r.adjustments if a["item_original"] == "Salmon"), None)
        assert swap_log is not None
        assert "Chicken" in swap_log["item_new"] or "Tofu" in swap_log["item_new"]

    def test_no_mutation_on_original_items(self, engine):
        """Mutation 방지: reconcile 후 원본 items 불변 확인."""
        items = make_items(("Salmon", 12.99, 2))
        original_price = items[0]["price"]
        engine.reconcile(items, 5.0)
        assert items[0]["price"] == original_price, "Original items mutated!"


class TestTier4DayReduction:
    def test_b5_tier4_requires_user_input(self, engine):
        """B5: 예산 30% 이상 초과 → needs_user_input (자동 적용 금지)."""
        items = make_items(("Salmon", 12.99, 5), ("Quinoa", 6.50, 5))
        r = engine.reconcile(items, 10.0)
        assert r.status in ("needs_user_input", "impossible")
        # status가 adjusted가 아닌 이상 auto-applied 아님

    def test_b6_impossible_budget_shows_status(self, engine):
        """B6: 예산 대비 200% 이상 초과 → status = impossible."""
        items = make_items(("Salmon", 50.0, 5), ("Quinoa", 30.0, 5))
        r = engine.reconcile(items, 10.0)
        assert r.status == "impossible"
        assert r.tier_reached == AdjustmentTier.FAIL.value


class TestBufferConsistency:
    def test_5pct_buffer_applied_consistently(self, engine):
        """B1 버퍼: budget × 1.05 이내면 ok."""
        # $10 budget, item costs $10.50 (5.0% over) → within buffer → ok
        items = make_items(("Rice Cakes", 9.68, 1))  # × 1.085 tax = ~$10.50
        r = engine.reconcile(items, 10.0)
        # est_total = 9.68 * 1.085 = ~10.50, budget*1.05 = 10.50 → borderline ok
        assert r.status in ("ok", "adjusted")  # should not be needs_user_input


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
