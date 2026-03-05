"use client";

import { useState } from "react";
import Link from "next/link";

// ─── FODMAP Groups to Reintroduce ─────────────────────────────
const FODMAP_GROUPS = [
    {
        id: "fructans",
        label: "Fructans",
        icon: "🌾",
        color: "#F97316",
        bg: "#FFF7ED",
        border: "#FED7AA",
        testFoods: [
            { name: "Wheat bread", amount: "1 slice" },
            { name: "Garlic", amount: "½ clove (in cooking)" },
            { name: "Onion", amount: "1 tbsp chopped" },
        ],
        protocol: "Found in wheat, garlic, onion. Test with wheat bread or garlic-infused broth.",
        sources: "Wheat, rye, garlic, onion, leek, asparagus",
    },
    {
        id: "fructose",
        label: "Excess Fructose",
        icon: "🍯",
        color: "#EC4899",
        bg: "#FDF2F8",
        border: "#FBCFE8",
        testFoods: [
            { name: "Honey", amount: "1 tbsp" },
            { name: "Mango", amount: "½ cup diced" },
            { name: "Apple juice", amount: "½ cup" },
        ],
        protocol: "Test excess fructose — not fructose itself. Use honey or mango as the test food.",
        sources: "Honey, high-fructose corn syrup, mango, apple, pear, watermelon",
    },
    {
        id: "lactose",
        label: "Lactose",
        icon: "🥛",
        color: "#3B82F6",
        bg: "#EFF6FF",
        border: "#BFDBFE",
        testFoods: [
            { name: "Regular milk", amount: "1 cup (240ml)" },
            { name: "Soft cheese (ricotta)", amount: "50g" },
            { name: "Ice cream", amount: "½ cup" },
        ],
        protocol: "Test dairy lactose. Use regular (non-lactose-free) milk as the challenge food.",
        sources: "Regular milk, ice cream, soft cheeses, yogurt, custard",
    },
    {
        id: "sorbitol",
        label: "Sorbitol (Polyol)",
        icon: "🫐",
        color: "#8B5CF6",
        bg: "#F5F3FF",
        border: "#DDD6FE",
        testFoods: [
            { name: "Avocado", amount: "¼ whole" },
            { name: "Blackberries", amount: "½ cup" },
            { name: "Peach", amount: "1 small" },
        ],
        protocol: "Sorbitol is a sugar alcohol found in some fruits. Avocado or blackberries are good test foods.",
        sources: "Avocado, stone fruits, blackberries, apples, pears, some sweeteners",
    },
    {
        id: "mannitol",
        label: "Mannitol (Polyol)",
        icon: "🍄",
        color: "#EF4444",
        bg: "#FEF2F2",
        border: "#FECACA",
        testFoods: [
            { name: "Mushrooms (button)", amount: "¾ cup" },
            { name: "Cauliflower", amount: "½ cup" },
            { name: "Sweet potato", amount: "½ cup" },
        ],
        protocol: "Mannitol is found in mushrooms and cauliflower. Use cooked mushrooms as the test food.",
        sources: "Mushrooms, cauliflower, celeriac, sweet potato",
    },
    {
        id: "gos",
        label: "GOS (Galacto-oligosaccharides)",
        icon: "🫘",
        color: "#10B981",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        testFoods: [
            { name: "Chickpeas (canned)", amount: "¼ cup" },
            { name: "Cashews", amount: "10 nuts" },
            { name: "Kidney beans", amount: "¼ cup" },
        ],
        protocol: "GOS is found in legumes and some nuts. Chickpeas or cashews are the standard test foods.",
        sources: "Chickpeas, lentils, kidney beans, cashews, almonds (>10 nuts)",
    },
];

const SYMPTOM_LABELS = ["None", "Mild", "Moderate", "Severe", "Debilitating"];

type ToleranceRating = "tolerates" | "partial" | "avoid" | null;

interface DayLog {
    serving: string;
    symptomScore: number; // 0–4
    notes: string;
}

interface GroupResult {
    groupId: string;
    days: [DayLog, DayLog, DayLog];
    tolerance: ToleranceRating;
    completed: boolean;
}

