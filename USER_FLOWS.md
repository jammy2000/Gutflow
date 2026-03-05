# USER_FLOWS.md — GutFlow User Flow Scenarios

> **Version**: 1.0
> **Owner**: Agent A (PM)
> **Depends on**: /docs/SSOT.md, /docs/PRD.md
> **Last updated**: 2026-02-19

---

## Flow 1 — Onboarding → Preference Setup → Plan Generation → Cart Review → Checkout

> **Priority**: P0 (MVP Critical Path)

### Description
New or returning user sets up their preferences, generates a meal plan, reviews the shopping cart, and initiates checkout at a retailer.

### Flow Diagram

```
[Onboarding Screen]
        |
        v
[Preference Setup]
  ┌─────────────────────────────────────┐
  │  ZIP code (optional — shows warning │
  │  if skipped: estimate mode)         │
  │  Retailer: walmart | kroger | both  │
  │  Fulfillment: delivery | pickup     │
  │  Duration: 1/2/3/5/7 days          │
  │  People: 1/2/3/4                   │
  │  Budget: $30–$150 or custom        │
  │  Diet: [Low-FODMAP] +vegan +halal  │
  │  Allergies: free text → tag chips  │
  └─────────────────────────────────────┘
        |
        v
[Validate Inputs]
  ├── ZIP missing? → estimate_mode=true → show "Prices estimated — add ZIP for accuracy"
  ├── halal + FODMAP conflict possible? → proceed; error returned later if impossible
  └── Allergy tags created from free text
        |
        v
[Generate Meal Plan]  ← AI (claude-sonnet-4-6) + FODMAP safety double-check
  ├── Each recipe: FODMAP double-check vs Strict Exclude List (SSOT §2)
  ├── milk_alternatives applied per diet type (SSOT §2.3)
  └── Budget engine: subtotal ≤ user_budget? 
        ├── YES → proceed
        └── NO  → ERR_BUDGET_TOO_LOW → show min. budget + offer to reduce duration
        |
        v
[Meal Plan View]
  ├── Day-by-day: Breakfast / Lunch / Dinner cards
  ├── Each card: recipe name, cook time, FODMAP score badge, cost
  └── FODMAP notes: "Monash University public guidelines basis"
        |
        v
[Shopping List / Cart Review]
  ├── Merged, deduplicated ingredient list
  ├── Subtotal, Est. Tax (~8.5%), Est. Total
  ├── "Final amount confirmed at checkout" note
  ├── retailer=both? → Show both subtotals; highlight recommended (lowest); user toggle
  └── Price stale? → "Prices may be outdated" banner
        |
        v
[Checkout]
  Phase 1 (MVP):
    └── Tap "Checkout at Walmart →" → opens retailer cart in new tab
        └── Payment completed on retailer website
  Phase 2 (stub):
    └── In-app checkout (future — requires partner approval)
```

### Key Rules Applied
- FODMAP double-check: REQUIRED on every recipe
- Budget wins over nutrition (portion reduction first, recipe removal last)
- Type A substitutions may auto-apply with audit entry; Type B requires user approval
- Affiliate tag appended to every deep-link URL

---

## Flow 2 — Plan Generated → Price Exceeds Budget → Auto Re-Plan → Re-Confirm

> **Priority**: P0 (MVP Critical Path)

### Description
After plan generation, the total subtotal exceeds the user's budget. The system automatically re-plans within budget and asks for re-confirmation.

### Flow Diagram

```
[Plan Generation Attempt]
        |
        v
[Budget Check: subtotal > user_budget?]
  └── YES → ERR_BUDGET_TOO_LOW
        |
        v
[System Response]
  ├── Calculate minimum required budget for current inputs
  ├── Show: "Your plan costs $XX.XX but your budget is $YY.YY"
  └── Show: minimum required budget
        |
        v
[User Options Presented] (explicit approval required — no silent change)
  ├── Option A: Increase budget
  ├── Option B: Reduce duration_days (e.g., 7 days → 5 days)
  └── Option C: Reduce people count
        |  User selects option
        v
[Re-Plan with Adjusted Parameters]
  ├── Apply Type A brand swaps if needed (auto — logged in adjustments_applied[])
  ├── Minimize cost via portion sizing before removing recipes
  └── Re-run budget check until subtotal ≤ user_budget
        |
        v
[Show Adjusted Plan]
  ├── Highlight changes: "Plan adjusted to fit your budget"
  ├── Show adjustments_applied[] diff to user
  ├── Display updated subtotal / est. tax / est. total
  └── Await user re-confirmation
        |
        v
[User Confirms] → continue to Cart Review → Checkout (Flow 1)
[User Rejects]  → return to Preference Setup with fields pre-filled
```

