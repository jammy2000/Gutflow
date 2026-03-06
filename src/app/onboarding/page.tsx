"use client";

import { useState } from "react";
import { useUserStore } from "@/lib/store";
import { useRouter } from "next/navigation";

// --- Design Tokens ----------------------------------------
const T = {
    bg: "#0A0F1E",
    surface: "rgba(255, 255, 255, 0.03)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.5)",
    primary: "#1D4ED8",
    primaryGradient: "linear-gradient(135deg, #6B21A8 0%, #1D4ED8 100%)",
    glow: "0 0 30px rgba(139, 92, 246, 0.3)",
};

const PHASES = [
    { id: "elimination", label: "Elimination Phase", desc: "Strictly cut out all High FODMAPs." },
    { id: "reintroduction", label: "Reintroduction Phase", desc: "Slowly testing triggers one by one." },
    { id: "maintenance", label: "Maintenance Phase", desc: "Eating freely except for known personal triggers." },
];

const COMMON_TRIGGERS = ["Garlic", "Onion", "Lactose (Dairy)", "Wheat", "Fructose (Apples/Honey)"];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    // Local state for the form
    const [phase, setPhase] = useState<'elimination' | 'reintroduction' | 'maintenance'>('elimination');
    const [budget, setBudget] = useState(100);
    const [people, setPeople] = useState(1);
    const [triggers, setTriggers] = useState<string[]>([]);

    // Global Zustand Actions
    const { setDietPhase, setWeeklyBudget, setPeopleToFeed, setKnownTriggers, setHasCompletedOnboarding } = useUserStore();

    const handleNext = () => setStep((s) => s + 1);
    const handleBack = () => setStep((s) => Math.max(1, s - 1));

    const handleToggleTrigger = (trigger: string) => {
        setTriggers((prev) =>
            prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]
        );
    };

    const handleComplete = () => {
        // Save everything to LocalStorage via Zustand
        setDietPhase(phase);
        setWeeklyBudget(budget);
        setPeopleToFeed(people);
        setKnownTriggers(triggers);
        setHasCompletedOnboarding(true);

        // Redirect to the new personalized dashboard
        router.replace("/dashboard");
    };

    return (
        <main
            style={{
                backgroundColor: T.bg,
                color: T.text,
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "20px",
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <div
                style={{
                    maxWidth: "480px",
                    margin: "0 auto",
                    width: "100%",
                }}
            >
                {/* Progress Bar */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "40px" }}>
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            style={{
                                flex: 1,
                                height: "4px",
                                borderRadius: "2px",
                                background: step >= s ? T.primary : T.surface,
                                transition: "background 0.3s ease",
                            }}
                        />
                    ))}
                </div>

                {/* STEP 1: Phase */}
                {step === 1 && (
                    <div style={{ animation: "fadeIn 0.5s ease" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>
                            Where are you in your journey?
                        </h1>
                        <p style={{ color: T.muted, marginBottom: "32px", fontSize: "16px", lineHeight: 1.5 }}>
                            The Low FODMAP diet has 3 clinical phases. GutFlow tailors algorithms based on your current stage.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {PHASES.map((p) => {
                                const isSelected = phase === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setPhase(p.id as any)}
                                        style={{
                                            background: isSelected ? "rgba(29, 78, 216, 0.1)" : T.surface,
                                            border: `2px solid ${isSelected ? T.primary : T.border}`,
                                            borderRadius: "16px",
                                            padding: "20px",
                                            textAlign: "left",
                                            color: T.text,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                        }}
                                    >
                                        <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "6px" }}>{p.label}</div>
                                        <div style={{ fontSize: "14px", color: T.muted }}>{p.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 2: Parameters */}
                {step === 2 && (
                    <div style={{ animation: "fadeIn 0.5s ease" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>
                            Set your engine limits.
                        </h1>
                        <p style={{ color: T.muted, marginBottom: "32px", fontSize: "16px", lineHeight: 1.5 }}>
                            We will actively reroute recipe generation to ensure you stay under budget.
                        </p>

                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: T.muted, marginBottom: "12px" }}>
                                Weekly Grocery Budget ($)
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <span style={{ fontSize: "32px", fontWeight: 800, color: T.muted }}>$</span>
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(Number(e.target.value))}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        outline: "none",
                                        color: T.text,
                                        fontSize: "40px",
                                        fontWeight: 800,
                                        width: "100%",
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                            <label style={{ display: "block", fontSize: "14px", fontWeight: 600, color: T.muted, marginBottom: "12px" }}>
                                How many people are you feeding?
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                                <button
                                    onClick={() => setPeople(Math.max(1, people - 1))}
                                    style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: "20px" }}
                                >
                                    -
                                </button>
                                <div style={{ fontSize: "24px", fontWeight: 700 }}>{people}</div>
                                <button
                                    onClick={() => setPeople(people + 1)}
                                    style={{ width: "40px", height: "40px", borderRadius: "50%", background: T.surface, border: `1px solid ${T.border}`, color: T.text, fontSize: "20px" }}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Triggers */}
                {step === 3 && (
                    <div style={{ animation: "fadeIn 0.5s ease" }}>
                        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "12px" }}>
                            Select known triggers
                        </h1>
                        <p style={{ color: T.muted, marginBottom: "32px", fontSize: "16px", lineHeight: 1.5 }}>
                            Even in maintenance mode, the AI will strictly filter out these specific ingredients across all your generations.
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                            {COMMON_TRIGGERS.map((t) => {
                                const isSelected = triggers.includes(t);
                                return (
                                    <button
                                        key={t}
                                        onClick={() => handleToggleTrigger(t)}
                                        style={{
                                            background: isSelected ? "rgba(220, 38, 38, 0.15)" : T.surface,
                                            border: `1px solid ${isSelected ? "#DC2626" : T.border}`,
                                            borderRadius: "20px",
                                            padding: "12px 20px",
                                            color: isSelected ? "#FCA5A5" : T.text,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            fontSize: "15px",
                                            fontWeight: isSelected ? 600 : 400,
                                        }}
                                    >
                                        {isSelected ? "🚫 " : ""}{t}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bottom Actions */}
                <div style={{ display: "flex", gap: "12px", marginTop: "40px" }}>
                    {step > 1 && (
                        <button
                            onClick={handleBack}
                            style={{
                                flex: "0 0 auto",
                                padding: "16px 24px",
                                background: "transparent",
                                border: `1px solid ${T.border}`,
                                color: T.text,
                                borderRadius: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Back
                        </button>
                    )}

                    <button
                        onClick={step < 3 ? handleNext : handleComplete}
                        style={{
                            flex: 1,
                            padding: "16px 24px",
                            background: T.primaryGradient,
                            border: "none",
                            color: "#fff",
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: "16px",
                            cursor: "pointer",
                            boxShadow: T.glow,
                        }}
                    >
                        {step < 3 ? "Continue" : "Initialize Engine"}
                    </button>
                </div>
            </div>
        </main>
    );
}
