"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
    { label: "Diet Setup", icon: "🌿" },
    { label: "Budget", icon: "💰" },
    { label: "People & Duration", icon: "👥" },
];

const DIET_MODES = [
    {
        id: "vegetarian",
        label: "Vegetarian",
        icon: "🥗",
        desc: "No meat — customize allowances below",
        hasSubOptions: true,
    },
    {
        id: "keto",
        label: "Keto",
        icon: "🥑",
        desc: "High fat, very low carb — naturally FODMAP-compatible",
        hasSubOptions: false,
    },
    {
        id: "paleo",
        label: "Paleo",
        icon: "🍖",
        desc: "No grains or legumes — overlaps well with Low FODMAP",
        hasSubOptions: false,
    },
    {
        id: "mediterranean",
        label: "Mediterranean",
        icon: "🫒",
        desc: "Olive oil-rich — grains & legumes auto-substituted",
        hasSubOptions: false,
    },
    {
        id: "halal",
        label: "Halal",
        icon: "☪️",
        desc: "No pork or alcohol — conflict-checked at plan generation",
        hasSubOptions: false,
    },
];

const VEGETARIAN_SUB = [
    { id: "eggs", label: "Eggs", icon: "🥚" },
    { id: "fish", label: "Fish & Seafood", icon: "🐟" },
    { id: "dairy", label: "Dairy", icon: "🧀" },
];

