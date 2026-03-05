"use client";

type FodmapTier = "green" | "yellow" | "red";

interface FodmapBadgeProps {
    tier: FodmapTier;
    size?: "sm" | "md" | "lg";
    showLabel?: boolean;
}

const TIER_CONFIG: Record<FodmapTier, { label: string; icon: string; color: string; bg: string; border: string }> = {
    green: { label: "SAFE", icon: "✓", color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0" },
    yellow: { label: "CAUTION", icon: "!", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A" },
    red: { label: "AVOID", icon: "✕", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
};

const SIZE = {
    sm: { fontSize: 10, padding: "2px 7px", iconSize: 10 },
    md: { fontSize: 12, padding: "4px 10px", iconSize: 12 },
    lg: { fontSize: 14, padding: "7px 14px", iconSize: 14 },
};

export function FodmapBadge({ tier, size = "md", showLabel = true }: FodmapBadgeProps) {
    const cfg = TIER_CONFIG[tier];
    const sz = SIZE[size];

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 100,
                color: cfg.color,
                fontWeight: 700,
                fontSize: sz.fontSize,
                padding: sz.padding,
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
            }}
        >
            <span style={{ fontWeight: 900, fontSize: sz.iconSize }}>{cfg.icon}</span>
            {showLabel && cfg.label}
        </span>
    );
}
