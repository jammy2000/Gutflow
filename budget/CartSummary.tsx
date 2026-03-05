"use client";

interface CartSummaryProps {
    subtotal: number;
    taxRate?: number;
    retailer?: "walmart" | "kroger";
    checkoutUrl?: string;
    disabled?: boolean;
}

export function CartSummary({
    subtotal,
    taxRate = 0.085,
    retailer = "walmart",
    checkoutUrl,
    disabled = false,
}: CartSummaryProps) {
    const taxBuffer = subtotal * taxRate;
    const estTotal = subtotal + taxBuffer;

    return (
        <div
            style={{
                position: "sticky",
                bottom: 0,
                background: "#fff",
                borderTop: "1px solid #E8ECF0",
                padding: "16px 20px",
                boxShadow: "0 -4px 24px rgba(0,0,0,0.08)",
            }}
        >
            {/* Tax breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8B95A1" }}>
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8B95A1" }}>
                    <span>Est. Tax (~8.5%)</span>
                    <span>${taxBuffer.toFixed(2)}</span>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 15,
                        fontWeight: 800,
                        color: "#1A1D23",
                        borderTop: "1px solid #F0F2F5",
                        paddingTop: 6,
                    }}
                >
                    <span>Est. Total</span>
                    <span>${estTotal.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 10, color: "#8B95A1", textAlign: "center" }}>
                    Final amount confirmed at checkout
                </div>
            </div>

            {/* Checkout CTA */}
            <a
                href={checkoutUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={disabled ? (e) => e.preventDefault() : undefined}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: disabled
                        ? "#E8ECF0"
                        : retailer === "walmart"
                            ? "linear-gradient(135deg,#0071CE,#00A3E0)"
                            : "linear-gradient(135deg,#2265A5,#00539E)",
                    color: disabled ? "#8B95A1" : "#fff",
                    fontWeight: 800,
                    fontSize: 15,
                    textDecoration: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "transform 0.15s, box-shadow 0.15s",
                    boxShadow: disabled ? "none" : "0 4px 16px rgba(0,113,206,0.3)",
                }}
                onMouseEnter={(e) => {
                    if (!disabled) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
            >
                Checkout at {retailer.charAt(0).toUpperCase() + retailer.slice(1)} →
            </a>
        </div>
    );
}
