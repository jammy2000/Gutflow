"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Design Tokens ────────────────────────────────────────
const T = {
    bg: "#0A0F1E",
    glass: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.6)",
    primary: "linear-gradient(135deg, #6B21A8 0%, #1D4ED8 100%)",
    danger: "#EF4444",
    warning: "#EAB308",
    success: "#22C55E",
    glow: "0 0 30px rgba(139, 92, 246, 0.3)",
};

export default function MarketDashboard() {
    const [activeTab, setActiveTab] = useState("all");
    const [triggers, setTriggers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMarketData() {
            try {
                const res = await fetch("/api/market-update");
                const data = await res.json();
                if (data.triggers) setTriggers(data.triggers);
            } catch (err) {
                console.error("Failed to fetch market data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchMarketData();
        const interval = setInterval(fetchMarketData, 20000); // 20s polling
        return () => clearInterval(interval);
    }, []);

    return (
        <main
            style={{
                backgroundColor: T.bg,
                color: T.text,
                minHeight: "100vh",
                fontFamily: "'Inter', sans-serif",
                display: "flex",
                flexDirection: "column",
                paddingBottom: "80px",
            }}
        >
            {/* 1. Nav Bar */}
            <nav
                style={{
                    padding: "20px 40px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `1px solid ${T.border}`,
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}
            >
                <Link href="/" style={{ color: T.text, textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>
                    ← Back to Analyzer
                </Link>
                <div style={{ fontSize: "20px", fontWeight: 800, background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    GutFlow Market
                </div>
            </nav>

            <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", padding: "40px 20px" }}>
                {/* 2. Dashboard Header */}
                <header style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                        <h1 style={{ fontSize: "36px", fontWeight: 900, marginBottom: "8px" }}>Market Intelligence</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: T.muted }}>
                            <span style={{ width: "8px", height: "8px", background: T.success, borderRadius: "50%", boxShadow: "0 0 10px #22C55E", animation: "pulse 2s infinite" }} />
                            Live Updates from 12 Retailers
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <span style={{ padding: "8px 16px", borderRadius: "8px", background: T.glass, border: `1px solid ${T.border}`, fontSize: "12px", fontWeight: 600 }}>Region: Northeast</span>
                    </div>
                </header>

                {/* 3. Summary Stats Row */}
                <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
                    {[
                        { label: "Avg. Basket Change", value: "-2.4%", trend: "down", color: T.success, detail: "vs last week" },
                        { label: "Heaviest Price Drop", value: "Rice Flour", trend: "down", color: T.success, detail: "15% off at MarketCentral" },
                        { label: "Top Saver", value: "Quinoa Bulk", trend: "up", color: T.warning, detail: "Trending up soon" },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px", backdropFilter: "blur(12px)" }}>
                            <div style={{ fontSize: "12px", fontWeight: 800, color: T.muted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>{stat.label}</div>
                            <div style={{ fontSize: "28px", fontWeight: 900, color: stat.color, marginBottom: "4px" }}>{stat.value}</div>
                            <div style={{ fontSize: "13px", color: T.muted }}>{stat.detail}</div>
                        </div>
                    ))}
                </section>

                {/* 4. Price Trends Graph Placeholder */}
                <section style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "32px", marginBottom: "40px", position: "relative" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>FODMAP Staples Index (30d)</h3>
                    <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "12px" }}>
                        {[40, 60, 45, 70, 55, 80, 65, 90, 75, 50, 45, 30].map((h, i) => (
                            <div key={i} style={{ flex: 1, background: T.primary, height: `${h}%`, borderRadius: "4px 4px 0 0", opacity: 0.3 + (h / 100) * 0.7, minWidth: "10px" }} />
                        ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "10px", color: T.muted, textTransform: "uppercase" }}>
                        <span>Jan 21</span>
                        <span>Jan 28</span>
                        <span>Feb 04</span>
                        <span>Feb 11</span>
                        <span>Today</span>
                    </div>
                </section>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "40px" }}>
                    {/* 5. Cheapest Staples Table */}
                    <section>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Cheapest Staples</h3>
                        <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${T.border}` }}>
                                        <th style={{ textAlign: "left", padding: "16px", color: T.muted, fontWeight: 600 }}>Item</th>
                                        <th style={{ textAlign: "left", padding: "16px", color: T.muted, fontWeight: 600 }}>Best Store</th>
                                        <th style={{ textAlign: "right", padding: "16px", color: T.muted, fontWeight: 600 }}>Price</th>
                                        <th style={{ textAlign: "right", padding: "16px", color: T.muted, fontWeight: 600 }}>Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { item: "White Rice (5kg)", store: "MarketCentral", price: "$8.99", trend: "-2%", color: T.success },
                                        { item: "Quinoa (1kg)", store: "WholeFoods", price: "$6.45", trend: "+5%", color: T.warning },
                                        { item: "GF Penne", store: "TraderJoes", price: "$2.99", trend: "Stable", color: T.text },
                                        { item: "Almond Milk", store: "Aldi", price: "$1.89", trend: "-12%", color: T.success },
                                        { item: "Maple Syrup", store: "Costco", price: "$14.50", trend: "+1%", color: T.warning },
                                    ].map((row, i) => (
                                        <tr key={i} style={{ borderBottom: i === 4 ? "none" : `1px solid ${T.border}` }}>
                                            <td style={{ padding: "16px", fontWeight: 600 }}>{row.item}</td>
                                            <td style={{ padding: "16px", color: T.muted }}>{row.store}</td>
                                            <td style={{ padding: "16px", textAlign: "right", fontWeight: 700 }}>{row.price}</td>
                                            <td style={{ padding: "16px", textAlign: "right", color: row.color, fontWeight: 800 }}>{row.trend}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 6. Recent Triggers Log */}
                    <section>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>Trigger Alerts</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
                            {loading && triggers.length === 0 ? (
                                <div style={{ color: T.muted, textAlign: "center", padding: "20px" }}>Loading signals...</div>
                            ) : triggers.length === 0 ? (
                                <div style={{ color: T.muted, textAlign: "center", padding: "20px" }}>No triggers yet</div>
                            ) : (
                                triggers.map((trigger, i) => (
                                    <div key={i} style={{ background: T.glass, border: `1px solid ${trigger.delta < 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: "12px", padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                                        <div style={{ fontSize: "20px" }}>{trigger.delta < 0 ? "📉" : "📈"}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: "14px", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {trigger.item_name ?? trigger.item_id}
                                            </div>
                                            <div style={{ fontSize: "11px", color: T.muted, marginTop: "2px", display: "flex", gap: "8px", alignItems: "center" }}>
                                                <span style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>{trigger.store}</span>
                                                <span>·</span>
                                                <span>${trigger.old_price.toFixed(2)} → ${trigger.new_price.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                            <div style={{ fontSize: "13px", fontWeight: 800, color: trigger.delta < 0 ? T.success : T.danger }}>
                                                {trigger.delta < 0 ? "▼" : "▲"} ${Math.abs(trigger.delta).toFixed(2)}
                                            </div>
                                            <div style={{ fontSize: "10px", color: T.muted, marginTop: "2px" }}>{new Date(trigger.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </section>
                </div>
            </div>

            {/* 7. Footer */}
            <footer style={{ marginTop: "auto", padding: "40px 20px", textAlign: "center", borderTop: `1px solid ${T.border}`, fontSize: "12px", color: T.muted }}>
                <p>Market data provided by OpenPrice API & Community Crowdsourcing.</p>
                <p style={{ marginTop: "8px" }}>Always verify prices in-store before purchase.</p>
            </footer>

            <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>
        </main>
    );
}
