"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FodmapBadge } from "@/components/fodmap/FodmapBadge";

type FodmapTier = "green" | "yellow" | "red";
interface Ingredient { name: string; qty: string; fodmap: FodmapTier; }
interface RecipeData { time: number; servings: number; fodmap: FodmapTier; ingredients: Ingredient[]; steps: string[]; }

const RECIPE_DB: Record<string, RecipeData> = {
    "Lemon Herb Salmon Bowl": {
        time: 25, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Salmon fillet", qty: "200 g", fodmap: "green" },
            { name: "Baby spinach", qty: "100 g", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Lemon", qty: "1 whole", fodmap: "green" },
            { name: "Jasmine rice", qty: "150 g (dry)", fodmap: "green" },
            { name: "Spring onion (green only)", qty: "2 stalks", fodmap: "green" },
        ],
        steps: [
            "Rinse rice and cook according to package instructions.",
            "Preheat oven to 400°F (200°C). Line a baking sheet.",
            "Season salmon with olive oil, lemon juice, salt, and pepper.",
            "Bake salmon for 15–18 minutes until flakes easily with a fork.",
            "While salmon bakes, sauté spinach in a pan with 1 tsp olive oil for 2–3 min.",
            "Plate rice, spinach, and salmon. Top with green onion and a squeeze of lemon.",
        ],
    },
    "Chicken Rice Bowl": {
        time: 30, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Chicken breast", qty: "300 g", fodmap: "green" },
            { name: "Jasmine rice", qty: "150 g (dry)", fodmap: "green" },
            { name: "Zucchini", qty: "1 medium", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Spring onion (green only)", qty: "2 stalks", fodmap: "green" },
            { name: "Soy sauce (GF)", qty: "1 tbsp", fodmap: "green" },
            { name: "Sesame oil", qty: "1 tsp", fodmap: "green" },
        ],
        steps: [
            "Cook rice according to package instructions.",
            "Slice chicken breast into thin strips. Season with salt and pepper.",
            "Heat olive oil in a pan over medium-high heat.",
            "Cook chicken strips 5–6 min per side until golden and cooked through.",
            "Slice zucchini into half-moons and stir-fry in the same pan for 3–4 min.",
            "Drizzle with GF soy sauce and sesame oil. Toss to coat.",
            "Serve rice topped with chicken and zucchini. Garnish with green onion.",
        ],
    },
    "Quinoa Veggie Stir-fry": {
        time: 20, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Quinoa", qty: "150 g (dry)", fodmap: "green" },
            { name: "Bell pepper (red/yellow)", qty: "1 large", fodmap: "green" },
            { name: "Baby spinach", qty: "80 g", fodmap: "green" },
            { name: "Carrot", qty: "1 medium", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Tamari (GF soy sauce)", qty: "2 tbsp", fodmap: "green" },
            { name: "Ginger (fresh)", qty: "1 tsp grated", fodmap: "green" },
        ],
        steps: [
            "Rinse quinoa and cook in 300ml water for 12–15 min until fluffy.",
            "Heat olive oil in a wok over high heat.",
            "Add carrot and bell pepper, stir-fry 3–4 min until slightly tender.",
            "Add spinach and ginger, cook 1–2 min until spinach wilts.",
            "Add cooked quinoa to the wok and toss everything together.",
            "Drizzle tamari over the mixture and stir to coat. Serve immediately.",
        ],
    },
    "GF Oat Banana Bowl": {
        time: 10, servings: 1, fodmap: "green",
        ingredients: [
            { name: "Gluten-free rolled oats", qty: "60 g", fodmap: "green" },
            { name: "Banana (unripe, firm)", qty: "½ medium", fodmap: "green" },
            { name: "Lactose-free milk", qty: "200 ml", fodmap: "green" },
            { name: "Maple syrup", qty: "1 tbsp", fodmap: "green" },
            { name: "Chia seeds", qty: "1 tsp", fodmap: "green" },
        ],
        steps: [
            "Combine oats and lactose-free milk in a small saucepan.",
            "Cook over medium heat, stirring, for 3–5 min until creamy.",
            "Transfer to a bowl. Drizzle with maple syrup.",
            "Slice banana and layer on top. Sprinkle chia seeds and serve warm.",
        ],
    },
    "Scrambled Eggs & Spinach": {
        time: 10, servings: 1, fodmap: "green",
        ingredients: [
            { name: "Eggs", qty: "3 large", fodmap: "green" },
            { name: "Baby spinach", qty: "60 g", fodmap: "green" },
            { name: "Olive oil", qty: "1 tsp", fodmap: "green" },
            { name: "Salt & pepper", qty: "to taste", fodmap: "green" },
            { name: "Chives (fresh)", qty: "1 tbsp chopped", fodmap: "green" },
        ],
        steps: [
            "Whisk eggs with a pinch of salt and pepper in a bowl.",
            "Heat olive oil in a non-stick pan over medium-low heat.",
            "Add spinach and sauté 1 min until just wilted. Push to the side.",
            "Pour in eggs. Stir slowly with a spatula until softly set — do not overcook.",
            "Remove from heat while still slightly underdone; residual heat will finish them.",
            "Top with fresh chives and serve immediately.",
        ],
    },
    "Zucchini Noodle Stir-fry": {
        time: 15, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Zucchini (spiralized)", qty: "3 medium", fodmap: "green" },
            { name: "Chicken breast", qty: "200 g", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Tamari (GF soy sauce)", qty: "2 tbsp", fodmap: "green" },
            { name: "Sesame oil", qty: "1 tsp", fodmap: "green" },
            { name: "Ginger (fresh)", qty: "1 tsp grated", fodmap: "green" },
            { name: "Spring onion (green only)", qty: "2 stalks", fodmap: "green" },
        ],
        steps: [
            "Spiralize zucchini into noodles or use a vegetable peeler for ribbons.",
            "Slice chicken into thin strips.",
            "Heat olive oil in a wok over high heat. Cook chicken 4–5 min until golden.",
            "Add ginger and spring onion greens, stir-fry 30 seconds.",
            "Add zucchini noodles and toss 1–2 min (do not overcook or they go watery).",
            "Drizzle tamari and sesame oil, toss to coat and serve immediately.",
        ],
    },
    "Tuna & Rice Salad": {
        time: 10, servings: 1, fodmap: "green",
        ingredients: [
            { name: "Canned tuna (in water)", qty: "1 can (140 g)", fodmap: "green" },
            { name: "Cooked jasmine rice", qty: "1 cup", fodmap: "green" },
            { name: "Cherry tomatoes", qty: "8 halved", fodmap: "green" },
            { name: "Cucumber", qty: "½ medium", fodmap: "green" },
            { name: "Olive oil", qty: "1 tbsp", fodmap: "green" },
            { name: "Lemon juice", qty: "1 tbsp", fodmap: "green" },
            { name: "Chives", qty: "1 tbsp", fodmap: "green" },
        ],
        steps: [
            "Drain and flake tuna into a bowl.",
            "Dice cucumber. Halve cherry tomatoes.",
            "Add rice, tuna, cucumber, and tomatoes to a bowl.",
            "Drizzle with olive oil and lemon juice. Toss to combine.",
            "Season with salt and pepper. Top with fresh chives.",
        ],
    },
    "Baked Chicken & Potato": {
        time: 40, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Chicken thighs (bone-in)", qty: "4 pieces", fodmap: "green" },
            { name: "Yukon Gold potatoes", qty: "400 g", fodmap: "green" },
            { name: "Olive oil", qty: "3 tbsp", fodmap: "green" },
            { name: "Rosemary (fresh)", qty: "2 sprigs", fodmap: "green" },
            { name: "Lemon", qty: "1 whole", fodmap: "green" },
            { name: "Salt & pepper", qty: "to taste", fodmap: "green" },
        ],
        steps: [
            "Preheat oven to 425°F (220°C).",
            "Quarter potatoes. Toss with 2 tbsp olive oil, salt, pepper, and rosemary on a sheet pan.",
            "Place chicken thighs on top. Rub with remaining olive oil, salt, and pepper.",
            "Squeeze half a lemon over everything. Layer lemon slices on top.",
            "Roast 35–40 min until chicken skin is golden and potatoes are crispy.",
            "Rest 5 min before serving.",
        ],
    },
    "Salmon & Spinach Bowl": {
        time: 20, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Salmon fillet", qty: "300 g", fodmap: "green" },
            { name: "Baby spinach", qty: "120 g", fodmap: "green" },
            { name: "Quinoa", qty: "120 g (dry)", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Lemon", qty: "1 whole", fodmap: "green" },
        ],
        steps: [
            "Cook quinoa in salted water for 12–15 min. Drain and fluff.",
            "Heat 1 tbsp olive oil in a pan. Cook salmon skin-side down 4 min, flip, cook 3 more min.",
            "In the same pan, wilt spinach with remaining olive oil, 2 min.",
            "Divide quinoa into bowls. Top with spinach and flaked salmon. Squeeze lemon over top.",
        ],
    },
    "Chicken & Zucchini Skillet": {
        time: 25, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Chicken breast", qty: "300 g", fodmap: "green" },
            { name: "Zucchini", qty: "2 medium", fodmap: "green" },
            { name: "Cherry tomatoes", qty: "100 g", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Basil (fresh)", qty: "handful", fodmap: "green" },
            { name: "Salt & pepper", qty: "to taste", fodmap: "green" },
        ],
        steps: [
            "Dice chicken breast into 1-inch cubes. Season with salt and pepper.",
            "Heat olive oil in a large skillet over medium-high heat.",
            "Cook chicken cubes 5–6 min until browned. Remove and set aside.",
            "Slice zucchini into half-moons. Add to skillet, sauté 3–4 min.",
            "Add cherry tomatoes and cook 2 min until they just begin to burst.",
            "Return chicken to pan. Toss everything together, top with fresh basil.",
        ],
    },
    "Carrot & Tofu Stir-fry": {
        time: 20, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Firm tofu", qty: "350 g, cubed", fodmap: "green" },
            { name: "Carrot", qty: "2 medium, julienned", fodmap: "green" },
            { name: "Bell pepper", qty: "1 large, sliced", fodmap: "green" },
            { name: "Olive oil", qty: "2 tbsp", fodmap: "green" },
            { name: "Tamari (GF soy sauce)", qty: "2 tbsp", fodmap: "green" },
            { name: "Rice vinegar", qty: "1 tbsp", fodmap: "green" },
            { name: "Ginger (fresh)", qty: "1 tsp grated", fodmap: "green" },
        ],
        steps: [
            "Press tofu between paper towels 10 min to remove moisture. Cut into cubes.",
            "Heat 1 tbsp oil in a wok over high heat. Cook tofu until golden on all sides, 5–6 min. Remove.",
            "Add remaining oil, ginger, carrot, and pepper. Stir-fry 3–4 min.",
            "Return tofu to wok. Add tamari and rice vinegar.",
            "Toss everything together for 1 min. Serve over rice or quinoa.",
        ],
    },
    "Bell Pepper Stuffed Quinoa": {
        time: 35, servings: 2, fodmap: "green",
        ingredients: [
            { name: "Bell peppers (red/yellow)", qty: "2 large, halved", fodmap: "green" },
            { name: "Quinoa", qty: "100 g (dry)", fodmap: "green" },
            { name: "Canned diced tomatoes", qty: "½ cup", fodmap: "green" },
            { name: "Spinach", qty: "60 g", fodmap: "green" },
            { name: "Olive oil", qty: "1 tbsp", fodmap: "green" },
            { name: "Dried oregano", qty: "1 tsp", fodmap: "green" },
        ],
        steps: [
            "Preheat oven to 400°F (200°C). Cook quinoa per package instructions.",
            "Halve peppers and remove seeds. Place cut-side up on a baking sheet.",
            "Mix cooked quinoa with diced tomatoes, spinach, olive oil, and oregano. Season to taste.",
            "Fill each pepper half with the quinoa mixture.",
            "Bake 20–25 min until peppers are tender and filling is heated through.",
        ],
    },
};

