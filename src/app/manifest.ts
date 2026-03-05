import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "GutFlow",
        short_name: "GutFlow",
        description: "Your autonomous gut-healing AI meal planner.",
        start_url: "/",
        display: "standalone",
        background_color: "#0A0F1E",
        theme_color: "#6B21A8",
        icons: [
            {
                src: "/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