### Key Rules Applied
- Budget vs Nutrition: Budget wins
- Never silently drop meals without user awareness
- Portion reduction before recipe removal
- Price spike > 20% triggers this flow automatically (not treated as checkout failure)
- All changes logged in `adjustments_applied[]`

---

## Flow 3 — Item Out of Stock → Substitute Suggested → User Approves → Cart Updated

> **Priority**: P0 (MVP Critical Path)

### Description
During cart construction or checkout deep-link preparation, one or more items are flagged as out of stock. The system proposes a Type B substitute and waits for user approval.

### Flow Diagram

```
[Cart Construction / Price Fetch]
        |
        v
[Stock Check: item_oos detected?]
  └── YES → Trigger Type B Substitution Flow
        |
        v
[Find Substitute Candidate]
  ├── Candidate: different product but same food category
  ├── FODMAP re-validation: candidate must pass (green or yellow-within-threshold)
  ├── No FODMAP-safe candidate found? → ERR_NO_SAFE_SUBSTITUTE
  │     └── Remove item from cart; show "X removed — no safe substitute available"
  └── Candidate found → present to user
        |
        v
[Show Substitution Modal]  ╔══════════════════════════════════╗
                           ║  "Salmon is unavailable.         ║
                           ║   Replace with Chicken Breast?"  ║
                           ║  [View Details]  [Decline]       ║
                           ║  [✓ Confirm Replacement]         ║
                           ╚══════════════════════════════════╝
        |
        ├── User taps Decline
        │     └── Item removed from cart; user notified; plan summary updated
        │
        └── User taps Confirm
              |
              v
        [Apply Substitution]
          ├── Swap item in shopping list
          ├── Recalculate subtotal / est. tax / est. total
          ├── Log in adjustments_applied[] with approved_by="user"
          └── Show updated cart with change highlighted
                |
                v
        [Continue to Checkout] (Flow 1)
```

### Key Rules Applied
- **Type B auto-apply is strictly prohibited** — code must enforce user confirmation
- FODMAP validation required on every substitute candidate
- Every substitution must be logged in `adjustments_applied[]`
- Multiple OOS items: modal shown sequentially per item

---

## Flow 4 — Scheduled Alert Fires → Recipe Card Shown → Cooking Mode Activated

> **Priority**: P1 (Phase 2)

### Description
At a scheduled meal time, the system sends a push notification. The user opens it and activates step-by-step cooking mode.

### Flow Diagram

```
[Scheduled Meal Time Reached]
  (e.g., 7:30 AM — Breakfast Day 2)
        |
        v
[Push Notification Sent]
  ┌─────────────────────────────────────┐
  │  🍽  GutFlow                     │
  │  "Time for Breakfast!               │
  │   Quinoa Porridge with Blueberries" │
  │  [View Recipe]                      │
  └─────────────────────────────────────┘
        |
        v
[User taps notification]
        |
        v
[Recipe Card Screen]
  ├── Recipe name + FODMAP score badge
  ├── Estimated cook time
  ├── Servings (scaled to people count)
  ├── Ingredients list with quantities
  ├── Estimated cost (from cached plan)
  └── [Start Cooking] button
        |
        v
[Cooking Mode Activated]
  ├── Full-screen step-by-step view
  ├── Steps shown one at a time (swipe to advance)
  ├── Each step: action text + optional timer
  ├── Timer: start/pause/reset per step
  └── On final step: "🎉 Meal complete! Enjoy your food."
        |
        v
[Post-Cook Options]
  ├── [Log as eaten] → mark meal done in plan tracker
  ├── [Skip] → meal stays unlogged
  └── [Return to Plan] → back to meal plan view
```

### Notes
- Notification scheduling requires user permission (iOS/Android push consent flow)
- Cooking mode activated from notification OR directly from meal plan card
- Notification time configurable per meal (Breakfast / Lunch / Dinner defaults customizable)
- Stub implementation in Phase 1; full implementation in Phase 2
- Cooking mode must remain FODMAP-context-aware (no non-FODMAP ingredient shown in steps)

### Key Rules Applied
- Recipe steps must only display ingredients already validated as FODMAP-safe
- No new ingredients introduced in cooking mode steps
- Schedule persistence: stored in Supabase; synced per device

---

## Flow Cross-Reference Summary

| Flow | Priority | Trigger | End State |
|---|---|---|---|
| Flow 1 | P0 | User opens app | Checkout initiated |
| Flow 2 | P0 | Budget exceeded | Adjusted plan confirmed |
| Flow 3 | P0 | Item OOS detected | Cart updated with approved substitute |
| Flow 4 | P1 | Scheduled meal alert | Meal cooked and optionally logged |

