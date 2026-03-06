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
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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

        // Optional: persist to Supabase if configured — non-fatal if DB not set up
        const ingredients = planJson.ingredients || {};
        const greensList = ingredients.Greens || ingredients.produce || [];
        const greensCount = Array.isArray(greensList) ? greensList.length : 0;
        const gutHealthBonus = greensCount * 0.50;

        try {
            await supabase
                .from("meal_plans")
                .update({ generated_plan: planJson })
                .eq("id", meal_plan_id);
        } catch (dbErr) {
            console.warn("Supabase persist skipped (DB not configured):", dbErr);
        }

        // Always return the plan to the client regardless of DB status
        return NextResponse.json({ success: true, plan: planJson, gutHealthBonus });

    } catch (error) {
        console.error("Generate Plan Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
