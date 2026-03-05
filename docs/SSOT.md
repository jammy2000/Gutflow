# SSOT.md — GutFlow Single Source of Truth

> **Authority**: This document is the canonical reference for ALL agents (B–F).
> In any conflict between this file and an individual agent doc, **this file wins**.
> Maintained by: Agent A (PM)
> Last updated: 2026-02-19

---

## 1. Enum Definitions

### 1.1 `duration_days`
```
1 | 2 | 3 | 5 | 7
```
Default: `7`

### 1.2 `people`
```
1 | 2 | 3 | 4
```
Default: `1`

### 1.3 `diet_type` (multi-select)
```
low_fodmap    ← always enabled (cannot be disabled)
vegan
halal
```

### 1.4 `retailer`
```
walmart | kroger | both
```
Default: `walmart`

### 1.5 `fulfillment_mode`
```
delivery | pickup
```
Default: `delivery`

### 1.6 `budget_preset` (USD, tax-inclusive total budget)
```
30 | 50 | 75 | 100 | 150 | custom
```

---

## 2. Medical Constraints (FODMAP — READ-ONLY, never modify)

> **Source**: Monash University public guidelines. Every recipe generation MUST double-check against this list.

### 2.1 Strict Exclude List
```
Garlic, Onion, Wheat, Honey, Apples, Milk (regular), Legumes (high-FODMAP),
High Fructose Corn Syrup, Inulin, Chicory Root,
Sorbitol, Xylitol, Mannitol, Maltitol
```

### 2.2 Safe Alternatives
| Excluded Item | Safe Replacement |
|---|---|
| Garlic | Garlic-infused oil |
| Onion | Spring onion (green part only) |
| Wheat | Rice, Quinoa, Gluten-free oats |
| Regular milk | Lactose-free milk (default) |
| Regular milk (vegan) | Rice milk (preferred) → Almond milk (≤200ml/day) |
| Soy milk | **PROHIBITED** — GOS content. No exceptions. |

### 2.3 `milk_alternatives` (Canonical — all agents must use this object)
```json
{
  "default": "lactose-free milk",
  "vegan": {
    "primary": "rice milk",
    "secondary": "almond milk",
    "secondary_limit": "200ml per day",
    "prohibited": ["soy milk"]
  }
}
```

### 2.4 FODMAP Safety Tiers
| Tier | Color | Meaning | Action |
|------|-------|---------|--------|
| Green | 🟢 | Safe at normal serving | Allow |
| Yellow | 🟡 | Safe only at low serving | Allow with serving cap + warning |
| Red | 🔴 | Not safe — high FODMAP | Block; offer substitute |

**Stacking Rule**: Two Yellow ingredients in the same recipe requires an aggregate FODMAP load check. If combined load exceeds threshold, at least one must be reduced or substituted.

---

## 3. Budget Formula

```
subtotal     = sum of all ingredient prices (pre-tax)
tax_buffer   = subtotal × 0.085          // estimated; actual varies by state/county
est_total    = subtotal + tax_buffer

Budget pass/fail: subtotal ≤ user_budget  // budget judgment uses subtotal only
```

> ⚠️  `user_budget` is treated as an **inclusive** total. The engine compares `subtotal` only;
> `tax_buffer` is displayed separately and clearly marked as estimated.

### 3.1 Tax UI Strings (P0 — fixed wording, do not alter)
```
Subtotal: $XX.XX
Est. Tax (~8.5%): $X.XX
Est. Total: $XX.XX
Final amount confirmed at checkout
```

---

## 4. Location & Estimate Mode

```json
{
  "zip_code_required": true,
  "fallback_behaviour": "Use national average prices",
  "estimate_mode_flag": "estimate_mode = true",
  "ui_warning": "Prices estimated — add ZIP for accuracy"
}
```

---

## 5. Retailer Selection Policy

| `retailer` | Behaviour |
|---|---|
| `walmart` | Fetch Walmart prices only |
| `kroger` | Fetch Kroger prices only |
| `both` | Fetch both; auto-recommend lowest total-price retailer; provide user toggle to switch |

> Auto-recommend = lowest `subtotal`. User can override via toggle without re-generating the plan.

---

## 6. Substitution Policy

### Type A — Brand Swap (Auto-allowed)
- Same ingredient, same FODMAP tier, different brand
- Example: Horizon Organic lactose-free milk → Great Value lactose-free milk
- Requirements:
  1. FODMAP re-validation required
  2. Record in `adjustments_applied[]`
  3. Show change in UI (no user approval needed)

### Type B — OOS / Ingredient Swap (Approval required)
- Different product or ingredient category
- Example: Salmon (OOS) → Chicken breast (suggested)
- Requirements:
  1. **Never apply automatically** — code prohibition
  2. Present modal: `"X is unavailable — Replace with Y?"`
  3. Apply only after explicit user confirmation
  4. Record in `adjustments_applied[]`

---

## 7. Checkout Reality

| Phase | Mode | Behaviour |
|---|---|---|
| Phase 1 (MVP) | Deep-link | App opens cart URL in new tab; payment on retailer site |
| Phase 2 | Direct API | In-app cart management + checkout (requires partner approval) |

**Phase 1 UI string**: `"Checkout at Walmart →"` (new tab)
**Affiliate tag**: Must be appended to all deep-link URLs.