---

*End of USER_FLOWS.md — Agent A, GutFlow*

---

## ⚙️ Phase 2 Technical Flows — Meal Planning Engine

> **Status**: Planned · **Decision date**: 2026-02-20
> **Key APIs**: Spoonacular (레시피) · Walmart/Kroger/Instacart (재고) · Custom (변환 엔진)

---

## Flow 5 — Recipe Fetch → Ingredient Scaling → Volume Conversion → Cart List

> **Priority**: P0 (Meal Plan MVP 핵심 경로)

### 5-1. Spoonacular API 연동

```
[User sets preferences]
  (people: N, duration: D days, budget: $B, diet: Low-FODMAP)
         |
         v
[Spoonacular API: GET /recipes/complexSearch]
  params:
    diet=fodmap          ← FODMAP 필터
    number=D*3           ← 일수 × 3끼
    instructionsRequired=true
    fillIngredients=true
    addRecipeNutrition=true
         |
         v
[Spoonacular API: GET /recipes/{id}/servings?servings=N]
  ← Servings Scaling 자체 지원
  Response: { ingredients: [{ name, amount, unit, image }], ... }
         |
         v
[FODMAP Double-Check]  ← master_validator.py 재검증 (Strict Exclude List)
  ├── PASS → proceed
  └── FAIL → remove recipe → fetch replacement
```

### 5-2. Ingredient → Density → Weight/Volume Conversion

```
[Raw ingredient from Spoonacular]
  e.g., { name: "chicken breast", amount: 1.5, unit: "lb" }
         |
         v
[Unit Normalization]
  ├── 이미 weight 단위(lb/oz/g/kg)? → 그대로 사용
  ├── volume 단위(cup/tbsp/tsp/ml)? → Density Table 조회
  │     e.g., "1 cup of rice" → (rice density: 0.85 g/ml) × 236ml = 201g
  └── count 단위(piece/clove/stalk)? → Average Weight Table 조회
        e.g., "2 cloves garlic" → 2 × 3g = 6g
         |
         v
[Density / Conversion Tables]
  ┌─────────────────────────────────────────────┐
  │  USDA FoodData + Monash density reference   │
  │  engine-room/density_table.json             │
  │  구조: { "rice": { "g_per_ml": 0.85, ... } }│
  └─────────────────────────────────────────────┘
         |
         v
[Standardized Output]
  { name: "Chicken Breast", weight_g: 680, display: "1.5 lb", servings: N }
```

### 5-3. Shopping List Aggregation

```
[All recipes for D days × N people]
         |
         v
[Ingredient Merge & Deduplication]
  ├── 동일 재료 합산: "rice 200g" × 3끼 = 600g
  ├── 단위 통일: g 기준 정규화 후 display unit으로 재변환
  └── 소분 기준 적용: 판매 단위로 올림
        e.g., 680g → "1× Chicken Breast 1lb pack"
         |
         v
[Final Shopping List]
  [{ ingredient: "Lundberg White Rice", qty: 2, unit: "5lb bag", est_price: $5.98 }]
```

---

## Flow 6 — Shopping List → Grocery API Matching → Cart Build

> **Priority**: P0 (Meal Plan MVP 핵심 경로)

### 6-1. Ingredient → Store Product Matching

```
[Shopping List Item]
  e.g., { name: "Chicken Breast", weight_g: 680 }
         |
         v
[Walmart Affiliate API / Kroger API Search]
  GET /products/search?query="Chicken Breast"&store_id=...
         |
         v
[Matching Algorithm]
  ┌──────────────────────────────────────────────────────┐
  │  Step 1: Name similarity score (fuzzy match)         │
  │  Step 2: Weight fit score                            │
  │    → 가장 가까운 상위 판매 단위 선택                  │
  │    → e.g., 필요 680g → "Tyson 1.5lb (680g)" 선택    │
  │  Step 3: FODMAP safe? (no additives in exclude list) │
  │  Step 4: In stock? (is_stock=true filter)            │
  │  Step 5: 최저가 우선 정렬                            │
  └──────────────────────────────────────────────────────┘
         |
         v
[Matched Product]
  { product_id, name: "Tyson Boneless Chicken Breast 1.5lb",
    price: $6.98, store: "walmart", in_stock: true,
    matched_weight_g: 680, overshoot_g: 0 }
         |
         v
[Budget Check]  ← budget_engine.py
  ├── WITHIN budget → Cart confirmed
  └── OVER budget → Trigger Flow 2 (재플래닝) or cheaper brand swap (Tier 1)

```

