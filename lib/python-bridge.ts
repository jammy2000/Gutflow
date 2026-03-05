/**
 * python-bridge.ts
 * Calls Python scripts (master_validator.py, budget_runner.py) via child_process.
 */
import { execFile } from "child_process";
import path from "path";

export interface IngredientEntry {
    name: string;
    grade: "green" | "yellow" | "red";
    load: number;
    category: string | null;
    reason?: string;
    safe_alt?: string;
    portion_note?: string;
    fda_position?: number;
    fda_weight?: number;
}

export interface CategoryBreakdown {
    cat: string;
    items: IngredientEntry[];
    raw_load: number;
    multiplier: number;
    final_load: number;
    has_synergy: boolean;
}

export interface AnalysisResult {
    status: "safe" | "warning" | "stacking" | "danger";
    score: number;
    grade: "green" | "yellow" | "red";
    reds: IngredientEntry[];
    yellows: IngredientEntry[];
    greens: IngredientEntry[];
    flagged: { name: string; warning: string }[];
    unknowns: string[];
    red_load: number;
    yellow_load: number;
    category_breakdown: CategoryBreakdown[];
    portion_items: IngredientEntry[];
    safe_alts: IngredientEntry[];
    fda_weights: Record<string, number>;
    message: string;
}

export interface BudgetAdjustment {
    tier: number;
    item_original: string;
    item_new: string;
    savings: number;
    reason: string;
}

export interface BudgetResult {
    status: "ok" | "adjusted" | "needs_user_input" | "impossible";
    original_total: number;
    final_total: number;
    overage: number;
    adjustments: BudgetAdjustment[];
    tier_reached: number;
    message: string;
}

const PYTHON_TIMEOUT_MS = 8_000;

/**
 * Calls master_validator.py via Python subprocess.
 */
export async function callMasterValidator(
    ingredients: string[],
): Promise<AnalysisResult | null> {
    const VALIDATOR_SCRIPT = path.resolve(process.cwd(), "engine-room", "master_validator.py");
    if (!ingredients.length) return null;

    return new Promise((resolve) => {
        execFile(
            "python",
            [VALIDATOR_SCRIPT, "--json", ...ingredients],
            { cwd: process.cwd(), timeout: PYTHON_TIMEOUT_MS, env: { ...process.env } },
            (error, stdout, stderr) => {
                if (error) {
                    console.warn("[python-bridge] Validator error:", stderr || error.message);
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(stdout.trim()));
                } catch (e) {
                    resolve(null);
                }
            }
        );
    });
}

/**
 * Calls budget_runner.py to reconcile meal plan pricing.
 */
export async function callBudgetEngine(
    items: { name: string; price: number; quantity: number }[],
    budget: number
): Promise<BudgetResult | null> {
    const BUDGET_SCRIPT = path.resolve(process.cwd(), "engine-room", "budget_runner.py");

    return new Promise((resolve) => {
        execFile(
            "python",
            [BUDGET_SCRIPT, JSON.stringify(items), budget.toString()],
            { cwd: process.cwd(), timeout: PYTHON_TIMEOUT_MS },
            (error, stdout, stderr) => {
                if (error) {
                    console.warn("[python-bridge] Budget Engine error:", stderr || error.message);
                    resolve(null);
                    return;
                }
                try {
                    resolve(JSON.parse(stdout.trim()));
                } catch (e) {
                    resolve(null);
                }
            }
        );
    });
}
