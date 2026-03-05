# AGENT D — Integrations Agent (Walmart / Kroger)
# Antigravity Agent Manager 태스크 프롬프트

## 역할
외부 마트 API 연동, 상품 검색, 대체품 로직, 장바구니 생성, 어필리에이트 태깅.
Agent B 완료 후 착수. Agent C와 병렬 실행 가능.

## 산출물
- `/docs/INTEGRATIONS.md` — 연동 명세 문서
- `/integrations/bluecart.py` — BlueCart API 클라이언트
- `/integrations/walmart.py` — Walmart Affiliate 연동
- `/integrations/kroger.py` — Kroger API 연동
- `/integrations/price_service.py` — 통합 가격 서비스

---

## TASK PROMPT

```
You are the Integrations Agent for GutFlow app.
Read rules.md, /docs/SSOT.md, /docs/API.md before starting.

## DELIVERABLES

### 1. /docs/INTEGRATIONS.md

INTEGRATION ARCHITECTURE:
```
Phase 1 (MVP — immediate):
  BlueCart API → Walmart + Kroger prices (no approval needed)
  Walmart Affiliate → deep link cart (immediate)
  Kroger API → product search + affiliate link

Phase 2 (after partner approval):
  Walmart Marketplace API → direct cart management
  Kroger Cart API → direct checkout
  Instacart Partner API → same-day delivery option
```

BLUECART API:
- Base URL: https://api.bluecartapi.com/request
- Auth: api_key in query param
- Endpoints used:
  * search: GET ?search_term={ingredient}&retailer=walmart
  * product: GET ?type=product&item_id={id}
- Rate limit: 100 req/min (cache aggressively)
- Price field: $.price or $.offers.primary.price

WALMART AFFILIATE:
- Program: Walmart Affiliate Program (impact.com)
- Affiliate tag format: ?wmlspartner={AFFILIATE_ID}&affiliates_ad_id={AD_ID}
- Cart deep link: https://www.walmart.com/cart?items={item_id}:{qty}
- Commission: 1-4% on groceries

KROGER API:
- Base URL: https://api.kroger.com/v1
- Auth: OAuth 2.0 client credentials
- locationId: REQUIRED — zip_code로 nearest store 먼저 조회 후 사용
- Endpoints:
  * GET /locations?filter.zipCode={zip}&filter.radiusInMiles=10 → locationId 획득
  * GET /products?filter.term={ingredient}&filter.locationId={store_id}
- Response: products[].items[].price.regular
- zip_code 없으면: locationId 없이 호출 불가 → estimate_mode fallback

PRICE CACHE STRATEGY:
- Cache key: {retailer}:{product_id}
- TTL: 15 minutes (enforced in Supabase price_cache table)
- Fallback: if API fails, use last cached price + "Price may have changed" warning
- Batch fetch: group all ingredients in one API call where possible

PRODUCT MATCHING LOGIC:
```
ingredient_name → search query → product candidates → best match
Best match algorithm:
1. Exact name match (score: 100)
2. FODMAP-safe brand preferred (score: +20)
3. Store brand preferred for budget (score: +10 if budget_tight)
4. Organic preferred if budget allows (score: +5)
5. Size/unit normalization: convert to per-100g comparison
```

SUBSTITUTE PRODUCT RULES (rules.md §8 준수):
- Type A (Brand Swap — 자동 허용):
  동일 성분/동일 FODMAP 등급 내에서 브랜드만 교체
  예: Horizon milk → Great Value lactose-free milk
  조건: FODMAP 재검증 + adjustments_applied 기록
  자동 적용 가능 (사용자 승인 불필요 — 단, 변경 내역 UI에 표시)

- Type B (OOS Substitute — 승인 필수):
  품절/unavailable 시 다른 제품/성분으로 교체 제안
  UI: "X is unavailable — Replace with Y?" 모달
  사용자 승인 없이 절대 자동 적용 금지
  FODMAP 재검증 필수
  max price difference for suggestion: +15% (자동 교체 아님, 제안만)

- 절대 금지: Type B를 자동 적용하는 코드 작성
- 모든 대체 이력: adjustments_applied[]에 기록

AFFILIATE TAGGING:
- Every outbound link MUST include affiliate tag
- Tag format stored in environment variable: WALMART_AFFILIATE_ID, KROGER_AFFILIATE_ID
- Track: clicks, cart_builds, conversions (via affiliate dashboard)
- Revenue estimate: $0.50-2.00 per completed order

### 2. /integrations/bluecart.py

```python
import httpx
import os
from typing import Optional
from dataclasses import dataclass

