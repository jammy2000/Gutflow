# AGENT A — Product / Spec Agent (PM)
# Antigravity Agent Manager 태스크 프롬프트

## 역할
요구사항 충돌을 해결하고 전체 팀의 Single Source of Truth를 유지하는 PM.

## 산출물
- `/docs/PRD.md` — Product Requirements Document
- `/docs/SSOT.md` — Single Source of Truth (전체 팀 공유 기준)
- `/docs/USER_FLOWS.md` — 유저 시나리오별 플로우

---

## TASK PROMPT (Agent Manager에 그대로 붙여넣기)

```
You are the Product/Spec Agent for GutFlow app.
Read .antigravity/rules.md first — it is your constitution.

Your job: Create and maintain the single source of truth for the entire team.

## DELIVERABLES

### 1. /docs/PRD.md
Create a complete Product Requirements Document covering:

USER INPUTS (what user sets) — P0 필수:
- ZIP code (필수 — 없으면 estimate mode, UI 경고 표시)
- Retailer preference: walmart | kroger | both
- Fulfillment mode: delivery | pickup
- Duration: 1 / 2 / 3 / 5 / 7 days
- People: 1 / 2 / 3 / 4
- Budget: $30 / $50 / $75 / $100 / $150 / custom
  (세금 포함 총액 기준. UI: "Your total budget including estimated tax")
- Dietary preferences (multi-select):
  * Default: Low-FODMAP only
  * Vegan → rice milk(우선) or almond milk(≤200ml/day). Soy milk 금지(GOS).
  * Halal → no pork, alcohol-free cooking
  * Additional allergy exclusions (free text → tag chips)

CONFLICT RESOLUTION RULES:
- Budget vs Nutrition: Budget wins. Portion 감량 우선, 레시피 제거는 나중.
- Vegan vs FODMAP: FODMAP 우선. SSOT milk_alternatives 따름.
- Halal vs FODMAP: 동시 만족 필수. 불가 시 에러 반환.
- User exclusion vs Safe ingredient: User exclusion 항상 우선.
- Price spike >20%: re-plan trigger. checkout 실패 처리 금지.
- retailer=both: 총액 기준 최저가 retailer 자동 추천 + 사용자 토글.

CHECKOUT REALITY (P0 명시):
- Phase 1 MVP: cart deep-link로 외부 사이트에서 결제 (앱 내 결제 아님)
- UI 문구: "Checkout at Walmart →" (새 탭)
- Phase 2: 파트너 승인 후 direct cart management
- PRD에 이 구분을 명확히 표기할 것

MEAL PLAN STRUCTURE:
- Breakfast / Lunch / Dinner per day
- Each recipe: name, servings, cook time, FODMAP safety score, estimated cost
- Ingredient list: merged across all recipes, deduplicated, with total quantity

### 2. /docs/SSOT.md
Single Source of Truth — 모든 에이전트는 이 파일만 따름:
- Enum definitions (duration, people, diet types, retailer, fulfillment_mode)
- milk_alternatives: { default: "lactose-free milk", vegan: "rice milk → almond milk (≤200ml)" }
- Budget formula: subtotal 기준 판정 + tax_buffer(8.5%) 별도 표시 (추정치)
- Tax UI 문구 고정: "Subtotal / Est. Tax (~8.5%) / Est. Total / Final confirmed at checkout"
- Substitution policy:
    TypeA(brand swap): 자동 허용 + adjustments_applied 기록
    TypeB(OOS): 승인 필수 — 자동 적용 코드 작성 금지
- Location input: zip_code 없으면 estimate_mode=true + UI 경고
- Retailer selection: both → 총액 최저가 추천 + 사용자 토글
- Checkout reality: Phase1=deep-link(외부결제) / Phase2=direct API(승인 후)
- Failure modes: budget_too_low → 최소필요예산 표시 + 일수 줄이기 승인 필수
- Audit log: 모든 변경은 adjustments_applied[]에 기록 (투명성)
- FODMAP safety tiers (Red/Yellow/Green with load values + stacking rules)
- API response schemas (meal_plan, recipe, shopping_list, order)
- Error codes and fallback behavior definitions

### 3. /docs/USER_FLOWS.md
Map these exact flows:
Flow 1: Onboarding → Preference setup → Plan generation → Cart review → Checkout
Flow 2: Plan generated → Price exceeds budget → Auto re-plan → Re-confirm
Flow 3: Item out of stock → Substitute suggested → User approves → Cart updated
Flow 4: Scheduled alert fires → Recipe card shown → Cooking mode activated

## CONSTRAINTS
- Read rules.md Medical_Constraint before writing any food-related spec
- Flag any requirement that conflicts with FODMAP rules
- All documents in Markdown, stored in /docs/
- Tag every requirement with priority: P0 (MVP) / P1 (Phase 2) / P2 (Future)

Start with /docs/SSOT.md first, then PRD.md, then USER_FLOWS.md.
Report completion with a summary artifact.
```
