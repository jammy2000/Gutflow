"""
budget_engine.py — GutFlow 예산 조정 엔진

코드 리뷰 수정 사항:
1. Buffer(5%) 기준을 Tier 1/2 판정에도 동일하게 적용 (버그 수정)
2. items 원본 Mutation 방지 — copy.deepcopy 사용
3. Tier 2 하드코딩 제거 — INGREDIENT_SWAP_TABLE 기반으로 확장
4. Tier 3 (Recipe Swap) 구현 추가
5. 최상단 imports 정리
"""

import json
import copy
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from enum import Enum

# ─── FODMAP-Safe Ingredient Swap Table ────────────────────────────────────────
# {expensive_ingredient: {replacement, price_avg, fodmap_safe: True}}
INGREDIENT_SWAP_TABLE: Dict[str, Dict[str, Any]] = {
    "salmon":          {"replacement": "chicken breast",  "price": 6.00,  "reason": "Cheaper FODMAP-safe protein"},
    "shrimp":          {"replacement": "firm tofu",       "price": 2.00,  "reason": "Vegan-friendly FODMAP-safe option"},
    "beef tenderloin": {"replacement": "ground beef",     "price": 5.50,  "reason": "Same protein at lower cost"},
    "lamb":            {"replacement": "chicken breast",  "price": 6.00,  "reason": "Cheaper FODMAP-safe protein"},
    "king crab":       {"replacement": "canned tuna",     "price": 2.50,  "reason": "Budget seafood alternative"},
}

# ─── FODMAP-Safe Recipe Swap Table ────────────────────────────────────────────
# Sorted by cost tier: high-cost → low-cost alternatives
RECIPE_SWAP_TABLE: List[Dict[str, Any]] = [
    {"expensive": "grilled salmon with asparagus", "replacement": "chicken rice bowl", "cost": 8.0},
    {"expensive": "shrimp stir fry",               "replacement": "tofu stir fry",    "cost": 5.5},
    {"expensive": "lamb chops",                    "replacement": "chicken soup",      "cost": 6.0},
]


class AdjustmentTier(Enum):
    NONE = 0
    BRAND_SWAP = 1
    INGREDIENT_SWAP = 2
    RECIPE_SWAP = 3
    DAY_REDUCTION = 4
    FAIL = 5


@dataclass
class AdjustmentLog:
    tier: int
    item_original: str
    item_new: str
    savings: float
    reason: str


@dataclass
class BudgetResult:
    status: str           # "ok" | "adjusted" | "needs_user_input" | "impossible"
    original_total: float
    final_total: float
    overage: float
    adjustments: List[Dict]
    tier_reached: int
    message: str


