"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STEPS = [
    { icon: "🧠", message: "Generating FODMAP-safe recipes…" },
    { icon: "💰", message: "Checking Walmart prices…" },
    { icon: "⚖️", message: "Optimizing for your budget…" },
    { icon: "✅", message: "Plan ready!" },
];

const SAMPLE_RECIPES = [
    { name: "Lemon Herb Salmon Bowl", time: 25, cost: 4.2, tag: "🟢 SAFE" },
    { name: "Quinoa Veggie Stir-fry", time: 20, cost: 3.8, tag: "🟢 SAFE" },
    { name: "Chicken & Rice Bowl", time: 30, cost: 5.1, tag: "🟢 SAFE" },
];

const T = {
    bg: "#F7F8FA",
    card: "#fff",
    border: "#E8ECF0",
    text: "#1A1D23",
    muted: "#8B95A1",
    primary: "#6B21A8",
    primaryDark: "#1D4ED8",
    green: "#10B981",
};

function GeneratingContent() {
    const router = useRouter();
    const params = useSearchParams();

    const [currentStep, setCurrentStep] = useState(0);
    const [done, setDone] = useState(false);
    const [recipeIdx, setRecipeIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        // Progress through steps
        const timings = [2000, 4500, 7000, 9500];
        const timers = timings.map((t, i) =>
            setTimeout(() => {
                setCurrentStep(i);
                if (i === 2) setRevealed(true);
                if (i === STEPS.length - 1) {
                    setDone(true);
                    // Auto-navigate after 1.5 seconds
                    setTimeout(() => {
                        router.push("/plan/demo");
                    }, 1500);
                }
            }, t)
        );

        // Cycle sample recipe card
        const recipeTimer = setInterval(() => {
            setRecipeIdx((prev) => (prev + 1) % SAMPLE_RECIPES.length);
        }, 3000);

        return () => {
            timers.forEach(clearTimeout);
            clearInterval(recipeTimer);
        };
    }, [router]);

    const recipe = SAMPLE_RECIPES[recipeIdx];

    return (
        <main
            style={{
                minHeight: "100vh",
                background: `linear-gradient(160deg, #0F0C29, #302B63, #24243E)`,
                fontFamily: "'Inter', -apple-system, sans-serif",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 20px",
                color: "#fff",
            }}
        >
            {/* Logo */}
            <div
                style={{
                    fontSize: 20,
                    fontWeight: 900,
                    background: "linear-gradient(135deg,#A78BFA,#60A5FA)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    marginBottom: 48,
                }}
            >
                GutFlow
            </div>

            {/* Step list */}
            <div style={{ width: "100%", maxWidth: 400, marginBottom: 40 }}>
                {STEPS.map((step, i) => {
                    const isCurrent = i === currentStep;
                    const isDone = i < currentStep || done;
                    const isPending = i > currentStep && !done;

                    return (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                padding: "14px 0",
                                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                                opacity: isPending ? 0.35 : 1,
                                transition: "opacity 0.4s",
                            }}
                        >
                            {/* Icon / spinner */}
                            <div
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    background: isDone
                                        ? "rgba(16,185,129,0.2)"
                                        : isCurrent
                                            ? "rgba(167,139,250,0.2)"
                                            : "rgba(255,255,255,0.05)",
                                    border: `2px solid ${isDone ? "#10B981" : isCurrent ? "#A78BFA" : "rgba(255,255,255,0.1)"}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 18,
                                    flexShrink: 0,
                                    transition: "all 0.4s",
                                }}
                            >
                                {isDone ? "✓" : step.icon}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: isCurrent ? 700 : 500,
                                        color: isDone ? "#10B981" : isCurrent ? "#fff" : "rgba(255,255,255,0.5)",
                                        transition: "color 0.4s",
                                    }}
                                >
                                    {step.message}
                                </div>
                            </div>

                            {/* Pulse dot for current */}
                            {isCurrent && !done && (
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        background: "#A78BFA",
                                        animation: "pulse 1.2s ease-in-out infinite",
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Sample recipe card (skeleton → reveal) */}
            <div
                style={{
                    width: "100%",
                    maxWidth: 400,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20,
                    padding: 24,
                    backdropFilter: "blur(12px)",
                    transition: "opacity 0.8s",
                    opacity: revealed ? 1 : 0.4,
                }}
            >
                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 8 }}>
                    SAMPLE RECIPE PREVIEW
                </div>

                {revealed ? (
                    <div
                        style={{
                            animation: "fadeIn 0.5s ease",
                        }}
                    >
                        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>{recipe.name}</div>
                        <div style={{ display: "flex", gap: 12, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                            <span>⏱ {recipe.time} min</span>
                            <span>💰 ${recipe.cost.toFixed(2)}/serving</span>
                            <span>{recipe.tag}</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ height: 20, borderRadius: 4, background: "rgba(255,255,255,0.1)", marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 12 }}>
                            {[80, 100, 70].map((w, i) => (
                                <div
                                    key={i}
                                    style={{ height: 14, width: w, borderRadius: 4, background: "rgba(255,255,255,0.07)" }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Estimated time */}
            {!done && (
                <div style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                    Estimated time: 8–15 seconds
                </div>
            )}

            {done && (
                <div
                    style={{
                        marginTop: 24,
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#10B981",
                        animation: "fadeIn 0.4s ease",
                    }}
                >
                    Redirecting to your plan…
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </main>
    );
}

export default function GeneratingPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", background: "#0F0C29", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    Loading…
                </div>
            }
        >
            <GeneratingContent />
        </Suspense>
    );
}