@dataclass
class ProductResult:
    product_id: str
    name: str
    brand: str
    price: float
    unit: str
    size: str
    retailer: str
    image_url: str
    available: bool
    affiliate_url: str

class BluecartClient:
    BASE_URL = "https://api.bluecartapi.com/request"
    
    def __init__(self):
        self.api_key = os.environ["BLUECART_API_KEY"]
    
    async def search_ingredient(
        self,
        ingredient: str,
        retailer: str = "walmart",
        max_results: int = 5
    ) -> list[ProductResult]:
        """
        Search for ingredient in Walmart or Kroger.
        Returns ranked list of matching products.
        """
        pass
    
    async def get_product_price(
        self,
        product_id: str,
        retailer: str
    ) -> Optional[float]:
        """
        Get current price for specific product.
        Used for cache refresh.
        """
        pass
    
    async def batch_search(
        self,
        ingredients: list[str],
        retailer: str
    ) -> dict[str, list[ProductResult]]:
        """
        Batch search for multiple ingredients.
        Respects rate limits with asyncio.gather + semaphore.
        """
        pass
```

### 3. /integrations/walmart.py

```python
class WalmartIntegration:
    AFFILIATE_ID = os.environ["WALMART_AFFILIATE_ID"]
    CART_BASE = "https://www.walmart.com/cart"
    
    def build_cart_url(self, items: list[dict]) -> str:
        """
        Build Walmart cart deep link with affiliate tag.
        items: [{ walmart_product_id, quantity }]
        Format: walmart.com/cart?items=ID1:QTY1,ID2:QTY2&wmlspartner=AFFILIATE_ID
        """
        pass
    
    def build_product_url(self, product_id: str) -> str:
        """Single product URL with affiliate tag."""
        pass
    
    def estimate_delivery(self, zip_code: str) -> dict:
        """
        Estimate delivery window and fee.
        Returns: { delivery_date, fee, free_delivery_threshold }
        """
        pass
```

### 4. /integrations/price_service.py

```python
class PriceService:
    """
    Unified price service — abstracts BlueCart, Walmart, Kroger.
    Handles caching, fallback, and best-price selection.
    """
    
    async def get_prices_for_shopping_list(
        self,
        shopping_list_id: str,
        preferred_retailer: str = "both"
    ) -> dict:
        """
        Main entry point for Budget Engine.
        1. Check Supabase price_cache (TTL: 15min)
        2. If stale: fetch from BlueCart API
        3. Update cache
        4. Return: { ingredient: { walmart: price, kroger: price, best: price } }
        """
        pass
    
    async def find_substitute(
        self,
        ingredient: str,
        max_price: float,
        fodmap_db: dict
    ) -> Optional[ProductResult]:
        """
        Find FODMAP-safe substitute within price limit.
        Called by Budget Engine Tier 1 (brand swap).
        """
        pass
    
    def compare_retailers(
        self,
        walmart_total: float,
        kroger_total: float
    ) -> dict:
        """
        Compare totals and recommend retailer.
        Returns: { recommended, savings, walmart_total, kroger_total }
        """
        pass
```

## CONSTRAINTS
- All API keys in environment variables — never hardcode
- Rate limit handling: exponential backoff on 429
- All prices include tax flag (some APIs return pre-tax)
- Log all API calls with timestamp (for QA Agent)
- FODMAP check on every substitute before returning
```
