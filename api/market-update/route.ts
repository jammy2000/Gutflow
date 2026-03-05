/**
 * /api/market-update  — Market Nerve price feed
 *
 * In-memory trigger store for MVP.
 * Future: reads from Supabase price_cache table (SSOT §15).
 *
 * GET /api/market-update
 *   Response: { triggers: PriceTrigger[], timestamp: string, stale: boolean }
 */

export interface PriceTrigger {
    item_id: string;
    item_name: string;        // ← 추가: 실제 제품명
    old_price: number;
    new_price: number;
    delta: number;
    store: "walmart" | "kroger";
    timestamp: number;
}

// Module-level in-memory store (persists across Next.js hot reloads in dev).
// test_connection.py / engine-room code writes here via a shared API call.
let triggerStore: PriceTrigger[] = [];
let lastUpdated = Date.now();

/** Called by engine-room webhook when a PriceTrigger fires (Phase 2). */
export function appendTriggers(triggers: PriceTrigger[]) {
    triggerStore = [...triggers, ...triggerStore].slice(0, 50); // cap at 50
    lastUpdated = Date.now();
}

export async function GET() {
    const STALE_MS = 15 * 60 * 1000; // 15 min — matches SSOT §15 cache TTL
    const stale = Date.now() - lastUpdated > STALE_MS;

    // ── Simulation Logic for Showcase ──
    if (triggerStore.length === 0) {
        const simTriggers: PriceTrigger[] = [
            { item_id: "012345678901", item_name: "Lundberg White Rice (5lb)", old_price: 2.99, new_price: 2.48, delta: -0.51, store: "walmart", timestamp: Date.now() - 3600000 },
            { item_id: "012345678904", item_name: "Bob's Red Mill GF Oats", old_price: 3.99, new_price: 3.48, delta: -0.51, store: "walmart", timestamp: Date.now() - 7200000 },
            { item_id: "012345678902", item_name: "Barilla GF Penne (12oz)", old_price: 5.48, new_price: 5.98, delta: 0.50, store: "walmart", timestamp: Date.now() - 10800000 },
            { item_id: "012345678905", item_name: "Silk Almond Milk (32oz)", old_price: 3.29, new_price: 2.79, delta: -0.50, store: "kroger", timestamp: Date.now() - 14400000 },
            { item_id: "012345678906", item_name: "Ancient Harvest Quinoa", old_price: 5.99, new_price: 6.49, delta: 0.50, store: "kroger", timestamp: Date.now() - 18000000 },
        ];
        triggerStore = simTriggers;
    }


    return Response.json({
        triggers: triggerStore,
        timestamp: new Date(lastUpdated).toISOString(),
        stale,
    });
}

export async function POST(request: Request) {
    // Webhook endpoint: engine-room's PriceTriggerEngine posts here
    try {
        const body = await request.json();
        const incoming: PriceTrigger[] = Array.isArray(body.triggers)
            ? body.triggers
            : [];
        appendTriggers(incoming);
        return Response.json({ accepted: incoming.length });
    } catch {
        return Response.json({ error: "Invalid payload" }, { status: 400 });
    }
}