function calcTolerance(days: [DayLog, DayLog, DayLog]): ToleranceRating {
    const maxScore = Math.max(...days.map((d) => d.symptomScore));
    if (maxScore <= 1) return "tolerates";
    if (maxScore === 2) return "partial";
    return "avoid";
}

const TOLERANCE_CONFIG: Record<NonNullable<ToleranceRating>, { label: string; icon: string; color: string; bg: string }> = {
    tolerates: { label: "Tolerates", icon: "🟢", color: "#10B981", bg: "#ECFDF5" },
    partial: { label: "Partial Tolerance", icon: "🟡", color: "#F59E0B", bg: "#FFFBEB" },
    avoid: { label: "Avoid", icon: "🔴", color: "#EF4444", bg: "#FEF2F2" },
};

const T = {
    bg: "#F7F8FA",
    card: "#fff",
    border: "#E8ECF0",
    text: "#1A1D23",
    muted: "#8B95A1",
    primary: "#6B21A8",
    primaryDark: "#1D4ED8",
};

const DEFAULT_DAYS: [DayLog, DayLog, DayLog] = [
    { serving: "Small", symptomScore: 0, notes: "" },
    { serving: "Medium", symptomScore: 0, notes: "" },
    { serving: "Full", symptomScore: 0, notes: "" },
];

