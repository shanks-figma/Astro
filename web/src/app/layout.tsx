import type { Metadata } from "next";
import { Suspense } from "react";
import AnalyticsTracker from "../components/AnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jyotish AI | Premium Personalised Vedic Kundli & Readings",
  description:
    "Get your accurate Vedic birth chart calculated with Swiss Ephemeris. Access personalised AI interpretations, Vimshottari Dasha timelines, and Yoga analysis in Hindi, English, and Hinglish.",
  keywords: [
    "Vedic Astrology",
    "Kundli Generator",
    "Birth Chart",
    "Vimshottari Dasha",
    "Astrology AI",
    "Kundli Milan",
    "Kundli reading",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-indigo-deep overflow-x-hidden relative">
        {/* Ambient background glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-glow blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-glow blur-[120px] pointer-events-none" />
        
        {/* Starfield overlay simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_80%)] opacity-30 pointer-events-none" />
        
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>

        <div className="relative flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
