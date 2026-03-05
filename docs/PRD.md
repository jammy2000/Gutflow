# PRD.md — GutFlow Product Requirements Document

> **Version**: 1.0
> **Owner**: Agent A (PM)
> **Depends on**: /docs/SSOT.md
> **Last updated**: 2026-02-19

---

## 1. Product Overview

**GutFlow** is an AI-powered meal planning and grocery ordering app for IBS patients following the Low-FODMAP diet. Users input their budget, household size, and preferences and receive a fully costed meal plan with a one-tap checkout flow to Walmart or Kroger.

### 1.1 Mission
Enable IBS patients to plan Low-FODMAP meals within their budget and order ingredients from Walmart/Kroger with a single button.

### 1.2 Target Users
- Primary: IBS patients in the United States
- Secondary: Dietitians / caregivers managing FODMAP diets for patients

### 1.3 Success Metrics
| Metric | MVP Target |
|---|---|
| Plan generation success rate | ≥ 95% |
| Budget adherence | 100% of plans within user budget |
| FODMAP safety score | 0 medical constraint violations |
| Cart deep-link success rate | ≥ 98% |

---

## 2. User Inputs (P0 — All Required for Full Functionality)

| Input | Type | Options / Constraints | Priority |
|---|---|---|---|
| `zip_code` | String (5-digit US ZIP) | Required for accurate pricing; absent → estimate mode | P0 |
| `retailer` | Enum | `walmart \| kroger \| both` | P0 |
| `fulfillment_mode` | Enum | `delivery \| pickup` | P0 |
| `duration_days` | Enum | `1 \| 2 \| 3 \| 5 \| 7` | P0 |
| `people` | Enum | `1 \| 2 \| 3 \| 4` | P0 |
| `budget` | USD Number | $30 / $50 / $75 / $100 / $150 / custom | P0 |
| `diet_preferences` | Multi-select | `low_fodmap` (always on) + `vegan` + `halal` | P0 |
| `allergies` | Free text | Converted to tag chips; always overrides safe ingredients | P0 |

### 2.1 Budget Input UX
- Label: **"Your total budget including estimated tax"**
- Clarification note: Subtotal is the budget target; tax is shown separately.

### 2.2 ZIP Code Absence Behaviour — Estimate Mode
- `estimate_mode = true`
- Use national average prices
- Display throughout UI: **"Prices estimated — add ZIP for accuracy"**

---

## 3. Medical Constraints (Non-Negotiable — P0)

> All food logic must be validated against `/docs/SSOT.md` §2 before use.

- **Strict Exclude List**: Garlic, Onion, Wheat, Honey, Apples, Milk (regular), Legumes, HFCS, Inulin, Chicory Root, Sorbitol, Xylitol, Mannitol, Maltitol
- **Soy milk**: Absolutely prohibited — GOS content
- **Every recipe generation**: Double-check against exclude list (mandatory)
- **All FODMAP judgments**: Must cite "Monash University public guidelines" in notes field
- **Medical_Constraint violation**: Immediately halt generation and report; never surface non-FODMAP-safe food to user

---

## 4. Dietary Preference Logic

### 4.1 Low-FODMAP (always active)
- Base constraint; cannot be turned off

### 4.2 Vegan + Low-FODMAP
- **Milk**: Rice milk (primary) → Almond milk (≤200ml/day). Soy milk prohibited (GOS).
- **Conflict rule**: FODMAP wins over vegan when they conflict.
- Refer to `milk_alternatives.vegan` in SSOT.

### 4.3 Halal + Low-FODMAP
- No pork; no alcohol in cooking or ingredients
- Both constraints must be met simultaneously
- If any recipe cannot satisfy both → return `ERR_HALAL_FODMAP_CONFLICT`; do not generate a partial plan

### 4.4 Allergy Exclusions
- Free text input is converted to ingredient tag chips
- User exclusions **always override** even if ingredient is FODMAP-safe
- Agent must block the ingredient from the plan entirely

---

## 5. Conflict Resolution Rules

| Conflict | Resolution | Notes |
|---|---|---|
| Budget vs Nutrition | **Budget wins** | Reduce portion first; drop recipe last |
| Vegan vs FODMAP | **FODMAP wins** | Follow `milk_alternatives` SSOT |
| Halal vs FODMAP | **Both required** | Error if impossible |
| User allergy vs Safe ingredient | **User exclusion wins** | No exceptions |
| Price spike > 20% | **Re-plan triggered** | Do not treat as checkout failure |

---

## 6. Meal Plan Structure

### 6.1 Day Structure
```
For each day (1 to duration_days):
  Breakfast
  Lunch
  Dinner
```

### 6.2 Recipe Fields
| Field | Type | Description |
|---|---|---|
| `id` | UUID | Unique identifier |
| `name` | String | Recipe name |
| `servings` | Integer | Number of servings (= `people`) |
| `cook_time_minutes` | Integer | Estimated cook time |
| `fodmap_safety_score` | Enum | `green \| yellow \| red` |
| `fodmap_notes` | String | Monash basis explanation |
| `estimated_cost_usd` | Float | Per recipe total |
| `ingredients` | Array | See §6.3 |

