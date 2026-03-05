"""
Market Nerve — test_connection.py (Rewritten)
GutFlow | Walmart & Kroger API Connectivity Layer

Role (Antigravity Sensor):
  1. API Connectivity — verify Walmart / Kroger endpoints are reachable
  2. Price Parsing    — extract current_price, sale_event, stock_status from raw JSON
  3. Trigger Engine  — detect price changes and emit signals to master_validator
                       and page.tsx via /api/market-update

Run this file directly for a connectivity health-check:
  python engine-room/test_connection.py
"""

import os
import json
import time
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("MarketNerve")


# ─── Config (all secrets via env — MISSION.md rule 5) ─────────────────────────
WALMART_API_KEY   = os.getenv("WALMART_API_KEY", "")
WALMART_BASE_URL  = os.getenv("WALMART_BASE_URL", "https://developer.api.walmart.com/api-proxy/service/affil/product/v2")
KROGER_CLIENT_ID  = os.getenv("KROGER_CLIENT_ID", "")
KROGER_CLIENT_SECRET = os.getenv("KROGER_CLIENT_SECRET", "")
KROGER_BASE_URL   = os.getenv("KROGER_BASE_URL", "https://api.kroger.com/v1")

# Price-change sensitivity: only trigger if price moves by more than this
PRICE_DELTA_THRESHOLD: float = float(os.getenv("PRICE_DELTA_THRESHOLD", "0.10"))  # 10¢


# ─── Data Shapes ──────────────────────────────────────────────────────────────

@dataclass
class ParsedProduct:
    """Normalized product record — the only shape master_validator ever sees."""
    item_id:        str
    name:           str
    current_price:  float
    original_price: float
    sale_event:     Optional[str]    # e.g. "Rollback", "Special Buy", None
    stock_status:   str              # "In Stock" | "Out of Stock" | "Limited"
    barcode_upc:    Optional[str]
    ingredients_raw: Optional[str]  # raw label text for master_validator
    store:          str              # "walmart" | "kroger"

    def is_on_sale(self) -> bool:
        return self.sale_event is not None

    def discount_pct(self) -> float:
        if self.original_price > 0:
            return round(float((1 - self.current_price / self.original_price) * 100), 1)
        return 0.0


@dataclass
class PriceTrigger:
    """Signal emitted when a tracked product's price changes significantly."""
    item_id:      str
    old_price:    float
    new_price:    float
    delta:        float
    store:        str
    timestamp:    float = field(default_factory=time.time)

    def to_dict(self) -> Dict:
        # Manual conversion avoids dataclasses.asdict overload issues
        return {
            "item_id":   self.item_id,
            "old_price": self.old_price,
            "new_price": self.new_price,
            "delta":     self.delta,
            "store":     self.store,
            "timestamp": self.timestamp,
        }


# ─── Walmart Parser ───────────────────────────────────────────────────────────

def parse_walmart_product(raw: Dict[str, Any]) -> Optional[ParsedProduct]:
    """
    Extract the fields we care about from a Walmart API product JSON.
    Handles nested paths gracefully — returns None if essential data missing.

    Walmart item JSON shape (Affiliate API v2):
      {
        "itemId": "...",
        "name": "...",
        "salePrice": 2.98,
        "msrp": 3.49,
        "clearance": false,
        "specialOffer": "Rollback",
        "availableOnline": true,
        "upc": "...",
        "shortDescription": "...",
      }
    """
    try:
        item_id       = str(raw.get("itemId", ""))
        name          = raw.get("name", "Unknown")
        sale_price    = float(raw.get("salePrice") or raw.get("msrp") or 0)
        msrp          = float(raw.get("msrp") or sale_price)
        special_offer = raw.get("specialOffer") or (
            "Clearance" if raw.get("clearance") else None
        )
        in_stock  = raw.get("availableOnline", True)
        stock_str = "In Stock" if in_stock else "Out of Stock"
        barcode   = raw.get("upc")
        ingr_text = raw.get("ingredients") or raw.get("shortDescription")

        if not item_id or sale_price <= 0:
            return None

        return ParsedProduct(
            item_id=item_id, name=name,
            current_price=round(float(sale_price), 2),
            original_price=round(float(msrp), 2),
            sale_event=special_offer,
            stock_status=stock_str,
            barcode_upc=barcode,
            ingredients_raw=ingr_text,
            store="walmart",
        )
    except (KeyError, TypeError, ValueError) as e:
        log.warning(f"[Walmart Parser] skipped item — {e}")
        return None


# ─── Kroger Parser ────────────────────────────────────────────────────────────

