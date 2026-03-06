"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const STEPS = [
    { icon: "🧠", message: "Generating FODMAP-safe recipes…" },
    { icon: "💰", message: "Optimizing for your budget…" },
    { icon: "⚖️", message: "Personalizing your meal plan…" },
    { icon: "✅", message: "Plan ready!" },
];

const SAMPLE_RECIPES = [
    { name: "Lemon Herb Salmon Bowl", time: 25, cost: 4.2, tag: "🟢 SAFE" },
    { name: "Quinoa Veggie Stir-fry", time: 20, cost: 3.8, tag: "🟢 SAFE" },
    { name: "Chicken & Rice Bowl", time: 30, cost: 5.1, tag: "🟢 SAFE" },
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

    // Read params from URL (passed from dashboard)
    const budget = params.get("budget") || "100";
    const people = params.get("people") || "1";
    const phase = params.get("phase") || "elimination";

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        async function generatePlan() {
            try {
                // Store params in sessionStorage so /results can read them
                sessionStorage.setItem("gutflow_params", JSON.stringify({ budget, people, phase }));

                const res = await fetch("/api/generate-plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        meal_plan_id: "local",
                        budget_usd: parseInt(budget, 10),
                        people: parseInt(people, 10),
                        duration_days: 3,
                        diet_type: [phase],
                    }),
                });

                if (!res.ok) {
                    const errText = await res.text();
                    console.error("API error:", errText);
                    setErrorMsg(`API 오류 (${res.status}): ${errText.slice(0, 300)}`);
                    setApiDone(true);
                    return;
                }

                const data = await res.json();
                // Save result to sessionStorage so results page can use it
                sessionStorage.setItem("gutflow_plan", JSON.stringify(data));
                setApiDone(true);
            } catch (err) {
                console.error("Fetch error:", err);
                setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
                setApiDone(true);
            }
        }

        generatePlan();
    }, [budget, people, phase]);

    useEffect(() => {
        const timings = [2000, 4500, 7000, 9500];
        const timers = timings.map((t, i) =>
            setTimeout(() => {
                setCurrentStep(i);
                if (i === 2) setRevealed(true);
                if (i === STEPS.length - 1) setAnimationDone(true);
            }, t)
        );
        const recipeTimer = setInterval(() => {
            setRecipeIdx((prev) => (prev + 1) % SAMPLE_RECIPES.length);
        }, 3000);
        return () => {
            timers.forEach(clearTimeout);
            clearInterval(recipeTimer);
        };
    }, []);

    // When both done, route to results page
    useEffect(() => {
        if (animationDone && apiDone && !errorMsg) {
            setTimeout(() => {
                router.push("/plan-result");
            }, 800);
        }
    }, [animationDone, apiDone, errorMsg, router]);

    const recipe = SAMPLE_RECIPES[recipeIdx];
    const bothDone = animationDone && apiDone;

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

            {errorMsg ? (
                /* ───── Error state ───── */
                <div
                    style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: 20,
                        padding: "28px 24px",
                        maxWidth: 400,
                        textAlign: "center",
                    }}
                >
                    <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                        생성 실패
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 24, lineHeight: 1.6 }}>
                        {errorMsg}
                    </div>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: 12,
                            padding: "12px 24px",
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        ← 돌아가기
                    </button>
                </div>
            ) : (
                <>
                    {/* Step list */}
                    <div style={{ width: "100%", maxWidth: 400, marginBottom: 40 }}>
                        {STEPS.map((step, i) => {
                            const isCurrent = i === currentStep;
                            const isDone = i < currentStep || bothDone;
                            const isPending = i > currentStep && !bothDone;

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
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 18,
                                            flexShrink: 0,
                                            transition: "background 0.4s",
                                        }}
                                    >
                                        {isDone ? "✓" : step.icon}
                                    </div>
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 14,
                                                fontWeight: isCurrent ? 700 : 500,
                                                color: isDone
                                                    ? "#10B981"
                                                    : isCurrent
                                                        ? "#A78BFA"
                                                        : "rgba(255,255,255,0.5)",
                                                transition: "color 0.4s",
                                            }}
                                        >
                                            {step.message}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Recipe preview card */}
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
                            <div style={{ animation: "fadeIn 0.5s ease" }}>
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
                                        <div key={i} style={{ height: 14, width: w, borderRadius: 4, background: "rgba(255,255,255,0.07)" }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {!bothDone && (
                        <div style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                            Estimated time: 8-15 seconds
                        </div>
                    )}
                    {bothDone && (
                        <div style={{ marginTop: 24, fontSize: 15, fontWeight: 700, color: "#10B981", animation: "fadeIn 0.4s ease" }}>
                            식단 완성! 결과 화면으로 이동합니다…
                        </div>
                    )}
                </>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </main>
    );
}

export default function GeneratingPage() {
    return (
        <Suspense
            fallback={
                <div style={{ minHeight: "100vh", background: "#0F0C29", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                    준비 중...
                </div>
            }
        >
            <GeneratingContent />
        </Suspense>
    );
}
