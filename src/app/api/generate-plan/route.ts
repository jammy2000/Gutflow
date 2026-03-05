import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { meal_plan_id, budget_usd, people, duration_days, diet_type } = body;

        if (!meal_plan_id) {
            return NextResponse.json({ error: "Missing meal_plan_id" }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
        }

        const systemInstruction = `You are an expert culinary nutrition AI specializing in Low FODMAP diets.
Your task is to generate a comprehensive, delicious, and budget-conscious meal plan.
Diet Restrictions: Low FODMAP only. 
Approved ingredients (examples, but stick strictly universally safe): Rice, chicken breast, salmon, carrots, spinach, pumpkin, firm tofu, blueberries, strawberries, unripe bananas, oranges, lactose-free milk, gluten-free oats.
AVOID: onion, garlic, wheat, high-lactose dairy, apples, beans.

You MUST respond in valid JSON format only, matching this exact schema:
{
  "budget": number,
  "days": [
    {
      "day": number,
      "label": string,
      "meals": {
        "breakfast": { "recipe": string, "cost": number, "fodmapTier": "green", "cookTime": number },
        "lunch": { "recipe": string, "cost": number, "fodmapTier": "green", "cookTime": number },
        "dinner": { "recipe": string, "cost": number, "fodmapTier": "green", "cookTime": number }
      }
    }
  ],
  "ingredients": {
    "Greens": [{ "name": string, "digestion_difficulty": "easy" | "moderate" | "hard" }],
    "Proteins": [{ "name": string, "digestion_difficulty": "easy" | "moderate" | "hard" }],
    "Gut-Soothers": [{ "name": string, "digestion_difficulty": "easy" | "moderate" | "hard" }]
  }
}
Cost should be per serving. Total sum of (cost_per_serving * servings * days) should roughly equal the budget.
`;

        const userPrompt = `Generate a ${duration_days}-day Low FODMAP meal plan for ${people} people with a total budget of $${budget_usd}. Diet types specified: ${diet_type?.join(", ") || "None"}.`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    contents: [{
                        parts: [{ text: userPrompt }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                    }
                })
            }
        );

        if (!geminiRes.ok) {
            const errorText = await geminiRes.text();
            console.error("Gemini API Error:", errorText);
            return NextResponse.json({ error: "Failed to generate plan securely" }, { status: 502 });
        }

        const data = await geminiRes.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!generatedText) {
            return NextResponse.json({ error: "No content generated" }, { status: 500 });
        }

        const planJson = JSON.parse(generatedText);

        const { error: updateError } = await supabase
            .from("meal_plans")
            .update({ generated_plan: planJson })
            .eq("id", meal_plan_id);

        if (updateError) {
            console.error("Supabase Error Update:", updateError);
            return NextResponse.json({ error: "Failed to persist generated plan" }, { status: 500 });
        }

        // --- Task 3: Shopping List DB Integration ---

        const ingredients = planJson.ingredients || {};
        const greensList = ingredients.Greens || ingredients.produce || [];

        // Gut-Health Bonus logic ($0.50 off per Green item)
        const greensCount = Array.isArray(greensList) ? greensList.length : 0;
        const gutHealthBonus = greensCount * 0.50;

        const subtotal = planJson.budget || budget_usd || 100;
        let tax_buffer = subtotal * 0.085;

        tax_buffer = tax_buffer - gutHealthBonus; // Apply bonus
        const est_total = subtotal + tax_buffer;

        const { data: listData, error: listError } = await supabase
            .from("shopping_lists")
            .insert({
                meal_plan_id: meal_plan_id,
                retailer: "walmart",
                estimate_mode: true,
                subtotal: subtotal,
                tax_buffer: tax_buffer,
                est_total: est_total
            })
            .select()
            .single();

        if (listError || !listData) {
            console.error("Failed to create shopping list:", listError);
        } else {
            const itemsToInsert: any[] = [];

            const addItems = (categoryList: any[], tier: 'green' | 'yellow' | 'red') => {
                if (!Array.isArray(categoryList)) return;
                categoryList.forEach((item) => {
                    const itemName = typeof item === 'string' ? item : item.name;
                    itemsToInsert.push({
                        shopping_list_id: listData.id,
                        name: itemName || "Unknown",
                        total_quantity: "1",
                        unit: "pkg",
                        price_per_unit: 0,
                        total_price: 0,
                        fodmap_tier: tier,
                        in_stock: true,
                        product_id: null
                    });
                });
            };

            addItems(greensList, 'green');
            addItems(ingredients.Proteins || ingredients.protein, 'green');
            addItems(ingredients['Gut-Soothers'] || ingredients.grocery, 'green');

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase
                    .from("shopping_items")
                    .insert(itemsToInsert);
                if (itemsError) {
                    console.error("Failed to insert shopping items:", itemsError);
                }
            }
        }

        return NextResponse.json({ success: true, plan: planJson, gutHealthBonus });

    } catch (error) {
        console.error("Generate Plan Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
