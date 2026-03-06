"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const T = {
    bg: "#0A0F1E",
    surface: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.1)",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.4)",
    primary: "#A78BFA",
};

interface NavProps {
    activeTab: "dashboard" | "scanner" | "settings";
}

export function BottomNav({ activeTab }: NavProps) {
    // We use usePathname internally to highlight tabs without needing props everywhere,
    // but keeping activeTab prop for backwards compatibility or explicit overrides if needed.
    const pathname = usePathname();

    return (
        <div
            style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                height: "80px",
                background: `rgba(10, 15, 30, 0.8)`,
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderTop: `1px solid ${T.border}`,
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center",
                paddingBottom: "20px", // safe area for iOS home indicator
                zIndex: 50,
            }}
        >
            <NavItem
                href="/dashboard"
                icon="🏠"
                label="Meals"
                isActive={activeTab === "dashboard" || pathname === "/dashboard"}
            />
            <NavItem
                href="/scanner"
                icon="🔎"
                label="Scan"
                isActive={activeTab === "scanner" || pathname === "/scanner"}
            />
            <NavItem
                href="/onboarding"
                icon="⚙️"
                label="Settings"
                isActive={activeTab === "settings" || pathname === "/onboarding"}
            />
        </div>
    );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: string; label: string; isActive: boolean }) {
    return (
        <Link
            href={href}
            style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                width: "60px",
                height: "50px",
                transition: "all 0.2s",
            }}
        >
            <div
                style={{
                    fontSize: "24px",
                    filter: isActive ? "grayscale(0) brightness(1.2)" : "grayscale(1) brightness(0.6)",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                }}
            >
                {icon}
            </div>
            <span
                style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: isActive ? T.primary : T.muted,
                }}
            >
                {label}
            </span>
        </Link>
    );
}
