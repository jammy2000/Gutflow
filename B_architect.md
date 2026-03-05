# AGENT B — Architect Agent
# Antigravity Agent Manager 태스크 프롬프트

## 역할
전체 시스템의 엔티티, DB 스키마, API 설계를 담당.
Agent A 완료 후 착수.

## 산출물
- `/docs/DOMAIN.md` — 도메인 모델 + 엔티티 관계
- `/docs/DB.md` — Supabase 스키마 (SQL 포함)
- `/docs/API.md` — FastAPI 엔드포인트 명세

---

## TASK PROMPT

```
You are the Architect Agent for GutFlow app.
Read .antigravity/rules.md AND /docs/SSOT.md before starting.

## DELIVERABLES

### 1. /docs/DOMAIN.md
Define all domain entities and relationships:

ENTITIES:
- User: id, email, people_count, budget_default, diet_preferences[], allergies[]
- MealPlan: id, user_id, duration_days, people, budget_total, status, created_at
- DayPlan: id, meal_plan_id, day_number, date, meals{breakfast, lunch, dinner}
- Recipe: id, name, fodmap_score, cook_time_min, servings, instructions[], fodmap_validated_at
- Ingredient: id, recipe_id, name, quantity, unit, fodmap_grade(red/yellow/green), category(produce/meat/grocery)
- ShoppingList: id, meal_plan_id, status, total_estimated, total_actual
- ShoppingItem: id, list_id, ingredient_name, quantity, unit, category, walmart_product_id, kroger_product_id, unit_price, is_available
- PriceCache: id, retailer(walmart/kroger), product_id, price, cached_at (TTL: 15min)
- Order: id, user_id, list_id, retailer, affiliate_tag, status, total, placed_at
- Notification: id, user_id, day_plan_id, scheduled_at, type(meal_reminder/cooking_start), sent_at

RELATIONSHIPS:
- User → MealPlan (1:many)
- MealPlan → DayPlan (1:many, day 1 to N)
- DayPlan → Recipe (many:many via DayPlanRecipe)
- Recipe → Ingredient (1:many)
- MealPlan → ShoppingList (1:1)
- ShoppingList → ShoppingItem (1:many)
- ShoppingItem → PriceCache (many:1)

### 2. /docs/DB.md
Write complete Supabase SQL schema:

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  people_count SMALLINT DEFAULT 2 CHECK (people_count BETWEEN 1 AND 4),
  budget_default NUMERIC(8,2),
  diet_preferences TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue all tables with:
-- RLS policies (user can only see their own data)
-- Indexes on foreign keys and frequently queried columns
-- price_cache with TTL check function
-- Triggers: auto-create shopping_list when meal_plan status = 'confirmed'

### 3. /docs/API.md
FastAPI endpoint specifications:

POST /api/meal-plans/generate
  Input: { duration_days, people, budget, diet_preferences, allergies }
  Process: claude-sonnet-4-6 → FODMAP validate → price estimate
  Output: MealPlan with DayPlans and Recipes
  Error: budget_too_low, no_valid_recipes

GET /api/meal-plans/{id}
  Output: Full meal plan with all day plans and recipes

POST /api/meal-plans/{id}/confirm
  Process: Finalize plan → trigger shopping list generation
  Output: ShoppingList with items

GET /api/shopping-lists/{id}
  Output: Shopping list with real-time prices from cache or BlueCart API

POST /api/shopping-lists/{id}/fetch-prices
  Process: BlueCart API → Walmart + Kroger prices → update cache
  Output: Updated shopping list with prices and availability

POST /api/orders
  Input: { list_id, retailer: 'walmart'|'kroger' }
  Process: Build affiliate URL with tagged cart items
  Output: { checkout_url, affiliate_tag, estimated_total }

GET /api/notifications/upcoming
  Output: Next 3 meal reminders for user

-- Include: request/response schemas, error codes, auth headers

## CONSTRAINTS
- All tables must have RLS enabled
- price_cache TTL enforced at DB level via updated_at + application check
- No PII in logs
- API versioning: /api/v1/
- All endpoints require Supabase JWT auth header
```
