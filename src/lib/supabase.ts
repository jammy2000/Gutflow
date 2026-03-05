/**
 * src/lib/supabase.ts — GutFlow Supabase Client
 *
 * Singleton browser/server client.
 * Uses NEXT_PUBLIC_* env vars so it works on both client and server components.
 * For server-side admin operations, use the service role key (never expose to client).
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
}

// ─── Database Types ────────────────────────────────────────────────────────
export type FodmapTier = "green" | "yellow" | "red";
export type Retailer = "walmart" | "kroger" | "both";
export type FulfillmentMode = "delivery" | "pickup";
export type PlanStatus = "draft" | "confirmed" | "ordered";
export type SubstitutionType = "TypeA" | "TypeB";

export interface PriceCache {
    id: string;
    product_id: string;
    store: "walmart" | "kroger";
    name: string;
    current_price: number;
    original_price: number | null;
    sale_event: string | null;
    stock_status: string;
    upc: string | null;
    ingredients_raw: string | null;
    fetched_at: string;
}

export interface MealPlan {
    id: string;
    user_id: string | null;
    duration_days: 1 | 2 | 3 | 5 | 7;
    people: 1 | 2 | 3 | 4;
    diet_type: string[];
    retailer: Retailer;
    fulfillment_mode: FulfillmentMode;
    budget_usd: number;
    zip_code: string | null;
    estimate_mode: boolean;
    status: PlanStatus;
    created_at: string;
    updated_at: string;
}

export interface ShoppingList {
    id: string;
    meal_plan_id: string;
    retailer: Retailer;
    estimate_mode: boolean;
    subtotal: number;
    tax_buffer: number;
    est_total: number;
    created_at: string;
}

export interface ShoppingItem {
    id: string;
    shopping_list_id: string;
    name: string;
    total_quantity: string;
    unit: string;
    price_per_unit: number;
    total_price: number;
    fodmap_tier: FodmapTier;
    in_stock: boolean;
    product_id: string | null;
}

export interface AuditLog {
    id: string;
    meal_plan_id: string | null;
    type: SubstitutionType;
    original: string;
    replacement: string;
    reason: string;
    approved_by: "auto" | "user";
    created_at: string;
}

export interface FoodAnalysisLog {
    id: number;
    created_at: string;
    product_name: string | null;
    ingredients: string | null;
    recommendation: string | null;
    is_safe: boolean | null;
}

// ─── Price Cache Helpers ───────────────────────────────────────────────────
export const PRICE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function isCacheStale(fetchedAt: string): boolean {
    return Date.now() - new Date(fetchedAt).getTime() > PRICE_CACHE_TTL_MS;
}

// ─── Singleton Client ──────────────────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
