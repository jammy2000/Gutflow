# AGENT E — App UX Agent (Frontend)
# Antigravity Agent Manager 태스크 프롬프트

## 역할
온보딩부터 주문 완료까지 전체 화면 흐름 구현.
"버튼 한 번으로 주문" UX 실현.
Agent C, D 완료 후 착수.

## 산출물
- Next.js 14 App Router 기반 전체 화면
- `/components/` — 재사용 컴포넌트
- `/app/` — 페이지 라우팅

---

## TASK PROMPT

```
You are the App UX Agent for GutFlow app.
Read rules.md, /docs/SSOT.md, /docs/USER_FLOWS.md before starting.
Stack: Next.js 14 App Router + Tailwind CSS + Shadcn/ui.

## SCREEN FLOWS

### Screen 1: Onboarding (/onboarding)
- App logo + tagline: "Eat well with IBS. No guesswork."
- 3 steps: Diet setup → Budget → People & Duration
- Progress bar at top
- CTA: "Generate My Plan →"
- Store to Supabase user profile on completion

### Screen 2: Preference Input (/setup)
Components needed:
```tsx
// DietSelector: multi-select pills
const DIET_OPTIONS = [
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
  { id: 'halal', label: 'Halal', icon: '☪️' },
  { id: 'extra_exclude', label: '+ Add exclusion', icon: '➕' },
]

// BudgetSlider: $30 → $200, snap to presets
const BUDGET_PRESETS = [50, 75, 100, 150]

// PeopleSelector: 1-4 with avatar icons
// DurationSelector: 1/2/3/5/7 day pills
// AllergyInput: free text → tag chips
```

### Screen 3: Plan Generation (/generating)
- Full-screen loading state (not a spinner — meaningful)
- Step-by-step progress:
  "🧠 Generating FODMAP-safe recipes..."
  "💰 Checking Walmart prices..."
  "⚖️ Optimizing for your budget..."
  "✅ Plan ready!"
- Estimated wait: 8-15 seconds
- Show sample recipe card while loading (skeleton → reveal)

### Screen 4: Meal Plan Review (/plan/:id)
Layout:
```
[Budget Bar] $87.40 / $100 budget   ██████████░░ 87%
[Retailer Toggle] Walmart ○  Kroger ○

[Day 1 — Monday]
  Breakfast: Lemon Herb Salmon Bowl    $4.20/serving
  Lunch:     Quinoa Veggie Stir-fry   $3.80/serving
  Dinner:    Chicken Rice Bowl        $5.10/serving
  
[Day 2 — Tuesday]
  ...

[Ingredient Summary]
  🥬 Produce:  Spinach, Carrots, Tomatoes...
  🥩 Protein:  Chicken breast (1.2kg), Salmon...
  🛒 Grocery:  Lactose-free milk, GF oats...

[CTA Button — sticky bottom]
  "Add to Walmart Cart — $87.40 →"
```

### Screen 5: Shopping List (/cart/:id)
- Grouped by category (Produce / Meat / Grocery)
- Each item: name, quantity, unit price, FODMAP badge
- Toggle: Walmart | Kroger (prices update in real-time)
- Out-of-stock items: strike-through + "Find substitute" button
- Price change alert: "⚠️ 3 items changed price since plan was made"
- Sticky CTA: "Checkout at Walmart →" (affiliate link)

### Screen 6: Recipe Infographic Card (/recipe/:id)
LARGE TEXT COOKING MODE — optimized for phone propped in kitchen:
```
┌──────────────────────────────────┐
│  🍋 Lemon Herb Salmon Bowl       │
│  Monday Dinner · 25 min · 2 ppl  │
├──────────────────────────────────┤
│  INGREDIENTS          FODMAP: ✅  │
│  • Salmon    200g                │
│  • Spinach   100g                │
│  • Olive oil  2 tbsp             │
│  • Lemon      1 whole            │
├──────────────────────────────────┤
│  STEPS                           │
│                                  │
│  1  Preheat oven to 400°F        │
│                                  │
│  2  Season salmon with           │
│     olive oil + lemon            │
│                                  │
│  3  Bake 15 min                  │
│                                  │
│  4  Sauté spinach 2 min          │
└──────────────────────────────────┘
  ← Previous          Next →
```
Font size: min 18px for ingredients, 22px for steps.

### Screen 7: Notification / Alert
- PWA push notification (Phase 2) → ICS calendar (Phase 1)
- Alert content: "Tonight's dinner: Lemon Herb Salmon 🍋 Tap to see recipe"
- ICS generation: /api/notifications/ics?meal_plan_id={id}

## COMPONENT ARCHITECTURE
```
/components/
├── ui/                    ← Shadcn primitives
├── fodmap/
│   ├── FodmapBadge.tsx    ← Red/Yellow/Green badge
│   ├── RecipeCard.tsx     ← Infographic card
│   ├── IngredientList.tsx ← Categorized list
│   └── CookingMode.tsx    ← Large text mode
├── budget/
│   ├── BudgetBar.tsx      ← Progress bar + retailer toggle
│   ├── PriceTag.tsx       ← Live price display
│   └── CartSummary.tsx    ← Sticky checkout CTA
├── plan/
│   ├── DayCard.tsx        ← Day meal overview
│   ├── MealSlot.tsx       ← Breakfast/Lunch/Dinner slot
│   └── PlanTimeline.tsx   ← Full week view
└── onboarding/
    ├── DietSelector.tsx
    ├── BudgetSlider.tsx
    └── PeopleSelector.tsx
```

## DESIGN TOKENS
```css
:root {
  --color-safe: #10B981;      /* FODMAP safe green */
  --color-caution: #F59E0B;   /* moderate yellow */
  --color-avoid: #EF4444;     /* high FODMAP red */
  --color-bg: #F7F8FA;
  --color-card: #FFFFFF;
  --font-cooking: 22px;       /* large text mode */
  --font-body: 15px;
}
```

## CONSTRAINTS
- Mobile-first (375px base)
- All client components: "use client" directive
- Business logic in /lib/ — NOT in components
- Affiliate checkout opens in new tab
- Loading states on every async action
- Offline: show last cached plan if no network
```
