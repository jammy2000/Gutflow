"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/Navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
    bg: "#F0FDF4",
    surface: "#FFFFFF",
    border: "#D1FAE5",
    text: "#0F2D18",
    muted: "#6B7F74",
    primary: "#16A34A",
    primaryLight: "#22C55E",
    accent: "#F97316",
    accentLight: "#FED7AA",
    yellow: "#FCD34D",
    blue: "#0EA5E9",
    walmart: "#0071CE",
    kroger: "#d22630",
};

const MEAL_META = {
    breakfast: { icon: "🌅", color: "#FDE68A", textColor: "#92400E", label: "Breakfast" },
    lunch: { icon: "☀️", color: "#DCFCE7", textColor: "#166534", label: "Lunch" },
    dinner: { icon: "🌙", color: "#EDE9FE", textColor: "#5B21B6", label: "Dinner" },
};

// ─── Expandable Meal Card ─────────────────────────────────────────────────────
function MealCard({ mealKey, meal }: { mealKey: "breakfast" | "lunch" | "dinner"; meal: Meal }) {
    const [expanded, setExpanded] = useState(false);
    const meta = MEAL_META[mealKey];

    return (
        <div
            onClick={() => setExpanded((p) => !p)}
            style={{
                background: T.surface,
                border: `1px solid ${expanded ? T.primary : T.border}`,
                borderRadius: 18,
                padding: "16px",
                marginBottom: 10,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: expanded ? "0 4px 16px rgba(22,163,74,0.1)" : "0 1px 4px rgba(0,0,0,0.04)",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, background: meta.color, padding: "3px 10px", borderRadius: 20, fontWeight: 800, color: meta.textColor }}>
                        {meta.icon} {meta.label}
                    </span>
                    <span style={{ fontSize: 11, background: "#DCFCE7", color: T.primary, padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>
                        🟢 SAFE
                    </span>
                </div>
                <span style={{ fontSize: 18, color: T.muted, transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                    ⌄
                </span>
            </div>

            <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 5 }}>{meal.recipe}</div>
            <div style={{ display: "flex", gap: 12, fontSize: 13, color: T.muted }}>
                <span>💰 ${meal.cost?.toFixed(2)}/serving</span>
                <span>⏱ {meal.cookTime} min</span>
            </div>

            {/* Expanded */}
            {expanded && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
                    {meal.ingredients && meal.ingredients.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.accent, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                                🛒 Ingredients
                            </div>
                            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                                {meal.ingredients.map((ing, i) => (
                                    <li key={i} style={{ fontSize: 13, color: T.text, display: "flex", alignItems: "flex-start", gap: 8 }}>
                                        <span style={{ width: 6, height: 6, background: T.primary, borderRadius: "50%", flexShrink: 0, marginTop: 5 }} />
                                        {ing}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {meal.steps && meal.steps.length > 0 && (
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.blue, letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>
                                👨‍🍳 How to Cook
                            </div>
                            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                                {meal.steps.map((step, i) => (
                                    <li key={i} style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                    {(!meal.ingredients?.length && !meal.steps?.length) && (
                        <p style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>Tap "Generate My Meal Plan" again for detailed recipes.</p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Shopping List ────────────────────────────────────────────────────────────
function ShoppingList({ ingredients }: { ingredients: Record<string, Array<IngredientItem | string>> }) {
    const [retailer, setRetailer] = useState<"walmart" | "kroger">("walmart");
    const allItems = Object.entries(ingredients).flatMap(([cat, items]) =>
        (Array.isArray(items) ? items : []).map((item) =>
            typeof item === "string"
                ? { name: item, walmart: 3.99, kroger: 4.29, cat }
                : { name: item.name, walmart: item.avg_price_walmart ?? 3.99, kroger: item.avg_price_kroger ?? 4.29, cat }
        )
    );
    const total = allItems.reduce((s, i) => s + (retailer === "walmart" ? i.walmart : i.kroger), 0);
    const rc = retailer === "walmart" ? T.walmart : T.kroger;

    return (
        <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: T.text }}>🛒 Shopping List</h3>
                <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 30, padding: 3 }}>
                    {(["walmart", "kroger"] as const).map((r) => (
                        <button key={r} onClick={(e) => { e.stopPropagation(); setRetailer(r); }} style={{
                            padding: "7px 14px", borderRadius: 24, border: "none",
                            background: retailer === r ? (r === "walmart" ? T.walmart : T.kroger) : "transparent",
                            color: retailer === r ? "#fff" : T.muted, fontWeight: 800, fontSize: 12,
                            cursor: "pointer", transition: "all 0.2s", fontFamily: "'Nunito', sans-serif"
                        }}>
                            {r === "walmart" ? "🔵 Walmart" : "🔴 Kroger"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Total */}
            <div style={{ background: rc, borderRadius: 18, padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, marginBottom: 2 }}>
                        EST. TOTAL AT {retailer.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: "#fff" }}>${total.toFixed(2)}</div>
                </div>
                <span style={{ fontSize: 36 }}>{retailer === "walmart" ? "🔵" : "🔴"}</span>
            </div>

            {Object.entries(ingredients).map(([category, items]) => {
                if (!Array.isArray(items) || !items.length) return null;
                return (
                    <div key={category} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 900, color: T.primary, letterSpacing: 1, textTransform: "uppercase" }}>
                            {category}
                        </div>
                        {items.map((item, i) => {
                            const name = typeof item === "string" ? item : item.name;
                            const w = typeof item === "string" ? 3.99 : (item.avg_price_walmart ?? 3.99);
                            const k = typeof item === "string" ? 4.29 : (item.avg_price_kroger ?? 4.29);
                            const price = retailer === "walmart" ? w : k;
                            return (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{ width: 8, height: 8, background: T.primary, borderRadius: "50%", flexShrink: 0 }} />
                                        <span style={{ fontSize: 14, color: T.text }}>{name}</span>
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: rc }}>${price.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
        if (paramStr) { try { setParams(JSON.parse(paramStr)); } catch { /**/ } }
        setLoading(false);
    }, []);

    if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.primary, fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>Loading…</div>;

    if (!plan?.days?.length) return (
        <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🥗</div>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>No Meal Plan Yet</h1>
            <p style={{ color: T.muted, textAlign: "center", marginBottom: 24 }}>Head back to the dashboard to generate your personalized plan.</p>
            <Link href="/dashboard" style={{ background: T.primary, color: "#fff", textDecoration: "none", borderRadius: 16, padding: "14px 32px", fontWeight: 900, fontSize: 15 }}>
                Back to Dashboard
            </Link>
        </main>
    );

    const day = plan.days[activeDay];
    const totalCost = plan.days.reduce((s, d) => s + Object.values(d.meals).reduce((ms, m) => ms + (m?.cost || 0), 0), 0);

    return (
        <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>
            {/* Header */}
            <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "18px 20px", position: "sticky", top: 0, zIndex: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 24 }}>🥦</span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: T.primary }}>GutFlow</span>
                    </div>
                    <div style={{ background: "#DCFCE7", color: T.primary, borderRadius: 20, fontSize: 12, fontWeight: 800, padding: "6px 14px" }}>
                        ✅ Plan Ready
                    </div>
                </div>
            </header>

            <div style={{ padding: "20px" }}>
                {/* Summary */}
                <div style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryLight})`, borderRadius: 24, padding: 22, marginBottom: 20, color: "#fff" }}>
                    <h1 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 6px" }}>{plan.days.length}-Day Low FODMAP Plan 🎉</h1>
                    <p style={{ fontSize: 13, margin: "0 0 16px", opacity: 0.85 }}>
                        Budget: ${params.budget || plan.budget} · {params.people || 1} {(params.people || "1") === "1" ? "person" : "people"} · {(params.phase || "elimination")} phase
                    </p>
                    <div style={{ display: "flex", gap: 10 }}>
                        {[
                            { val: `$${totalCost.toFixed(0)}`, label: "Est. Total" },
                            { val: String(plan.days.length * 3), label: "Total Meals" },
                            { val: "100%", label: "FODMAP Safe" },
                        ].map(({ val, label }) => (
                            <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.25)", borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>{val}</div>
                                <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tip */}
                <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 14, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400E", display: "flex", gap: 8, alignItems: "center" }}>
                    <span>💡</span>
                    <span style={{ fontWeight: 700 }}>Tap any meal card to see the full recipe & ingredients</span>
                </div>

                {/* Day Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
                    {plan.days.map((d, i) => (
                        <button key={i} onClick={() => setActiveDay(i)} style={{
                            flexShrink: 0, padding: "10px 22px", borderRadius: 30, border: "none",
                            background: activeDay === i ? T.primary : T.surface,
                            color: activeDay === i ? "#fff" : T.muted, border: activeDay === i ? "none" : `1px solid ${T.border}`,
                            fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "'Nunito', sans-serif",
                        } as React.CSSProperties}>
                            Day {d.day}
                        </button>
                    ))}
                </div>

                {/* Meals */}
                {day && (
                    <div>
                        <h2 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                            📅 {day.label || `Day ${day.day}`}
                        </h2>
                        {(["breakfast", "lunch", "dinner"] as const).map((k) =>
                            day.meals?.[k] ? <MealCard key={k} mealKey={k} meal={day.meals[k]} /> : null
                        )}
                    </div>
                )}

                {/* Shopping List */}
                {plan.ingredients && Object.keys(plan.ingredients).length > 0 && (
                    <ShoppingList ingredients={plan.ingredients} />
                )}

                {/* Regenerate */}
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <Link href="/dashboard" style={{ display: "inline-block", padding: "16px 36px", background: T.surface, border: `2px solid ${T.border}`, borderRadius: 20, color: T.primary, textDecoration: "none", fontSize: 15, fontWeight: 900 }}>
                        ⚡ Generate a New Plan
                    </Link>
                </div>
            </div>

            <BottomNav activeTab="dashboard" />
        </main>
    );
}

export default function PlanResultPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A", fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>Loading…</div>}>
            <PlanResultContent />
        </Suspense>
    );
}
