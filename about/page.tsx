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
                    ? Back to Analyzer
                </Link>
                <div style={{ fontSize: "20px", fontWeight: 800, background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    About GutFlow
                </div>
            </nav>

            <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%", padding: "60px 20px" }}>
                {/* 2. Hero Section */}
                <section style={{ textAlign: "center", marginBottom: "80px" }}>
                    <h1 style={{ fontSize: "48px", fontWeight: 900, marginBottom: "24px", letterSpacing: "-1px" }}>
                        Our <span style={{ background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Mission</span>
                    </h1>
                    <p style={{ fontSize: "20px", color: T.muted, lineHeight: 1.6 }}>
                        Eating Low-FODMAP shouldn't feel like solving a puzzle. GutFlow is here to make it simple — just scan, check, and eat without the second-guessing. We've got your gut covered. ??
                    </p>
                </section>

                {/* 3. The Stacking Engine */}
                <section style={{ marginBottom: "80px" }}>
                    <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "24px", textAlign: "center" }}>The Stacking Engine</h2>
                    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: "20px", padding: "32px", backdropFilter: "blur(12px)" }}>
                        <p style={{ marginBottom: "20px", lineHeight: 1.7 }}>
                            Unlike simple "safe or unsafe" lists, GutFlow uses a sophisticated **Stacking Engine** that calculates cumulative risks. We account for:
                        </p>
                        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "16px" }}>
                            {[
                                { title: "Synergy Multipliers", desc: "How ingredients in the same category amplify their total load." },
                                { title: "Portion Intelligence", desc: "Identifying items that are safe only in specific quantities." },
                                { title: "Hidden Risk Detection", desc: "Highlighting additives like 'natural flavors' or 'inulin' often missed by humans." },
                            ].map((item, i) => (
                                <li key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                    <span style={{ fontSize: "20px" }}>??</span>
                                    <div>
                                        <strong style={{ display: "block", fontSize: "16px", marginBottom: "4px" }}>{item.title}</strong>
                                        <span style={{ fontSize: "14px", color: T.muted }}>{item.desc}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* 4. Medical Basis */}
                <section style={{ marginBottom: "80px", textAlign: "center" }}>
                    <h2 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "24px" }}>Medical Basis</h2>
                    <p style={{ color: T.muted, lineHeight: 1.7 }}>
                        Our analysis engine is built upon public research and guidelines pioneered by **Monash University**. We continually update our database to reflect the latest consensus in gastroenterology and nutritional science.
                    </p>
                </section>

                {/* 5. Detailed Medical Disclaimer */}
                <section style={{ marginBottom: "80px" }}>
                    <div
                        style={{
                            background: "rgba(234, 179, 8, 0.05)",
                            border: `1px solid rgba(234, 179, 8, 0.2)`,
                            borderRadius: "20px",
                            padding: "40px",
                            boxShadow: "0 0 40px rgba(234, 179, 8, 0.1)",
                        }}
                    >
                        <h3 style={{ fontSize: "20px", fontWeight: 800, color: T.warning, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                            ?? MEDICAL DISCLAIMER
                        </h3>
                        <div style={{ fontSize: "14px", lineHeight: 1.8, color: "rgba(255,255,255,0.8)" }}>
                            <p style={{ marginBottom: "16px" }}>
                                GutFlow is a informational tool and DOES NOT provide medical advice, diagnosis, or treatment. The information provided by this application is for general educational purposes only.
                            </p>
                            <p style={{ marginBottom: "16px" }}>
                                Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this application.
                            </p>
                            <p>
                                The Low-FODMAP diet is complex and should ideally be undertaken under the supervision of a registered dietitian specialized in gastrointestinal health.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 6. Contact & Support */}
                <section style={{ textAlign: "center" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px" }}>Connect With Us</h3>
                    <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
                        <a href="mailto:support@GutFlow.com" style={{ color: T.muted, textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>Email Support</a>
                        <a href="#" style={{ color: T.muted, textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>Twitter / X</a>
                        <a href="#" style={{ color: T.muted, textDecoration: "none", fontSize: "14px", fontWeight: 600 }}>Documentation</a>
                    </div>
                </section>
            </div>

            {/* 7. Footer */}
            <footer style={{ marginTop: "auto", padding: "40px 20px", textAlign: "center", borderTop: `1px solid ${T.border}`, fontSize: "12px", color: T.muted }}>
                <p>© 2026 GutFlow. Not affiliated with Monash University.</p>
                <p style={{ marginTop: "8px" }}>Always consult a doctor before starting the Low-FODMAP protocol.</p>
            </footer>
        </main>
    );
}
