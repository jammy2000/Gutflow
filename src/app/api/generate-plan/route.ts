import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { meal_plan_id, budget_usd, people, duration_days, diet_type } = body;

        if (!meal_plan_id) {
            return NextResponse.json({ error: "Missing meal_plan_id" }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
        }

        const client = new Anthropic({ apiKey });

        const prompt = `You are an expert culinary nutrition AI specializing in Low FODMAP diets.
Generate a ${duration_days}-day Low FODMAP meal plan for ${people} people with a total budget of $${budget_usd}.
Diet phase: ${diet_type?.join(", ") || "elimination"}.

Rules:
- ALL ingredients must be Low FODMAP safe
- Approved: rice, chicken breast, salmon, carrots, spinach, pumpkin, firm tofu, blueberries, strawberries, oranges, lactose-free milk, gluten-free oats, potatoes, eggs, olive oil
- AVOID: onion, garlic, wheat, high-lactose dairy, apples, beans, lentils

Respond ONLY with valid JSON matching this exact schema (no markdown, no explanation):
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
    "Greens": [{ "name": string, "digestion_difficulty": "easy" }],
    "Proteins": [{ "name": string, "digestion_difficulty": "easy" }],
    "Gut-Soothers": [{ "name": string, "digestion_difficulty": "easy" }]
  }
}`;

        const message = await client.messages.create({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
        });

        const generatedText = message.content[0].type === "text" ? message.content[0].text : null;
        if (!generatedText) {
            return NextResponse.json({ error: "No content generated" }, { status: 500 });
        }

        // Strip markdown fences if Claude wraps it
        const cleaned = generatedText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
        const planJson = JSON.parse(cleaned);

        const ingredients = planJson.ingredients || {};
        const greensList = ingredients.Greens || [];
        const greensCount = Array.isArray(greensList) ? greensList.length : 0;
        const gutHealthBonus = greensCount * 0.50;

        return NextResponse.json({ success: true, plan: planJson, gutHealthBonus });

    } catch (error) {
        console.error("Generate Plan Error:", error);
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