export default function ReintroducePage() {
    const [view, setView] = useState<"intro" | "test" | "results">("intro");
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, GroupResult>>({});
    const [dayIndex, setDayIndex] = useState(0);
    const [currentDays, setCurrentDays] = useState<[DayLog, DayLog, DayLog]>(
        structuredClone(DEFAULT_DAYS)
    );

    const group = FODMAP_GROUPS.find((g) => g.id === selectedGroup);
    const completedCount = Object.values(results).filter((r) => r.completed).length;

    const startGroup = (id: string) => {
        setSelectedGroup(id);
        // Restore previous data if exists
        const prev = results[id];
        setCurrentDays(prev ? structuredClone(prev.days) : structuredClone(DEFAULT_DAYS));
        setDayIndex(0);
        setView("test");
    };

    const updateDayField = (field: keyof DayLog, value: string | number) => {
        setCurrentDays((prev) => {
            const updated = [...prev] as [DayLog, DayLog, DayLog];
            updated[dayIndex] = { ...updated[dayIndex], [field]: value };
            return updated;
        });
    };

    const finishGroup = () => {
        if (!selectedGroup) return;
        const tolerance = calcTolerance(currentDays);
        setResults((prev) => ({
            ...prev,
            [selectedGroup]: {
                groupId: selectedGroup,
                days: currentDays,
                tolerance,
                completed: true,
            },
        }));
        setView("results");
    };

    // ── INTRO ────────────────────────────────────────────────────
    if (view === "intro") {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    background: T.bg,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    padding: "0 20px 60px",
                }}
            >
                <nav
                    style={{
                        background: "#fff",
                        borderBottom: `1px solid ${T.border}`,
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <Link
                        href="/"
                        style={{
                            fontSize: 18,
                            fontWeight: 900,
                            background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            textDecoration: "none",
                        }}
                    >
                        GutFlow
                    </Link>
                    {completedCount > 0 && (
                        <button
                            onClick={() => setView("results")}
                            style={{
                                padding: "8px 14px",
                                borderRadius: 10,
                                border: "none",
                                background: T.primary,
                                color: "#fff",
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: "pointer",
                            }}
                        >
                            View Results ({completedCount}/6)
                        </button>
                    )}
                </nav>

                <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 28 }}>
                    {/* Header */}
                    <div
                        style={{
                            background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                            borderRadius: 20,
                            padding: "28px 24px",
                            color: "#fff",
                            marginBottom: 20,
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7, letterSpacing: 1, marginBottom: 8 }}>
                            PHASE 2 · REINTRODUCTION
                        </div>
                        <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 10px" }}>
                            Identify Your Trigger Foods
                        </h1>
                        <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6, margin: 0 }}>
                            After 2–6 weeks of strict Low FODMAP elimination, systematically reintroduce one FODMAP group at a time to discover exactly which foods trigger your symptoms.
                        </p>
                    </div>

                    {/* Protocol explainer */}
                    <div
                        style={{
                            background: "#fff",
                            border: `1px solid ${T.border}`,
                            borderRadius: 16,
                            padding: 20,
                            marginBottom: 20,
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 12 }}>
                            📋 How It Works
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                                { step: "1", text: "Select a FODMAP group to test (one at a time, one per week)" },
                                { step: "2", text: "Eat the test food in small → medium → full servings over 3 days" },
                                { step: "3", text: "Continue eating Low FODMAP otherwise — no other new foods" },
                                { step: "4", text: "Log your symptoms after each test meal" },
                                { step: "5", text: "Rest 2–3 days on strict Low FODMAP before testing the next group" },
                            ].map(({ step, text }) => (
                                <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                    <div
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: "50%",
                                            background: T.primary,
                                            color: "#fff",
                                            fontSize: 11,
                                            fontWeight: 800,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {step}
                                    </div>
                                    <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, paddingTop: 3 }}>{text}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 6 FODMAP Groups */}
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 12 }}>
                        Choose a FODMAP Group to Test
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {FODMAP_GROUPS.map((g) => {
                            const result = results[g.id];
                            const done = result?.completed;
                            const tol = done ? result.tolerance : null;
                            const tolCfg = tol ? TOLERANCE_CONFIG[tol] : null;

                            return (
                                <div
                                    key={g.id}
                                    onClick={() => startGroup(g.id)}
                                    style={{
                                        background: "#fff",
                                        border: `1px solid ${done ? g.border : T.border}`,
                                        borderRadius: 16,
                                        padding: "16px 18px",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 14,
                                        transition: "transform 0.15s, box-shadow 0.15s",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            background: g.bg,
                                            border: `1px solid ${g.border}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: 22,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {g.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text }}>{g.label}</div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: T.muted,
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}
                                        >
                                            {g.sources}
                                        </div>
                                    </div>
                                    {done && tolCfg ? (
                                        <div
                                            style={{
                                                padding: "5px 12px",
                                                borderRadius: 100,
                                                background: tolCfg.bg,
                                                color: tolCfg.color,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {tolCfg.icon} {tolCfg.label}
                                        </div>
                                    ) : (
                                        <div
                                            style={{
                                                padding: "5px 12px",
                                                borderRadius: 100,
                                                background: "#F7F8FA",
                                                color: T.muted,
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }}
                                        >
                                            {done ? "Re-test →" : "Test →"}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        );
    }

    // ── TEST VIEW ────────────────────────────────────────────────
    if (view === "test" && group) {
        const day = currentDays[dayIndex];
        const servings = ["Small (¼ portion)", "Medium (½ portion)", "Full (standard portion)"];

        return (
            <main
                style={{
                    minHeight: "100vh",
                    background: T.bg,
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    padding: "0 20px 60px",
                }}
            >
                <nav
                    style={{
                        background: "#fff",
                        borderBottom: `1px solid ${T.border}`,
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                    }}
                >
                    <button
                        onClick={() => setView("intro")}
                        style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer" }}
                    >
                        ← Back
                    </button>
                    <div
                        style={{
                            fontSize: 15,
                            fontWeight: 800,
                            background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        Reintroduction Test
                    </div>
                </nav>

                <div style={{ maxWidth: 520, margin: "0 auto", paddingTop: 24 }}>
                    {/* Group header */}
                    <div
                        style={{
                            background: group.bg,
                            border: `1px solid ${group.border}`,
                            borderRadius: 16,
                            padding: "18px 20px",
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 28 }}>{group.icon}</span>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{group.label}</div>
                                <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{group.protocol}</div>
                            </div>
                        </div>
                    </div>

                    {/* Day selector */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        {[0, 1, 2].map((i) => (
                            <button
                                key={i}
                                onClick={() => setDayIndex(i)}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    borderRadius: 12,
                                    border: `2px solid ${dayIndex === i ? T.primary : T.border}`,
                                    background: dayIndex === i ? "#F5F3FF" : "#fff",
                                    color: dayIndex === i ? T.primary : T.muted,
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                            >
                                Day {i + 1}
                                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>
                                    {["Small", "Medium", "Full"][i]}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Test card */}
                    <div
                        style={{
                            background: "#fff",
                            border: `1px solid ${T.border}`,
                            borderRadius: 20,
                            padding: 24,
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 16 }}>
                            Day {dayIndex + 1} — {servings[dayIndex]}
                        </div>

                        {/* Test foods */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 8 }}>
                                SUGGESTED TEST FOODS
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {group.testFoods.map((f) => (
                                    <div
                                        key={f.name}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            padding: "10px 14px",
                                            background: group.bg,
                                            borderRadius: 10,
                                            border: `1px solid ${group.border}`,
                                        }}
                                    >
                                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.name}</span>
                                        <span style={{ fontSize: 13, color: group.color, fontWeight: 700 }}>
                                            Day {dayIndex + 1}: {dayIndex === 0 ? "¼ of " : dayIndex === 1 ? "½ of " : ""}{f.amount}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Symptom score */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 8 }}>
                                SYMPTOM SEVERITY (4–6 HOURS AFTER EATING)
                            </div>
                            <div style={{ display: "flex", gap: 6 }}>
                                {SYMPTOM_LABELS.map((label, score) => (
                                    <button
                                        key={score}
                                        onClick={() => updateDayField("symptomScore", score)}
                                        style={{
                                            flex: 1,
                                            padding: "10px 4px",
                                            borderRadius: 10,
                                            border: `2px solid ${day.symptomScore === score
                                                ? score <= 1 ? "#10B981" : score === 2 ? "#F59E0B" : "#EF4444"
                                                : T.border}`,
                                            background: day.symptomScore === score
                                                ? score <= 1 ? "#ECFDF5" : score === 2 ? "#FFFBEB" : "#FEF2F2"
                                                : "#F7F8FA",
                                            color: day.symptomScore === score
                                                ? score <= 1 ? "#10B981" : score === 2 ? "#F59E0B" : "#EF4444"
                                                : T.muted,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "all 0.15s",
                                            textAlign: "center",
                                        }}
                                    >
                                        <div style={{ fontSize: 16, marginBottom: 2 }}>
                                            {["😊", "😐", "😟", "😣", "🤢"][score]}
                                        </div>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 0.5, marginBottom: 8 }}>
                                NOTES (OPTIONAL)
                            </div>
                            <textarea
                                value={day.notes}
                                onChange={(e) => updateDayField("notes", e.target.value)}
                                placeholder="Describe any symptoms: bloating, pain, urgency, nausea…"
                                rows={3}
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    borderRadius: 10,
                                    border: `1px solid ${T.border}`,
                                    fontSize: 13,
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                    color: T.text,
                                    outline: "none",
                                    boxSizing: "border-box",
                                }}
                            />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div style={{ display: "flex", gap: 10 }}>
                        {dayIndex > 0 && (
                            <button
                                onClick={() => setDayIndex((d) => d - 1)}
                                style={{
                                    flex: 1,
                                    padding: "14px",
                                    borderRadius: 14,
                                    border: `1px solid ${T.border}`,
                                    background: "#fff",
                                    color: T.muted,
                                    fontWeight: 700,
                                    fontSize: 15,
                                    cursor: "pointer",
                                }}
                            >
                                ← Day {dayIndex}
                            </button>
                        )}
                        {dayIndex < 2 ? (
                            <button
                                onClick={() => setDayIndex((d) => d + 1)}
                                style={{
                                    flex: 2,
                                    padding: "14px",
                                    borderRadius: 14,
                                    border: "none",
                                    background: `linear-gradient(135deg,${T.primary},${T.primaryDark})`,
                                    color: "#fff",
                                    fontWeight: 800,
                                    fontSize: 15,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 16px rgba(107,33,168,0.3)",
                                }}
                            >
                                Save & Continue to Day {dayIndex + 2} →
                            </button>
                        ) : (
                            <button
                                onClick={finishGroup}
                                style={{
                                    flex: 2,
                                    padding: "14px",
                                    borderRadius: 14,
                                    border: "none",
                                    background: "linear-gradient(135deg,#10B981,#059669)",
                                    color: "#fff",
                                    fontWeight: 800,
                                    fontSize: 15,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                                }}
                            >
                                Complete Test & See Result ✓
                            </button>
                        )}
                    </div>

                    {/* Reminder */}
                    <div
                        style={{
                            marginTop: 16,
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "#FFFBEB",
                            border: "1px solid #FDE68A",
                            fontSize: 12,
                            color: "#92400E",
                            display: "flex",
                            gap: 8,
                        }}
                    >
                        <span>⚠️</span>
                        <span>
                            Eat strictly Low FODMAP for all other meals during testing. Do not introduce any other new foods simultaneously.
                        </span>
                    </div>
                </div>
            </main>
        );
    }

    // ── RESULTS VIEW ─────────────────────────────────────────────
    return (
        <main
            style={{
                minHeight: "100vh",
                background: T.bg,
                fontFamily: "'Inter', -apple-system, sans-serif",
                padding: "0 20px 60px",
            }}
        >
            <nav
                style={{
                    background: "#fff",
                    borderBottom: `1px solid ${T.border}`,
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                }}
            >
                <button
                    onClick={() => setView("intro")}
                    style={{ background: "none", border: "none", color: T.muted, fontSize: 14, cursor: "pointer" }}
                >
                    ← All Groups
                </button>
                <div
                    style={{
                        fontSize: 15,
                        fontWeight: 800,
                        background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    My FODMAP Tolerance Profile
                </div>
            </nav>

            <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 24 }}>
                <div
                    style={{
                        background: "linear-gradient(135deg,#6B21A8,#1D4ED8)",
                        borderRadius: 20,
                        padding: "24px",
                        color: "#fff",
                        marginBottom: 20,
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, letterSpacing: 1 }}>
                        YOUR PERSONAL TOLERANCE PROFILE
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 900, margin: "8px 0 6px" }}>
                        {completedCount} of 6 groups tested
                    </h2>
                    <p style={{ fontSize: 13, opacity: 0.8, margin: 0 }}>
                        Share this profile with your dietitian or gastroenterologist.
                    </p>
                </div>

                {/* Tolerance grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {FODMAP_GROUPS.map((g) => {
                        const result = results[g.id];
                        const tol = result?.tolerance ?? null;
                        const tolCfg = tol ? TOLERANCE_CONFIG[tol] : null;

                        return (
                            <div
                                key={g.id}
                                onClick={() => result && startGroup(g.id)}
                                style={{
                                    background: "#fff",
                                    border: `1px solid ${tol ? g.border : T.border}`,
                                    borderRadius: 14,
                                    padding: "16px",
                                    cursor: result ? "pointer" : "default",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                    <span style={{ fontSize: 20 }}>{g.icon}</span>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{g.label}</div>
                                </div>
                                {tol && tolCfg ? (
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "5px 12px",
                                            borderRadius: 100,
                                            background: tolCfg.bg,
                                            color: tolCfg.color,
                                            fontSize: 12,
                                            fontWeight: 700,
                                        }}
                                    >
                                        {tolCfg.icon} {tolCfg.label}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "inline-flex",
                                            padding: "5px 12px",
                                            borderRadius: 100,
                                            background: "#F7F8FA",
                                            color: T.muted,
                                            fontSize: 12,
                                        }}
                                    >
                                        Not tested yet
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* What to do next */}
                {completedCount === 6 && (
                    <div
                        style={{
                            background: "#ECFDF5",
                            border: "1px solid #A7F3D0",
                            borderRadius: 16,
                            padding: "20px",
                            marginBottom: 16,
                        }}
                    >
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#065F46", marginBottom: 8 }}>
                            🎉 All groups tested! What&apos;s next?
                        </div>
                        <div style={{ fontSize: 13, color: "#047857", lineHeight: 1.6 }}>
                            You can now move to <strong>Phase 3 — Personalization</strong>. Reintroduce the foods you tolerate into your regular diet while continuing to avoid your trigger groups. Discuss your results with a registered dietitian.
                        </div>
                    </div>
                )}

                {/* Export note */}
                <div
                    style={{
                        background: "#fff",
                        border: `1px solid ${T.border}`,
                        borderRadius: 16,
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Share with your dietitian</div>
                        <div style={{ fontSize: 12, color: T.muted }}>Print or save this page as PDF</div>
                    </div>
                    <button
                        onClick={() => window.print()}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: `1px solid ${T.border}`,
                            background: "#fff",
                            color: T.text,
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Print / PDF
                    </button>
                </div>
            </div>
        </main>
    );
}
