"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Check if user has generated a chart, if not, redirect to onboarding!
    const chart = localStorage.getItem("astro_chart");
    const storedProfile = localStorage.getItem("astro_profile");
    
    if (!chart || !storedProfile) {
      router.push("/kundli");
    } else {
      setProfile(JSON.parse(storedProfile));
    }
  }, [router]);

  const handleSignOut = () => {
    localStorage.clear();
    router.push("/");
  };

  const navItems = [
    { name: "Daily Reading", path: "/dashboard", icon: "✨" },
    { name: "Interactive Kundli", path: "/dashboard/kundli", icon: "🧭" },
    { name: "Ask AI Chat", path: "/dashboard/ask", icon: "💬" },
  ];

  if (!profile) {
    return (
      <div className="min-h-screen bg-indigo-deep flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-2 border-dashed border-gold-base animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Aligning coordinates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-deep flex flex-col md:flex-row text-foreground font-sans relative z-10">
      
      {/* Sidebar Panel */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-indigo-dark/80 backdrop-blur-lg flex flex-col p-6 space-y-8 z-20">
        
        {/* Brand/Logo */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold tracking-wider gold-text-gradient font-heading">
            JYOTISH AI
          </Link>
          <button 
            onClick={handleSignOut} 
            className="md:hidden text-xs text-white/40 hover:text-red-400 border border-white/10 px-2 py-1 rounded"
          >
            Sign Out
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-gold-dark/15 to-purple-glow text-gold-light border-l-2 border-gold-base"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Pricing Promotion Card inside Sidebar */}
        {(!profile.plan || profile.plan === "free" || profile.plan === "basic") && (
          <div className="hidden md:block glass-card p-4 rounded-2xl space-y-3 border border-gold-base/10 bg-gold-base/5">
            <div className="text-xs font-bold uppercase tracking-wider text-gold-light">⚡ Premium Access</div>
            <p className="text-xs text-white/60 leading-normal">Unlock compatibility, bhava analysis, and unlimited AI questions.</p>
            <Link
              href="/pricing"
              className="block text-center w-full py-2 rounded-lg bg-gold-base hover:bg-gold-light text-indigo-deep font-bold text-xs transition-colors shadow-sm"
            >
              Upgrade to {profile.plan === "basic" ? "Pro" : "Basic"}
            </Link>
          </div>
        )}

        {/* Footer profile info */}
        <div className="hidden md:flex items-center gap-3 border-t border-white/5 pt-4">
          <div className="w-9 h-9 rounded-full bg-purple-accent flex items-center justify-center text-sm font-bold">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{profile.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className="text-[9px] text-white/40 truncate max-w-[70px]">{profile.birthPlace}</span>
              <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase tracking-wide font-extrabold ${
                profile.plan === "pro" 
                  ? "bg-gold-base/15 text-gold-light border border-gold-base/30" 
                  : profile.plan === "basic" 
                  ? "bg-purple-accent/20 text-purple-300 border border-purple-accent/30" 
                  : "bg-white/10 text-white/50"
              }`}>
                {profile.plan || "Free"}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="px-8 py-5 border-b border-white/5 bg-indigo-dark/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold font-heading">
              {pathname === "/dashboard" && "Your Daily Insights"}
              {pathname === "/dashboard/kundli" && "Vedic Birth Chart"}
              {pathname === "/dashboard/ask" && "Consult AI Astrologer"}
            </h1>
            <div className="text-xs text-white/50">
              Ayanamsa: <span className="capitalize">{profile.ayanamsa}</span> | Lang: <span className="capitalize">{profile.language}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {(!profile.plan || profile.plan === "free" || profile.plan === "basic") ? (
              <Link
                href="/pricing"
                className="px-4 py-1.5 rounded-full border border-gold-base/30 bg-gold-base/5 hover:bg-gold-base/10 text-gold-light text-xs font-semibold tracking-wide transition-all"
              >
                Get Premium
              </Link>
            ) : (
              <span className="px-4 py-1.5 rounded-full border border-gold-base/30 bg-gold-base/10 text-gold-light text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.15)]">
                👑 Pro Member
              </span>
            )}
          </div>
        </header>
        
        {/* Page content scrollable */}
        <main className="flex-1 p-8 overflow-y-auto max-w-6xl w-full mx-auto">
          {children}
        </main>

      </div>
    </div>
  );
}
