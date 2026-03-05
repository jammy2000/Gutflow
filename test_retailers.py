"""
tests/unit/test_retailers.py
GutFlow — RetailerIntegrations 유닛 테스트 (Agent F / Category C)
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'integrations'))
from retailers import RetailerIntegrations, WalmartIntegration, KrogerIntegration, ProductResult


@pytest.fixture
def ri():
    return RetailerIntegrations()

class TestProductSchema:
    def test_walmart_returns_product_result(self, ri):
        """스키마 통일: Walmart가 ProductResult 반환."""
        r = ri.walmart.search_product("quinoa")
        assert isinstance(r, ProductResult)
        assert r.provider == "Walmart"
        assert r.price > 0

    def test_kroger_returns_product_result(self, ri):
        """스키마 통일: Kroger가 ProductResult 반환."""
        r = ri.kroger.search_product("quinoa")
        assert isinstance(r, ProductResult)
        assert r.provider == "Kroger"

    def test_missing_product_returns_none(self, ri):
        """없는 상품 → None (예외 아님)."""
        r = ri.walmart.search_product("dragon fruit")
        assert r is None


class TestBestPriceLogic:
    def test_picks_cheaper_in_stock_retailer(self, ri):
        """최저가 & 재고 있는 리테일러 자동 선택."""
        r = ri.find_best_price("quinoa")
        assert r is not None
        assert r.in_stock is True
        # Kroger: 6.00 < Walmart: 6.50 → Kroger wins
        assert r.provider == "Kroger"
        assert r.price == 6.00

    def test_salmon_kroger_oos_falls_back_to_walmart(self, ri):
        """C3: Kroger salmon 품절 → Walmart 자동 선택."""
        r = ri.find_best_price("salmon")
        assert r is not None
        assert r.provider == "Walmart"
        assert r.in_stock is True

    def test_deterministic_results(self, ri):
        """결정론적: 동일 입력 → 항상 동일 결과."""
        r1 = ri.find_best_price("chicken breast")
        r2 = ri.find_best_price("chicken breast")
        assert r1.price == r2.price
        assert r1.provider == r2.provider


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
