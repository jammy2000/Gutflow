"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/Navigation";

// ─── Types ──────────────────────────────────────────────────────────────
interface Meal {
    recipe: string;
    cost: number;
    fodmapTier: "green" | "yellow" | "red";
    cookTime: number;
}

interface DayPlan {
    day: number;
    label: string;
    meals: { breakfast: Meal; lunch: Meal; dinner: Meal };
}

interface GeneratedPlan {
    budget: number;
    days: DayPlan[];
    ingredients: Record<string, Array<{ name: string; digestion_difficulty?: string } | string>>;
}

// ─── Design Tokens ───────────────────────────────────────────────────────
const T = {
    bg: "#0A0F1E",
    surface: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
    text: "#FFFFFF",
    muted: "rgba(255,255,255,0.5)",
    accent: "#A78BFA",
    green: "#10B981",
    yellow: "#F59E0B",
    red: "#EF4444",
};

const TIER_COLOR = { green: T.green, yellow: T.yellow, red: T.red };
const MEAL_ICON = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };

function MealCard({ label, meal }: { label: string; meal: Meal }) {
    const color = TIER_COLOR[meal.fodmapTier] || T.green;
    return (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: T.muted, fontWeight: 700 }}>
                    {MEAL_ICON[label as keyof typeof MEAL_ICON]} {label.toUpperCase()}
                </span>
                <span style={{ fontSize: 12, color, fontWeight: 700, background: `${color}20`, padding: "2px 8px", borderRadius: 20 }}>
                    🟢 SAFE
                </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{meal.recipe}</div>
            <div style={{ fontSize: 13, color: T.muted }}>
                💰 ${meal.cost.toFixed(2)}/serving · ⏱ {meal.cookTime} min
            </div>
        </div>
    );
}

function PlanResultContent() {
    const router = useRouter();
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
                // The API wraps the plan in a `plan` key sometimes
                const p = raw.plan || raw;

                // Normalise: ensure `days` is an array and meals have all three slots
                if (p && Array.isArray(p.days)) {
                    setPlan(p as GeneratedPlan);
                } else {
                    console.error("Unexpected plan format:", p);
                }
            } catch (e) {
                console.error("Failed to parse plan:", e);
            }
        }

        if (paramStr) {
            try { setParams(JSON.parse(paramStr)); } catch { /* ignore */ }
        }

        setLoading(false);
    }, []);

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}>
                로딩 중...
            </div>
        );
    }

    if (!plan || !plan.days || plan.days.length === 0) {
        return (
            <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>식단을 불러올 수 없습니다</h1>
                <p style={{ color: T.muted, textAlign: "center", marginBottom: 24 }}>
                    아직 생성된 식단이 없습니다. 대시보드로 돌아가서 다시 시도해 주세요.
                </p>
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
        <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', sans-serif", paddingBottom: 100 }}>
            {/* Header */}
            <header style={{ padding: "20px", borderBottom: `1px solid ${T.border}`, backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, background: T.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>GutFlow</div>
                    <div style={{ padding: "6px 12px", background: "rgba(16,185,129,0.1)", color: T.green, borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        ✅ Plan Ready
                    </div>
                </div>
            </header>

            <div style={{ padding: "24px 20px" }}>
                {/* Summary Banner */}
                <div style={{ background: "linear-gradient(135deg, rgba(107,33,168,0.3), rgba(29,78,216,0.3))", border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px", marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>
                        {plan.days.length}-Day Low FODMAP Plan
                    </h1>
                    <p style={{ color: T.muted, fontSize: 14, marginBottom: 16 }}>
                        Budget: ${params.budget || plan.budget} · {params.people || 1} person · {params.phase || "elimination"} phase
                    </p>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: T.accent }}>${totalCost.toFixed(0)}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>Est. Total</div>
                        </div>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: T.green }}>{plan.days.length * 3}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>Total Meals</div>
                        </div>
                        <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: T.yellow }}>100%</div>
                            <div style={{ fontSize: 11, color: T.muted }}>FODMAP Safe</div>
                        </div>
                    </div>
                </div>

                {/* Day Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                    {plan.days.map((d, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveDay(i)}
                            style={{
                                flexShrink: 0,
                                padding: "10px 18px",
                                borderRadius: 12,
                                border: "none",
                                background: activeDay === i ? T.accent : "rgba(255,255,255,0.06)",
                                color: activeDay === i ? "#fff" : T.muted,
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                                transition: "all 0.2s",
                            }}
                        >
                            Day {d.day}
                        </button>
                    ))}
                </div>

                {/* Selected Day's Meals */}
                {day && (
                    <div>
                        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, color: T.muted }}>
                            {day.label || `Day ${day.day}`}
                        </h2>
                        {day.meals?.breakfast && <MealCard label="breakfast" meal={day.meals.breakfast} />}
                        {day.meals?.lunch && <MealCard label="lunch" meal={day.meals.lunch} />}
                        {day.meals?.dinner && <MealCard label="dinner" meal={day.meals.dinner} />}
                    </div>
                )}

                {/* Ingredients */}
                {plan.ingredients && Object.keys(plan.ingredients).length > 0 && (
                    <div style={{ marginTop: 32 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>🛒 Shopping List</h3>
                        {Object.entries(plan.ingredients).map(([category, items]) => (
                            <div key={category} style={{ marginBottom: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: T.accent, marginBottom: 10, textTransform: "uppercase" }}>
                                    {category}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {Array.isArray(items) && items.map((item, i) => {
                                        const name = typeof item === "string" ? item : item.name;
                                        return (
                                            <span key={i} style={{ background: "rgba(255,255,255,0.06)", padding: "4px 12px", borderRadius: 20, fontSize: 13, color: T.text }}>
                                                {name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Re-generate */}
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <Link
                        href="/dashboard"
                        style={{ display: "inline-block", padding: "16px 32px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, color: T.text, textDecoration: "none", fontSize: 15, fontWeight: 700 }}
                    >
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