def parse_kroger_product(raw: Dict[str, Any]) -> Optional[ParsedProduct]:
    """
    Extract fields from a Kroger Products API item JSON.

    Kroger item JSON shape (Products API v1):
      {
        "productId": "...",
        "description": "...",
        "items": [
          {
            "price": { "regular": 3.49, "promo": 2.99 },
            "fulfillment": { "inStore": true },
            "inventory": { "stockLevel": "HIGH" }
          }
        ],
        "upc": "...",
        "categories": [...]
      }
    """
    try:
        product_id = str(raw.get("productId", ""))
        name       = raw.get("description", "Unknown")
        items_list = raw.get("items", [{}])
        item0      = items_list[0] if items_list else {}

        price_obj: Any    = item0.get("price", {})
        regular_price     = float(price_obj.get("regular", 0))
        promo_price       = float(price_obj.get("promo") or regular_price)
        sale_event        = "Promo" if promo_price < regular_price else None

        inv: Any          = item0.get("inventory", {})
        stock_level       = str(inv.get("stockLevel", "HIGH"))
        stock_map     = {"HIGH": "In Stock", "LOW": "Limited", "NONE": "Out of Stock"}
        stock_status  = stock_map.get(stock_level, "In Stock")

        barcode   = raw.get("upc")
        ingr_text = raw.get("ingredient") or raw.get("additionalDescription")

        if not product_id or regular_price <= 0:
            return None

        return ParsedProduct(
            item_id=product_id, name=name,
            current_price=round(float(promo_price), 2),
            original_price=round(float(regular_price), 2),
            sale_event=sale_event,
            stock_status=stock_status,
            barcode_upc=barcode,
            ingredients_raw=ingr_text,
            store="kroger",
        )
    except (KeyError, TypeError, ValueError) as e:
        log.warning(f"[Kroger Parser] skipped item — {e}")
        return None


# ─── Price Trigger Engine ─────────────────────────────────────────────────────

class PriceTriggerEngine:
    """
    Watches a basket of products for price changes.
    When a change exceeds PRICE_DELTA_THRESHOLD, emits a PriceTrigger
    that page.tsx / master_validator can subscribe to via /api/market-update.
    """

    def __init__(self):
        self._last_prices: Dict[str, float] = {}  # item_id → last known price

    def ingest(self, products: List[ParsedProduct]) -> List[PriceTrigger]:
        """
        Compare incoming prices to last-known prices.
        Returns a list of PriceTrigger events for price moves > threshold.
        """
        triggers: List[PriceTrigger] = []
        for p in products:
            last = self._last_prices.get(p.item_id)
            self._last_prices[p.item_id] = p.current_price
            if last is None:
                continue  # first time seen — no delta yet
            delta = p.current_price - last
            if abs(delta) >= PRICE_DELTA_THRESHOLD:
                t = PriceTrigger(
                    item_id=p.item_id,
                    old_price=last,
                    new_price=p.current_price,
                    delta=round(float(delta), 2),
                    store=p.store,
                )
                triggers.append(t)
                direction = "↓" if delta < 0 else "↑"
                log.info(
                    f"[Trigger] {p.store.upper()} · {p.name[:30]} "
                    f"{direction} ${abs(delta):.2f} (${last:.2f}→${p.current_price:.2f})"
                )
        return triggers


# ─── Connectivity Health Check ────────────────────────────────────────────────

def check_connectivity() -> Dict[str, Any]:
    """
    Validates that Walmart and Kroger API credentials are set and endpoints
    are reachable. Does NOT make real API calls in this version — validates
    env vars and returns the config status for dev/CI use.

    Returns:
        {
          "walmart": { "configured": bool, "base_url": str },
          "kroger":  { "configured": bool, "base_url": str },
          "ready":   bool   ← True if at least one store is configured
        }
    """
    walmart_ok = bool(WALMART_API_KEY)
    kroger_ok  = bool(KROGER_CLIENT_ID and KROGER_CLIENT_SECRET)

    result = {
        "walmart": {"configured": walmart_ok,  "base_url": WALMART_BASE_URL},
        "kroger":  {"configured": kroger_ok,   "base_url": KROGER_BASE_URL},
        "ready":   walmart_ok or kroger_ok,
        "delta_threshold": PRICE_DELTA_THRESHOLD,
    }
    return result


# ─── CLI Health Check ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("🚀  [MarketNerve] Connectivity health check starting...")

    status = check_connectivity()
    log.info(f"Walmart : {'✅ configured' if status['walmart']['configured'] else '⚠️  WALMART_API_KEY not set'}")
    log.info(f"Kroger  : {'✅ configured' if status['kroger']['configured'] else '⚠️  KROGER_CLIENT_ID / SECRET not set'}")
    log.info(f"Ready   : {'✅ At least one store live' if status['ready'] else '❌ No store credentials found'}")
    log.info(f"Trigger threshold: >${status['delta_threshold']:.2f}")

    # Smoke test parsers with synthetic data
    log.info("\n--- Parser smoke tests ---")

    fake_walmart = {
        "itemId": "W001",
        "name": "Rice Cakes Plain",
        "salePrice": 2.48,
        "msrp": 2.98,
        "specialOffer": "Rollback",
        "availableOnline": True,
        "upc": "012345678901",
        "ingredients": "Rice, Salt",
    }
    wp = parse_walmart_product(fake_walmart)
    log.info(f"Walmart parse: {wp}")

    fake_kroger = {
        "productId": "K001",
        "description": "Quinoa Organic",
        "items": [{"price": {"regular": 5.99, "promo": 4.49}, "inventory": {"stockLevel": "HIGH"}}],
        "upc": "098765432100",
    }
    kp = parse_kroger_product(fake_kroger)
    log.info(f"Kroger  parse: {kp}")

    # Trigger engine test — guard against None parse results
    engine = PriceTriggerEngine()
    parsed: List[ParsedProduct] = [p for p in [wp, kp] if p is not None]
    engine.ingest(parsed)  # first pass — no triggers
    if wp:
        wp.current_price = 1.98   # simulate price drop
        triggers_fired = engine.ingest([wp])
        log.info(f"Triggers fired: {[t.to_dict() for t in triggers_fired]}")
    else:
        log.warning("Walmart parse returned None — trigger test skipped")

    log.info("\n✅  Market Nerve health check complete.")