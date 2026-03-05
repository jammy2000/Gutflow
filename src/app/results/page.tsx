/**
 * /results — Shareable FODMAP Analysis Results
 * Stitch-Loop iteration 2: built from next-prompt.md baton
 * Design: Stitch-inspired Tailwind dark mode + GutFlow violet/navy system
 * Data: URL query param ?d=<base64-encoded JSON> for deep-linking
 */
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

interface IngredientResult {
    name: string;
    grade: "green" | "yellow" | "red";
    load: number;
    category?: string | null;
    safe_alt?: string | null;
}

interface AnalysisData {
    status: string;
    score: number;
    grade: "green" | "yellow" | "red";
    reds: IngredientResult[];
    yellows: IngredientResult[];
    greens: IngredientResult[];
    message: string;
    ingredients?: string[];
}

const GRADE_CONFIG = {
    green: { label: "SAFE", color: "#22C55E", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)", icon: "✓" },
    yellow: { label: "CAUTION", color: "#EAB308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.3)", icon: "!" },
    red: { label: "DANGER", color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", icon: "✕" },
};

const DEMO: AnalysisData = {
    status: "danger",
    score: 15,
    grade: "red",
    message: "HIGH RISK: garlic, wheat, onion detected.",
    ingredients: ["garlic", "wheat", "onion"],
    reds: [
        { name: "Garlic", grade: "red", load: 10, category: "Fructans", safe_alt: "Garlic-infused oil" },
        { name: "Wheat", grade: "red", load: 10, category: "Fructans/GOS", safe_alt: "Rice flour" },
        { name: "Onion", grade: "red", load: 10, category: "Fructans", safe_alt: "Spring onion (green only)" },
    ],
    yellows: [],
    greens: [],
};

function GradeBadge({ grade, size = "sm" }: { grade: "green" | "yellow" | "red"; size?: "sm" | "lg" }) {
    const cfg = GRADE_CONFIG[grade];
    const pad = size === "lg" ? "14px 28px" : "4px 10px";
    const font = size === "lg" ? "1.1rem" : "0.75rem";
    return (
        <span style={{
            background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "8px",
            color: cfg.color, fontWeight: 700, fontSize: font, padding: pad,
            display: "inline-flex", alignItems: "center", gap: "6px", letterSpacing: "0.05em",
        }}>
            <span style={{ fontWeight: 900 }}>{cfg.icon}</span>
            {cfg.label}
        </span>
    );
}

function ScoreRing({ score, grade }: { score: number; grade: "green" | "yellow" | "red" }) {
    const color = GRADE_CONFIG[grade].color;
    const r = 52, circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return (
        <div style={{ position: "relative", width: 128, height: 128 }}>
            <svg width="128" height="128" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
                <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
                    strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "2rem", fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>/ 100</span>
            </div>
        </div>
    );
}

function ResultsContent() {
    const params = useSearchParams();
    const [data, setData] = useState<AnalysisData>(DEMO);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const raw = params.get("d");
        if (raw) {
            try { setData(JSON.parse(atob(raw))); } catch { /* use demo */ }
        }
    }, [params]);

    const allIngredients = [...data.reds, ...data.yellows, ...data.greens];
    const hasAlts = data.reds.some(r => r.safe_alt);

    const copyLink = () => {
        const url = `${window.location.origin}/results?d=${btoa(JSON.stringify(data))}`;
        navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    return (
        <main style={{ minHeight: "100vh", background: "#0A0F1E", fontFamily: "'Inter', -apple-system, sans-serif", color: "#fff" }}>

            {/* Nav */}
            <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,15,30,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
                <Link href="/" style={{ background: "linear-gradient(135deg,#6B21A8,#1D4ED8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, fontSize: "1.2rem", textDecoration: "none" }}>
                    GutFlow
                </Link>
                <Link href="/" style={{ color: "rgba(255,255,255,0.6)", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    ← Back to Analyzer
                </Link>
            </nav>

            <div style={{ maxWidth: "840px", margin: "0 auto", padding: "48px 24px 80px" }}>

                {/* Results Header */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "36px", backdropFilter: "blur(12px)", marginBottom: "24px", display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
                    <ScoreRing score={data.score} grade={data.grade} />
                    <div style={{ flex: 1, minWidth: "200px" }}>
                        <GradeBadge grade={data.grade} size="lg" />
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "12px 0 8px", lineHeight: 1.2 }}>
                            {data.grade === "green" ? "All Clear!" : data.grade === "yellow" ? "Review Caution Items" : "High-Risk Ingredients Detected"}
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.9rem", lineHeight: 1.6 }}>{data.message}</p>
                        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem", marginTop: "10px" }}>
                            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                    </div>
                </div>

                {/* Stacking Alert */}
                {data.status === "stacking" && (
                    <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
                        <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 700, color: "#EAB308", marginBottom: "4px" }}>FODMAP Stacking Detected</div>
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                                Multiple moderate-FODMAP ingredients in this list combine to exceed the safe threshold. Even though each item may be individually tolerated, together they increase risk.
                            </p>
                        </div>
                    </div>
                )}

                {/* Ingredient Breakdown */}
                {allIngredients.length > 0 && (
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)", marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px", color: "rgba(255,255,255,0.9)" }}>
                            Ingredient Breakdown
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {allIngredients.map((item, i) => {
                                const cfg = GRADE_CONFIG[item.grade];
                                return (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", background: cfg.bg, borderRadius: "12px", border: `1px solid ${cfg.border}` }}>
                                        <div style={{ width: 32, height: 32, borderRadius: "8px", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.9rem", flexShrink: 0 }}>
                                            {cfg.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.name}</span>
                                            {item.category && <span style={{ marginLeft: 8, fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.07)", padding: "2px 8px", borderRadius: "100px" }}>{item.category}</span>}
                                        </div>
                                        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", textAlign: "right" }}>
                                            <div style={{ color: cfg.color, fontWeight: 700 }}>Load {item.load}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Safe Alternatives */}
                {hasAlts && (
                    <div style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)", marginBottom: "24px" }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "16px", color: "#22C55E" }}>
                            ✓ Safe Alternatives
                        </h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {data.reds.filter(r => r.safe_alt).map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                    <span style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "6px 12px", color: "#EF4444", fontWeight: 600, fontSize: "0.85rem" }}>✕ {item.name}</span>
                                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "1.1rem" }}>→</span>
                                    <span style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", padding: "6px 12px", color: "#22C55E", fontWeight: 600, fontSize: "0.85rem" }}>✓ {item.safe_alt}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Share */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "24px", backdropFilter: "blur(12px)", marginBottom: "32px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: "180px" }}>
                        <div style={{ fontWeight: 700, marginBottom: "4px" }}>Share results</div>
                        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>Copy a deep-link to share with your dietitian or doctor.</p>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button onClick={copyLink} style={{ background: copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)", border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.15)"}`, color: copied ? "#22C55E" : "#fff", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", transition: "all 0.2s" }}>
                            {copied ? "✓ Copied!" : "Copy Link"}
                        </button>
                        <button onClick={() => window.print()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)", borderRadius: "10px", padding: "10px 18px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
                            Print / PDF
                        </button>
                    </div>
                </div>

                {/* CTA */}
                <div style={{ textAlign: "center" }}>
                    <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(135deg,#6B21A8,#1D4ED8)", color: "#fff", textDecoration: "none", borderRadius: "12px", padding: "16px 32px", fontWeight: 700, fontSize: "1rem", boxShadow: "0 0 30px rgba(139,92,246,0.3)" }}>
                        Re-analyze with new ingredients →
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "24px 32px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
                Based on publicly available{" "}
                <a href="https://www.monashfodmap.com" target="_blank" rel="noreferrer" style={{ color: "rgba(139,92,246,0.7)", textDecoration: "none" }}>
                    Monash University FODMAP guidelines
                </a>. Not medical advice.
            </footer>
        </main>
    );
}

export default function ResultsPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0A0F1E", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Loading…</div>}>
            <ResultsContent />
        </Suspense>
    );
}
