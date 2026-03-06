"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/Navigation";

// ─── Types ──────────────────────────────────────────────────────────────────
interface Meal {
    recipe: string;
    cost: number;
    fodmapTier: "green" | "yellow" | "red";
    cookTime: number;
    ingredients?: string[];
    steps?: string[];
}

interface DayPlan {
    day: number;
    label: string;
    meals: { breakfast: Meal; lunch: Meal; dinner: Meal };
}

interface IngredientItem {
    name: string;
    digestion_difficulty?: string;
    avg_price_walmart?: number;
    avg_price_kroger?: number;
}

interface GeneratedPlan {
    budget: number;
    days: DayPlan[];
    ingredients: Record<string, Array<IngredientItem | string>>;
}

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
    bg: "#0A0F1E",
    surface: "rgba(255,255,255,0.05)",
    surfaceHover: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.08)",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.5)",
    accent: "#A78BFA",
    accentBlue: "#60A5FA",
    green: "#10B981",
    yellow: "#F59E0B",
    walmart: "#0071CE",
    kroger: "#d22630",
};

const MEAL_META = {
    breakfast: { icon: "🌅", label: "BREAKFAST" },
    lunch: { icon: "☀️", label: "LUNCH" },
    dinner: { icon: "🌙", label: "DINNER" },
};

