"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "../../utils/analytics";

export default function Onboarding() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    tob: "12:00",
    tob_unknown: false,
    city: "",
    language: "English",
    ayanamsa: "lahiri",
    concern: "general",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const loadingMessages = [
    "Consulting the Swiss Ephemeris...",
    "Aligning planetary longitudes...",
    "Dividing the 12 Whole-Sign houses...",
    "Mapping Dasha periods and Vedic Yogas...",
    "Retrieving RAG rules from classical texts...",
    "Synthesizing your personalized reading..."
  ];

  // Rotate loading messages every 1.5 seconds during loading
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingMessages.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!formData.name || !formData.dob || !formData.city) {
      setErrorMessage("Please fill in Name, Date, and Place of Birth.");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage("");
    trackEvent("chart_details_submitted", { concern: formData.concern, has_time: !formData.tob_unknown });

    try {
      // Call calculation microservice via Next.js proxy route
      const res = await fetch("/api/chart/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dob: formData.dob,
          tob: formData.tob_unknown ? "12:00" : formData.tob,
          tob_unknown: formData.tob_unknown,
          city: formData.city,
          ayanamsa: formData.ayanamsa,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate birth chart.");
      }

      const chartData = await res.json();
      
      // Store in localStorage for client state persistence
      localStorage.setItem("astro_chart", JSON.stringify(chartData));
      localStorage.setItem("astro_profile", JSON.stringify({
        name: formData.name,
        language: formData.language,
        concern: formData.concern,
        ayanamsa: formData.ayanamsa,
        birthPlace: formData.city
      }));

      // Short delay for final transition
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
      
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || "An unexpected connection error occurred.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen text-foreground relative z-10 font-sans items-center justify-center p-6">
      
      {/* Back button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 text-sm text-white/50 hover:text-gold-light flex items-center gap-1.5 transition-colors"
      >
        ← Back to Home
      </Link>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-indigo-deep bg-opacity-95 z-50 flex flex-col items-center justify-center p-6 transition-all duration-500">
          <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
            {/* Spinning Gold Zodiac Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-gold-base opacity-40 animate-[spin_12s_linear_infinite]" />
            {/* Inner spinning purple ring */}
            <div className="absolute w-32 h-32 rounded-full border-2 border-purple-accent/60 opacity-60 animate-[spin_6s_linear_infinite_reverse]" />
            {/* Central icon */}
            <span className="text-4xl animate-pulse">✨</span>
          </div>
          
          <div className="text-center space-y-4 max-w-md">
            <h3 className="text-2xl font-bold font-heading gold-text-gradient">Reading the Stars</h3>
            <p className="text-white/70 h-8 font-light text-sm animate-pulse">
              {loadingMessages[loadingStep]}
            </p>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full max-w-xl glass-panel p-8 rounded-3xl space-y-8 relative overflow-hidden">
        {/* Subtle glow inside card */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-purple-accent/5 blur-[40px] pointer-events-none" />
        
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold font-heading gold-text-gradient">Enter Birth Details</h2>
          <p className="text-sm text-white/60">Provide accurate details to compile your Vedic chart coordinates.</p>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm text-center">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-gold-base/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Dob */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-gold-base/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Time of birth */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Time of Birth</label>
                <input
                  type="time"
                  name="tob"
                  value={formData.tob}
                  onChange={handleChange}
                  disabled={formData.tob_unknown}
                  className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-gold-base/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm ${formData.tob_unknown ? "opacity-30 cursor-not-allowed" : ""}`}
                />
              </div>
              <div className="sm:col-span-4 flex items-center h-full sm:pt-6">
                <label className="flex items-center gap-2 text-xs text-white/70 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    name="tob_unknown"
                    checked={formData.tob_unknown}
                    onChange={handleChange}
                    className="accent-gold-base rounded border-white/10 bg-white/5"
                  />
                  Time Unknown
                </label>
              </div>
            </div>

            {/* Place of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Place of Birth (City)</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. New Delhi"
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-gold-base/50 focus:bg-white/[0.08] focus:outline-none transition-all text-sm"
              />
            </div>

            {/* Primary Focus Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Life Area of Focus</label>
                <select
                  name="concern"
                  value={formData.concern}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-indigo-dark border border-white/10 text-white focus:border-gold-base/50 focus:outline-none transition-all text-sm"
                >
                  <option value="general">General Life Paths</option>
                  <option value="career">Career & Profession</option>
                  <option value="relationship">Relationships & Spouse</option>
                  <option value="health">Health & Well-being</option>
                  <option value="wealth">Wealth & Property</option>
                  <option value="spiritual">Spiritual & Dharma</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-white/60">Language Preference</label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-indigo-dark border border-white/10 text-white focus:border-gold-base/50 focus:outline-none transition-all text-sm"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिंदी)</option>
                  <option value="Hinglish">Hinglish (Hindi - Latin)</option>
                </select>
              </div>
            </div>

            {/* Advanced Settings Collapsible */}
            <details className="group pt-2">
              <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-base/80 hover:text-gold-base cursor-pointer select-none transition-colors">
                <span className="text-sm transition-transform group-open:rotate-90">▸</span>
                <span>Advanced Calculation Settings</span>
                <span className="text-[10px] text-white/40 normal-case font-normal">(Ayanamsa)</span>
              </summary>
              <div className="mt-3 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-white/70">Ayanamsa Calculation System</label>
                  <span className="text-[10px] text-gold-base/70">Lahiri recommended</span>
                </div>
                <select
                  name="ayanamsa"
                  value={formData.ayanamsa}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-indigo-dark border border-white/10 text-white focus:border-gold-base/50 focus:outline-none transition-all text-xs"
                >
                  <option value="lahiri">Lahiri (Default / Standard — Recommended)</option>
                  <option value="raman">Raman (B.V. Raman offset)</option>
                  <option value="krishnamurti">Krishnamurti (KP System)</option>
                </select>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  99% of users should leave this on <strong className="text-white/60">Lahiri</strong>. Only change if your astrologer specifically uses KP System or Dr. B.V. Raman&apos;s method.
                </p>
              </div>
            </details>

          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold-dark via-gold-base to-gold-light text-indigo-deep font-bold text-base hover:opacity-95 active:scale-[0.99] transition-all shadow-[0_4px_20px_rgba(212,175,55,0.2)]"
          >
            Compute Birth Chart & Readings
          </button>
        </form>
      </div>
    </div>
  );
}
