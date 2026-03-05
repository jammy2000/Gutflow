"use client";

interface BudgetBarProps {
    spent: number;
    total: number;
    retailer?: "walmart" | "kroger" | "both";
    onRetailerChange?: (r: "walmart" | "kroger") => void;
}

export function BudgetBar({ spent, total, retailer = "walmart", onRetailerChange }: BudgetBarProps) {
    const pct = Math.min(100, (spent / total) * 100);
    const color = pct > 95 ? "#EF4444" : pct > 80 ? "#F59E0B" : "#10B981";

    return (
        <div
            style={{
                background: "#fff",
                border: "1px solid #E8ECF0",
                borderRadius: 16,
                padding: "16px 20px",
                marginBottom: 16,
            }}
        >
            {/* Top row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#1A1D23" }}>${spent.toFixed(2)}</span>
                    <span style={{ fontSize: 14, color: "#8B95A1", marginLeft: 4 }}>/ ${total.toFixed(2)} budget</span>
                </div>

                {/* Retailer toggle */}
                {onRetailerChange && (
                    <div
                        style={{
                            display: "flex",
                            gap: 4,
                            background: "#F7F8FA",
                            borderRadius: 10,
                            padding: 3,
                            border: "1px solid #E8ECF0",
                        }}
                    >
                        {(["walmart", "kroger"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onRetailerChange(r)}
                                style={{
                                    padding: "5px 14px",
                                    borderRadius: 8,
                                    border: "none",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    background: retailer === r ? "#1A1D23" : "transparent",
                                    color: retailer === r ? "#fff" : "#8B95A1",
                                }}
                            >
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 8, background: "#F0F2F5", overflow: "hidden" }}>
                <div
                    style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 8,
                        background: color,
                        transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#8B95A1" }}>
                <span>{pct.toFixed(0)}% of budget used</span>
                <span style={{ color }}>${(total - spent).toFixed(2)} remaining</span>
            </div>
        </div>
    );
}