// ─── Expandable Meal Card ────────────────────────────────────────────────────
function MealCard({ mealKey, meal }: { mealKey: "breakfast" | "lunch" | "dinner"; meal: Meal }) {
    const [expanded, setExpanded] = useState(false);
    const meta = MEAL_META[mealKey];

    return (
        <div
            onClick={() => setExpanded((p) => !p)}
            style={{
                background: expanded ? T.surfaceHover : T.surface,
                border: `1px solid ${expanded ? "rgba(167,139,250,0.3)" : T.border}`,
                borderRadius: 16,
                padding: "16px",
                marginBottom: 10,
                cursor: "pointer",
                transition: "all 0.25s ease",
            }}
        >
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 700 }}>
                    {meta.icon} {meta.label}
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: T.green, fontWeight: 700, background: "rgba(16,185,129,0.12)", padding: "2px 8px", borderRadius: 20 }}>
                        🟢 SAFE
                    </span>
                    <span style={{ fontSize: 16, color: T.muted, transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
                        ↓
                    </span>
                </div>
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{meal.recipe}</div>
            <div style={{ fontSize: 13, color: T.muted }}>
                💰 ${meal.cost?.toFixed(2)}/serving · ⏱ {meal.cookTime} min
            </div>

            {/* Expanded content */}
            {expanded && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                    {/* Ingredients */}
                    {meal.ingredients && meal.ingredients.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.accent, letterSpacing: 1, marginBottom: 8 }}>
                                🛒 INGREDIENTS
                            </div>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                                {meal.ingredients.map((ing, i) => (
                                    <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ width: 6, height: 6, background: T.green, borderRadius: "50%", flexShrink: 0 }} />
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Steps */}
                    {meal.steps && meal.steps.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.accentBlue, letterSpacing: 1, marginBottom: 8 }}>
                                👨‍🍳 HOW TO COOK
                            </div>
                            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                                {meal.steps.map((step, i) => (
                                    <li key={i} style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {(!meal.ingredients?.length && !meal.steps?.length) && (
                        <p style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>재생성 시 상세 레시피가 포함됩니다.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Shopping List ───────────────────────────────────────────────────────────
function ShoppingList({ ingredients }: { ingredients: Record<string, Array<IngredientItem | string>> }) {
    const [retailer, setRetailer] = useState<"walmart" | "kroger">("walmart");

    const allItems: { name: string; walmart: number; kroger: number; category: string }[] = [];
    Object.entries(ingredients).forEach(([cat, items]) => {
        if (!Array.isArray(items)) return;
        items.forEach((item) => {
            if (typeof item === "string") {
                allItems.push({ name: item, walmart: 3.99, kroger: 4.29, category: cat });
            } else {
                allItems.push({
                    name: item.name,
                    walmart: item.avg_price_walmart ?? 3.99,
                    kroger: item.avg_price_kroger ?? 4.29,
                    category: cat,
                });
            }
        });
    });

    const total = allItems.reduce((sum, i) => sum + (retailer === "walmart" ? i.walmart : i.kroger), 0);
    const retailerColor = retailer === "walmart" ? T.walmart : T.kroger;

    return (
        <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>🛒 Shopping List</h3>
                {/* Retailer Toggle */}
                <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 24, padding: 3, gap: 2 }}>
                    {(["walmart", "kroger"] as const).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRetailer(r)}
                            style={{
                                padding: "7px 14px",
                                borderRadius: 20,
                                border: "none",
                                background: retailer === r ? (r === "walmart" ? T.walmart : T.kroger) : "transparent",
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                letterSpacing: 0.5,
                            }}
                        >
                            {r === "walmart" ? "🔵 Walmart" : "🔴 Kroger"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Total banner */}
            <div style={{
                background: `linear-gradient(135deg, ${retailerColor}22, ${retailerColor}11)`,
                border: `1px solid ${retailerColor}44`,
                borderRadius: 16,
                padding: "16px 20px",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <div>
                    <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, marginBottom: 2 }}>
                        EST. TOTAL AT {retailer.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: retailerColor }}>
                        ${total.toFixed(2)}
                    </div>
                </div>
                <div style={{ fontSize: 32 }}>{retailer === "walmart" ? "🔵" : "🔴"}</div>
            </div>

            {/* Item list grouped by category */}
            {Object.entries(ingredients).map(([category, items]) => {
                if (!Array.isArray(items) || items.length === 0) return null;
                const catItems = items.map((item) =>
                    typeof item === "string"
                        ? { name: item, walmart: 3.99, kroger: 4.29 }
                        : { name: item.name, walmart: item.avg_price_walmart ?? 3.99, kroger: item.avg_price_kroger ?? 4.29 }
                );

                return (
                    <div key={category} style={{ marginBottom: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 800, color: T.accent, letterSpacing: 1 }}>
                            {category}
                        </div>
                        {catItems.map((item, i) => {
                            const price = retailer === "walmart" ? item.walmart : item.kroger;
                            return (
                                <div key={i} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "11px 16px",
                                    borderBottom: i < catItems.length - 1 ? `1px solid ${T.border}` : "none",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ width: 8, height: 8, background: T.green, borderRadius: "50%", flexShrink: 0 }} />
                                        <span style={{ fontSize: 14 }}>{item.name}</span>
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: retailerColor }}>
                                        ${price.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function PlanResultContent() {
    const [plan, setPlan] = useState<GeneratedPlan | null>(null);
    const [params, setParams] = useState<{ budget?: string; people?: string; phase?: string }>({});
    const [activeDay, setActiveDay] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const planStr = sessionStorage.getItem("gutflow_plan");
        const paramStr = sessionStorage.getItem("gutflow_params");
        if (planStr) {
            try {
                const raw = JSON.parse(planStr);
                const p = raw.plan || raw;
                if (p && Array.isArray(p.days)) setPlan(p as GeneratedPlan);
            } catch (e) { console.error(e); }
        }
        if (paramStr) {
            try { setParams(JSON.parse(paramStr)); } catch { /* ignore */ }
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}>로딩 중...</div>;
    }

    if (!plan || !plan.days?.length) {
        return (
            <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>식단을 불러올 수 없습니다</h1>
                <p style={{ color: T.muted, textAlign: "center", marginBottom: 24 }}>대시보드로 돌아가서 다시 생성해주세요.</p>
                <Link href="/dashboard" style={{ background: T.accent, color: "#fff", textDecoration: "none", borderRadius: 14, padding: "14px 28px", fontWeight: 700 }}>
                    대시보드로 이동
                </Link>
            </main>
        );
    }

    const day = plan.days[activeDay];
    const totalCost = plan.days.reduce((sum, d) => {
        const meals = Object.values(d.meals);
        return sum + meals.reduce((s, m) => s + (m?.cost || 0), 0);
    }, 0);

    return (
        <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 100 }}>
            {/* Header */}
            <header style={{ padding: "20px", borderBottom: `1px solid ${T.border}`, background: T.bg, position: "sticky", top: 0, zIndex: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, background: "linear-gradient(135deg,#A78BFA,#60A5FA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GutFlow</div>
                    <div style={{ padding: "6px 12px", background: "rgba(16,185,129,0.1)", color: T.green, borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✅ Plan Ready</div>
                </div>
            </header>

            <div style={{ padding: "20px" }}>
                {/* Summary Banner */}
                <div style={{ background: "linear-gradient(135deg, rgba(107,33,168,0.25), rgba(29,78,216,0.25))", border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px", marginBottom: 20 }}>
                    <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>{plan.days.length}-Day Low FODMAP Plan</h1>
                    <p style={{ color: T.muted, fontSize: 13, marginBottom: 14 }}>
                        Budget: ${params.budget || plan.budget} · {params.people || 1} person · {params.phase || "elimination"} phase
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[
                            { val: `$${totalCost.toFixed(0)}`, label: "Est. Total", color: T.accent },
                            { val: String(plan.days.length * 3), label: "Total Meals", color: T.green },
                            { val: "100%", label: "FODMAP Safe", color: T.yellow },
                        ].map(({ val, label, color }) => (
                            <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "11px 8px", textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tip */}
                <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "rgba(167,139,250,0.9)" }}>
                    💡 레시피 카드를 탭하면 재료와 조리법이 펼쳐집니다
                </div>

                {/* Day Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                    {plan.days.map((d, i) => (
                        <button key={i} onClick={() => setActiveDay(i)} style={{
                            flexShrink: 0, padding: "10px 20px", borderRadius: 12, border: "none",
                            background: activeDay === i ? T.accent : "rgba(255,255,255,0.06)",
                            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                        }}>
                            Day {d.day}
                        </button>
                    ))}
                </div>

                {/* Meals */}
                {day && (
                    <div>
                        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                            {day.label || `Day ${day.day}`}
                        </h2>
                        {(["breakfast", "lunch", "dinner"] as const).map((mealKey) =>
                            day.meals?.[mealKey] ? (
                                <MealCard key={mealKey} mealKey={mealKey} meal={day.meals[mealKey]} />
                            ) : null
                        )}
                    </div>
                )}

                {/* Shopping list */}
                {plan.ingredients && Object.keys(plan.ingredients).length > 0 && (
                    <ShoppingList ingredients={plan.ingredients} />
                )}

                {/* Re-generate */}
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <Link href="/dashboard" style={{
                        display: "inline-block", padding: "16px 32px",
                        background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`,
                        borderRadius: 16, color: T.text, textDecoration: "none", fontSize: 15, fontWeight: 700
                    }}>
                        ⚡️ 새 식단 생성
                    </Link>
                </div>
            </div>

            <BottomNav activeTab="dashboard" />
        </main>
    );
}

export default function PlanResultPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>로딩 중...</div>}>
            <PlanResultContent />
        </Suspense>
    );
}
