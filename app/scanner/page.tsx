"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

// ─── Design Tokens ────────────────────────────────────────
const T = {
    bg: "#0A0F1E",
    glass: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.6)",
    primary: "linear-gradient(135deg, #6B21A8 0%, #1D4ED8 100%)",
    danger: "#EF4444",
    warning: "#EAB308",
    success: "#22C55E",
    glow: "0 0 30px rgba(139, 92, 246, 0.3)",
};

export default function ScannerOnboarding() {
    const [scanResult, setScanResult] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startScanner = async () => {
        setIsScanning(true);
        setError(null);
        try {
            const html5QrCode = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 150 } };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                async (decodedText) => {
                    await handleScanSuccess(decodedText, html5QrCode);
                },
                (errorMessage) => {
                    // console.warn(errorMessage);
                }
            );
        } catch (err) {
            console.error(err);
            setError("Could not start camera. Please check permissions.");
            setIsScanning(false);
        }
    };

    const handleScanSuccess = async (decodedText: string, scannerInstance: Html5Qrcode) => {
        try {
            if (scannerInstance.isScanning) {
                await scannerInstance.stop();
            }
            setIsScanning(false);

            const res = await fetch(`/api/lookup-barcode?upc=${decodedText}`);
            const data = await res.json();

            if (data.error) {
                setError(`Product not found: ${decodedText}`);
            } else {
                setScanResult(data);
                // Save to localStorage for the analyzer to pick up
                localStorage.setItem(
                    "FODMAP_PEND_SCAN",
                    JSON.stringify({
                        ingredients: data.ingredients,
                        name: data.name,
                        upc: decodedText,
                    })
                );
            }
        } catch (err) {
            setError("Failed to fetch product data.");
        }
    };

    return (
        <main
            style={{
                backgroundColor: T.bg,
                color: T.text,
                minHeight: "100vh",
                fontFamily: "'Inter', sans-serif",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* 1. Nav Bar */}
            <nav
                style={{
                    padding: "20px 40px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `1px solid ${T.border}`,
                    backdropFilter: "blur(12px)",
                    position: "sticky",
                    top: 0,
                    zIndex: 100,
                }}
            >
                <div style={{ fontSize: "24px", fontWeight: 800, background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    GutFlow
                </div>
                <Link href="/" style={{ color: T.text, textDecoration: "none", fontWeight: 600, fontSize: "14px" }}>
                    Go to Analyzer →
                </Link>
            </nav>

            <section style={{ padding: "80px 20px", textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "48px", fontWeight: 900, marginBottom: "20px", letterSpacing: "-1px" }}>
                    Scan Any Product <span style={{ background: T.primary, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Instantly</span>
                </h1>
                <p style={{ fontSize: "18px", color: T.muted, lineHeight: 1.6 }}>
                    Point your camera at any food product barcode. Our engine auto-detects ingredients and grades them for FODMAP safety in milliseconds.
                </p>
            </section>

            {/* 4. Scanner Container */}
            <section style={{ padding: "0 20px 80px", textAlign: "center" }}>
                <div
                    style={{
                        width: "100%",
                        maxWidth: "500px",
                        margin: "0 auto",
                        background: T.glass,
                        border: `1px solid ${T.border}`,
                        borderRadius: "24px",
                        padding: "32px",
                        backdropFilter: "blur(12px)",
                        boxShadow: T.glow,
                    }}
                >
                    <div
                        id="reader"
                        style={{
                            width: "100%",
                            minHeight: "300px",
                            background: "black",
                            borderRadius: "16px",
                            overflow: "hidden",
                            marginBottom: "24px",
                            display: isScanning ? "block" : "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                        }}
                    >
                        {!isScanning && (
                            <div style={{ padding: "40px", textAlign: "center" }}>
                                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📷</div>
                                <div style={{ color: T.muted, fontSize: "14px" }}>Camera preview will appear here</div>
                                <button
                                    onClick={startScanner}
                                    style={{
                                        marginTop: "24px",
                                        background: T.primary,
                                        border: "none",
                                        borderRadius: "12px",
                                        padding: "14px 28px",
                                        color: "white",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        boxShadow: "0 0 20px rgba(107, 33, 168, 0.4)",
                                    }}
                                >
                                    Launch Camera
                                </button>
                            </div>
                        )}
                        {isScanning && (
                            <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10 }}>
                                <div style={{ background: "red", width: "8px", height: "8px", borderRadius: "50%", display: "inline-block", marginRight: "8px", boxShadow: "0 0 10px red", animation: "pulse 1.5s infinite" }} />
                                <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase" }}>Live</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div style={{ marginBottom: "20px", color: T.danger, fontSize: "14px", fontWeight: 600 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {scanResult ? (
                        <div style={{ animation: "fadeIn 0.5s ease-out", textAlign: "left" }}>
                            <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${T.border}`, borderRadius: "16px", padding: "24px" }}>
                                <div style={{ fontSize: "12px", color: T.muted, textTransform: "uppercase", marginBottom: "4px" }}>Successfully Scanned</div>
                                <div style={{ fontSize: "20px", fontWeight: 800, marginBottom: "8px" }}>{scanResult.name}</div>
                                <div style={{ fontSize: "13px", color: T.muted, lineHeight: 1.5, marginBottom: "20px" }}>
                                    <strong>Ingredients detected:</strong> {scanResult.ingredients}
                                </div>
                                <Link
                                    href="/"
                                    style={{
                                        display: "block",
                                        textAlign: "center",
                                        background: T.primary,
                                        color: "white",
                                        textDecoration: "none",
                                        padding: "16px",
                                        borderRadius: "12px",
                                        fontWeight: 700,
                                        boxShadow: T.glow,
                                    }}
                                >
                                    Analyze Safety Grade →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                            <button
                                onClick={() => handleScanSuccess("012345678901", {} as any)}
                                style={{ background: T.glass, border: `1px solid ${T.border}`, color: T.muted, padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Sim: Rice Cakes (SAFE)
                            </button>
                            <button
                                onClick={() => handleScanSuccess("099999000001", {} as any)}
                                style={{ background: T.glass, border: `1px solid ${T.border}`, color: T.muted, padding: "8px 16px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                            >
                                Sim: Garlic Bread (HIGH)
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer style={{ marginTop: "auto", padding: "40px 20px", textAlign: "center", borderTop: `1px solid ${T.border}`, fontSize: "12px", color: T.muted }}>
                <p>© 2026 GutFlow. Based on Monash University public guidelines.</p>
                <p style={{ marginTop: "8px" }}>Always consult a doctor before starting the Low-FODMAP protocol.</p>
            </footer>

            <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </main>
    );
}
