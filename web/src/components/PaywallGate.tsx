"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PaywallGateProps {
  children: React.ReactNode;
  requiredPlan: "basic" | "pro";
  featureName: string;
}

export default function PaywallGate({
  children,
  requiredPlan,
  featureName,
}: PaywallGateProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("astro_profile");
    if (stored) {
      setProfile(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 w-full h-32 bg-white/5 rounded-xl flex items-center justify-center">
        <div className="text-xs text-white/30">Checking credentials...</div>
      </div>
    );
  }

  // Plan level check:
  // "free" < "basic" < "pro"
  const planLevels: Record<string, number> = {
    free: 0,
    basic: 1,
    pro: 2,
  };

  const userPlan = (profile?.plan || "free").toLowerCase();
  const userLevel = planLevels[userPlan] ?? 0;
  const requiredLevel = planLevels[requiredPlan] ?? 1;

  const isLocked = userLevel < requiredLevel;

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl group">
      
      {/* Blurred background wrapper for children */}
      <div className="blur-[5px] select-none pointer-events-none opacity-40 transition-all duration-300">
        {children}
      </div>

      {/* Glassmorphic locked lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-indigo-deep/40 backdrop-blur-md border border-gold-base/15 rounded-2xl animate-fade-in-up">
        
        {/* Glowing padlock */}
        <div className="w-12 h-12 rounded-full bg-gold-base/10 border border-gold-base/30 flex items-center justify-center text-xl mb-4 animate-gold-glow">
          🔒
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h4 className="font-bold text-sm sm:text-base text-gold-light">
            Unlock {featureName}
          </h4>
          <p className="text-[11px] sm:text-xs text-white/60 leading-normal font-light">
            This premium feature requires a <span className="capitalize text-gold-base font-semibold">{requiredPlan}</span> plan or higher.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-5">
          <Link
            href="/pricing"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-gold-dark to-gold-base hover:opacity-95 text-indigo-deep font-bold text-xs shadow-md transition-all inline-block active:scale-95"
          >
            Upgrade to {requiredPlan}
          </Link>
        </div>

      </div>

    </div>
  );
}
