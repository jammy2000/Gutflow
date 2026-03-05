"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FodmapBadge } from "@/components/fodmap/FodmapBadge";
import { CartSummary } from "@/components/budget/CartSummary";
import { useParams } from "next/navigation";
import { supabase, ShoppingList, ShoppingItem } from "@/lib/supabase";

type RetailerKey = "walmart" | "kroger";
const CATEGORY_ICONS: Record<string, string> = { "Greens": "🥬 Greens", "Proteins": "🥩 Proteins", "Gut-Soothers": "🍵 Gut-Soothers", "Other": "🛒 Other" };

export default function CartPage() {
    const params = useParams();
    const id = params?.id as string;

    const [retailer, setRetailer] = useState<RetailerKey>("walmart");
    const [priceAlert] = useState(false); // Can be tied to estimate_mode later

    const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
    const [genPlan, setGenPlan] = useState<any>(null);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCart() {
            if (!id || id === 'demo') {
                setLoading(false);
                return;
            }

            const { data: listData, error: listError } = await supabase
                .from("shopping_lists")
                .select("*")
                .eq("meal_plan_id", id)
                .single();

            if (listError || !listData) {
                console.error("Failed to load shopping list", listError);
                setLoading(false);
                return;
            }
            setShoppingList(listData);
            setRetailer(listData.retailer);

            const { data: itemsData, error: itemsError } = await supabase
                .from("shopping_items")
                .select("*")
                .eq("shopping_list_id", listData.id);

            if (!itemsError && itemsData) {
                setItems(itemsData);
            }

            const { data: planData } = await supabase
                .from("meal_plans")
                .select("generated_plan")
                .eq("id", id)
                .single();

            if (planData?.generated_plan) {
                setGenPlan(planData.generated_plan);
            }

            setLoading(false);
        }
        fetchCart();
    }, [id]);

    const subtotal = shoppingList?.subtotal || 0;

    if (loading) {
        return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B95A1" }}>AI가 당신의 식도를 위한 재료를 선별 중입니다...</div>;
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#F7F8FA",
                fontFamily: "'Inter', -apple-system, sans-serif",
                paddingBottom: 180,
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
                    gap: 12,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Link href={`/plan/${id}`} style={{ color: "#8B95A1", textDecoration: "none", fontSize: 14 }}>
                    ← Plan
                </Link>
                <div
                    style={{
                        fontSize: 18,
                        fontWeight: 900,
                        background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    GutFlow
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <div
                        style={{
                            display: "flex",
                            gap: 4,
                            background: "#F7F8FA",
                            borderRadius: 10,
                            padding: 3,
                            border: "1px solid #E8ECF0",
                        }}
                    >
                        {(["walmart", "kroger"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRetailer(r)}
                                style={{
                                    padding: "5px 14px",
                                    borderRadius: 8,
                                    border: "none",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    background: retailer === r ? "#1A1D23" : "transparent",
                                    color: retailer === r ? "#fff" : "#8B95A1",
                                }}
                            >
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
                {priceAlert && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 16px",
                            background: "#FFFBEB",
                            border: "1px solid #FDE68A",
                            borderRadius: 14,
                            marginBottom: 16,
                        }}
                    >
                        <span style={{ fontSize: 18 }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 700, color: "#92400E", fontSize: 13 }}>
                                Items are currently estimated
                            </div>
                            <div style={{ fontSize: 12, color: "#B45309" }}>Actual prices may vary at checkout</div>
                        </div>
                    </div>
                )}

                {items.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "#8B95A1" }}>
                        No items found in your cart. Generate a new plan!
                    </div>
                ) : (
                    <div style={{ marginBottom: 20 }}>
                        {["Greens", "Proteins", "Gut-Soothers", "Other"].map(cat => {
                            const catArr = genPlan?.ingredients?.[cat] || [];
                            const catNames = catArr.map((c: any) => typeof c === 'string' ? c : c.name);

                            const getCatItems = () => {
                                if (cat === "Other") {
                                    const mappedGreens = (genPlan?.ingredients?.Greens || []).map((x: any) => x.name || x);
                                    const mappedProteins = (genPlan?.ingredients?.Proteins || []).map((x: any) => x.name || x);
                                    const mappedSoothers = (genPlan?.ingredients?.["Gut-Soothers"] || []).map((x: any) => x.name || x);
                                    return items.filter(i =>
                                        !mappedGreens.includes(i.name) &&
                                        !mappedProteins.includes(i.name) &&
                                        !mappedSoothers.includes(i.name)
                                    );
                                }
                                return items.filter(i => catNames.includes(i.name));
                            };

                            const catItems = getCatItems();
                            if (catItems.length === 0) return null;

                            return (
                                <div key={cat} style={{ marginBottom: 24 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#8B95A1", marginBottom: 10 }}>
                                        {CATEGORY_ICONS[cat] || "🛒"}
                                    </div>
                                    <div
                                        style={{
                                            background: "#fff",
                                            border: "1px solid #E8ECF0",
                                            borderRadius: 16,
                                            overflow: "hidden",
                                        }}
                                    >
                                        {catItems.map((item, idx) => {
                                            const aiItemInfo = catArr.find((c: any) => (typeof c === 'string' ? c : c.name) === item.name);
                                            const diff = aiItemInfo?.digestion_difficulty;

                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 12,
                                                        padding: "14px 16px",
                                                        borderBottom: idx < catItems.length - 1 ? "1px solid #F7F8FA" : "none",
                                                        opacity: item.in_stock ? 1 : 0.6,
                                                    }}
                                                >
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div
                                                            style={{
                                                                fontSize: 14,
                                                                fontWeight: 600,
                                                                color: "#1A1D23",
                                                                textDecoration: item.in_stock ? "none" : "line-through",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 6
                                                            }}
                                                        >
                                                            {item.name}
                                                            {diff && (
                                                                <span style={{ fontSize: 10, background: diff === 'easy' ? '#D1FAE5' : '#FEF3C7', color: diff === 'easy' ? '#065F46' : '#92400E', padding: "2px 6px", borderRadius: 4 }}>
                                                                    {diff}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: "#8B95A1" }}>
                                                            {item.total_quantity} {item.unit}
                                                        </div>
                                                    </div>

                                                    <FodmapBadge tier={item.fodmap_tier} size="sm" showLabel={false} />

                                                    <div style={{ textAlign: "right", minWidth: 60 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D23" }}>
                                                            ${item.total_price > 0 ? item.total_price.toFixed(2) : "Est."}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <CartSummary
                subtotal={subtotal}
                retailer={retailer}
                checkoutUrl={`https://${retailer}.com/cart`}
            />
        </main>
    );
}
