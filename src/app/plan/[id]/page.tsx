"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BudgetBar } from "@/components/budget/BudgetBar";
import { DayCard } from "@/components/plan/DayCard";
import { CartSummary } from "@/components/budget/CartSummary";
import { useRouter, useParams, notFound } from "next/navigation";
import { supabase, MealPlan } from "@/lib/supabase";

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BudgetBar } from "@/components/budget/BudgetBar";
import { DayCard } from "@/components/plan/DayCard";
import { CartSummary } from "@/components/budget/CartSummary";
import { useRouter, useParams } from "next/navigation";
import { supabase, MealPlan } from "@/lib/supabase";

const CATEGORY_ICONS: Record<string, string> = {
    "Greens": "🥬",
    "Proteins": "🥩",
    "Gut-Soothers": "🍵",
    "produce": "🥬",
    "protein": "🥩",
    "grocery": "🛒"
};

// Minimal TypeScript interface for the Gemini JSON structure we expect
interface GeneratedPlan {
    budget: number;
    days: Array<{
        day: number;
        label: string;
        meals: {
            breakfast: { recipe: string; cost: number; fodmapTier: "green" | "yellow" | "red"; cookTime: number };
            lunch: { recipe: string; cost: number; fodmapTier: "green" | "yellow" | "red"; cookTime: number };
            dinner: { recipe: string; cost: number; fodmapTier: "green" | "yellow" | "red"; cookTime: number };
        };
    }>;
    ingredients: Record<string, Array<{ name: string; digestion_difficulty?: string } | string>>;
}

export default function PlanPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const [retailer, setRetailer] = useState<"walmart" | "kroger">("walmart");

    const [plan, setPlan] = useState<MealPlan | null>(null);
    const [generatedData, setGeneratedData] = useState<GeneratedPlan | null>(null);
    const [spent, setSpent] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (!id || id === "demo") {
                setLoading(false);
                return;
            }

            // Fetch Plan
            const { data: planData, error: planError } = await supabase
                .from("meal_plans")
                .select("*")
                .eq("id", id)
                .single();

            if (planError) {
                console.error("Failed to load plan:", planError);
            } else if (planData) {
                setPlan(planData);
                if (planData.generated_plan) {
                    setGeneratedData(planData.generated_plan as unknown as GeneratedPlan);
                }
            }

            // Fetch Shopping List Total
            const { data: listData } = await supabase
                .from("shopping_lists")
                .select("subtotal, retailer")
                .eq("meal_plan_id", id)
                .single();

            if (listData) {
                // If we persisted a shopping list, use its subtotal as the "spent" amount
                setSpent(listData.subtotal);
                setRetailer(listData.retailer as "walmart" | "kroger");
            } else if (planData?.generated_plan) {
                // Fallback: Calculate from meal recipes manually if DB list is missing
                const gen = planData.generated_plan as unknown as GeneratedPlan;
                const calculatedSpent = gen.days.reduce(
                    (sum, d) => sum + Object.values(d.meals).reduce((s, m) => s + m.cost, 0),
                    0
                );
                setSpent(calculatedSpent);
            }

            setLoading(false);
        }
        loadData();
    }, [id]);

    const handleRecipeClick = (meal: string, recipe: string) => {
        router.push(`/recipe/${id}?name=${encodeURIComponent(recipe)}&meal=${meal}`);
    };

    if (loading) {
        return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>AI가 당신의 식도를 위한 재료를 선별 중입니다...</div>;
    }

    if (!generatedData) {
        return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Plan is still generating... please refresh or try again.</div>;
    }

    const displayBudget = plan ? plan.budget_usd : generatedData.budget;
    const planDuration = plan ? plan.duration_days : generatedData.days.length;

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#F7F8FA",
                fontFamily: "'Inter', -apple-system, sans-serif",
                paddingBottom: 140,
            }}
        >
            {/* Nav */}
            <nav
                style={{
                    background: "#fff",
                    borderBottom: "1px solid #E8ECF0",
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Link
                    href="/"
                    style={{
                        fontSize: 18,
                        fontWeight: 900,
                        background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textDecoration: "none",
                    }}
                >
                    GutFlow
                </Link>
                <Link
                    href={`/cart/${id}`}
                    style={{
                        marginLeft: "auto",
                        padding: "8px 16px",
                        borderRadius: 10,
                        background: "#6B21A8",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        textDecoration: "none",
                    }}
                >
                    View Cart →
                </Link>
            </nav>

            <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
                {/* Budget bar with retailer toggle */}
                <BudgetBar
                    spent={spent}
                    total={displayBudget || 100}
                    retailer={retailer}
                    onRetailerChange={setRetailer}
                />

                {/* Days */}
                <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1D23", marginBottom: 12 }}>
                    Your {planDuration}-Day Meal Plan
                </h1>
                {generatedData.days.map((d) => (
                    <DayCard
                        key={d.day}
                        day={d.day}
                        dayLabel={d.label}
                        meals={d.meals}
                        onRecipeClick={handleRecipeClick}
                    />
                ))}

                {/* Ingredient summary */}
                <div
                    style={{
                        background: "#fff",
                        border: "1px solid #E8ECF0",
                        borderRadius: 20,
                        padding: 20,
                        marginTop: 8,
                    }}
                >
                    <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1A1D23", marginBottom: 16 }}>
                        🛒 Ingredient Summary
                    </h2>
                    {Object.entries(generatedData.ingredients || {}).map(([cat, items]) => (
                        <div key={cat} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#8B95A1", marginBottom: 6 }}>
                                {CATEGORY_ICONS[cat] || "🛒"} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {(items as any[]).map((item, idx) => {
                                    const itemName = typeof item === 'string' ? item : item.name;
                                    const diff = typeof item === 'object' && item.digestion_difficulty ? item.digestion_difficulty : null;

                                    return (
                                        <span
                                            key={`${itemName}-${idx}`}
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 100,
                                                background: "#F7F8FA",
                                                border: "1px solid #E8ECF0",
                                                fontSize: 12,
                                                color: "#1A1D23",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 4
                                            }}
                                        >
                                            {itemName}
                                            {diff && (
                                                <span style={{ fontSize: 10, background: diff === 'easy' ? '#D1FAE5' : '#FEF3C7', color: diff === 'easy' ? '#065F46' : '#92400E', padding: "2px 6px", borderRadius: 4 }}>
                                                    {diff}
                                                </span>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky checkout CTA */}
            <CartSummary
                subtotal={spent}
                retailer={retailer}
                checkoutUrl={`/cart/${id}`}
            />
        </main>
    );
}
