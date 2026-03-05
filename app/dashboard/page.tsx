"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Phase data ────────────────────────────────────────────────
const PHASES = [
    {
        num: 1,
        label: "Elimination",
        duration: "2–6 weeks",
        color: "#6B21A8",
        gradientFrom: "#6B21A8",
        gradientTo: "#1D4ED8",
        bg: "#F5F3FF",
        border: "#DDD6FE",
        icon: "🥦",
        headline: "Strict Low FODMAP diet",
        bullets: [
            "Remove all high-FODMAP foods simultaneously",
            "Symptoms should improve within 2–4 weeks",
            "Do not skip this phase — baseline is critical",
            "GutFlow generates your weekly meal plan & grocery cart",
        ],
        cta: { label: "Start My Plan →", href: "/onboarding" },
        ctaSecondary: null,
    },
    {
        num: 2,
        label: "Reintroduction",
        duration: "6–8 weeks",
        color: "#D97706",
        gradientFrom: "#D97706",
        gradientTo: "#EF4444",
        bg: "#FFFBEB",
        border: "#FDE68A",
        icon: "🔬",
        headline: "FODMAP Exit — identify your triggers",
        bullets: [
            "Reintroduce ONE FODMAP group per week",
            "Keep rest of diet strictly Low FODMAP",
            "Log symptoms after each test meal",
            "After each group: Tolerates / Partial / Avoid",
            "6 groups total: Fructans, Fructose, Lactose, Sorbitol, Mannitol, GOS",
        ],
        cta: { label: "Start Reintroduction →", href: "/reintroduce" },
        ctaSecondary: {
            label: "View My Tolerance Profile",
            href: "/reintroduce",
        },
    },
    {
        num: 3,
        label: "Personalization",
        duration: "Ongoing",
        color: "#10B981",
        gradientFrom: "#10B981",
        gradientTo: "#0891B2",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        icon: "✨",
        headline: "Your permanent personalized diet",
        bullets: [
            "Freely eat foods you tolerated in Phase 2",
            "Avoid only your personal trigger groups",
            "Far more variety than strict Low FODMAP",
            "GutFlow plans now reflect your tolerance profile",
        ],
        cta: { label: "View My Profile →", href: "/reintroduce" },
        ctaSecondary: null,
    },
];

const T = {
    bg: "#F7F8FA",
    card: "#fff",
    border: "#E8ECF0",
    text: "#1A1D23",
    muted: "#8B95A1",
    primary: "#6B21A8",
};

