import { NextResponse } from "next/server";

// Temporary debug endpoint — remove after fixing env vars
export async function GET() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiKeyAlt = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    return NextResponse.json({
        has_GEMINI_API_KEY: !!geminiKey,
        GEMINI_API_KEY_length: geminiKey?.length ?? 0,
        GEMINI_API_KEY_prefix: geminiKey ? geminiKey.substring(0, 6) + "..." : "NOT SET",
        has_NEXT_PUBLIC_GEMINI_API_KEY: !!geminiKeyAlt,
        NODE_ENV: process.env.NODE_ENV,
    });
}
