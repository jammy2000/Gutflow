-- Enable Row Level Security (RLS) on all tables
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_analysis_logs ENABLE ROW LEVEL SECURITY;

-- 1. Policies for `meal_plans`
-- Authenticated users can only read/write their own meal plans
CREATE POLICY "Users can manage their own meal plans" 
ON meal_plans
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Allow inserting without user_id if we want to support anonymous creation, 
-- but strictly speaking, the prompt asks for "인증된 사용자만 자기 데이터를 읽고 쓸 수 있게".
-- If anonymous creation is needed later, we can add a separate policy.

-- 2. Policies for `shopping_lists`
-- Users can access shopping lists if they own the parent meal_plan
CREATE POLICY "Users can manage shopping lists for their meal plans" 
ON shopping_lists
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM meal_plans 
    WHERE meal_plans.id = shopping_lists.meal_plan_id 
    AND meal_plans.user_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meal_plans 
    WHERE meal_plans.id = shopping_lists.meal_plan_id 
    AND meal_plans.user_id::text = auth.uid()::text
  )
);

-- 3. Policies for `shopping_items`
-- Users can access items via the shopping list -> meal plan chain
CREATE POLICY "Users can manage shopping items via their shopping lists" 
ON shopping_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shopping_lists
    JOIN meal_plans ON meal_plans.id = shopping_lists.meal_plan_id
    WHERE shopping_lists.id = shopping_items.shopping_list_id
    AND meal_plans.user_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM shopping_lists
    JOIN meal_plans ON meal_plans.id = shopping_lists.meal_plan_id
    WHERE shopping_lists.id = shopping_items.shopping_list_id
    AND meal_plans.user_id::text = auth.uid()::text
  )
);

-- 4. Policies for `audit_log`
CREATE POLICY "Users can view audit logs for their meal plans" 
ON audit_log
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM meal_plans 
    WHERE meal_plans.id = audit_log.meal_plan_id 
    AND meal_plans.user_id::text = auth.uid()::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM meal_plans 
    WHERE meal_plans.id = audit_log.meal_plan_id 
    AND meal_plans.user_id::text = auth.uid()::text
  )
);

-- 5. Policies for `price_cache`
-- Price cache is generally public or global for reading, but restricted for writing.
-- Here, we allow all authenticated users to read the cache.
CREATE POLICY "Authenticated users can read price cache" 
ON price_cache
FOR SELECT
TO authenticated
USING (true);

-- (Optional: Only service role can insert/update price_cache, which bypasses RLS anyway)

-- 6. Policies for `food_analysis_logs`
-- Assuming this is global logging or analysis results
CREATE POLICY "Authenticated users can read food analysis logs" 
ON food_analysis_logs
FOR SELECT
TO authenticated
USING (true);
