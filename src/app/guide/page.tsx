"use client";

import Link from "next/link";
import { useState } from "react";

// --- Design Tokens ----------------------------------------
const T = {
    bg: "#0A0F1E",
    glass: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.6)",
    primary: "linear-gradient(135deg, #6B21A8 0%, #1D4ED8 100%)",
    accent: "#6366F1",
    glow: "0 0 30px rgba(139, 92, 246, 0.3)",
};

const guideSteps = [
    {
        title: "Step 1: Set Your Parameters",
        desc: "Enter your weekly budget (e.g., $100), the number of people eating, and select your preferred supermarket. Our engine initializes the constraint map.",
        icon: "1"
    },
    {
        title: "Step 2: AI Generation",
        desc: "GutFlow uses Google Gemini to generate a 3-day or 7-day meal plan. Crucially, it only selects ingredients from the strictly curated 'Green' Monash Tier.",
        icon: "2"
    },
    {
        title: "Step 3: Cart Orchestration",
        desc: "The system aggregates every ingredient, normalizes the units, and injects live pricing. If the total exceeds your budget, the AI re-routes the recipe.",
        icon: "3"
    },
    {
        title: "Step 4: Relief",
        desc: "Follow the provided simple recipes. Eat confidently knowing no hidden onions or garlic are lurking in your food.",
        icon: "4"
    }
];

export default function GuidePage() {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <main
            style={{
                backgroundColor: T.bg,
                color: T.text,
                minHeight: "100vh",
                fontFamily: "'Inter', sans-serif",
                paddingBottom: "80px",
            }}
        >
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
                    &larr; Back to Flow
                </Link>
                <div style={{ fontSize: "20px", fontWeight: 800, background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    System Guide
                </div>
                <div style={{ width: "100px" }} />
            </nav>

            <section style={{ maxWidth: "800px", margin: "60px auto", padding: "0 20px" }}>
                <div style={{ textAlign: "center", marginBottom: "50px" }}>
                    <h1 style={{ fontSize: "40px", fontWeight: 900, marginBottom: "16px" }}>How GutFlow Works</h1>
                    <p style={{ fontSize: "18px", color: T.muted, lineHeight: 1.6 }}>
                        Understanding the pipeline from constraint generation to cart orchestration.
                    </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {guideSteps.map((step, idx) => (
                        <div
                            key={idx}
                            onClick={() => setActiveStep(idx)}
                            style={{
                                background: idx === activeStep ? "rgba(139, 92, 246, 0.1)" : T.glass,
                                border: `1px solid ${idx === activeStep ? T.accent : T.border}`,
                                borderRadius: "16px",
                                padding: "30px",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                display: "flex",
                                gap: "24px",
                                alignItems: "flex-start"
                            }}
                        >
                            <div style={{ fontSize: "32px", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px" }}>
                                {step.icon}
                            </div>
                            <div>
                                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "12px", color: idx === activeStep ? "#fff" : "#ddd" }}>
                                    {step.title}
                                </h3>
                                <p style={{ color: T.muted, fontSize: "15px", lineHeight: 1.6 }}>
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ textAlign: "center", marginTop: "60px", padding: "40px 20px" }}>
                <Link
                    href="/"
                    style={{
                        display: "inline-block",
                        padding: "16px 32px",
                        background: T.glass,
                        border: `1px solid ${T.border}`,
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        borderRadius: "12px",
                        transition: "all 0.2s ease",
                    }}
                >
                    Run It Now
                </Link>
            </section>
        </main>
    );
}
