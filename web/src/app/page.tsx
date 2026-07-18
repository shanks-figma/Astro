import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen text-foreground relative z-10 font-sans">
      {/* Premium Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-wider gold-text-gradient font-heading">
            JYOTISH AI
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
          <Link href="#features" className="hover:text-gold-base transition-colors">Features</Link>
          <Link href="#sample" className="hover:text-gold-base transition-colors">Sample Reading</Link>
          <Link href="/pricing" className="hover:text-gold-base transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="hidden sm:inline-block text-sm font-medium hover:text-gold-base transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/kundli"
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-gold-dark via-gold-base to-gold-light text-indigo-deep font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] animate-gold-glow"
          >
            Generate Free Kundli
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-24 md:pt-32 md:pb-36 max-w-7xl mx-auto px-6 text-center">
          {/* Subtle spinning star background behind hero */}
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5 opacity-10 pointer-events-none animate-stars-slow bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(138,43,226,0.1)_100%)]" />
          
          <div className="max-w-4xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-base/30 bg-gold-base/5 text-gold-light text-xs font-semibold uppercase tracking-wider">
              ✨ Traditional Wisdom Meets Artificial Intelligence
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] font-heading">
              Understand Your Destiny with <br />
              <span className="gold-text-gradient">AI-Powered Vedic Astrology</span>
            </h1>
            
            <p className="text-base sm:text-xl text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
              Combining exact Swiss Ephemeris calculations with semantic RAG rule retrieval grounded strictly in classical texts (BPHS, Phaladeepika). Get instant personalized readings with zero hallucinations.
            </p>
            
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/kundli"
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-gold-dark via-gold-base to-gold-light text-indigo-deep font-bold text-lg hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)] active:scale-95 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.3)] text-center"
              >
                Create Your Chart — Free
              </Link>
              <Link
                href="#sample"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 font-semibold text-lg transition-all text-center"
              >
                View Sample Reading
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-20 md:py-28 border-t border-white/5 bg-indigo-dark/50">
          <div className="max-w-7xl mx-auto px-6 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold font-heading">Engineered for Astrological Integrity</h2>
              <p className="text-white/60">We don't do generic horoscope summaries. Every reading is programmatically constructed from astronomical math and classic guidelines.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
              {/* Feature 1 */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-glow border border-purple-accent/30 flex items-center justify-center text-2xl">
                  🧭
                </div>
                <h3 className="text-lg font-bold">Precise Ephemeris Math</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Utilizes NASA-grade Swiss Ephemeris (pySwisseph) calculations to plot planets, degrees, Nakshatras, and Whole-Sign lagna houses with 100% precision.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-glow border border-purple-accent/30 flex items-center justify-center text-2xl">
                  📚
                </div>
                <h3 className="text-lg font-bold">Vedic RAG Ingestion</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Semantic vector search maps your chart alignments directly to classical verses in the Brihat Parashara Hora Shastra, Saravali, and Phaladeepika.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-glow border border-purple-accent/30 flex items-center justify-center text-2xl">
                  ⏳
                </div>
                <h3 className="text-lg font-bold">120-Year Dasha Tree</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Interactive timeline maps your life cycles through Mahadasha and Antardasha timelines, starting from your precise birth Moon coordinates.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel glass-panel-hover p-6 rounded-2xl space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-glow border border-purple-accent/30 flex items-center justify-center text-2xl">
                  🗣️
                </div>
                <h3 className="text-lg font-bold">Multilingual Synthesis</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Personalised readings synthesized cleanly in English, traditional Hindi (Devanagari script), or popular Hinglish based on your preference.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sample Preview Section */}
        <section id="sample" className="py-20 max-w-7xl mx-auto px-6">
          <div className="glass-panel p-8 md:p-12 rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
            {/* Soft decorative blur */}
            <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full bg-purple-accent/10 blur-[80px]" />
            
            <div className="lg:col-span-5 space-y-4 relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold font-heading">Personalised Readings In Your Language</h2>
              <p className="text-white/70 leading-relaxed">
                Watch the AI compile your chart positions, retrieve specific rules, and construct a supportive, non-doom reading complete with classical remedies.
              </p>
              <div className="pt-2">
                <Link
                  href="/kundli"
                  className="inline-flex items-center gap-2 text-gold-light hover:text-gold-base font-semibold group transition-all"
                >
                  Create yours now <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 relative">
              {/* Blurred mockup reading */}
              <div className="glass-card border border-white/5 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div className="space-y-1">
                    <div className="text-xs text-gold-light uppercase tracking-wider font-semibold">✨ Daily Astrological Forecast</div>
                    <h3 className="font-bold text-lg">Navigating Career Ambition and Focus</h3>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-white/5 text-white/60">English</span>
                </div>
                <div className="space-y-3 text-sm text-white/80 leading-relaxed">
                  <p className="font-medium text-white/90">Summary: The current Mahadasha of Mars suggests a period of elevated drive and leadership focus, potentially bringing administrative support.</p>
                  <p>Given your birth chart, with the Lagna in Aries and Mars positioned in the 10th house, you occupy a strong Ruchaka Yoga configuration. This alignment may support careers in engineering, administration, or military structures...</p>
                  
                  {/* Blur starts */}
                  <div className="relative">
                    <p className="blur-[4px] select-none">Additionally, your Saturn placement indicates that discipline is required to unlock long-term authority. You may experience delays, but persistence leads to undeniable growth after the age of 35. You are advised to maintain physical routines...</p>
                    
                    {/* Blurry fade to black overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-deep via-indigo-deep/80 to-transparent flex flex-col justify-end items-center pb-2">
                      <Link
                        href="/kundli"
                        className="px-6 py-3 rounded-full bg-gradient-to-r from-gold-dark to-gold-base text-indigo-deep font-bold text-sm shadow-lg hover:opacity-95 transform hover:scale-105 transition-all"
                      >
                        Sign in to read yours
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 bg-indigo-deep">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm text-white/40">
          <div>© {new Date().getFullYear()} Jyotish AI. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
