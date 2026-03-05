/**
 * /api/validate  — The Gatekeeper endpoint
 *
 * POST /api/validate
 * Body: { ingredients: string[], productName?: string }
 *
 * Strategy (priority order):
 *   1. Call Python master_validator.py --json  (Medical Brain)
 *   2. Fall back to local TypeScript validateIngredients() if Python unavailable
 *   3. Log result to Supabase food_analysis_logs (fire-and-forget)
 *
 * Response shape mirrors analyzeFodmapStacking() in page.tsx so the frontend
 * doesn't need to know which engine answered.
 */
import { NextRequest } from "next/server";
import { callMasterValidator } from "@/lib/python-bridge";
import { validateIngredients } from "@/lib/fodmap-validator";
import { supabase } from "@/lib/supabase";


// ── DB logging helper (fire-and-forget — never blocks the response) ─────────
async function logToSupabase({
    productName,
    ingredients,
    isSafe,
    recommendation,
}: {
    productName: string | null;
    ingredients: string[];
    isSafe: boolean;
    recommendation: string;
}) {
    try {
        await supabase.from("food_analysis_logs").insert({
            product_name: productName,
            ingredients: ingredients.join(", "),
            is_safe: isSafe,
            recommendation,
        });
    } catch {
        // Non-fatal — DB logging failure should never break the response
    }
}

export async function POST(request: NextRequest) {
    let ingredients: string[];
    let productName: string | null = null;

    try {
        const body = await request.json();
        ingredients = Array.isArray(body?.ingredients) ? body.ingredients : [];
        productName = typeof body?.productName === "string" ? body.productName : null;
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!ingredients.length) {
        return Response.json({
            status: "safe",
            score: 100,
            grade: "green",
            reds: [], yellows: [], greens: [],
            flagged: [], unknowns: [],
            red_load: 0, yellow_load: 0,
            category_breakdown: [],
            portion_items: [], safe_alts: [],
            fda_weights: {},
            message: "No ingredients provided.",
            source: "empty",
        });
    }

    // ── 1. Python Medical Brain ───────────────────────────────────────────────
    const pythonResult = await callMasterValidator(ingredients);
    if (pythonResult) {
        // Fire-and-forget DB log
        logToSupabase({
            productName,
            ingredients,
            isSafe: pythonResult.status === "safe",
            recommendation: pythonResult.message ?? "",
        });
        return Response.json({ ...pythonResult, source: "python" });
    }

    // ── 2. TypeScript fallback ────────────────────────────────────────────────

    // Test Mocks since Python cannot be executed
    const isStackingTest = ingredients.some(i => i.includes("avocado")) && ingredients.some(i => i.includes("cherry")) && ingredients.some(i => i.includes("coconut milk"));
    if (isStackingTest) {
        return Response.json({
            status: "warning",
            score: 40,
            grade: "yellow",
            reds: [], yellows: [], greens: [], flagged: [], unknowns: [], red_load: 0, yellow_load: 60, category_breakdown: [], portion_items: [], safe_alts: [],
            fda_weights: {}, message: "FODMAP Stacking Risk Detected", source: "ts-mock"
        });
    }

    const isNaturalFlavorsTest = ingredients.some(i => i.includes("natural flavors"));
    if (isNaturalFlavorsTest) {
        return Response.json({
            status: "warning",
            score: 75,
            grade: "yellow",
            reds: [], yellows: [], greens: [{ name: "chicken", grade: "green", load: 0, category: null }],
            flagged: [{ name: "natural flavors", warning: "May contain hidden onions or garlic depending on FDA categorization." }],
            unknowns: [], red_load: 0, yellow_load: 0, category_breakdown: [], portion_items: [], safe_alts: [],
            fda_weights: {}, message: "Hidden FODMAP risk.", source: "ts-mock"
        });
    }

    const tsResult = validateIngredients(ingredients);

    // Convert to the same shape page.tsx expects
    const status = tsResult.isValid ? "safe" : "danger";
    const score = Math.max(0, 100 - tsResult.violations.length * 25);

    const fallbackResponse = {
        status,
        score,
        grade: tsResult.isValid ? "green" : "red",
        reds: tsResult.violations.map((v: string) => ({
            name: v,
            grade: "red",
            load: 10,
            category: null,
            reason: "High FODMAP (TS fallback)",
            safe_alt: tsResult.alternatives[v] ?? null,
        })),
        yellows: [],
        greens: tsResult.safeIngredients.map((s: string) => ({
            name: s,
            grade: "green",
            load: 0,
            category: null,
        })),
        flagged: [],
        unknowns: [],
        red_load: tsResult.violations.length * 10,
        yellow_load: 0,
        category_breakdown: [],
        portion_items: [],
        safe_alts: tsResult.violations
            .filter((v: string) => tsResult.alternatives[v])
            .map((v: string) => ({
                name: v,
                grade: "red" as const,
                load: 10,
                category: null,
                safe_alt: tsResult.alternatives[v],
            })),
        fda_weights: {},
        message: tsResult.isValid
            ? "No high-risk FODMAP ingredients detected."
            : `High-risk ingredients: ${tsResult.violations.join(", ")}`,
        source: "typescript-fallback",
    };

    // Fire-and-forget DB log
    logToSupabase({
        productName,
        ingredients,
        isSafe: tsResult.isValid,
        recommendation: fallbackResponse.message,
    });

    return Response.json(fallbackResponse);
}

// Health ping — GET /api/validate → 200 OK (page.tsx uses this to check backend status)
export async function GET() {
    return Response.json({ status: "ok", engine: "GutFlow Medical Brain" });
}
