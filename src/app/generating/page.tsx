"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const T = {
    bg: "#F0FDF4",
    primary: "#16A34A",
    primaryLight: "#22C55E",
    accent: "#F97316",
    text: "#0F2D18",
    muted: "#6B7F74",
    surface: "#FFFFFF",
    border: "#D1FAE5",
};

const STEPS = [
    { icon: "🧠", label: "Analyzing your diet profile…" },
    { icon: "🥗", label: "Crafting FODMAP-safe recipes…" },
    { icon: "💰", label: "Optimizing for your budget…" },
    { icon: "✅", label: "Your plan is ready!" },
];

const SAMPLE_RECIPES = [
    { name: "Lemon Herb Salmon Bowl", time: 25, cost: 4.2 },
    { name: "Quinoa Veggie Stir-fry", time: 20, cost: 3.8 },
    { name: "Chicken & Rice Bowl", time: 30, cost: 5.1 },
];

function GeneratingContent() {
    const router = useRouter();
    const params = useSearchParams();
    const [currentStep, setCurrentStep] = useState(0);
    const [animationDone, setAnimationDone] = useState(false);
    const [apiDone, setApiDone] = useState(false);
    const [recipeIdx, setRecipeIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const budget = params.get("budget") || "100";
    const people = params.get("people") || "1";
    const phase = params.get("phase") || "elimination";

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        async function generatePlan() {
            try {
                sessionStorage.setItem("gutflow_params", JSON.stringify({ budget, people, phase }));
                const res = await fetch("/api/generate-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meal_plan_id: "local", budget_usd: parseInt(budget, 10), people: parseInt(people, 10), duration_days: 3, diet_type: [phase] }),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    setErrorMsg(`API Error (${res.status}): ${errText.slice(0, 250)}`);
                    setApiDone(true);
                    return;
                }
                const data = await res.json();
                sessionStorage.setItem("gutflow_plan", JSON.stringify(data));
                setApiDone(true);
            } catch (err) {
                setErrorMsg(`Network error: ${err instanceof Error ? err.message : String(err)}`);
                setApiDone(true);
            }
        }

        generatePlan();
    }, [budget, people, phase]);

    useEffect(() => {
        const timers = [2200, 4800, 7500, 10000].map((t, i) =>
            setTimeout(() => {
                setCurrentStep(i);
                if (i === 2) setRevealed(true);
                if (i === STEPS.length - 1) setAnimationDone(true);
            }, t)
        );
        const recipeTimer = setInterval(() => setRecipeIdx((p) => (p + 1) % SAMPLE_RECIPES.length), 3200);
        return () => { timers.forEach(clearTimeout); clearInterval(recipeTimer); };
    }, []);

    useEffect(() => {
        if (animationDone && apiDone && !errorMsg) {
            setTimeout(() => router.push("/plan-result"), 800);
        }
    }, [animationDone, apiDone, errorMsg, router]);

    const recipe = SAMPLE_RECIPES[recipeIdx];
    const bothDone = animationDone && apiDone;

    return (
        <main style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Nunito', sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
                <span style={{ fontSize: 30 }}>🥦</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: T.primary }}>GutFlow</span>
            </div>

            {errorMsg ? (
                <div style={{ background: T.surface, border: "2px solid #FCA5A5", borderRadius: 24, padding: "28px 24px", maxWidth: 400, textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                    <div style={{ fontSize: 40, marginBottom: 14 }}>⚠️</div>
                    <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8, color: "#DC2626" }}>Generation Failed</div>
                    <p style={{ fontSize: 12, color: T.muted, marginBottom: 20, lineHeight: 1.6, wordBreak: "break-word" }}>{errorMsg}</p>
                    <button onClick={() => router.back()} style={{ background: T.primary, border: "none", borderRadius: 14, padding: "12px 28px", color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                        ← Go Back
                    </button>
                </div>
            ) : (
                <>
                    {/* Steps */}
                    <div style={{ width: "100%", maxWidth: 400, background: T.surface, borderRadius: 24, padding: 24, boxShadow: "0 4px 20px rgba(22,163,74,0.1)", border: `1px solid ${T.border}`, marginBottom: 20 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 900, color: T.text, margin: "0 0 20px" }}>Building Your Personalized Plan</h2>
                        {STEPS.map((step, i) => {
                            const isDone = i < currentStep || bothDone;
                            const isCurrent = i === currentStep && !bothDone;
                            const isPending = i > currentStep && !bothDone;
                            return (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: i < STEPS.length - 1 ? `1px solid ${T.border}` : "none", opacity: isPending ? 0.3 : 1, transition: "opacity 0.4s" }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: isDone ? "#DCFCE7" : isCurrent ? "#FEF3C7" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, transition: "background 0.4s" }}>
                                        {isDone ? "✅" : step.icon}
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: isDone ? 700 : isCurrent ? 800 : 600, color: isDone ? T.primary : isCurrent ? "#D97706" : T.muted, transition: "color 0.4s" }}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Recipe preview */}
                    <div style={{ width: "100%", maxWidth: 400, background: T.surface, borderRadius: 20, padding: 20, boxShadow: "0 2px 12px rgba(22,163,74,0.08)", border: `1px solid ${T.border}`, opacity: revealed ? 1 : 0.4, transition: "opacity 0.8s" }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: T.muted, letterSpacing: 1.2, marginBottom: 10, textTransform: "uppercase" }}>Sample Recipe Preview</div>
                        {revealed ? (
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: T.text, marginBottom: 6 }}>{recipe.name}</div>
                                <div style={{ display: "flex", gap: 14, fontSize: 13, color: T.muted }}>
                                    <span>⏱ {recipe.time} min</span>
                                    <span>💰 ${recipe.cost.toFixed(2)}/serving</span>
                                    <span style={{ color: T.primary, fontWeight: 700 }}>🟢 Safe</span>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ height: 18, borderRadius: 6, background: "#F3F4F6", marginBottom: 10, width: "70%" }} />
                                <div style={{ display: "flex", gap: 10 }}>
                                    {[80, 100, 70].map((w, i) => <div key={i} style={{ height: 13, width: w, borderRadius: 6, background: "#F3F4F6" }} />)}
                                </div>
                            </div>
                        )}
                    </div>

                    {!bothDone && <p style={{ marginTop: 20, fontSize: 13, color: T.muted }}>This usually takes 8–15 seconds ☕</p>}
                    {bothDone && <p style={{ marginTop: 20, fontSize: 15, fontWeight: 900, color: T.primary }}>🎉 Redirecting to your plan…</p>}
                </>
            )}
        </main>
    );
}

export default function GeneratingPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A", fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>Preparing…</div>}>
            <GeneratingContent />
        </Suspense>
    );
}
