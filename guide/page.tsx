/**
 * /guide — FODMAP Beginner Guide
 * Stitch-Loop iteration 1: generated from next-prompt.md baton
 * Design system: dark navy bg, violet?blue gradient, glassmorphism cards
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "FODMAP Guide — GutFlow",
    description:
        "Learn what FODMAP means, understand the three safety tiers (green/yellow/red), and discover how the stacking rule works to protect your gut health.",
};

const TIERS = [
    {
        grade: "green",
        label: "Safe",
        color: "#22C55E",
        bg: "rgba(34,197,94,0.10)",
        border: "rgba(34,197,94,0.25)",
        glow: "rgba(34,197,94,0.20)",
        icon: "?",
        description:
            "Low FODMAP load. These ingredients are generally well-tolerated even in normal serving sizes.",
        examples: ["Chicken", "Brown rice", "Baby spinach"],
    },
    {
        grade: "yellow",
        label: "Caution",
        color: "#EAB308",
        bg: "rgba(234,179,8,0.10)",
        border: "rgba(234,179,8,0.25)",
        glow: "rgba(234,179,8,0.20)",
        icon: "!",
        description:
            "Moderate FODMAP load. Safe in small portions, but stacking multiple yellow ingredients can trigger symptoms.",
        examples: ["Avocado (½)", "Ripe banana", "Coconut milk"],
    },
    {
        grade: "red",
        label: "Avoid",
        color: "#EF4444",
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.25)",
        glow: "rgba(239,68,68,0.20)",
        icon: "?",
        description:
            "High FODMAP load. These ingredients frequently cause gut symptoms and should be eliminated during the elimination phase.",
        examples: ["Garlic", "Onion", "Wheat bread"],
    },
];

const FAQS = [
    {
        q: "What does FODMAP stand for?",
        a: "Fermentable Oligosaccharides, Disaccharides, Monosaccharides, And Polyols — short-chain carbohydrates that are poorly absorbed in the small intestine and can cause bloating, gas, and pain in sensitive individuals.",
    },
    {
        q: "How long should I follow the elimination phase?",
        a: "The Monash University protocol recommends a strict 2–6 week elimination phase, followed by systematic reintroduction of one FODMAP group at a time to identify your personal triggers.",
    },
    {
        q: "What is the stacking rule?",
        a: "Two yellow (moderate) ingredients together can exceed your gut's tolerance threshold — this is called FODMAP stacking. GutFlow detects this automatically and flags meal combinations even when no single ingredient is red.",
    },
    {
        q: "Is GutFlow a replacement for a dietitian?",
        a: "No. GutFlow is an educational tool based on publicly available Monash University research. Always consult a registered dietitian or gastroenterologist before making significant dietary changes for medical conditions.",
    },
];

export default function GuidePage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#0A0F1E",
                fontFamily: "'Inter', -apple-system, sans-serif",
                color: "#fff",
            }}
        >
            {/* -- Nav ------------------------------------------------- */}
            <nav
                style={{
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    padding: "18px 32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    background: "rgba(10,15,30,0.85)",
                }}
            >
                <Link
                    href="/"
                    style={{
                        background: "linear-gradient(135deg, #6B21A8, #1D4ED8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700,
                        fontSize: "1.2rem",
                        textDecoration: "none",
                    }}
                >
                    GutFlow
                </Link>
                <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                    <Link
                        href="/"
                        style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.9rem" }}
                    >
                        Analyzer
                    </Link>
                    <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 500 }}>Guide</span>
                </div>
            </nav>

            {/* -- Hero ------------------------------------------------ */}
            <section style={{ padding: "80px 32px 40px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
                <div
                    style={{
                        display: "inline-block",
                        background: "linear-gradient(135deg, rgba(107,33,168,0.3), rgba(29,78,216,0.3))",
                        border: "1px solid rgba(139,92,246,0.3)",
                        borderRadius: "100px",
                        padding: "6px 18px",
                        fontSize: "0.8rem",
                        color: "rgba(255,255,255,0.7)",
                        marginBottom: "24px",
                        letterSpacing: "0.05em",
                    }}
                >
                    Based on Monash University Guidelines
                </div>
                <h1
                    style={{
                        fontSize: "clamp(2rem, 5vw, 3.5rem)",
                        fontWeight: 800,
                        lineHeight: 1.15,
                        marginBottom: "20px",
                        background: "linear-gradient(135deg, #fff 30%, rgba(139,92,246,0.9))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    What is FODMAP?
                </h1>
                <p
                    style={{
                        fontSize: "1.1rem",
                        color: "rgba(255,255,255,0.65)",
                        lineHeight: 1.7,
                        maxWidth: "600px",
                        margin: "0 auto",
                    }}
                >
                    FODMAP is a group of short-chain carbohydrates that trigger gut symptoms in sensitive
                    people. Understanding the three safety tiers helps you eat confidently on the Low-FODMAP
                    protocol.
                </p>
            </section>

            {/* -- Tier Cards ------------------------------------------ */}
            <section style={{ padding: "20px 32px 60px", maxWidth: "960px", margin: "0 auto" }}>
                <h2
                    style={{
                        textAlign: "center",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        marginBottom: "36px",
                        color: "rgba(255,255,255,0.9)",
                    }}
                >
                    The Three Safety Tiers
                </h2>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "20px",
                    }}
                >
                    {TIERS.map((tier) => (
                        <div
                            key={tier.grade}
                            style={{
                                background: tier.bg,
                                border: `1px solid ${tier.border}`,
                                borderRadius: "16px",
                                padding: "28px 24px",
                                backdropFilter: "blur(12px)",
                                boxShadow: `0 0 30px ${tier.glow}`,
                                transition: "transform 0.2s ease",
                            }}
                            className="tier-card"
                        >
                            {/* Badge */}
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                <div
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "8px",
                                        background: tier.color,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 700,
                                        fontSize: "1rem",
                                        color: "#fff",
                                        flexShrink: 0,
                                    }}
                                >
                                    {tier.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: tier.color }}>
                                        {tier.label}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                        {tier.grade} tier
                                    </div>
                                </div>
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: "16px" }}>
                                {tier.description}
                            </p>
                            {/* Examples */}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {tier.examples.map((ex) => (
                                    <span
                                        key={ex}
                                        style={{
                                            background: "rgba(255,255,255,0.06)",
                                            border: "1px solid rgba(255,255,255,0.1)",
                                            borderRadius: "100px",
                                            padding: "4px 12px",
                                            fontSize: "0.8rem",
                                            color: "rgba(255,255,255,0.7)",
                                        }}
                                    >
                                        {ex}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* -- Stacking Rule --------------------------------------- */}
            <section
                style={{
                    padding: "60px 32px",
                    maxWidth: "760px",
                    margin: "0 auto 20px",
                }}
            >
                <div
                    style={{
                        background: "rgba(234,179,8,0.06)",
                        border: "1px solid rgba(234,179,8,0.2)",
                        borderRadius: "20px",
                        padding: "40px",
                        backdropFilter: "blur(12px)",
                    }}
                >
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "12px" }}>
                        ?? The Stacking Rule
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: "28px", fontSize: "0.95rem" }}>
                        Two{" "}
                        <span style={{ color: "#EAB308", fontWeight: 600 }}>yellow (caution)</span>{" "}
                        ingredients together can push your total FODMAP load over the threshold — even though
                        each ingredient is individually safe in small amounts. GutFlow detects this
                        automatically.
                    </p>

                    {/* Visual: two yellows ? warning */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        {["Avocado ½", "Coconut milk"].map((item) => (
                            <div
                                key={item}
                                style={{
                                    background: "rgba(234,179,8,0.15)",
                                    border: "1px solid rgba(234,179,8,0.35)",
                                    borderRadius: "8px",
                                    padding: "8px 14px",
                                    fontSize: "0.85rem",
                                    color: "#EAB308",
                                    fontWeight: 600,
                                }}
                            >
                                ?? {item}
                            </div>
                        ))}
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.2rem" }}>?</span>
                        {/* Load bar */}
                        <div style={{ flex: 1, minWidth: "140px" }}>
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                                Combined FODMAP load
                            </div>
                            <div
                                style={{
                                    height: "8px",
                                    borderRadius: "100px",
                                    background: "rgba(255,255,255,0.1)",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        height: "100%",
                                        width: "82%",
                                        borderRadius: "100px",
                                        background: "linear-gradient(90deg, #EAB308, #EF4444)",
                                    }}
                                />
                            </div>
                        </div>
                        <div
                            style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.35)",
                                borderRadius: "8px",
                                padding: "8px 14px",
                                fontSize: "0.85rem",
                                color: "#EF4444",
                                fontWeight: 600,
                            }}
                        >
                            ?? Stacking!
                        </div>
                    </div>
                </div>
            </section>

            {/* -- FAQ ------------------------------------------------- */}
            <section style={{ padding: "20px 32px 80px", maxWidth: "760px", margin: "0 auto" }}>
                <h2
                    style={{
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        marginBottom: "28px",
                        color: "rgba(255,255,255,0.9)",
                    }}
                >
                    Common Questions
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {FAQS.map((faq, i) => (
                        <details
                            key={i}
                            style={{
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: "12px",
                                padding: "0",
                                cursor: "pointer",
                            }}
                        >
                            <summary
                                style={{
                                    padding: "18px 20px",
                                    fontWeight: 600,
                                    fontSize: "0.95rem",
                                    color: "rgba(255,255,255,0.9)",
                                    listStyle: "none",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                {faq.q}
                                <span style={{ color: "rgba(139,92,246,0.8)", fontSize: "1.2rem", flexShrink: 0 }}>
                                    +
                                </span>
                            </summary>
                            <div
                                style={{
                                    padding: "0 20px 18px",
                                    color: "rgba(255,255,255,0.6)",
                                    lineHeight: 1.7,
                                    fontSize: "0.9rem",
                                    borderTop: "1px solid rgba(255,255,255,0.06)",
                                    paddingTop: "12px",
                                }}
                            >
                                {faq.a}
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {/* -- CTA ------------------------------------------------- */}
            <section style={{ padding: "20px 32px 80px", textAlign: "center" }}>
                <Link
                    href="/"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "linear-gradient(135deg, #6B21A8, #1D4ED8)",
                        color: "#fff",
                        textDecoration: "none",
                        borderRadius: "12px",
                        padding: "16px 32px",
                        fontWeight: 700,
                        fontSize: "1rem",
                        boxShadow: "0 0 30px rgba(139,92,246,0.3)",
                        transition: "opacity 0.2s",
                    }}
                >
                    Analyze My Ingredients ?
                </Link>
            </section>

            {/* -- Footer ---------------------------------------------- */}
            <footer
                style={{
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    padding: "24px 32px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: "0.8rem",
                }}
            >
                Based on publicly available{" "}
                <a
                    href="https://www.monashfodmap.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "rgba(139,92,246,0.7)", textDecoration: "none" }}
                >
                    Monash University FODMAP guidelines
                </a>
                . Not medical advice. Consult your dietitian.
            </footer>
        </main>
    );
}
