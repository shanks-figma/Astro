"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackEvent } from "../../utils/analytics";

export default function PricingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  
  // Checkout Modal State
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState("");
  const [checkoutAmount, setCheckoutAmount] = useState(0);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("astro_profile");
    if (stored) {
      setProfile(JSON.parse(stored));
    }
  }, []);

  const handleOpenCheckout = (planName: string, price: number) => {
    setCheckoutPlan(planName);
    setCheckoutAmount(price);
    setShowCheckout(true);
    setCheckoutStatus("idle");
    setCheckoutError("");
    trackEvent("upgrade_clicked", { plan: planName, billing: isAnnual ? "annual" : "monthly" });
  };

  const handleSimulateSuccess = async () => {
    setCheckoutStatus("processing");
    setCheckoutError("");

    try {
      // 1. Call create-order API
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: checkoutPlan,
          billing: isAnnual ? "annual" : "monthly",
        }),
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create order on server.");
      }

      const orderData = await orderRes.json();

      // 2. Call verify API with simulated signatures
      const paymentId = `pay_${Math.random().toString(36).substring(2, 12)}`;
      const signature = `sig_${Math.random().toString(36).substring(2, 12)}`;

      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderData.id,
          razorpay_signature: signature,
          plan: checkoutPlan,
          profile: profile,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error("Payment signature verification failed.");
      }

      const verifyData = await verifyRes.json();

      // 3. Update localStorage and profile state
      localStorage.setItem("astro_profile", JSON.stringify(verifyData.profile));
      localStorage.setItem("astro_ask_count", "0"); // Reset AI chat limits
      setProfile(verifyData.profile);
      setCheckoutStatus("success");
      trackEvent("payment_completed", { plan: checkoutPlan, amount: checkoutAmount, billing: isAnnual ? "annual" : "monthly" });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        setShowCheckout(false);
        router.push("/dashboard");
      }, 1500);

    } catch (err: any) {
      setCheckoutStatus("failed");
      setCheckoutError(err.message || "An error occurred during payment processing.");
    }
  };

  const handleSimulateFailure = () => {
    setCheckoutStatus("processing");
    setTimeout(() => {
      setCheckoutStatus("failed");
      setCheckoutError("Simulated Transaction Declined: Insufficient balance or invalid OTP.");
      trackEvent("payment_failed", { plan: checkoutPlan, reason: "declined" });
    }, 1000);
  };

  const plans = [
    {
      name: "Free Tier",
      price: 0,
      description: "Basic astronomical calculations & daily reading.",
      features: [
        "Swiss Ephemeris chart plotting",
        "Whole-Sign house placements",
        "Today's daily forecast reading",
        "Limited to 3 Ask AI questions total",
        "Support via general forums"
      ],
      cta: "Current Active",
      premium: false
    },
    {
      name: "Basic Plan",
      price: isAnnual ? 79 : 99,
      description: "Unlocks full AI interpretations & unlimited consulting.",
      features: [
        "Everything in Free Tier",
        "Comprehensive RAG interpretations",
        "Complete 30+ Yoga analysis",
        "120-Year Vimshottari Dasha details",
        "Unlimited Ask AI chat queries",
        "No advertisement banners"
      ],
      cta: "Upgrade to Basic",
      premium: true,
      popular: false
    },
    {
      name: "Pro Plan",
      price: isAnnual ? 239 : 299,
      description: "Advanced Vedic toolkits for relationship & timing analysis.",
      features: [
        "Everything in Basic Plan",
        "Kundli Milan (Relationship Compatibility)",
        "Muhurta (Auspicious timing check)",
        "Transit Map (Daily planetary shifts)",
        "Downloadable PDF generated reports",
        "Priority live astrologer verification"
      ],
      cta: "Go Pro (Recommended)",
      premium: true,
      popular: true
    }
  ];

  return (
    <div className="flex flex-col min-h-screen text-foreground relative z-10 font-sans p-6 items-center">
      
      {/* Header and Back Button */}
      <header className="w-full max-w-7xl mx-auto py-6 flex items-center justify-between border-b border-white/5 mb-12">
        <Link href="/" className="text-xl font-bold tracking-wider gold-text-gradient font-heading">
          JYOTISH AI
        </Link>
        <Link href="/dashboard" className="text-sm text-white/50 hover:text-gold-light flex items-center gap-1.5 transition-colors">
          Go to Dashboard →
        </Link>
      </header>

      {/* Title */}
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl sm:text-5xl font-bold font-heading">Unleash the Power of the Stars</h2>
        <p className="text-white/60 text-sm sm:text-base leading-relaxed font-light">
          Upgrade to unlock detailed Yoga analysis, unlimited AI consults, relationship matching, and premium PDF summaries.
        </p>
        
        {/* Toggle Button */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold ${!isAnnual ? "text-gold-light" : "text-white/40"}`}>Monthly billing</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-12 h-6 rounded-full bg-white/10 relative p-1 flex items-center transition-all focus:outline-none"
          >
            <div className={`w-4 h-4 rounded-full bg-gold-base shadow-md transform transition-transform ${isAnnual ? "translate-x-6" : ""}`} />
          </button>
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${isAnnual ? "text-gold-light" : "text-white/40"}`}>
            Yearly billing
            <span className="px-1.5 py-0.5 rounded-full bg-gold-base/15 text-gold-light text-[9px] font-bold uppercase tracking-wide">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl pb-20">
        {plans.map((plan) => {
          const isUserPlan = (profile?.plan || "free").toLowerCase() === plan.name.split(" ")[0].toLowerCase();
          
          return (
            <div
              key={plan.name}
              className={`glass-panel p-8 rounded-3xl flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                plan.popular 
                  ? "border-gold-base ring-2 ring-gold-base/20 scale-105 shadow-2xl bg-indigo-dark/90" 
                  : "border-white/5 shadow-lg bg-indigo-dark/50"
              }`}
            >
              {/* Popular glow badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-gold-dark to-gold-base text-indigo-deep text-[10px] font-extrabold uppercase px-4 py-1.5 rounded-bl-2xl tracking-wider">
                  🔥 Best Value
                </div>
              )}
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold font-heading">{plan.name}</h3>
                  <p className="text-xs text-white/50 mt-1 font-light leading-relaxed">{plan.description}</p>
                </div>

                {/* Pricing section */}
                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-4xl font-extrabold font-heading text-white">₹{plan.price}</span>
                  <span className="text-xs text-white/40">/ month</span>
                </div>

                {/* Features checklist */}
                <ul className="space-y-3 pt-4 text-xs font-light text-white/80 border-t border-white/5">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="text-gold-base text-xs mt-0.5">✓</span>
                      <span className="leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-8">
                {plan.price === 0 || isUserPlan ? (
                  <div className="w-full text-center py-3 text-xs font-semibold text-white/40 border border-white/5 rounded-xl bg-white/[0.01]">
                    {isUserPlan ? "Active Subscribed" : "Current Free Tier"}
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenCheckout(plan.name.split(" ")[0], plan.price)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-gradient-to-r from-gold-dark via-gold-base to-gold-light text-indigo-deep shadow-[0_4px_20px_rgba(212,175,55,0.2)] hover:opacity-95"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    }`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated Razorpay Checkout Modal Overlay */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="w-full max-w-sm bg-[#1e2330] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            
            {/* Razorpay Simulated Header */}
            <div className="bg-[#191d29] px-6 py-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-xs font-bold text-white">R</span>
                <div className="text-xs">
                  <div className="font-bold text-white tracking-wide">Razorpay Checkout</div>
                  <div className="text-[9px] text-white/40">Secure checkout system</div>
                </div>
              </div>
              <button 
                onClick={() => setShowCheckout(false)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Merchant Details */}
            <div className="p-6 space-y-6 text-center">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-white/50">Merchant Account</div>
                <h4 className="font-bold text-sm text-gold-light">JYOTISH AI PREMIUM</h4>
                <div className="text-[10px] text-white/30">ID: acc_jyotish_ai_2026</div>
              </div>

              {/* Amount to Pay */}
              <div className="py-4 border-y border-white/5 space-y-1">
                <div className="text-xs text-white/40">Simulated Payment Amount</div>
                <h3 className="text-3xl font-extrabold text-white">₹{checkoutAmount}.00</h3>
                <div className="text-[9px] text-gold-light/60 capitalize">{checkoutPlan} Plan (INR)</div>
              </div>

              {/* Status / Log Message */}
              {checkoutStatus === "processing" && (
                <div className="space-y-2 py-2">
                  <div className="w-6 h-6 border-2 border-gold-base border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] text-white/50">Sending secure cryptographic verification tokens...</p>
                </div>
              )}

              {checkoutStatus === "success" && (
                <div className="text-xs text-green-400 py-2 font-medium">
                  ✓ Payment Successful! Upgrading dashboard permissions...
                </div>
              )}

              {checkoutStatus === "failed" && (
                <div className="text-xs text-red-400 py-2 border border-red-500/10 bg-red-500/5 rounded-lg leading-normal font-light">
                  ⚠️ {checkoutError}
                </div>
              )}

              {/* Interaction Buttons */}
              {checkoutStatus !== "processing" && checkoutStatus !== "success" && (
                <div className="space-y-2.5">
                  <button
                    onClick={handleSimulateSuccess}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.99]"
                  >
                    Simulate Payment Success (Verify Signature)
                  </button>
                  <button
                    onClick={handleSimulateFailure}
                    className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-semibold text-xs sm:text-sm transition-all"
                  >
                    Simulate Payment Failure / Decline
                  </button>
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="w-full py-2.5 text-xs text-white/40 hover:text-white font-light transition-all"
                  >
                    Cancel Transaction
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
