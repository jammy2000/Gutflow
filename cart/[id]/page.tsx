"use client";

import { useState } from "react";
import Link from "next/link";
import { FodmapBadge } from "@/components/fodmap/FodmapBadge";
import { CartSummary } from "@/components/budget/CartSummary";

type RetailerKey = "walmart" | "kroger";

const PRICES_BY_RETAILER: Record<RetailerKey, { price: number }[]> = {
    walmart: [
        { price: 5.98 }, { price: 2.48 }, { price: 8.97 }, { price: 3.48 },
        { price: 1.98 }, { price: 2.98 }, { price: 4.48 }, { price: 3.28 }, { price: 2.28 },
    ],
    kroger: [
        { price: 6.49 }, { price: 2.89 }, { price: 9.49 }, { price: 3.89 },
        { price: 2.19 }, { price: 3.29 }, { price: 4.99 }, { price: 3.59 }, { price: 2.59 },
    ],
};

const ITEMS = [
    { name: "Chicken Breast", qty: "1.2 kg", unit: "pkg", category: "protein", fodmap: "green" as const, inStock: true },
    { name: "Baby Spinach", qty: "300 g", unit: "bag", category: "produce", fodmap: "green" as const, inStock: true },
    { name: "Salmon Fillet", qty: "600 g", unit: "pkg", category: "protein", fodmap: "green" as const, inStock: false },
    { name: "Quinoa", qty: "500 g", unit: "bag", category: "grocery", fodmap: "green" as const, inStock: true },
    { name: "Jasmine Rice", qty: "2 kg", unit: "bag", category: "grocery", fodmap: "green" as const, inStock: true },
    { name: "Lactose-Free Milk", qty: "2 L", unit: "jug", category: "grocery", fodmap: "green" as const, inStock: true },
    { name: "Firm Tofu", qty: "400 g", unit: "pkg", category: "protein", fodmap: "green" as const, inStock: true },
    { name: "Zucchini", qty: "3 pcs", unit: "ea", category: "produce", fodmap: "yellow" as const, inStock: true },
    { name: "Bell Pepper", qty: "4 pcs", unit: "ea", category: "produce", fodmap: "green" as const, inStock: true },
];

const CATEGORY_ORDER = ["produce", "protein", "grocery"];
const CATEGORY_ICONS: Record<string, string> = { produce: "🥬 Produce", protein: "🥩 Protein", grocery: "🛒 Grocery" };

export default function CartPage() {
    const [retailer, setRetailer] = useState<RetailerKey>("walmart");
    const [priceAlert] = useState(true); // demo: 3 items changed price

    const prices = PRICES_BY_RETAILER[retailer];
    const itemsWithPrices = ITEMS.map((item, i) => ({ ...item, price: prices[i].price }));
    const subtotal = itemsWithPrices.filter((i) => i.inStock).reduce((sum, i) => sum + i.price, 0);

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
                <Link href="/plan/demo" style={{ color: "#8B95A1", textDecoration: "none", fontSize: 14 }}>
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
                    {/* Retailer toggle */}
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
                {/* Price change alert */}
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
                                3 items changed price since plan was made
                            </div>
                            <div style={{ fontSize: 12, color: "#B45309" }}>Prices updated as of now</div>
                        </div>
                    </div>
                )}

                {/* Items grouped by category */}
                {CATEGORY_ORDER.map((cat) => {
                    const catItems = itemsWithPrices.filter((i) => i.category === cat);
                    if (!catItems.length) return null;
                    return (
                        <div key={cat} style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#8B95A1", marginBottom: 10 }}>
                                {CATEGORY_ICONS[cat]}
                            </div>
                            <div
                                style={{
                                    background: "#fff",
                                    border: "1px solid #E8ECF0",
                                    borderRadius: 16,
                                    overflow: "hidden",
                                }}
                            >
                                {catItems.map((item, idx) => (
                                    <div
                                        key={item.name}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 12,
                                            padding: "14px 16px",
                                            borderBottom: idx < catItems.length - 1 ? "1px solid #F7F8FA" : "none",
                                            opacity: item.inStock ? 1 : 0.6,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: "#1A1D23",
                                                    textDecoration: item.inStock ? "none" : "line-through",
                                                }}
                                            >
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: 12, color: "#8B95A1" }}>
                                                {item.qty} · ${(item.price / parseFloat(item.qty)).toFixed(2)}/{item.unit}
                                            </div>
                                        </div>

                                        <FodmapBadge tier={item.fodmap} size="sm" showLabel={false} />

                                        <div style={{ textAlign: "right", minWidth: 60 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1D23" }}>
                                                ${item.price.toFixed(2)}
                                            </div>
                                        </div>

                                        {!item.inStock && (
                                            <button
                                                style={{
                                                    padding: "5px 10px",
                                                    borderRadius: 8,
                                                    border: "1px solid #FECACA",
                                                    background: "#FEF2F2",
                                                    color: "#EF4444",
                                                    fontWeight: 600,
                                                    fontSize: 11,
                                                    cursor: "pointer",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                Find substitute
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <CartSummary
                subtotal={subtotal}
                retailer={retailer}
                checkoutUrl={`https://${retailer}.com/cart`}
            />
        </main>
    );
}
