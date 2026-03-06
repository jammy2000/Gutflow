"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/store";

// A stealth router that prevents 1-frame screen flashes during local-storage retrieval
export default function AppEntryRouter() {
    const router = useRouter();
    const { hasCompletedOnboarding } = useUserStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            if (hasCompletedOnboarding) {
                // User has already defined their GutFlow parameters
                router.replace("/dashboard");
            } else {
                // First-time user, push to the Survey
                router.replace("/onboarding");
            }
        }
    }, [mounted, hasCompletedOnboarding, router]);

    // Render a completely black screen to hide Next.js routing latency
    return (
        <div style={{ backgroundColor: "#0A0F1E", width: "100vw", height: "100vh" }} />
    );
}