const BUDGET_PRESETS = [50, 75, 100, 150];
const PEOPLE_OPTIONS = [1, 2, 3, 4];
const DURATION_OPTIONS = [1, 2, 3, 5, 7];

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

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);

    // Step 1 — Diet
    const [selectedDiet, setSelectedDiet] = useState<string | null>(null);
    const [vegSubs, setVegSubs] = useState<string[]>(["eggs", "dairy"]); // default lacto-ovo

    // Step 2 — Budget
    const [budget, setBudget] = useState(100);

    // Step 3 — People & Duration
    const [people, setPeople] = useState(1);
    const [duration, setDuration] = useState(7);

    const toggleVegSub = (id: string) =>
        setVegSubs((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

    const handleFinish = () => {
        const params = new URLSearchParams({
            diet: selectedDiet || "none",
            budget: String(budget),
            people: String(people),
            duration: String(duration),
        });
        if (selectedDiet === "vegetarian") {
            params.set("veg_sub", vegSubs.join(","));
        }
        router.push(`/generating?${params.toString()}`);
    };

    const progress = ((step + 1) / STEPS.length) * 100;

    return (
        <main
            style={{
                minHeight: "100vh",
                background: T.bg,
                fontFamily: "'Inter', -apple-system, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "0 20px 60px",
            }}
        >
            {/* Logo */}
            <div style={{ paddingTop: 48, textAlign: "center", marginBottom: 32 }}>
                <div
                    style={{
                        fontSize: 28,
                        fontWeight: 900,
                        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    GutFlow
                </div>
                <div style={{ fontSize: 15, color: T.muted, marginTop: 6 }}>
                    Eat well with IBS. No guesswork.
                </div>
            </div>

            {/* Progress */}
            <div style={{ width: "100%", maxWidth: 520, marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    {STEPS.map((s, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div
                                style={{
                                    width: 24, height: 24, borderRadius: "50%",
                                    background: i <= step ? T.primary : T.border,
                                    color: i <= step ? "#fff" : T.muted,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 800, transition: "background 0.3s",
                                }}
                            >
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span style={{ fontSize: 11, color: i === step ? T.text : T.muted, fontWeight: i === step ? 700 : 400 }}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ height: 4, borderRadius: 4, background: T.border, overflow: "hidden" }}>
                    <div
                        style={{
                            height: "100%", width: `${progress}%`, borderRadius: 4,
                            background: `linear-gradient(90deg, ${T.primary}, ${T.primaryDark})`,
                            transition: "width 0.4s ease",
                        }}
                    />
                </div>
            </div>

            {/* Card */}
            <div
                style={{
                    width: "100%", maxWidth: 520,
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 24, padding: 32,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                }}
            >
                {/* ── Step 1: Diet Setup ── */}
                {step === 0 && (
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                            {STEPS[0].icon} {STEPS[0].label}
                        </div>
                        <div style={{ fontSize: 14, color: T.muted, marginBottom: 20 }}>
                            Every plan is Low FODMAP by default. Select an optional dietary mode below.
                        </div>

                        {/* Low FODMAP foundation block */}
                        <div
                            style={{
                                padding: "16px 18px", borderRadius: 14,
                                background: "#ECFDF5", border: `2px solid ${T.green}`,
                                marginBottom: 16,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 20 }}>🥦</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>Low FODMAP</div>
                                    <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 1 }}>
                                        Always active · cannot be disabled
                                    </div>
                                </div>
                                <div
                                    style={{
                                        background: T.green, color: "#fff", borderRadius: 100,
                                        padding: "3px 10px", fontSize: 11, fontWeight: 800,
                                    }}
                                >
                                    Base
                                </div>
                            </div>

                            {/* Separator */}
                            <div style={{ margin: "14px 0 12px", borderTop: "1px dashed #A7F3D0" }} />
                            <div
                                style={{
                                    fontSize: 11, fontWeight: 700, color: "#059669",
                                    letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase",
                                }}
                            >
                                Additional Dietary Mode within Low FODMAP (optional)
                            </div>

                            {/* Diet mode grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                {DIET_MODES.map((mode) => {
                                    const active = selectedDiet === mode.id;
                                    return (
                                        <div
                                            key={mode.id}
                                            onClick={() => setSelectedDiet(active ? null : mode.id)}
                                            style={{
                                                padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                                                background: active ? T.primary : "#fff",
                                                border: `2px solid ${active ? T.primary : "#D1FAE5"}`,
                                                transition: "all 0.2s",
                                                boxShadow: active ? "0 2px 12px rgba(107,33,168,0.25)" : "none",
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                <span style={{ fontSize: 18 }}>{mode.icon}</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: active ? "#fff" : T.text }}>
                                                    {mode.label}
                                                </span>
                                                <div
                                                    style={{
                                                        marginLeft: "auto", width: 16, height: 16, borderRadius: "50%",
                                                        border: `2px solid ${active ? "#fff" : "#A7F3D0"}`,
                                                        background: active ? "#fff" : "transparent",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {active && <span style={{ color: T.primary, fontSize: 9, fontWeight: 900 }}>✓</span>}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.75)" : T.muted, lineHeight: 1.4 }}>
                                                {mode.desc}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Vegetarian sub-options */}
                            {selectedDiet === "vegetarian" && (
                                <div
                                    style={{
                                        marginTop: 14, padding: "14px 16px", borderRadius: 12,
                                        background: "#F5F3FF", border: "1px solid #DDD6FE",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: 11, fontWeight: 700, color: T.primary,
                                            letterSpacing: 0.5, marginBottom: 10, textTransform: "uppercase",
                                        }}
                                    >
                                        Customize Vegetarian — What&apos;s allowed?
                                    </div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {VEGETARIAN_SUB.map((sub) => {
                                            const on = vegSubs.includes(sub.id);
                                            return (
                                                <div
                                                    key={sub.id}
                                                    onClick={() => toggleVegSub(sub.id)}
                                                    style={{
                                                        flex: 1, textAlign: "center", padding: "10px 6px",
                                                        borderRadius: 10, cursor: "pointer",
                                                        background: on ? "#EDE9FE" : "#fff",
                                                        border: `2px solid ${on ? T.primary : "#DDD6FE"}`,
                                                        transition: "all 0.2s",
                                                    }}
                                                >
                                                    <div style={{ fontSize: 20, marginBottom: 4 }}>{sub.icon}</div>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: on ? T.primary : T.muted }}>
                                                        {sub.label}
                                                    </div>
                                                    <div style={{ fontSize: 9, color: on ? T.primary : T.muted, marginTop: 2 }}>
                                                        {on ? "✓ Allowed" : "Not included"}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>
                                        Note: Soy milk is always excluded (GOS content). Use rice or almond milk.
                                    </div>
                                </div>
                            )}

                            {/* Halal conflict note */}
                            {selectedDiet === "halal" && (
                                <div
                                    style={{
                                        marginTop: 12, padding: "10px 14px", borderRadius: 10,
                                        background: "#FFF7ED", border: "1px solid #FED7AA",
                                        fontSize: 11, color: "#92400E", display: "flex", gap: 8,
                                    }}
                                >
                                    <span>ℹ️</span>
                                    <span>If Halal + Low FODMAP cannot be satisfied simultaneously, you will be notified at plan generation.</span>
                                </div>
                            )}
                        </div>

                        {/* No preference option */}
                        <div
                            onClick={() => setSelectedDiet(null)}
                            style={{
                                padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                                background: selectedDiet === null ? "#F5F3FF" : "#F7F8FA",
                                border: `1.5px solid ${selectedDiet === null ? T.primary : T.border}`,
                                display: "flex", alignItems: "center", gap: 10,
                                transition: "all 0.2s",
                            }}
                        >
                            <span style={{ fontSize: 18 }}>🍽️</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>No additional preference</div>
                                <div style={{ fontSize: 11, color: T.muted }}>Low FODMAP only — maximum food variety</div>
                            </div>
                            {selectedDiet === null && (
                                <span style={{ color: T.primary, fontSize: 14, fontWeight: 900 }}>✓</span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Budget ── */}
                {step === 1 && (
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                            {STEPS[1].icon} {STEPS[1].label}
                        </div>
                        <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>
                            Total grocery budget (USD, tax-inclusive estimate)
                        </div>

                        <div
                            style={{
                                textAlign: "center", marginBottom: 24, padding: "24px",
                                background: "#F5F3FF", borderRadius: 16, border: "1px solid #DDD6FE",
                            }}
                        >
                            <div style={{ fontSize: 48, fontWeight: 900, color: T.primary }}>${budget}</div>
                            <div style={{ fontSize: 13, color: T.muted }}>estimated weekly budget</div>
                        </div>

                        <input
                            type="range" min={30} max={200} step={5} value={budget}
                            onChange={(e) => setBudget(Number(e.target.value))}
                            style={{ width: "100%", marginBottom: 16, accentColor: T.primary }}
                        />
                        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            {BUDGET_PRESETS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setBudget(p)}
                                    style={{
                                        padding: "8px 16px", borderRadius: 10,
                                        border: `2px solid ${budget === p ? T.primary : T.border}`,
                                        background: budget === p ? "#F5F3FF" : "#fff",
                                        color: budget === p ? T.primary : T.muted,
                                        fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                                    }}
                                >
                                    ${p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 3: People & Duration ── */}
                {step === 2 && (
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>
                            {STEPS[2].icon} {STEPS[2].label}
                        </div>
                        <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>
                            How many people and how many days?
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 10, letterSpacing: 0.5 }}>
                                NUMBER OF PEOPLE
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                {PEOPLE_OPTIONS.map((p) => (
                                    <div
                                        key={p}
                                        onClick={() => setPeople(p)}
                                        style={{
                                            flex: 1, textAlign: "center", padding: "14px 0", borderRadius: 14,
                                            border: `2px solid ${people === p ? T.primary : T.border}`,
                                            background: people === p ? "#F5F3FF" : "#F7F8FA",
                                            cursor: "pointer", transition: "all 0.2s",
                                        }}
                                    >
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>
                                            {["🧑", "👫", "👨‍👩‍👦", "👨‍👩‍👧‍👦"][p - 1]}
                                        </div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: people === p ? T.primary : T.muted }}>
                                            {p}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 10, letterSpacing: 0.5 }}>
                                PLAN DURATION
                            </div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {DURATION_OPTIONS.map((d) => (
                                    <div
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        style={{
                                            flex: "1 1 60px", textAlign: "center", padding: "12px 8px", borderRadius: 12,
                                            border: `2px solid ${duration === d ? T.primary : T.border}`,
                                            background: duration === d ? "#F5F3FF" : "#F7F8FA",
                                            cursor: "pointer", transition: "all 0.2s",
                                        }}
                                    >
                                        <div style={{ fontSize: 18, fontWeight: 900, color: duration === d ? T.primary : T.text }}>{d}</div>
                                        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>day{d > 1 ? "s" : ""}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                    {step > 0 && (
                        <button
                            onClick={() => setStep((s) => s - 1)}
                            style={{
                                flex: 1, padding: "14px", borderRadius: 14,
                                border: `1px solid ${T.border}`, background: "#fff",
                                color: T.muted, fontWeight: 700, fontSize: 15, cursor: "pointer",
                            }}
                        >
                            ← Back
                        </button>
                    )}
                    <button
                        onClick={() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : handleFinish())}
                        style={{
                            flex: 2, padding: "14px", borderRadius: 14, border: "none",
                            background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
                            color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                            boxShadow: "0 4px 16px rgba(107,33,168,0.3)", transition: "transform 0.15s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-1px)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
                    >
                        {step === STEPS.length - 1 ? "Generate My Plan →" : "Next →"}
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: T.muted, textAlign: "center" }}>
                FODMAP guidelines based on{" "}
                <a href="https://www.monashfodmap.com" target="_blank" rel="noreferrer" style={{ color: T.muted }}>
                    Monash University
                </a>
                . Not medical advice.
            </div>
        </main>
    );
}
