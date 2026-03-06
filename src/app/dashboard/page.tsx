"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/Navigation";
import { useUserStore } from "@/lib/store";

const T = {
    bg: "#F0FDF4",
    surface: "#FFFFFF",
    border: "#D1FAE5",
    text: "#0F2D18",
    muted: "#6B7F74",
    primary: "#16A34A",
    primaryLight: "#22C55E",
    accent: "#F97316",
    accentLight: "#FED7AA",
    yellow: "#FCD34D",
    card1: "#ECFDF5",
    card2: "#FFF7ED",
    card3: "#F0F9FF",
};

const PHASE_INFO = {
    elimination: { emoji: "🌱", color: T.primary, label: "Elimination Phase", desc: "Strictest FODMAP avoidance" },
    reintroduction: { emoji: "🔬", color: "#7C3AED", label: "Reintroduction Phase", desc: "Testing food triggers" },
    maintenance: { emoji: "🌿", color: "#0EA5E9", label: "Maintenance Phase", desc: "Sustainable long-term diet" },
};

export default function DashboardPage() {
    const router = useRouter();
    const { hasCompletedOnboarding, dietPhase, weeklyBudget, peopleToFeed } = useUserStore();
    const [mounted, setMounted] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const phase = PHASE_INFO[dietPhase] || PHASE_INFO.elimination;

    const handleGenerate = () => {
        setGenerating(true);
        const params = new URLSearchParams({
            budget: String(weeklyBudget),
            people: String(peopleToFeed),
            phase: dietPhase,
        });
        router.push(`/generating?${params.toString()}`);
    };

    if (!mounted) return null;

    return (
        <main style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Nunito', sans-serif", paddingBottom: 100 }}>
            {/* Header */}
            <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "18px 20px", position: "sticky", top: 0, zIndex: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 28 }}>🥦</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: T.primary }}>GutFlow</span>
                    </div>
                    <Link href="/onboarding" style={{ textDecoration: "none" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: T.card1, border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                            👤
                        </div>
                    </Link>
                </div>
            </header>

            <div style={{ padding: "20px" }}>
                {/* Greeting */}
                <div style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Good morning! 🌤️</p>
                    <h1 style={{ fontSize: 26, fontWeight: 900, margin: "4px 0 0", color: T.text }}>
                        Your Gut Health <span style={{ color: T.primary }}>Dashboard</span>
                    </h1>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    {[
                        { icon: "💰", val: `$${weeklyBudget}`, label: "Weekly Budget", bg: T.card2, color: T.accent },
                        { icon: "👥", val: String(peopleToFeed), label: "People", bg: T.card3, color: "#0EA5E9" },
                        { icon: phase.emoji, val: "Active", label: "Plan Status", bg: T.card1, color: T.primary },
                    ].map(({ icon, val, label, bg, color }) => (
                        <div key={label} style={{ flex: 1, background: bg, borderRadius: 18, padding: "14px 10px", textAlign: "center", border: `1px solid ${T.border}` }}>
                            <div style={{ fontSize: 22 }}>{icon}</div>
                            <div style={{ fontSize: 17, fontWeight: 900, color, marginTop: 2 }}>{val}</div>
                            <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Phase Card */}
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 22, padding: "20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(22,163,74,0.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 32 }}>{phase.emoji}</span>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>Current Phase</div>
                            <div style={{ fontSize: 17, fontWeight: 900, color: phase.color }}>{phase.label}</div>
                        </div>
                    </div>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>{phase.desc}. Your meals are fully personalized for this phase.</p>
                </div>

                {/* Today's tip */}
                <div style={{ background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", border: "1px solid #FCD34D", borderRadius: 18, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 24 }}>💡</span>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#92400E", marginBottom: 3 }}>Gut Health Tip of the Day</div>
                        <p style={{ fontSize: 12, color: "#78350F", margin: 0, lineHeight: 1.5 }}>
                            Eating smaller portions spread throughout the day reduces FODMAP load and eases digestion. Aim for 4-5 smaller meals instead of 3 large ones.
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    id="start-engine-btn"
                    onClick={handleGenerate}
                    disabled={generating}
                    style={{
                        width: "100%",
                        padding: "20px",
                        borderRadius: 22,
                        border: "none",
                        background: generating
                            ? "#A7F3D0"
                            : `linear-gradient(135deg, ${T.primary}, ${T.primaryLight})`,
                        color: "#fff",
                        fontSize: 17,
                        fontWeight: 900,
                        cursor: generating ? "not-allowed" : "pointer",
                        boxShadow: "0 6px 24px rgba(22,163,74,0.35)",
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        fontFamily: "'Nunito', sans-serif",
                        transform: generating ? "scale(0.98)" : "scale(1)",
                    }}
                >
                    {generating ? (
                        <>⏳ Generating your plan…</>
                    ) : (
                        <>🚀 Generate My Meal Plan</>
                    )}
                </button>

                <p style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 10 }}>
                    AI-powered · Low FODMAP · Budget-optimized
                </p>

                {/* Quick links */}
                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                    <Link href="/scanner" style={{ textDecoration: "none", flex: 1 }}>
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "16px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Scan Food</div>
                            <div style={{ fontSize: 11, color: T.muted }}>Check FODMAP safety</div>
                        </div>
                    </Link>
                    <Link href="/guide" style={{ textDecoration: "none", flex: 1 }}>
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 18, padding: "16px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 4 }}>📖</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>FODMAP Guide</div>
                            <div style={{ fontSize: 11, color: T.muted }}>Learn what to eat</div>
                        </div>
                    </Link>
                </div>
            </div>

            <BottomNav activeTab="dashboard" />
        </main>
    );
}