> Phase 2 ETA: Walmart 4–8 weeks, Kroger 2–4 weeks for API partner approval.
> All E/QA agents implement Phase 1 only. Phase 2 endpoints are **stub-only**.

---

## 8. Conflict Resolution Rules

| Conflict | Winner | Rule |
|---|---|---|
| Budget vs Nutrition | **Budget** | Reduce portions first; drop recipe last |
| Vegan vs FODMAP | **FODMAP** | Follow `milk_alternatives` SSOT |
| Halal vs FODMAP | **Both required** | Must satisfy simultaneously; return error if impossible |
| User exclusion vs Safe ingredient | **User exclusion** | Always override even if FODMAP-safe |
| Price spike > 20% | Trigger re-plan | Do not treat as checkout failure |

---

## 9. Failure Modes & Fallback Behaviour

| Failure | Response |
|---|---|
| `budget_too_low` | Show minimum required budget + offer to reduce `duration_days` (requires user approval) |
| `item_oos` | Trigger Type B substitution flow (user approval required) |
| `price_spike > 20%` | Auto re-plan; notify user with diff; do not fail silently |
| `halal + fodmap impossible` | Return structured error; do not generate partial plan |
| `zip_code missing` | `estimate_mode = true`; proceed with national average prices |
| `api_timeout` | Return cached price (max 15-min stale) with `"Prices may be outdated"` marker |

---

## 10. Audit Log — `adjustments_applied[]`

Every plan modification must be appended to the `adjustments_applied` array in the API response.

```json
{
  "adjustments_applied": [
    {
      "type": "TypeA | TypeB",
      "original": "string",
      "replacement": "string",
      "reason": "string",
      "approved_by": "auto | user",
      "timestamp": "ISO8601"
    }
  ]
}
```

---

## 11. Meal Plan Structure

```json
{
  "meal_plan": {
    "day": 1,
    "meals": {
      "breakfast": { "recipe": {...} },
      "lunch":     { "recipe": {...} },
      "dinner":    { "recipe": {...} }
    }
  },
  "recipe": {
    "id": "uuid",
    "name": "string",
    "servings": 1,
    "cook_time_minutes": 30,
    "fodmap_safety_score": "green | yellow | red",
    "fodmap_notes": "string (Monash basis)",
    "estimated_cost_usd": 0.00,
    "ingredients": [
      {
        "name": "string",
        "quantity": "string",
        "unit": "string",
        "fodmap_tier": "green | yellow | red"
      }
    ]
  }
}
```

---

## 12. Shopping List Structure

```json
{
  "shopping_list": {
    "retailer": "walmart | kroger",
    "estimate_mode": false,
    "items": [
      {
        "name": "string",
        "total_quantity": "string",
        "unit": "string",
        "price_per_unit": 0.00,
        "total_price": 0.00,
        "fodmap_tier": "green | yellow | red",
        "in_stock": true,
        "product_id": "string (retailer SKU)"
      }
    ],
    "subtotal": 0.00,
    "tax_buffer": 0.00,
    "est_total": 0.00,
    "adjustments_applied": []
  }
}
```

---

## 13. Order Structure

```json
{
  "order": {
    "retailer": "walmart | kroger",
    "fulfillment_mode": "delivery | pickup",
    "cart_deep_link": "https://...",
    "affiliate_tag": "string",
    "phase": "1 | 2",
    "items": [...],
    "subtotal": 0.00,
    "tax_buffer": 0.00,
    "est_total": 0.00,
    "adjustments_applied": []
  }
}
```

---

## 14. Error Codes

| Code | Meaning | Fallback |
|---|---|---|
| `ERR_BUDGET_TOO_LOW` | Budget insufficient for minimum plan | Show min. required budget + reduce days prompt |
| `ERR_HALAL_FODMAP_CONFLICT` | Cannot satisfy Halal + FODMAP simultaneously | Return error; do not generate partial plan |
| `ERR_NO_SAFE_SUBSTITUTE` | No FODMAP-safe substitute found for OOS item | Remove item from cart; notify user |
| `ERR_PRICE_API_TIMEOUT` | Price API unreachable | Use 15-min cache; mark as stale |
| `ERR_ZIP_INVALID` | ZIP code not recognized | Enter estimate mode; prompt user to correct |
| `ERR_ALLERGY_CONFLICT` | Allergy tag conflicts with required ingredient | Block recipe; offer alternative |

---

## 15. Price Cache Policy

```
Cache engine: Supabase price_cache table
TTL:          15 minutes
Stale label:  "Prices may be outdated" (shown in UI when serving from cache)
On miss:      Fetch live → store with timestamp
```

---

## 16. Technical Stack (Read-Only)

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Supabase (Auth + PostgreSQL) |
| AI | claude-sonnet-4-6 |
| Deployment | Vercel (FE) + Railway (BE) |
| Price API (MVP) | BlueCart API |
| Price API (Phase 2) | Walmart / Kroger Affiliate API |
| Future portability | Architecture compatible with Expo (React Native) |

---

## 17. API Security

- All API keys managed via **environment variables only** — hardcoding is prohibited
- TypeScript strict mode required on all TS/TSX files
- Affiliate tag must be present on every deep-link

---

*End of SSOT.md — Agent A, GutFlow*
