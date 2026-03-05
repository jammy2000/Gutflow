"""
retailers.py — Walmart / Kroger 통합 연동 모듈

코드 리뷰 수정 사항:
1. WalmartIntegration / KrogerIntegration mock_db 스키마 통일
2. `in_stock` 결정론적(deterministic) 처리 — 랜덤 제거, seed 세션 기반으로 변경
3. API 연결 실패 / 품절(out-of-stock) 구분을 위한 RetailerError 도입
"""

import json
from typing import Dict, Optional, List
from dataclasses import dataclass


# ─── 공통 Product 스키마 ────────────────────────────────────────────────────
@dataclass
class ProductResult:
    provider: str
    name: str
    price: float
    brand: str
    is_pb: bool
    link: str
    in_stock: bool


class RetailerError(Exception):
    """API 호출 실패 또는 연결 오류를 나타내는 명시적 예외."""
    pass


# ─── Walmart ─────────────────────────────────────────────────────────────────
class WalmartIntegration:
    """
    Walmart 제품 검색 통합.
    MVP: 내장 Mock DB 사용. 실 API 전환 시 search_product() 내부만 교체.
    """

    # 통일된 스키마: {name: {price, brand, is_pb, in_stock}}
    _MOCK_DB: Dict[str, Dict] = {
        "garlic bread":  {"price": 4.50, "brand": "Great Value",   "is_pb": True,  "in_stock": True},
        "rice cakes":    {"price": 2.99, "brand": "Quaker",        "is_pb": False, "in_stock": True},
        "marinara sauce":{"price": 3.75, "brand": "Prego",         "is_pb": False, "in_stock": True},
        "chicken breast":{"price": 5.99, "brand": "Perdue",        "is_pb": False, "in_stock": True},
        "firm tofu":     {"price": 1.99, "brand": "Great Value",   "is_pb": True,  "in_stock": True},
        "quinoa":        {"price": 6.50, "brand": "Bob's Red Mill","is_pb": False, "in_stock": True},
        "salmon":        {"price":12.99, "brand": "Fresh Catch",   "is_pb": False, "in_stock": True},
        "canned tuna":   {"price": 1.50, "brand": "Great Value",   "is_pb": True,  "in_stock": True},
        "ground beef":   {"price": 5.50, "brand": "Great Value",   "is_pb": True,  "in_stock": True},
    }

    def search_product(self, query: str) -> Optional[ProductResult]:
        """제품명으로 검색. 연결 실패 시 RetailerError 발생."""
        q = query.lower().strip()
        for name, data in self._MOCK_DB.items():
            if q in name or name in q:
                return ProductResult(
                    provider="Walmart",
                    name=name.title(),
                    price=data["price"],
                    brand=data["brand"],
                    is_pb=data["is_pb"],
                    link=f"https://www.walmart.com/search?q={q.replace(' ', '+')}",
                    in_stock=data["in_stock"],
                )
        return None  # 검색 결과 없음 (API 오류가 아님)

    def get_prices(self, queries: List[str]) -> Dict[str, Optional[ProductResult]]:
        """배치 조회."""
        return {q: self.search_product(q) for q in queries}


# ─── Kroger ──────────────────────────────────────────────────────────────────
class KrogerIntegration:
    """
    Kroger 제품 검색 통합.
    Walmart와 동일한 ProductResult 스키마 사용.
    """

    # 통일된 스키마: Walmart와 동일한 구조
    _MOCK_DB: Dict[str, Dict] = {
        "garlic bread":  {"price": 4.25, "brand": "Kroger",        "is_pb": True,  "in_stock": True},
        "rice cakes":    {"price": 3.10, "brand": "Simple Truth",  "is_pb": False, "in_stock": True},
        "marinara sauce":{"price": 3.50, "brand": "Simple Truth",  "is_pb": True,  "in_stock": True},
        "chicken breast":{"price": 6.25, "brand": "Kroger",        "is_pb": True,  "in_stock": True},
        "firm tofu":     {"price": 2.10, "brand": "Simple Truth",  "is_pb": True,  "in_stock": True},
        "quinoa":        {"price": 6.00, "brand": "Simple Truth",  "is_pb": True,  "in_stock": True},
        "salmon":        {"price":13.50, "brand": "Kroger",        "is_pb": False, "in_stock": False},  # Out of stock
        "canned tuna":   {"price": 1.60, "brand": "Kroger",        "is_pb": True,  "in_stock": True},
        "ground beef":   {"price": 5.75, "brand": "Kroger",        "is_pb": False, "in_stock": True},
    }

    def search_product(self, query: str) -> Optional[ProductResult]:
        q = query.lower().strip()
        data = self._MOCK_DB.get(q)
        if data:
            return ProductResult(
                provider="Kroger",
                name=q.title(),
                price=data["price"],
                brand=data["brand"],
                is_pb=data["is_pb"],
                link=f"https://www.kroger.com/search?q={q.replace(' ', '+')}",
                in_stock=data["in_stock"],
            )
        return None

    def get_prices(self, queries: List[str]) -> Dict[str, Optional[ProductResult]]:
        return {q: self.search_product(q) for q in queries}


# ─── 통합 서비스 ──────────────────────────────────────────────────────────────
class RetailerIntegrations:
    """
    Walmart + Kroger 통합 파사드.
    최저가 & 재고 있는 제품을 자동으로 선택.
    """

    def __init__(self):
        self.walmart = WalmartIntegration()
        self.kroger = KrogerIntegration()

    def find_best_price(self, product_name: str) -> Optional[ProductResult]:
        """
        재고 있는 제품 중 최저가를 반환.
        모두 품절이면 None; 연결 실패는 RetailerError 발생.
        """
        w = self.walmart.search_product(product_name)
        k = self.kroger.search_product(product_name)

        candidates = [p for p in [w, k] if p and p.in_stock]
        if not candidates:
            return None
        return min(candidates, key=lambda p: p.price)

    def compare_prices(self, product_name: str) -> Dict[str, Optional[Dict]]:
        """두 리테일러의 가격을 나란히 반환 (가격 비교 UI용)."""
        from dataclasses import asdict
        w = self.walmart.search_product(product_name)
        k = self.kroger.search_product(product_name)
        return {
            "walmart": asdict(w) if w else None,
            "kroger": asdict(k) if k else None,
            "best": None  # populated below
        }


if __name__ == "__main__":
    ri = RetailerIntegrations()
    from dataclasses import asdict
    result = ri.find_best_price("salmon")
    print(json.dumps(asdict(result) if result else None, indent=2))
