"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/Navigation";

// --- Design Tokens ----------------------------------------
const T = {
    bg: "#0A0F1E",
    surface: "rgba(255, 255, 255, 0.03)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.5)",
    primary: "#1D4ED8",
    primaryGradient: "linear-gradient(135deg, #6B21A8 0%, #1D4ED8 100%)",
    accent: "#A78BFA",
    glow: "0 0 30px rgba(139, 92, 246, 0.3)",
};

export default function DashboardPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const { hasCompletedOnboarding, dietPhase, weeklyBudget, peopleToFeed } = useUserStore();

    useEffect(() => {
        // Prevent hydration mismatch by waiting for client mount
        setMounted(true);
        if (!hasCompletedOnboarding) {
            router.replace("/onboarding");
        }
    }, [hasCompletedOnboarding, router]);

    if (!mounted || !hasCompletedOnboarding) return null;

    return (
        <main
            style={{
                backgroundColor: T.bg,
                color: T.text,
                minHeight: "100vh",
                paddingBottom: "80px", // space for bottom nav
                fontFamily: "'Inter', sans-serif",
            }}
        >
            {/* Header */}
            <header
                style={{
                    padding: "20px",
                    borderBottom: `1px solid ${T.border}`,
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <div style={{ fontSize: "20px", fontWeight: 800 }}>GutFlow</div>
                <div style={{ display: "flex", gap: "10px" }}>
                    <div style={{ padding: "6px 12px", background: "rgba(167, 139, 250, 0.1)", color: T.accent, borderRadius: "20px", fontSize: "12px", fontWeight: 700, textTransform: "capitalize" }}>
                        {dietPhase} Phase
                    </div>
                </div>
            </header>

            <div style={{ padding: "24px 20px" }}>
                <h1 style={{ fontSize: "32px", fontWeight: 900, marginBottom: "8px" }}>
                    Your Engine is Ready.
                </h1>
                <p style={{ color: T.muted, fontSize: "16px", marginBottom: "32px" }}>
                    Targeting a ${weeklyBudget} budget for {peopleToFeed} {peopleToFeed === 1 ? "person" : "people"}.
                </p>

                {/* Generate Meal Plan CTA */}
                <div
                    style={{
                        background: T.surface,
                        border: `1px solid ${T.border}`,
                        borderRadius: "24px",
                        padding: "32px 24px",
                        textAlign: "center",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Subtle bg glow */}
                    <div style={{ position: "absolute", top: "-50px", left: "50%", transform: "translateX(-50%)", width: "150px", height: "150px", background: T.primaryGradient, filter: "blur(80px)", opacity: 0.5, borderRadius: "50%" }} />

                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚡️</div>
                        <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "12px" }}>Generate Weekly Plan</h2>
                        <p style={{ color: T.muted, fontSize: "15px", lineHeight: 1.5, marginBottom: "24px" }}>
                            GutFlow AI will compile a specialized 3-day Low FODMAP menu avoiding your known triggers while optimizing supermarket costs.
                        </p>

                        <Link
                            href={`/generating?budget=${weeklyBudget}&people=${peopleToFeed}&phase=${dietPhase}`}
                            style={{
                                display: "inline-block",
                                width: "100%",
                                padding: "18px 0",
                                background: T.text,
                                color: T.bg,
                                border: "none",
                                borderRadius: "16px",
                                fontSize: "18px",
                                fontWeight: 800,
                                textDecoration: "none",
                                boxShadow: "0 4px 14px rgba(255,255,255,0.2)",
                            }}
                        >
                            Start Autonomous Engine
                        </Link>
                    </div>
                </div>

                {/* Recent Plans (Placeholder map) */}
                <div style={{ marginTop: "40px" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px" }}>Past Generations</h3>
                    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "20px", textAlign: "center", color: T.muted, fontSize: "14px", fontStyle: "italic" }}>
                        No plans generated yet.
                    </div>
                </div>
            </div>

            {/* Persistent Bottom Tab Nav */}
            <BottomNav activeTab="dashboard" />
        </main>
    );
}