### 6-2. Cart Generation & Deep Link

```
[Confirmed Cart Items]
         |
         v
[Walmart Cart Deep Link]
  https://www.walmart.com/cart?items=product_id_1:qty,product_id_2:qty
  + affiliate tag 자동 추가

[Kroger Cart Deep Link]
  https://www.kroger.com/cart → Kroger API addToCart()

         |
         v
[User Cart Review Screen]
  ├── 항목별: Product name · qty · unit price · subtotal
  ├── Merged subtotal / Est. Tax 8.5% / Est. Total
  ├── "Prices confirmed at checkout" 안내
  └── [Checkout at Walmart →] / [Checkout at Kroger →]
```

---

## Flow 7 — Meal Plan View → IKEA-Style Infographic Cooking Guide

> **Priority**: P1 (Phase 2)

### 7-1. Meal Plan Time View

```
[Day View — e.g., Day 1]
  ┌─────────────────────────────────────────────┐
  │  🌅 Breakfast  07:30  Quinoa Porridge        │
  │  ☀️ Lunch      12:00  GF Penne with Tofu    │
  │  🌙 Dinner     18:30  Baked Salmon + Rice    │
  └─────────────────────────────────────────────┘
  각 카드: recipe name · cook time · FODMAP score badge · cost
  [▶ Start Cooking] 버튼 → Flow 7-2
```

### 7-2. IKEA-Style Infographic Cooking Mode

> **디자인 원칙**: 글자 없는 그림 + 최소 텍스트. 이케아 설명서 느낌.

```
[Recipe Step Screen]

  ┌──────────────────────────────────────────┐
  │  Step 2 / 6                              │
  │                                          │
  │  [냄비 SVG] ──→ [물 아이콘] ──→ [불꽃]  │
  │                                          │
  │  ████████████░░░░  8 min                 │
  │  (예상 조리 시간 Bar)                     │
  │                                          │
  │  ← Prev            Next →               │
  └──────────────────────────────────────────┘
```

**SVG 아이콘 세트** (IKEA 스타일 — 단순 선화, 동일 stroke 두께):

| 아이콘 | 파일명 | 사용 단계 |
|:---|:---|:---|
| 🔪 칼 + 도마 | `icon-chop.svg` | 재료 썰기 |
| 🥣 그릇 + 저울 | `icon-measure.svg` | 계량 |
| 🫕 냄비 | `icon-pot.svg` | 끓이기/삶기 |
| 🍳 프라이팬 | `icon-pan.svg` | 볶기/굽기 |
| 🔥 불꽃 | `icon-heat.svg` | 가열 강도 |
| ⏱ 타이머 | `icon-timer.svg` | 시간 대기 |
| 🥄 수저 | `icon-stir.svg` | 섞기 |
| ❄️ 냉장고 | `icon-chill.svg` | 냉각/보관 |
| 🍽 접시 | `icon-plate.svg` | 플레이팅/완성 |

**시간 바 (Time Bar)**:
```
총 조리시간 = Σ(각 step 예상 시간)
각 step bar = step_time / total_time × 100%

예시:
  Step 1: 계량     ░  2min
  Step 2: 끓이기   ████████  8min
  Step 3: 볶기     ███  3min
  Step 4: 플레이팅 ░  1min
```

### 7-3. 데이터 스케일링 전략

```
초반 테스트: 10개 레시피로 완벽 검증
  ├── 각 카테고리 대표 1개씩:
  │   Breakfast(2) · Lunch(4) · Dinner(4)
  ├── 모든 변환 로직(Density, Unit) 수동 검증
  ├── Walmart 매칭 품질 확인 (정밀도 ≥ 90%)
  └── FODMAP 통과율 확인

확장: 50 → 200 → Spoonacular 전체
  └── 매칭 알고리즘을 ML 기반으로 개선 고려
```

---

## 기술 스택 결정 요약

| 영역 | 선택 | 근거 |
|:---|:---|:---|
| 레시피 DB | **Spoonacular API** | 36만 레시피, Servings Scaling 내장, 재료 단위 세분화 |
| 재고/가격 | **Walmart Affiliate API + Kroger API** | 실재고 확인 + 장바구니 딥링크 |
| 대안 | Instacart API | 멀티 소매점 통합 (향후 추가) |
| 변환 엔진 | **Custom Python (density_table.json)** | USDA 기반 밀도 테이블 자체 구축 |
| 인포그래픽 UI | **SVG 아이콘 + CSS 애니메이션** | 이케아 스타일 선화, 글자 최소화 |

---

*Updated: 2026-02-20 — Phase 2 Tech Decision*

