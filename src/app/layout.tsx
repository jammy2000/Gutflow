import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GutFlow - Smart Low-FODMAP Meal Planner",
  description: "AI-powered Low-FODMAP diet planner with personalized recipes, barcode scanner, and budget optimization.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GutFlow",
  },
};

export const viewport = {
  themeColor: "#F0FDF4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Nunito', 'Inter', -apple-system, sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}