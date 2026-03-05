const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing supabase credentials in env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing Task 1 Insert to meal_plans...");

    const { data, error } = await supabase
        .from("meal_plans")
        .insert({
            duration_days: 7,
            people: 2,
            diet_type: ["vegetarian"],
            retailer: "walmart",
            fulfillment_mode: "pickup",
            budget_usd: 150,
            estimate_mode: true,
            status: "draft",
        })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to insert test plan:", error);
    } else {
        console.log("✅ Successfully inserted test plan!");
        console.log("Plan ID:", data.id);

        console.log("\nTesting Task 1 Select...");
        const { data: fetch, error: fetchError } = await supabase
            .from("meal_plans")
            .select()
            .eq("id", data.id)
            .single();

        if (fetchError) {
            console.error("❌ Failed to fetch plan:", fetchError);
        } else {
            console.log("✅ Successfully fetched test plan:", fetch.id);
        }

        // Cleanup
        await supabase.from("meal_plans").delete().eq("id", data.id);
        console.log("🧹 Cleaned up test record.");
    }
}

testInsert();
