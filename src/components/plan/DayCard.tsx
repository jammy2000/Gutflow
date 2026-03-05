"use client";

import { FodmapBadge } from "../fodmap/FodmapBadge";

export interface MealSlot {
    recipe: string;
    cost: number;
    fodmapTier: "green" | "yellow" | "red";
    cookTime?: number;
}

export interface DayCardProps {
    day: number;
    dayLabel: string;
    meals: {
        breakfast: MealSlot;
        lunch: MealSlot;
        dinner: MealSlot;
    };
    onRecipeClick?: (meal: string, recipe: string) => void;
}

const MEAL_ICONS: Record<string, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
};

export function DayCard({ day, dayLabel, meals, onRecipeClick }: DayCardProps) {
    const dayTotal = Object.values(meals).reduce((sum, m) => sum + m.cost, 0);

    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #E8ECF0",
                borderRadius: 20,
                overflow: "hidden",
                marginBottom: 12,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 20px",
                    background: "#F7F8FA",
                    borderBottom: "1px solid #E8ECF0",
                }}
            >
                <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#8B95A1", letterSpacing: 1 }}>
                        DAY {day}
                    </span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#1A1D23" }}>{dayLabel}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#10B981" }}>${dayTotal.toFixed(2)}</div>
            </div>

            {/* Meals */}
            <div style={{ padding: "8px 0" }}>
                {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
                    const slot = meals[meal];
                    return (
                        <div
                            key={meal}
                            onClick={() => onRecipeClick?.(meal, slot.recipe)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 20px",
                                cursor: onRecipeClick ? "pointer" : "default",
                                transition: "background 0.15s",
                                borderBottom: meal !== "dinner" ? "1px solid #F7F8FA" : "none",
                            }}
                            onMouseEnter={(e) => {
                                if (onRecipeClick) (e.currentTarget as HTMLElement).style.background = "#F7F8FA";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}
                        >
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{MEAL_ICONS[meal]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#8B95A1", letterSpacing: 0.5, textTransform: "uppercase" }}>
                                    {meal}
                                </div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: "#1A1D23",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {slot.recipe}
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <FodmapBadge tier={slot.fodmapTier} size="sm" showLabel={false} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#8B95A1" }}>
                                    ${slot.cost.toFixed(2)}/srv
                                </span>
                                {onRecipeClick && (
                                    <span style={{ fontSize: 14, color: "#D1D5DB" }}>›</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