class BudgetEngine:
    """
    예산 초과 시 Tier 1 → Tier 4 순서로 자동 조정.
    모든 Tier에서 FODMAP 안전성 우선.
    """

    BUFFER = 0.05  # 5% buffer — 단일 기준점

    def __init__(self, fodmap_db: Dict, usda_prices_path: str):
        self.fodmap_db = fodmap_db
        try:
            with open(usda_prices_path, "r") as f:
                self.prices = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.prices = []

    def _within_budget(self, total: float, budget: float) -> bool:
        """버퍼를 고려한 예산 충족 여부 — 단일 기준으로 통일."""
        return total <= budget * (1 + self.BUFFER)

    def calculate_total(self, items: List[Dict]) -> float:
        subtotal = sum(item.get("price", 0) * item.get("quantity", 1) for item in items)
        return round(subtotal * 1.085, 2)  # 8.5% 세금 포함

    def reconcile(self, items: List[Dict], user_budget: float) -> BudgetResult:
        """
        핵심 예산 조정 흐름.
        원본 items를 deep copy하여 mutation 방지.
        """
        # ── 원본 보존: deep copy 사용 ──────────────────────────────────────────
        working = copy.deepcopy(items)
        original_total = self.calculate_total(working)

        if self._within_budget(original_total, user_budget):
            return BudgetResult(
                status="ok",
                original_total=original_total,
                final_total=original_total,
                overage=0,
                adjustments=[],
                tier_reached=AdjustmentTier.NONE.value,
                message="Budget within limits.",
            )

        adjustments: List[Dict] = []
        tier_reached = AdjustmentTier.NONE.value
        current_total = original_total

        # ── Tier 1: Brand Swap ────────────────────────────────────────────────
        for item in working:
            if self._within_budget(current_total, user_budget):
                break
            if item.get("can_swap_brand") and not item.get("is_pb"):
                old_price = item["price"]
                item["price"] = round(old_price * 0.70, 2)  # 30% 절감
                item["is_pb"] = True
                item["brand"] = "Store Brand"
                savings = round((old_price - item["price"]) * item.get("quantity", 1), 2)
                adjustments.append(asdict(AdjustmentLog(
                    tier=1,
                    item_original=item["name"],
                    item_new=f"PB {item['name']}",
                    savings=savings,
                    reason="Swapped to store brand for savings"
                )))
                current_total = self.calculate_total(working)
                tier_reached = max(tier_reached, AdjustmentTier.BRAND_SWAP.value)

        # ── Tier 2: Expensive Ingredient Swap ────────────────────────────────
        if not self._within_budget(current_total, user_budget):
            sorted_working = sorted(working, key=lambda x: x.get("price", 0), reverse=True)
            for item in sorted_working:
                if self._within_budget(current_total, user_budget):
                    break
                key = item["name"].lower()
                if key in INGREDIENT_SWAP_TABLE:
                    swap = INGREDIENT_SWAP_TABLE[key]
                    old_price = item["price"]
                    savings = round((old_price - swap["price"]) * item.get("quantity", 1), 2)
                    # Locate the original item in working list and update (sorted_working shares refs)
                    item["name"] = swap["replacement"].title()
                    item["price"] = swap["price"]
                    adjustments.append(asdict(AdjustmentLog(
                        tier=2,
                        item_original=key.title(),
                        item_new=swap["replacement"].title(),
                        savings=savings,
                        reason=swap["reason"],
                    )))
                    current_total = self.calculate_total(working)
                    tier_reached = max(tier_reached, AdjustmentTier.INGREDIENT_SWAP.value)

        # ── Tier 3: Recipe Swap ───────────────────────────────────────────────
        if not self._within_budget(current_total, user_budget):
            for recipe in RECIPE_SWAP_TABLE:
                if self._within_budget(current_total, user_budget):
                    break
                # Find matching item by name similarity (MVP: substring)
                for item in working:
                    if recipe["expensive"].lower() in item["name"].lower():
                        old_price = item["price"]
                        savings = round((old_price - recipe["cost"]) * item.get("quantity", 1), 2)
                        item["name"] = recipe["replacement"].title()
                        item["price"] = recipe["cost"]
                        adjustments.append(asdict(AdjustmentLog(
                            tier=3,
                            item_original=recipe["expensive"].title(),
                            item_new=recipe["replacement"].title(),
                            savings=savings,
                            reason="Recipe swapped for cheaper FODMAP-safe alternative"
                        )))
                        current_total = self.calculate_total(working)
                        tier_reached = max(tier_reached, AdjustmentTier.RECIPE_SWAP.value)
                        break

        # ── Tier 4 / 5: Final Status Determination ───────────────────────────
        if self._within_budget(current_total, user_budget):
            status = "adjusted"
        elif current_total > user_budget * 2.0:
            status = "impossible"
            tier_reached = max(tier_reached, AdjustmentTier.FAIL.value)
        else:
            status = "needs_user_input"
            tier_reached = max(tier_reached, AdjustmentTier.DAY_REDUCTION.value)

        overage = round(current_total - user_budget, 2) if current_total > user_budget else 0

        messages = {
            "adjusted":          "Budget adjusted successfully within limits.",
            "needs_user_input":  "Partial adjustment made. User input needed for day reduction.",
            "impossible":        "Cannot fit budget. Minimum viable budget exceeded.",
        }
        return BudgetResult(
            status=status,
            original_total=original_total,
            final_total=round(current_total, 2),
            overage=overage,
            adjustments=adjustments,
            tier_reached=tier_reached,
            message=messages.get(status, "Unknown status"),
        )


if __name__ == "__main__":
    print("BudgetEngine module loaded.")
