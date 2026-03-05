"use client";

import Link from "next/link";

// --- Design Tokens ----------------------------------------
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

export default function AboutPage() {
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
                    &larr; Back to Flow
                </Link>
                <div style={{ fontSize: "20px", fontWeight: 800, background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    About GutFlow
                </div>
                <div style={{ width: "100px" }} />
            </nav>

            {/* 2. Hero Section */}
            <section
                style={{
                    padding: "80px 20px 40px",
                    textAlign: "center",
                    maxWidth: "800px",
                    margin: "0 auto",
                }}
            >
                <h1 style={{ fontSize: "48px", fontWeight: 900, marginBottom: "20px", letterSpacing: "-1px" }}>
                    Engineered for <br />
                    <span style={{ background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Digestive Peace.
                    </span>
                </h1>
                <p style={{ fontSize: "18px", color: T.muted, lineHeight: 1.6, maxWidth: "600px", margin: "0 auto" }}>
                    GutFlow is the world&apos;s first autonomous meal planning engine that strictly adheres to the Monash University Low FODMAP protocols, directly integrated with live supermarket inventory.
                </p>
            </section>

            {/* 3. Core Principles */}
            <section style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 20px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "30px", borderBottom: `1px solid ${T.border}`, paddingBottom: "10px" }}>
                    Core Architecture
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                    {/* Block A */}
                    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>⚛</div>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Zero-Compromise Ingredients</h3>
                        <p style={{ color: T.muted, fontSize: "14px", lineHeight: 1.6 }}>
                            We don&apos;t just filter by tags. Our engine cross-references live grocery data against medical-grade IBS safelists before it ever reaches your cart.
                        </p>
                    </div>

                    {/* Block B */}
                    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>$</div>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>Dynamic Budgeting</h3>
                        <p style={{ color: T.muted, fontSize: "14px", lineHeight: 1.6 }}>
                            Eating for health shouldn&apos;t break the bank. GutFlow actively monitors cart totals and redistributes ingredients to guarantee you hit your sub-$100 targets.
                        </p>
                    </div>

                    {/* Block C */}
                    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                        <div style={{ fontSize: "24px", marginBottom: "16px" }}>AI</div>
                        <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px" }}>AI-Driven Context</h3>
                        <p style={{ color: T.muted, fontSize: "14px", lineHeight: 1.6 }}>
                            Powered by massive LLMs, GutFlow understands the nuance between &quot;Natural Flavors&quot; and &quot;Garlic Powder&quot;, catching hidden triggers that human eyes miss.
                        </p>
                    </div>
                </div>
            </section>

            {/* 4. Footer CTA */}
            <section style={{ textAlign: "center", marginTop: "60px", padding: "40px 20px" }}>
                <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "20px" }}>Ready to heal your gut?</h2>
                <Link
                    href="/"
                    style={{
                        display: "inline-block",
                        padding: "16px 32px",
                        background: T.primary,
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                        borderRadius: "12px",
                        boxShadow: T.glow,
                        transition: "all 0.2s ease",
                    }}
                >
                    Start the Analyzer
                </Link>
            </section>
        </main>
    );
}