export default function DashboardPage() {
    const [activePhase, setActivePhase] = useState<number | null>(null);

    return (
        <main
            style={{
                minHeight: "100vh",
                background: T.bg,
                fontFamily: "'Inter', -apple-system, sans-serif",
                paddingBottom: 60,
            }}
        >
            {/* Nav */}
            <nav
                style={{
                    background: "#fff",
                    borderBottom: `1px solid ${T.border}`,
                    padding: "14px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <div
                    style={{
                        fontSize: 20,
                        fontWeight: 900,
                        background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    GutFlow
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                    <Link href="/" style={{ color: T.muted, textDecoration: "none", fontWeight: 600 }}>Analyzer</Link>
                    <Link href="/market" style={{ color: T.muted, textDecoration: "none", fontWeight: 600 }}>Market</Link>
                </div>
            </nav>

            <div style={{ maxWidth: 680, margin: "0 auto", padding: "36px 20px" }}>

                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 2,
                            color: T.muted,
                            textTransform: "uppercase",
                            marginBottom: 10,
                        }}
                    >
                        The GutFlow Protocol
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 900, color: T.text, margin: "0 0 12px" }}>
                        Your IBS Recovery Journey
                    </h1>
                    <p style={{ fontSize: 15, color: T.muted, max: 480, lineHeight: 1.7, margin: "0 auto", maxWidth: 480 }}>
                        The Low FODMAP diet is a 3-phase clinical protocol. GutFlow guides you through each step — from full elimination to your personalized long-term diet.
                    </p>
                </div>

                {/* Phase timeline connector */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                    {/* Vertical connector line */}
                    <div
                        style={{
                            position: "absolute",
                            left: 27,
                            top: 56,
                            bottom: 56,
                            width: 2,
                            background: `linear-gradient(180deg, #6B21A8, #D97706, #10B981)`,
                            zIndex: 0,
                        }}
                    />

                    {PHASES.map((phase) => {
                        const expanded = activePhase === phase.num;
                        return (
                            <div
                                key={phase.num}
                                style={{ position: "relative", zIndex: 1, marginBottom: 14 }}
                            >
                                {/* Phase card */}
                                <div
                                    style={{
                                        background: expanded ? phase.bg : "#fff",
                                        border: `2px solid ${expanded ? phase.border : T.border}`,
                                        borderRadius: 20,
                                        overflow: "hidden",
                                        transition: "all 0.3s",
                                        boxShadow: expanded ? `0 4px 24px ${phase.border}` : "none",
                                    }}
                                >
                                    {/* Header row */}
                                    <div
                                        onClick={() => setActivePhase(expanded ? null : phase.num)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 16,
                                            padding: "20px 24px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {/* Phase circle */}
                                        <div
                                            style={{
                                                width: 52,
                                                height: 52,
                                                borderRadius: "50%",
                                                background: `linear-gradient(135deg, ${phase.gradientFrom}, ${phase.gradientTo})`,
                                                color: "#fff",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                                fontSize: 11,
                                                fontWeight: 900,
                                                boxShadow: `0 4px 12px ${phase.gradientFrom}55`,
                                            }}
                                        >
                                            <span style={{ fontSize: 20, lineHeight: 1 }}>{phase.icon}</span>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 800,
                                                        color: phase.color,
                                                        textTransform: "uppercase",
                                                        letterSpacing: 1,
                                                    }}
                                                >
                                                    Phase {phase.num}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        background: phase.bg,
                                                        border: `1px solid ${phase.border}`,
                                                        color: phase.color,
                                                        borderRadius: 100,
                                                        padding: "1px 8px",
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    {phase.duration}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>
                                                {phase.label}
                                            </div>
                                            <div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>
                                                {phase.headline}
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                fontSize: 20,
                                                color: T.muted,
                                                transition: "transform 0.3s",
                                                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                                            }}
                                        >
                                            ›
                                        </div>
                                    </div>

                                    {/* Expanded content */}
                                    {expanded && (
                                        <div
                                            style={{
                                                padding: "0 24px 24px",
                                                borderTop: `1px solid ${phase.border}`,
                                                paddingTop: 20,
                                            }}
                                        >
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                                                {phase.bullets.map((bullet, i) => (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "flex-start",
                                                            gap: 10,
                                                            fontSize: 14,
                                                            color: T.text,
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: "50%",
                                                                background: `linear-gradient(135deg,${phase.gradientFrom},${phase.gradientTo})`,
                                                                color: "#fff",
                                                                fontSize: 10,
                                                                fontWeight: 900,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                flexShrink: 0,
                                                                marginTop: 1,
                                                            }}
                                                        >
                                                            {i + 1}
                                                        </div>
                                                        {bullet}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* CTAs */}
                                            <div style={{ display: "flex", gap: 10 }}>
                                                <Link
                                                    href={phase.cta.href}
                                                    style={{
                                                        flex: 1,
                                                        padding: "13px",
                                                        borderRadius: 13,
                                                        background: `linear-gradient(135deg,${phase.gradientFrom},${phase.gradientTo})`,
                                                        color: "#fff",
                                                        fontWeight: 800,
                                                        fontSize: 14,
                                                        textDecoration: "none",
                                                        textAlign: "center",
                                                        boxShadow: `0 4px 14px ${phase.gradientFrom}44`,
                                                    }}
                                                >
                                                    {phase.cta.label}
                                                </Link>
                                                {phase.ctaSecondary && (
                                                    <Link
                                                        href={phase.ctaSecondary.href}
                                                        style={{
                                                            flex: 1,
                                                            padding: "13px",
                                                            borderRadius: 13,
                                                            border: `1.5px solid ${phase.border}`,
                                                            background: "#fff",
                                                            color: phase.color,
                                                            fontWeight: 700,
                                                            fontSize: 14,
                                                            textDecoration: "none",
                                                            textAlign: "center",
                                                        }}
                                                    >
                                                        {phase.ctaSecondary.label}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Clinical note */}
                <div
                    style={{
                        padding: "16px 20px",
                        background: "#fff",
                        border: `1px solid ${T.border}`,
                        borderRadius: 14,
                        fontSize: 12,
                        color: T.muted,
                        lineHeight: 1.7,
                        display: "flex",
                        gap: 10,
                    }}
                >
                    <span style={{ fontSize: 16 }}>🏥</span>
                    <span>
                        The Low FODMAP protocol was developed by Monash University. GutFlow is an educational tool and does not replace a registered dietitian or gastroenterologist. Always consult a healthcare professional before making significant dietary changes for IBS or other medical conditions.
                    </span>
                </div>

                {/* Quick links */}
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    {[
                        { icon: "📊", label: "FODMAP Analyzer", href: "/" },
                        { icon: "🛒", label: "My Meal Plan", href: "/plan/demo" },
                        { icon: "🔬", label: "Reintroduction", href: "/reintroduce" },
                        { icon: "📡", label: "Market Prices", href: "/market" },
                    ].map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            style={{
                                flex: 1,
                                padding: "12px 6px",
                                textAlign: "center",
                                background: "#fff",
                                border: `1px solid ${T.border}`,
                                borderRadius: 12,
                                textDecoration: "none",
                                transition: "transform 0.15s",
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
                        >
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{link.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>
                                {link.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
