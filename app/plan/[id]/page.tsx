"use client";

import { useState } from "react";
import Link from "next/link";
import { BudgetBar } from "@/components/budget/BudgetBar";
import { DayCard } from "@/components/plan/DayCard";
import { CartSummary } from "@/components/budget/CartSummary";
import { useRouter } from "next/navigation";

// ─── Demo Data ─────────────────────────────────────────────────
const DEMO_PLAN = {
    id: "demo",
    budget: 100,
    days: [
        {
            day: 1,
            label: "Monday",
            meals: {
                breakfast: { recipe: "GF Oat Banana Bowl", cost: 2.1, fodmapTier: "green" as const, cookTime: 10 },
                lunch: { recipe: "Quinoa Veggie Stir-fry", cost: 3.8, fodmapTier: "green" as const, cookTime: 20 },
                dinner: { recipe: "Lemon Herb Salmon Bowl", cost: 4.2, fodmapTier: "green" as const, cookTime: 25 },
            },
        },
        {
            day: 2,
            label: "Tuesday",
            meals: {
                breakfast: { recipe: "Scrambled Eggs & Spinach", cost: 1.9, fodmapTier: "green" as const, cookTime: 10 },
                lunch: { recipe: "Chicken Rice Bowl", cost: 5.1, fodmapTier: "green" as const, cookTime: 30 },
                dinner: { recipe: "Zucchini Noodle Stir-fry", cost: 3.5, fodmapTier: "yellow" as const, cookTime: 20 },
            },
        },
        {
            day: 3,
            label: "Wednesday",
            meals: {
                breakfast: { recipe: "Lactose-Free Yogurt & Kiwi", cost: 2.4, fodmapTier: "green" as const, cookTime: 5 },
                lunch: { recipe: "Tuna & Rice Salad", cost: 3.2, fodmapTier: "green" as const, cookTime: 10 },
                dinner: { recipe: "Baked Chicken & Potato", cost: 4.8, fodmapTier: "green" as const, cookTime: 35 },
            },
        },
        {
            day: 4,
            label: "Thursday",
            meals: {
                breakfast: { recipe: "Banana Smoothie (LF milk)", cost: 1.8, fodmapTier: "green" as const, cookTime: 5 },
                lunch: { recipe: "Bell Pepper Stuffed Quinoa", cost: 4.0, fodmapTier: "green" as const, cookTime: 25 },
                dinner: { recipe: "Salmon & Spinach Bowl", cost: 4.5, fodmapTier: "green" as const, cookTime: 20 },
            },
        },
        {
            day: 5,
            label: "Friday",
            meals: {
                breakfast: { recipe: "GF Toast & Eggs", cost: 2.0, fodmapTier: "green" as const, cookTime: 10 },
                lunch: { recipe: "Carrot & Tofu Stir-fry", cost: 3.6, fodmapTier: "green" as const, cookTime: 20 },
                dinner: { recipe: "Chicken & Zucchini Skillet", cost: 4.7, fodmapTier: "yellow" as const, cookTime: 25 },
            },
        },
    ],
    ingredients: {
        produce: ["Spinach", "Carrots", "Zucchini", "Bell Pepper", "Kiwi", "Banana", "Tomatoes"],
        protein: ["Chicken Breast (1.2kg)", "Salmon (600g)", "Eggs (12 pack)", "Firm Tofu"],
        grocery: ["GF Oats", "Quinoa", "Jasmine Rice", "Lactose-Free Milk", "GF Bread"],
    },
};

const CATEGORY_ICONS: Record<string, string> = { produce: "🥬", protein: "🥩", grocery: "🛒" };

// ─── Component ─────────────────────────────────────────────────
export default function PlanPage() {
    const router = useRouter();
    const [retailer, setRetailer] = useState<"walmart" | "kroger">("walmart");

    const spent = DEMO_PLAN.days.reduce(
        (sum, d) => sum + Object.values(d.meals).reduce((s, m) => s + m.cost, 0),
        0
    );

    const handleRecipeClick = (meal: string, recipe: string) => {
        router.push(`/recipe/demo?name=${encodeURIComponent(recipe)}&meal=${meal}`);
    };

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
                    justifyContent: "space-between",
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
                    href="/cart/demo"
                    style={{
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
                    total={DEMO_PLAN.budget}
                    retailer={retailer}
                    onRetailerChange={setRetailer}
                />

                {/* Days */}
                <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1A1D23", marginBottom: 12 }}>
                    Your 5-Day Meal Plan
                </h1>
                {DEMO_PLAN.days.map((d) => (
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
                    {Object.entries(DEMO_PLAN.ingredients).map(([cat, items]) => (
                        <div key={cat} style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#8B95A1", marginBottom: 6 }}>
                                {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {items.map((item) => (
                                    <span
                                        key={item}
                                        style={{
                                            padding: "4px 10px",
                                            borderRadius: 100,
                                            background: "#F7F8FA",
                                            border: "1px solid #E8ECF0",
                                            fontSize: 12,
                                            color: "#1A1D23",
                                        }}
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sticky checkout CTA */}
            <CartSummary
                subtotal={spent}
                retailer={retailer}
                checkoutUrl="/cart/demo"
            />
        </main>
    );
}