### 6.3 Ingredient Fields
| Field | Type | Description |
|---|---|---|
| `name` | String | Ingredient name |
| `quantity` | String | Amount for this recipe |
| `unit` | String | Unit of measure |
| `fodmap_tier` | Enum | `green \| yellow \| red` |

### 6.4 Merged Shopping List
- Ingredients are deduplicated across all recipes in the plan
- Total quantity per ingredient is summed
- See SSOT §12 for full `shopping_list` schema

---

## 7. Budget Engine Requirements

### 7.1 Formula (from SSOT §3)
```
subtotal   = sum of ingredient prices
tax_buffer = subtotal × 0.085
est_total  = subtotal + tax_buffer

Pass:  subtotal ≤ user_budget
Fail:  subtotal > user_budget → ERR_BUDGET_TOO_LOW
```

### 7.2 Budget Failure Flow
1. Show minimum required budget
2. Offer to reduce `duration_days` (requires explicit user approval)
3. Never silently drop meals

### 7.3 Tax UI (P0 — exact wording required)
```
Subtotal: $XX.XX
Est. Tax (~8.5%): $X.XX
Est. Total: $XX.XX
Final amount confirmed at checkout
```

---

## 8. Retailer & Pricing

### 8.1 Single Retailer
- Fetch and display prices from selected retailer only

### 8.2 `retailer = both`
- Fetch prices from Walmart and Kroger
- Auto-recommend lowest-total-subtotal retailer
- Display user toggle to switch retailer without regenerating the plan
- Show both subtotals side-by-side for transparency

### 8.3 Price Cache
- TTL: 15 minutes (Supabase `price_cache` table)
- If serving stale cache: display `"Prices may be outdated"`

---

## 9. Substitution Policy

### 9.1 Type A — Brand Swap (Auto-allowed)
- Same ingredient, same FODMAP tier, different brand
- Auto-apply; record in `adjustments_applied[]`; show in UI summary (no user approval)

### 9.2 Type B — OOS Substitute (Requires Approval)
- Different product/ingredient
- Show modal: **"X is unavailable — Replace with Y?"**
- Apply only after user taps Confirm
- Record in `adjustments_applied[]`
- **Code prohibition**: No auto-apply logic for Type B anywhere in codebase

---

## 10. Checkout Requirements

### 10.1 Phase 1 MVP (P0)
- Cart deep-link: opens retailer's cart pre-populated with items in new browser tab
- Payment completed on retailer website (not in-app)
- Button label: **"Checkout at Walmart →"** or **"Checkout at Kroger →"**
- Affiliate tag appended to every deep-link URL (required)

### 10.2 Phase 2 (P1 — Requires Partner Approval)
- Direct cart management API (Walmart / Kroger Affiliate API)
- In-app checkout possible
- Stub-only implementation until partner approval granted
- ETA: Walmart 4–8 weeks, Kroger 2–4 weeks

> **Important**: UX and QA agents implement Phase 1 only. Phase 2 endpoints must be stubs.

---

## 11. Scheduling & Alerts (P1)

| Feature | Priority | Description |
|---|---|---|
| Meal reminder notifications | P1 | Push alerts at scheduled meal times |
| Cooking mode | P1 | Step-by-step recipe card activated from alert |
| Plan re-schedule | P1 | User can shift meal plan days |

---

## 12. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time (plan generation) | < 10 seconds |
| Price fetch (cached) | < 500ms |
| Price fetch (live) | < 3 seconds |
| FODMAP safety check | < 1 second per recipe |
| Availability | 99.5% uptime (Vercel + Railway) |
| TypeScript strict mode | Required on all TS/TSX code |
| API key storage | Environment variables only — hardcoding prohibited |

---

## 13. Error Handling Requirements

| Error Code | Trigger | UX Response |
|---|---|---|
| `ERR_BUDGET_TOO_LOW` | Subtotal > budget | Show min budget + offer to reduce days |
| `ERR_HALAL_FODMAP_CONFLICT` | Impossible dietary combination | Block generation; display conflict message |
| `ERR_NO_SAFE_SUBSTITUTE` | No FODMAP-safe OOS replacement exists | Remove item; notify user |
| `ERR_PRICE_API_TIMEOUT` | Price API unreachable | Serve from cache (≤15 min) with stale marker |
| `ERR_ZIP_INVALID` | ZIP not recognized | Enter estimate mode; prompt user to correct |
| `ERR_ALLERGY_CONFLICT` | Allergy tag blocks required ingredient | Block recipe; suggest alternative |

---

## 14. Audit Trail

Every plan, substitution, and price change must be logged in `adjustments_applied[]` on the API response. See SSOT §10 for schema.

---

## 15. Requirement Priority Summary

| Priority | Meaning |
|---|---|
| **P0** | MVP — must ship in Phase 1 |
| **P1** | Phase 2 — ship after partner API approval |
| **P2** | Future — nice-to-have, no committed timeline |

---

## 16. Out of Scope (Phase 1)

- In-app payment / checkout (P1)
- Nutritional macro tracking (P2)
- Recipe social sharing (P2)
- Custom recipe creation by user (P2)
- Integration beyond Walmart and Kroger (P2)

---

*End of PRD.md — Agent A, GutFlow*
