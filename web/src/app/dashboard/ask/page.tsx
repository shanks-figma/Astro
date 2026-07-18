"use client";

import { useState, useEffect, useRef } from "react";
import PaywallGate from "../../../components/PaywallGate";
import { trackEvent } from "../../../utils/analytics";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  remedy?: string;
  sources?: string[];
  isLoading?: boolean;
}

export default function AskChatPage() {
  const [profile, setProfile] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [askCount, setAskCount] = useState(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    "Will Mars in my chart help my career?",
    "Tell me about my Saturn placement.",
    "What remedies are recommended for me?",
    "How does my Moon sign affect my emotional state?"
  ];

  useEffect(() => {
    const storedProfile = localStorage.getItem("astro_profile");
    const storedChart = localStorage.getItem("astro_chart");
    
    if (storedProfile && storedChart) {
      const p = JSON.parse(storedProfile);
      setProfile(p);
      setChart(JSON.parse(storedChart));
      
      // Seed first AI greeting
      setMessages([
        {
          id: "welcome",
          sender: "ai",
          text: `Namaste ${p.name}. I have analyzed your Vedic birth chart details (${p.birthPlace} birth). What specific aspect of your planetary alignments would you like to inquire about today?`
        }
      ]);

      const storedCount = localStorage.getItem("astro_ask_count");
      if (storedCount) {
        setAskCount(parseInt(storedCount, 10));
      }
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string) => {
    const isFree = (!profile?.plan || profile.plan === "free");
    if (isFree && askCount >= 3) {
      return;
    }

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);
    
    trackEvent("ai_question_asked", { 
      question_length: textToSend.length, 
      plan: profile?.plan || "free" 
    });

    if (isFree) {
      const nextCount = askCount + 1;
      setAskCount(nextCount);
      localStorage.setItem("astro_ask_count", nextCount.toString());
    }

    try {
      // Call interpretation microservice via proxy route
      const res = await fetch("/api/reading/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chart: chart,
          query_type: "ask",
          ask_text: textToSend,
          language: profile.language,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to consult the planetary database.");
      }

      const data = await res.json();
      
      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: data.body,
        remedy: data.remedy,
        sources: data.sources
      };
      
      setMessages((prev) => [...prev, aiMsg]);
      
    } catch (err: any) {
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: "The cosmic alignment was interrupted. I couldn't query the classical rules. Please try asking again."
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[78vh] glass-panel rounded-3xl overflow-hidden shadow-2xl relative border-gold-base/10">
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[70%] p-4 rounded-2xl space-y-3 shadow-md ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-gold-dark/20 to-purple-glow text-white border border-gold-base/20 rounded-tr-none"
                  : "bg-indigo-dark/70 text-white/90 border border-white/5 rounded-tl-none"
              }`}
            >
              {/* Message main text */}
              <p className="text-xs sm:text-sm leading-relaxed font-light">{msg.text}</p>
              
              {/* Remedy subsection */}
              {msg.remedy && (
                <div className="p-3 rounded-lg bg-gold-base/5 border border-gold-base/10 space-y-1">
                  <div className="text-[10px] font-bold text-gold-light uppercase tracking-wider">🧘 Suggested Action</div>
                  <p className="text-xs text-white/80 leading-relaxed font-light">{msg.remedy}</p>
                </div>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/5 text-[9px] text-white/30">
                  <span>Sources:</span>
                  {msg.sources.map((src, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 font-mono">{src}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-indigo-dark/70 text-white/40 border border-white/5 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs font-light">Consulting classical rules...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      <PaywallGate requiredPlan="basic" featureName="Unlimited AI Chat Queries">
        {/* Suggested prompts tags (only shows on start) */}
        {messages.length === 1 && !isTyping && (
          <div className="px-6 py-2 flex flex-wrap gap-2 border-t border-white/5 bg-indigo-deep/30">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-[10px] px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:border-gold-base/30 text-white/60 hover:text-gold-light transition-all active:scale-95"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t border-white/5 bg-indigo-dark/60 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isTyping}
              placeholder="Ask about career timing, dasha changes, or remedies..."
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:border-gold-base/50 focus:outline-none transition-all text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isTyping}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold-dark to-gold-base text-indigo-deep font-bold text-xs sm:text-sm transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ask
            </button>
          </form>
        </div>
      </PaywallGate>

    </div>
  );
}
