/**
 * /api/lookup-barcode  — UPC → ingredients bridge
 *
 * GET /api/lookup-barcode?upc=<13-digit-string>
 *
 * MVP: static lookup table covering the 20 most common Low-FODMAP pantry items.
 * Phase 2: dials BlueCart API (SSOT §16 — BLUECART_API_KEY env var).
 *
 * Response: { name, ingredients, price, store, in_stock }
 * On miss:  404 with { error: "UPC not found" }
 */
import { NextRequest } from "next/server";

interface ProductLookup {
    name: string;
    ingredients: string;
    price: number;
    store: "walmart" | "kroger" | "generic";
    in_stock: boolean;
}

// ─── MVP Static Lookup Table ──────────────────────────────────────────────────
// UPC → product data (Walmart SKU prices as of 2026-02)
const UPC_TABLE: Record<string, ProductLookup> = {
    "012345678901": { name: "Rice Cakes Plain", ingredients: "Rice, Salt", price: 2.48, store: "walmart", in_stock: true },
    "012345678902": { name: "Quinoa Organic", ingredients: "Organic Quinoa", price: 5.98, store: "walmart", in_stock: true },
    "012345678903": { name: "Chicken Breast (1 lb)", ingredients: "Chicken", price: 4.98, store: "walmart", in_stock: true },
    "012345678904": { name: "Lactose-Free Milk (½ gal)", ingredients: "Lactose-free milk, Vitamin D3", price: 3.48, store: "walmart", in_stock: true },
    "012345678905": { name: "Almond Milk Unsweetened", ingredients: "Water, Almonds, Salt", price: 2.98, store: "walmart", in_stock: true },
    "012345678906": { name: "Maple Syrup Pure", ingredients: "Pure Maple Syrup", price: 6.98, store: "walmart", in_stock: true },
    "012345678907": { name: "Olive Oil Extra Virgin", ingredients: "100% Extra Virgin Olive Oil", price: 5.98, store: "walmart", in_stock: true },
    "012345678908": { name: "Gluten-Free Oats", ingredients: "Whole Grain Oats", price: 3.98, store: "walmart", in_stock: true },
    "012345678909": { name: "Canned Tuna in Water", ingredients: "Tuna, Water, Salt", price: 1.28, store: "walmart", in_stock: true },
    "012345678910": { name: "Brown Rice (2 lb bag)", ingredients: "Whole Grain Brown Rice", price: 2.48, store: "walmart", in_stock: true },
    "012345678911": { name: "Eggs Large (12 ct)", ingredients: "Eggs", price: 3.48, store: "walmart", in_stock: true },
    "012345678912": { name: "Firm Tofu", ingredients: "Water, Soybeans, Calcium Sulfate", price: 1.98, store: "walmart", in_stock: true },
    "012345678913": { name: "Baby Spinach (5 oz)", ingredients: "Organic Baby Spinach", price: 2.98, store: "walmart", in_stock: true },
    "012345678914": { name: "Carrots (1 lb bag)", ingredients: "Carrots", price: 0.98, store: "walmart", in_stock: true },
    "012345678915": { name: "Zucchini (each)", ingredients: "Zucchini", price: 0.78, store: "walmart", in_stock: true },
    "012345678916": { name: "Roma Tomatoes (each)", ingredients: "Tomatoes", price: 0.48, store: "walmart", in_stock: true },
    "012345678917": { name: "Salmon Fillet (frozen)", ingredients: "Atlantic Salmon", price: 7.98, store: "walmart", in_stock: true },
    "012345678918": { name: "Strawberries (1 lb)", ingredients: "Strawberries", price: 2.98, store: "walmart", in_stock: true },
    "012345678919": { name: "Banana Bunch (~3 lb)", ingredients: "Bananas", price: 1.38, store: "walmart", in_stock: true },
    "012345678920": { name: "Spring Onion Bunch", ingredients: "Green Onion (Scallion)", price: 0.88, store: "walmart", in_stock: true },
    // ── HIGH-RISK barcodes (for scanner testing) ──
    "099999000001": { name: "Garlic Bread", ingredients: "Wheat Flour, Garlic, Butter, Salt", price: 2.48, store: "walmart", in_stock: true },
    "099999000002": { name: "Onion Rings (frozen)", ingredients: "Onion, Wheat Flour, Salt, Natural Flavors", price: 3.48, store: "walmart", in_stock: true },
};

export async function GET(request: NextRequest) {
    const upc = request.nextUrl.searchParams.get("upc")?.replace(/\D/g, ""); // digits only

    if (!upc) {
        return Response.json({ error: "Missing upc parameter" }, { status: 400 });
    }

    // ── MVP: static table lookup ──────────────────────────────────────────────
    const product = UPC_TABLE[upc];
    if (product) {
        return Response.json({ upc, ...product });
    }

    // ── Phase 2: BlueCart API ─────────────────────────────────────────────────
    const bluecartKey = process.env.BLUECART_API_KEY;
    if (bluecartKey) {
        try {
            const res = await fetch(
                `https://api.bluecartapi.com/request?api_key=${bluecartKey}&search_term=${upc}&type=search`,
                { cache: "no-store" }, // freshness managed by our Supabase price_cache (SSOT §15)
            );
            if (res.ok) {
                const data = await res.json();
                const item = data?.search_results?.[0]?.product;
                if (item) {
                    return Response.json({
                        upc,
                        name: item.title ?? "Unknown",
                        ingredients: item.description ?? "",
                        price: item.buybox_winner?.price?.value ?? 0,
                        store: "walmart",
                        in_stock: true,
                    });
                }
            }
        } catch (err) {
            console.warn("[lookup-barcode] BlueCart error:", err);
        }
    }

    return Response.json({ error: "UPC not found", upc }, { status: 404 });
}