// Fuzzy match: strip punctuation, lowercase, find closest key
function lookupRecipe(name: string): RecipeData {
    if (!name) return RECIPE_DB["Lemon Herb Salmon Bowl"];
    // Exact match
    if (RECIPE_DB[name]) return RECIPE_DB[name];
    // Case-insensitive match
    const lower = name.toLowerCase();
    const key = Object.keys(RECIPE_DB).find((k) => k.toLowerCase() === lower);
    if (key) return RECIPE_DB[key];
    // Partial match — find a recipe whose key contains the query words
    const words = lower.split(/\s+/);
    const partial = Object.keys(RECIPE_DB).find((k) =>
        words.some((w) => w.length > 3 && k.toLowerCase().includes(w))
    );
    if (partial) return RECIPE_DB[partial];
    // Fallback: generic entry
    return RECIPE_DB["Lemon Herb Salmon Bowl"];
}

function RecipeContent() {
    const params = useSearchParams();
    const recipeName = params.get("name") ?? "Lemon Herb Salmon Bowl";
    const mealLabel = params.get("meal") ?? "Dinner";
    const recipeData = lookupRecipe(recipeName);
    const recipe = { ...recipeData, name: recipeName, meal: mealLabel };


    const [cookingMode, setCookingMode] = useState(false);
    const [activeStep, setActiveStep] = useState(0);

    const fontSize = {
        ing: cookingMode ? 18 : 14,
        step: cookingMode ? 22 : 15,
        stepLabel: cookingMode ? 16 : 12,
        label: cookingMode ? 13 : 11,
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                background: cookingMode ? "#0F0F0F" : "#F7F8FA",
                fontFamily: "'Inter', -apple-system, sans-serif",
                color: cookingMode ? "#fff" : "#1A1D23",
                transition: "background 0.4s",
            }}
        >
            {/* Nav */}
            {!cookingMode && (
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
                    <Link href="/plan/demo" style={{ color: "#8B95A1", textDecoration: "none", fontSize: 14 }}>
                        ← Plan
                    </Link>
                    <button
                        onClick={() => setCookingMode(true)}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: "#1A1D23",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        🍳 Cooking Mode
                    </button>
                </nav>
            )}

            {/* Cooking mode exit */}
            {cookingMode && (
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                        onClick={() => { setCookingMode(false); setActiveStep(0); }}
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            color: "#fff",
                            padding: "8px 16px",
                            borderRadius: 10,
                            fontSize: 13,
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        Exit Cooking Mode ✕
                    </button>
                </div>
            )}

            <div style={{ maxWidth: cookingMode ? "100%" : 600, margin: "0 auto", padding: "0 20px 40px" }}>
                {/* Header */}
                <div
                    style={{
                        background: cookingMode ? "rgba(255,255,255,0.05)" : "#fff",
                        border: `1px solid ${cookingMode ? "rgba(255,255,255,0.1)" : "#E8ECF0"}`,
                        borderRadius: 20,
                        padding: 24,
                        marginBottom: 16,
                        marginTop: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: fontSize.label,
                            fontWeight: 700,
                            color: cookingMode ? "rgba(255,255,255,0.5)" : "#8B95A1",
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                        }}
                    >
                        {recipe.meal}
                    </div>
                    <div style={{ fontSize: cookingMode ? 28 : 24, fontWeight: 900, marginBottom: 10, lineHeight: 1.2 }}>
                        {recipe.name}
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: fontSize.ing, color: cookingMode ? "rgba(255,255,255,0.6)" : "#8B95A1" }}>
                            ⏱ {recipe.time} min
                        </span>
                        <span style={{ fontSize: fontSize.ing, color: cookingMode ? "rgba(255,255,255,0.6)" : "#8B95A1" }}>
                            👥 {recipe.servings} servings
                        </span>
                        <FodmapBadge tier={recipe.fodmap} size={cookingMode ? "lg" : "md"} />
                    </div>
                </div>

                {/* Ingredients */}
                <div
                    style={{
                        background: cookingMode ? "rgba(255,255,255,0.05)" : "#fff",
                        border: `1px solid ${cookingMode ? "rgba(255,255,255,0.1)" : "#E8ECF0"}`,
                        borderRadius: 20,
                        padding: 24,
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: cookingMode ? "rgba(255,255,255,0.5)" : "#8B95A1",
                            letterSpacing: 1,
                            marginBottom: 16,
                            textTransform: "uppercase",
                        }}
                    >
                        Ingredients
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {recipe.ingredients.map((ing) => (
                            <div
                                key={ing.name}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <FodmapBadge tier={ing.fodmap} size="sm" showLabel={false} />
                                    <span style={{ fontSize: fontSize.ing, fontWeight: 600 }}>{ing.name}</span>
                                </div>
                                <span
                                    style={{
                                        fontSize: fontSize.ing,
                                        fontWeight: 700,
                                        color: cookingMode ? "rgba(255,255,255,0.6)" : "#8B95A1",
                                        textAlign: "right",
                                    }}
                                >
                                    {ing.qty}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Steps */}
                <div
                    style={{
                        background: cookingMode ? "rgba(255,255,255,0.05)" : "#fff",
                        border: `1px solid ${cookingMode ? "rgba(255,255,255,0.1)" : "#E8ECF0"}`,
                        borderRadius: 20,
                        padding: 24,
                    }}
                >
                    <div
                        style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: cookingMode ? "rgba(255,255,255,0.5)" : "#8B95A1",
                            letterSpacing: 1,
                            marginBottom: 20,
                            textTransform: "uppercase",
                        }}
                    >
                        Steps
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: cookingMode ? 24 : 16 }}>
                        {recipe.steps.map((step, i) => {
                            const isActive = cookingMode && i === activeStep;
                            const isDone = cookingMode && i < activeStep;
                            return (
                                <div
                                    key={i}
                                    onClick={() => cookingMode && setActiveStep(i)}
                                    style={{
                                        display: "flex",
                                        gap: 16,
                                        alignItems: "flex-start",
                                        cursor: cookingMode ? "pointer" : "default",
                                        padding: cookingMode ? "16px" : "0",
                                        borderRadius: cookingMode ? 14 : 0,
                                        background: isActive
                                            ? "rgba(167,139,250,0.15)"
                                            : "transparent",
                                        border: isActive ? "1px solid rgba(167,139,250,0.3)" : "1px solid transparent",
                                        opacity: cookingMode && !isActive && !isDone ? 0.5 : 1,
                                        transition: "all 0.2s",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: cookingMode ? 36 : 28,
                                            height: cookingMode ? 36 : 28,
                                            borderRadius: "50%",
                                            background: isDone
                                                ? "#10B981"
                                                : isActive
                                                    ? "#A78BFA"
                                                    : cookingMode
                                                        ? "rgba(255,255,255,0.1)"
                                                        : "#F7F8FA",
                                            border: `2px solid ${isDone ? "#10B981" : isActive ? "#A78BFA" : "#E8ECF0"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: fontSize.stepLabel,
                                            fontWeight: 900,
                                            color: isDone ? "#fff" : isActive ? "#fff" : "#8B95A1",
                                            flexShrink: 0,
                                            transition: "all 0.3s",
                                        }}
                                    >
                                        {isDone ? "✓" : i + 1}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: fontSize.step,
                                            lineHeight: 1.6,
                                            fontWeight: isActive ? 700 : 500,
                                            color: isActive
                                                ? "#fff"
                                                : cookingMode
                                                    ? "rgba(255,255,255,0.8)"
                                                    : "#1A1D23",
                                            paddingTop: cookingMode ? 4 : 2,
                                            transition: "color 0.3s",
                                        }}
                                    >
                                        {step}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Cooking mode prev/next navigation */}
                {cookingMode && (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 24,
                            gap: 12,
                        }}
                    >
                        <button
                            onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                            disabled={activeStep === 0}
                            style={{
                                flex: 1,
                                padding: "16px",
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,0.15)",
                                background: "rgba(255,255,255,0.07)",
                                color: activeStep === 0 ? "rgba(255,255,255,0.2)" : "#fff",
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: activeStep === 0 ? "not-allowed" : "pointer",
                            }}
                        >
                            ← Previous
                        </button>
                        <button
                            onClick={() => setActiveStep((s) => Math.min(recipe.steps.length - 1, s + 1))}
                            disabled={activeStep === recipe.steps.length - 1}
                            style={{
                                flex: 1,
                                padding: "16px",
                                borderRadius: 14,
                                border: "none",
                                background:
                                    activeStep === recipe.steps.length - 1
                                        ? "rgba(16,185,129,0.3)"
                                        : "#A78BFA",
                                color: "#fff",
                                fontSize: 16,
                                fontWeight: 700,
                                cursor: activeStep === recipe.steps.length - 1 ? "default" : "pointer",
                            }}
                        >
                            {activeStep === recipe.steps.length - 1 ? "Done! ✓" : "Next →"}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function RecipePage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Loading recipe…
                </div>
            }
        >
            <RecipeContent />
        </Suspense>
    );
}
