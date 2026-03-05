"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const ALLERGY_SUGGESTIONS = ["Shellfish", "Nuts", "Eggs", "Soy", "Corn"];

const T = {
    bg: "#F7F8FA",
    card: "#fff",
    border: "#E8ECF0",
    text: "#1A1D23",
    muted: "#8B95A1",
    green: "#10B981",
    primary: "#6B21A8",
    primaryDark: "#1D4ED8",
};

function SetupContent() {
    const router = useRouter();
    const params = useSearchParams();

    const [allergyInput, setAllergyInput] = useState("");
    const [allergies, setAllergies] = useState<string[]>([]);
    const [customExclusions, setCustomExclusions] = useState<string[]>([]);
    const [exclusionInput, setExclusionInput] = useState("");

    const addAllergy = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !allergies.includes(trimmed)) {
            setAllergies((prev) => [...prev, trimmed]);
        }
        setAllergyInput("");
    };

    const addExclusion = (val: string) => {
        const trimmed = val.trim();
        if (trimmed && !customExclusions.includes(trimmed)) {
            setCustomExclusions((prev) => [...prev, trimmed]);
        }
        setExclusionInput("");
    };

    const handleGenerate = () => {
        const newParams = new URLSearchParams(params.toString());
        if (allergies.length) newParams.set("allergies", allergies.join(","));
        if (customExclusions.length) newParams.set("exclusions", customExclusions.join(","));
        router.push(`/generating?${newParams.toString()}`);
    };

    // Read from onboarding params for display
    const budget = params.get("budget") || "100";
    const people = params.get("people") || "1";
    const duration = params.get("duration") || "7";
    const diets = params.get("diets")?.split(",").filter(Boolean) || [];

    return (
        <main
            style={{
                minHeight: "100vh",
                background: T.bg,
                fontFamily: "'Inter', -apple-system, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 20px 100px",
            }}
        >
            {/* Header */}
            <div style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        background: "none",
                        border: "none",
                        color: T.muted,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: 0,
                        marginBottom: 16,
                    }}
                >
                    ← Back
                </button>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: T.text, margin: 0 }}>
                    Confirm Your Setup
                </h1>
                <p style={{ fontSize: 14, color: T.muted, marginTop: 6 }}>
                    Add any allergies or extra exclusions before generating your plan.
                </p>
            </div>

            {/* Plan summary card */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 480,
                    background: "#F5F3FF",
                    border: "1px solid #DDD6FE",
                    borderRadius: 16,
                    padding: "16px 20px",
                    marginBottom: 16,
                }}
            >
                <div style={{ fontSize: 12, fontWeight: 700, color: T.primary, letterSpacing: 1, marginBottom: 10 }}>
                    YOUR PLAN SUMMARY
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {[
                        { label: "Budget", value: `$${budget}` },
                        { label: "People", value: people },
                        { label: "Duration", value: `${duration} days` },
                        { label: "Diet", value: ["Low FODMAP", ...diets].join(", ") || "Low FODMAP" },
                    ].map((item) => (
                        <div key={item.label}>
                            <div style={{ fontSize: 10, color: T.muted, fontWeight: 600 }}>{item.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Allergy input */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 480,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 12,
                }}
            >
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                    🚫 Allergy Exclusions
                </div>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
                    These ingredients will be completely blocked from your plan.
                </div>

                {/* Input */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                        type="text"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addAllergy(allergyInput)}
                        placeholder="Type an allergy and press Enter…"
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: `1px solid ${T.border}`,
                            fontSize: 14,
                            outline: "none",
                            fontFamily: "inherit",
                        }}
                    />
                    <button
                        onClick={() => addAllergy(allergyInput)}
                        style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: T.primary,
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        +
                    </button>
                </div>

                {/* Suggestions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {ALLERGY_SUGGESTIONS.filter((s) => !allergies.includes(s)).map((s) => (
                        <button
                            key={s}
                            onClick={() => addAllergy(s)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: 100,
                                border: `1px solid ${T.border}`,
                                background: "#F7F8FA",
                                color: T.muted,
                                fontSize: 12,
                                cursor: "pointer",
                            }}
                        >
                            + {s}
                        </button>
                    ))}
                </div>

                {/* Tags */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {allergies.map((a) => (
                        <span
                            key={a}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "5px 12px",
                                borderRadius: 100,
                                background: "#FEF2F2",
                                border: "1px solid #FECACA",
                                color: "#EF4444",
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {a}
                            <button
                                onClick={() => setAllergies((prev) => prev.filter((x) => x !== a))}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#EF4444",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 14,
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Custom exclusions */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 480,
                    background: T.card,
                    border: `1px solid ${T.border}`,
                    borderRadius: 20,
                    padding: 24,
                    marginBottom: 24,
                }}
            >
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                    ➕ Additional Exclusions
                </div>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
                    Any other ingredients you dislike or want to avoid.
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                        type="text"
                        value={exclusionInput}
                        onChange={(e) => setExclusionInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addExclusion(exclusionInput)}
                        placeholder="e.g. Cilantro, Mushrooms…"
                        style={{
                            flex: 1,
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: `1px solid ${T.border}`,
                            fontSize: 14,
                            outline: "none",
                            fontFamily: "inherit",
                        }}
                    />
                    <button
                        onClick={() => addExclusion(exclusionInput)}
                        style={{
                            padding: "10px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: T.text,
                            color: "#fff",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        +
                    </button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {customExclusions.map((ex) => (
                        <span
                            key={ex}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "5px 12px",
                                borderRadius: 100,
                                background: "#F7F8FA",
                                border: `1px solid ${T.border}`,
                                color: T.text,
                                fontSize: 13,
                                fontWeight: 600,
                            }}
                        >
                            {ex}
                            <button
                                onClick={() => setCustomExclusions((prev) => prev.filter((x) => x !== ex))}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: T.muted,
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 14,
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Sticky CTA */}
            <div
                style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(247,248,250,0.95)",
                    backdropFilter: "blur(12px)",
                    borderTop: `1px solid ${T.border}`,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <button
                    data-testid="generate-btn"
                    onClick={handleGenerate}
                    style={{
                        width: "100%",
                        maxWidth: 480,
                        padding: "16px",
                        borderRadius: 16,
                        border: "none",
                        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: 16,
                        cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(107,33,168,0.35)",
                        transition: "transform 0.15s",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-1px)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
                >
                    Generate My Plan →
                </button>
            </div>
        </main>
    );
}

export default function SetupPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B95A1" }}>Loading…</div>}>
            <SetupContent />
        </Suspense>
    );
}
