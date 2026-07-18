"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PaywallGate from "../../components/PaywallGate";

interface ReadingResult {
  title: string;
  summary: string;
  body: string;
  remedy: string;
  sources: string[];
  low_confidence?: boolean;
}

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [reading, setReading] = useState<ReadingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedProfile = localStorage.getItem("astro_profile");
    const storedChart = localStorage.getItem("astro_chart");
    
    if (storedProfile && storedChart) {
      const parsedProfile = JSON.parse(storedProfile);
      const parsedChart = JSON.parse(storedChart);
      setProfile(parsedProfile);
      setChart(parsedChart);
      
      // Load daily reading
      fetchDailyReading(parsedChart, parsedProfile);
    }
  }, []);

  const fetchDailyReading = async (chartData: any, profileData: any) => {
    // Check session cache first
    const cacheKey = `daily_reading_${chartData.metadata.utc_datetime}_${profileData.language}_${profileData.concern}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      setReading(JSON.parse(cached));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Request generation
      const res = await fetch("/api/reading/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chart: chartData,
          query_type: "daily",
          domain: profileData.concern === "general" ? null : profileData.concern,
          language: profileData.language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to compile astrological reading.");
      }

      const readingData = await res.json();
      setReading(readingData);
      
      // Save cache
      sessionStorage.setItem(cacheKey, JSON.stringify(readingData));
    } catch (err: any) {
      setError(err.message || "Could not retrieve daily prediction.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Main reading skeleton */}
        <div className="glass-panel p-6 rounded-2xl h-80 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-6 bg-white/10 rounded w-[40%]" />
            <div className="h-4 bg-white/5 rounded w-[90%]" />
            <div className="h-4 bg-white/5 rounded w-[85%]" />
          </div>
          <div className="h-20 bg-white/5 rounded-xl w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center space-y-4 border-red-500/20 bg-red-500/5">
        <span className="text-4xl">🔮</span>
        <h3 className="text-lg font-bold text-red-400">Connection Interrupted</h3>
        <p className="text-white/60 text-sm">{error}</p>
        <button
          onClick={() => fetchDailyReading(chart, profile)}
          className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold"
        >
          Retry Calculation
        </button>
      </div>
    );
  }

  const dashaInfo = chart?.dashas?.current || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
      
      {/* Daily Reading Card */}
      <div className="lg:col-span-8 space-y-6">
        
        {reading?.low_confidence && (
          <div className="px-4 py-2 text-xs rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-400">
            ⚠️ <strong>General Influence:</strong> Limited classical rules matched your exact planetary positions today. A general forecast is shown.
          </div>
        )}

        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden space-y-6 shadow-xl border-l-2 border-l-gold-base">
          {/* Subtle gold flare */}
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gold-base/5 blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gold-light">✨ Today's Guidance</span>
              <h2 className="text-2xl font-bold font-heading">{reading?.title}</h2>
            </div>
            <span className="text-xs px-2 py-1 rounded bg-gold-base/10 text-gold-light font-medium capitalize">
              {profile?.concern} Focus
            </span>
          </div>

          {/* Reading body */}
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-white/80 font-light">
            <p className="font-medium text-white/95 text-indigo-200">
              {reading?.summary}
            </p>
            <PaywallGate requiredPlan="basic" featureName="Detailed Reading Body">
              {reading?.body.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </PaywallGate>
          </div>

          {/* Remedy Box */}
          {reading?.remedy && (
            <div className="p-5 rounded-xl border border-gold-base/20 bg-gold-base/5 space-y-2">
              <h4 className="text-xs font-bold text-gold-light uppercase tracking-wider flex items-center gap-1.5">
                <span>🧘</span> Daily Classical Remedy
              </h4>
              <p className="text-sm text-white/80 leading-relaxed font-light">{reading.remedy}</p>
            </div>
          )}

          {/* Sources list */}
          {reading?.sources && reading.sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs text-white/40">
              <span>Retrieved Verses:</span>
              {reading.sources.map((src, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono">
                  {src}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dasha & Life Area Sidebar Panels */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Current Dasha Period Card */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-20 h-20 rounded-full bg-purple-accent/10 blur-[30px]" />
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Current Life Cycle</h3>
          
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Mahadasha Lord</span>
              <span className="text-sm font-bold text-gold-light">{dashaInfo.maha}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Antardasha Lord</span>
              <span className="text-sm font-semibold">{dashaInfo.antar}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">Ends At</span>
              <span className="text-xs font-mono">{dashaInfo.ends_at}</span>
            </div>

            {/* Visual Dasha transition bar */}
            <div className="pt-2">
              <div className="text-[10px] text-white/40 flex justify-between mb-1">
                <span>Active Cycle</span>
                <span>Vimshottari Dasha</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="w-[65%] h-full rounded-full bg-gradient-to-r from-purple-accent to-gold-base" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Astrological Metrics Card */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Astrological Details</h3>
          
          <div className="space-y-3.5 text-sm pt-2 font-light">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Ascendant (Lagna)</span>
              <span className="font-semibold text-white/95">{chart?.lagna?.sign}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Moon Sign (Rashi)</span>
              <span className="font-semibold text-white/95">{chart?.rashi}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60">Birth Star (Nakshatra)</span>
              <span className="font-semibold text-white/95">
                {chart?.nakshatra} ({chart?.nakshatra_pada} Pada)
              </span>
            </div>
          </div>
        </div>

        {/* Ask Astrologer Quick CTA */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden space-y-4 bg-indigo-dark/40 border border-purple-accent/20">
          <h4 className="font-bold text-sm">Have specific questions?</h4>
          <p className="text-xs text-white/60 leading-relaxed font-light">Ask the AI Astrologer questions about your career, marriage, or financial alignments.</p>
          <Link
            href="/dashboard/ask"
            className="block text-center w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gold-light border border-gold-base/20 font-semibold text-sm transition-all"
          >
            Consult AI Astrologer
          </Link>
        </div>

      </div>

    </div>
  );
}
