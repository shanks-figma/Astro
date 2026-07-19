"use client";

import { useEffect, useState } from "react";
import PaywallGate from "../../../components/PaywallGate";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const PLANET_SIGNIFICATORS: Record<string, { Hindi: string; meaning: string }> = {
  "Sun": { Hindi: "Surya", meaning: "Soul, Vitality, Leadership & Authority" },
  "Moon": { Hindi: "Chandra", meaning: "Mind, Emotional Balance, Intuition & Peace" },
  "Mars": { Hindi: "Mangal", meaning: "Courage, Energy, Drive & Ambition" },
  "Mercury": { Hindi: "Budh", meaning: "Intellect, Speech, Analytical Ability & Business" },
  "Jupiter": { Hindi: "Guru", meaning: "Wisdom, Fortune, Growth & Higher Guidance" },
  "Venus": { Hindi: "Shukra", meaning: "Love, Wealth, Harmony, Arts & Relationships" },
  "Saturn": { Hindi: "Shani", meaning: "Karma, Discipline, Endurance & Life Lessons" },
  "Rahu": { Hindi: "Rahu", meaning: "Innovation, Ambition, Expansion & Desire" },
  "Ketu": { Hindi: "Ketu", meaning: "Spiritual Awakening, Research & Intuition" },
};

function getChartCrucialPointers(chart: any) {
  const positives: string[] = [];
  const cautions: string[] = [];

  const lagna = chart.lagna?.sign;
  if (lagna) {
    positives.push(`Lagna in ${lagna}: Gives a strong core vitality, natural charisma, and clear life direction.`);
  }

  chart.yogas?.forEach((y: any) => {
    if (["Gajakesari Yoga", "Budha-Aditya Yoga", "Anapha Yoga", "Ubhayachari Yoga", "Raj Yoga"].includes(y.name)) {
      positives.push(`✨ ${y.name}: Auspicious planetary formation enhancing your reputation, mental strength, and success.`);
    } else if (y.name === "Mangal Dosha") {
      cautions.push(`⚡ Mangal Alignment: High drive in partnerships—maintain open, patient communication with your spouse or partner.`);
    }
  });

  chart.planets?.forEach((p: any) => {
    if ([1, 4, 5, 7, 9, 10].includes(p.house) && ["Jupiter", "Venus", "Mercury", "Sun"].includes(p.name)) {
      const area = p.house === 10 ? "career & status" : p.house === 9 ? "luck & wisdom" : p.house === 5 ? "creativity & intellect" : p.house === 7 ? "partnerships" : "overall growth";
      positives.push(`🌟 ${p.name} in House ${p.house}: Strongly positioned to support your ${area}.`);
    }

    if (p.retrograde) {
      cautions.push(`🔄 Retrograde ${p.name} (${p.sign}): Encourages internal reflection; take time before rushing major ${p.name === "Saturn" ? "career commitments" : p.name === "Mercury" ? "agreements" : "decisions"}.`);
    }

    if ([6, 8, 12].includes(p.house)) {
      const area = p.house === 6 ? "daily routine & health" : p.house === 8 ? "transformation & research" : "rest & inner reflection";
      cautions.push(`🛡️ ${p.name} in House ${p.house}: Brings deep resilience; focus extra attention on ${area}.`);
    }
  });

  if (positives.length === 0) {
    positives.push("Balanced planetary distribution supporting steady, long-term personal development.");
  }
  if (cautions.length === 0) {
    cautions.push("No major planetary afflictions detected; maintain regular mindful habits.");
  }

  return { 
    positives: Array.from(new Set(positives)).slice(0, 4), 
    cautions: Array.from(new Set(cautions)).slice(0, 4) 
  };
}

export default function KundliChartPage() {
  const [chart, setChart] = useState<any>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"planets" | "yogas" | "dashas">("planets");

  useEffect(() => {
    const storedChart = localStorage.getItem("astro_chart");
    if (storedChart) {
      setChart(JSON.parse(storedChart));
    }
  }, []);

  if (!chart) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-gold-base border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-white/50">Computing chart coordinates...</p>
        </div>
      </div>
    );
  }

  const crucialPointers = getChartCrucialPointers(chart);

  // 1. Calculate sign index for each house based on Lagna sign
  const lagnaSign = chart.lagna?.sign || "Aries";
  const lagnaIndex = ZODIAC_SIGNS.indexOf(lagnaSign) + 1; // 1-12
  
  const getHouseSignNum = (houseNum: number) => {
    return ((lagnaIndex + houseNum - 2) % 12) + 1;
  };

  // 2. Map planets to their houses
  const getPlanetsInHouse = (houseNum: number) => {
    return chart.planets.filter((p: any) => p.house === houseNum);
  };

  // 3. Define North Indian Chart polygon coords
  const houses_coords = [
    { number: 1, points: "200,0 300,100 200,200 100,100", center: { x: 200, y: 100 }, label: { x: 200, y: 55 } },
    { number: 2, points: "0,0 200,0 100,100", center: { x: 100, y: 35 }, label: { x: 100, y: 65 } },
    { number: 3, points: "0,0 0,200 100,100", center: { x: 35, y: 100 }, label: { x: 65, y: 100 } },
    { number: 4, points: "0,200 100,100 200,200 100,300", center: { x: 100, y: 200 }, label: { x: 145, y: 200 } },
    { number: 5, points: "0,200 0,400 100,300", center: { x: 35, y: 300 }, label: { x: 65, y: 300 } },
    { number: 6, points: "0,400 200,400 100,300", center: { x: 100, y: 365 }, label: { x: 100, y: 335 } },
    { number: 7, points: "200,400 100,300 200,200 300,300", center: { x: 200, y: 300 }, label: { x: 200, y: 345 } },
    { number: 8, points: "200,400 400,400 300,300", center: { x: 300, y: 365 }, label: { x: 300, y: 335 } },
    { number: 9, points: "400,200 400,400 300,300", center: { x: 365, y: 300 }, label: { x: 335, y: 300 } },
    { number: 10, points: "400,200 300,300 200,200 300,100", center: { x: 300, y: 200 }, label: { x: 255, y: 200 } },
    { number: 11, points: "400,0 400,200 300,100", center: { x: 365, y: 100 }, label: { x: 335, y: 100 } },
    { number: 12, points: "200,0 400,0 300,100", center: { x: 300, y: 35 }, label: { x: 300, y: 65 } },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Top Section: Crucial Highlights Card */}
      <div className="glass-panel p-6 rounded-3xl border border-gold-base/20 relative overflow-hidden space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div>
            <h3 className="text-lg font-bold font-heading gold-text-gradient flex items-center gap-2">
              ✨ Key Chart Highlights & Pointers
            </h3>
            <p className="text-xs text-white/50">Crucial positive drivers and constructive mindfulness pointers for your birth chart.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Positive Strengths */}
          <div className="space-y-2 p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              🟢 Key Strengths & Fortunate Placements
            </h4>
            <ul className="space-y-2 text-xs text-white/80 font-light">
              {crucialPointers.positives.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 select-none">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Mindfulness */}
          <div className="space-y-2 p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              🟡 Areas for Care & Mindful Growth
            </h4>
            <ul className="space-y-2 text-xs text-white/80 font-light">
              {crucialPointers.cautions.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 select-none">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Chart Section */}
        <div className="lg:col-span-6 flex flex-col items-center space-y-6">
          
          {/* Interactive SVG Chart Card */}
          <div className="glass-panel p-6 rounded-3xl w-full flex items-center justify-center shadow-xl border border-gold-base/10 relative overflow-hidden">
            {/* Subtle spinning background details */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(138,43,226,0.05)_0%,_transparent_75%)] pointer-events-none" />
            
            <svg
              viewBox="0 0 400 400"
              className="w-full max-w-[380px] h-auto drop-shadow-[0_4px_15px_rgba(0,0,0,0.5)] select-none"
            >
              {/* Outer box border */}
              <rect 
                x="0" 
                y="0" 
                width="400" 
                height="400" 
                fill="rgba(15, 11, 33, 0.4)" 
                stroke="#d4af37" 
                strokeWidth="2.5" 
                className="rx-2" 
              />

              {/* Inner Diagonal Lines */}
              <line x1="0" y1="0" x2="400" y2="400" stroke="#d4af37" strokeWidth="1.2" opacity="0.7" />
              <line x1="400" y1="0" x2="0" y2="400" stroke="#d4af37" strokeWidth="1.2" opacity="0.7" />

              {/* Center Diamond Lines */}
              <line x1="200" y1="0" x2="0" y2="200" stroke="#d4af37" strokeWidth="1.5" />
              <line x1="0" y1="200" x2="200" y2="400" stroke="#d4af37" strokeWidth="1.5" />
              <line x1="200" y1="400" x2="400" y2="200" stroke="#d4af37" strokeWidth="1.5" />
              <line x1="400" y1="200" x2="200" y2="0" stroke="#d4af37" strokeWidth="1.5" />

              {/* Render each house polygon & labels */}
              {houses_coords.map((house) => {
                const signNum = getHouseSignNum(house.number);
                const housePlanets = getPlanetsInHouse(house.number);
                
                return (
                  <g key={house.number} className="group cursor-pointer">
                    {/* Invisible hover layer */}
                    <polygon
                      points={house.points}
                      fill="transparent"
                      className="group-hover:fill-purple-glow transition-colors duration-300"
                    />

                    {/* Zodiac Sign index label (small, near corners) */}
                    <text
                      x={house.label.x}
                      y={house.label.y}
                      fill="#ffe082"
                      fontSize="11"
                      fontWeight="semibold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      opacity="0.85"
                    >
                      {signNum}
                    </text>

                    {/* Planets Occupying House (neatly clustered in the center) */}
                    <g transform={`translate(${house.center.x}, ${house.center.y})`}>
                      {housePlanets.map((planet: any, idx: number) => {
                        const short = PLANET_SHORT_NAMES[planet.name] || planet.name.slice(0, 2);
                        
                        // Cluster alignment offset math
                        const totalPlanets = housePlanets.length;
                        const xOffset = totalPlanets > 1 ? (idx % 2 === 0 ? -12 : 12) : 0;
                        const yOffset = totalPlanets > 2 ? (idx < 2 ? -8 : 8) : 0;
                        
                        return (
                          <text
                            key={planet.name}
                            x={xOffset}
                            y={yOffset}
                            fill={planet.retrograde ? "#e57373" : "#f3f0ff"}
                            fontSize={totalPlanets > 4 ? "10" : "12"}
                            fontWeight="500"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanet(planet);
                            }}
                            className="hover:fill-gold-light hover:scale-110 active:scale-95 transition-all"
                          >
                            {short}
                            {planet.retrograde && "R"}
                          </text>
                        );
                      })}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Planet Details Panel */}
          {selectedPlanet ? (
            <div className="glass-panel p-5 rounded-2xl w-full border-gold-base/20 space-y-3 relative overflow-hidden animate-fade-in-up">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="font-bold text-sm text-gold-light">
                  {selectedPlanet.name} ({PLANET_SIGNIFICATORS[selectedPlanet.name]?.Hindi || selectedPlanet.name}) Placement Details
                </h4>
                <button 
                  onClick={() => setSelectedPlanet(null)} 
                  className="text-xs text-white/40 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-light">
                <div>
                  <span className="text-white/40 block mb-0.5">Zodiac Sign</span>
                  <span className="font-medium text-white/90">{selectedPlanet.sign} ({selectedPlanet.degree}° degree)</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">House Position</span>
                  <span className="font-medium text-white/90">House {selectedPlanet.house} (Whole-Sign)</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">Nakshatra</span>
                  <span className="font-medium text-white/90">{selectedPlanet.nakshatra} (Pada {selectedPlanet.pada})</span>
                </div>
                <div>
                  <span className="text-white/40 block mb-0.5">Vedic Significance</span>
                  <span className="font-medium text-gold-light/90">
                    {PLANET_SIGNIFICATORS[selectedPlanet.name]?.meaning || "Planetary energy"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-white/40 text-center w-full">
              💡 Click on any planet abbreviation (e.g. Su, Mo) in the chart to inspect its degree and Nakshatra placements.
            </div>
          )}
        </div>

      {/* Details Tabs Section (Planets, Yogas, Dashas) */}
      <div className="lg:col-span-6 space-y-6">
        
        {/* Tab Buttons */}
        <div className="flex border-b border-white/5">
          {(["planets", "yogas", "dashas"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-all border-b-2 ${
                activeTab === tab 
                  ? "border-gold-base text-gold-light" 
                  : "border-transparent text-white/40 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content 1: Planetary placements */}
        {activeTab === "planets" && (
          <div className="glass-panel rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-white/50 font-bold uppercase tracking-wider">
                    <th className="p-4">Planet & Meaning</th>
                    <th className="p-4">House</th>
                    <th className="p-4">Sign</th>
                    <th className="p-4">Nakshatra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-light">
                  {chart.planets.map((planet: any) => {
                    const sig = PLANET_SIGNIFICATORS[planet.name];
                    const isSelected = selectedPlanet?.name === planet.name;

                    return (
                      <tr 
                        key={planet.name} 
                        onClick={() => setSelectedPlanet(planet)}
                        className={`hover:bg-white/5 cursor-pointer transition-colors ${isSelected ? "bg-gold-base/10" : ""}`}
                      >
                        <td className="p-4 space-y-0.5">
                          <div className="font-semibold text-white/90 flex items-center gap-1.5">
                            <span>{planet.name}</span>
                            {sig?.Hindi && <span className="text-gold-light/80 font-normal">({sig.Hindi})</span>}
                            {planet.retrograde && <span className="text-[10px] text-amber-400 font-mono px-1 rounded bg-amber-400/10">R</span>}
                          </div>
                          {sig?.meaning && <div className="text-[10px] text-white/40">{sig.meaning}</div>}
                        </td>
                        <td className="p-4 font-medium">House {planet.house}</td>
                        <td className="p-4">{planet.sign} ({planet.degree}°)</td>
                        <td className="p-4">{planet.nakshatra} (Pada {planet.pada})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content 2: Detected Yogas */}
        {activeTab === "yogas" && (
          <PaywallGate requiredPlan="basic" featureName="Vedic Yogas Analysis">
            <div className="space-y-4">
              {chart.yogas && chart.yogas.length > 0 ? (
                chart.yogas.map((yoga: any) => (
                  <div key={yoga.name} className="glass-panel p-5 rounded-2xl relative overflow-hidden space-y-2 border-l-2 border-l-gold-base">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-gold-light">{yoga.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gold-base/10 text-gold-light font-medium capitalize">
                        {yoga.strength} strength
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-normal font-light">
                      {yoga.name === "Anapha Yoga" && "Formed when planets occupy the 12th house from the Moon. Denotes emotional depth, influence, and supportive alliances."}
                      {yoga.name === "Ubhayachari Yoga" && "Formed when planets occupy both the 12th and 2nd houses from the Sun. Brings good health, wealth, and general prosperity."}
                      {yoga.name === "Gajakesari Yoga" && "Formed by Jupiter and Moon's mutual angles. Denotes high intelligence, noble lineage, and professional success."}
                      {yoga.name === "Budha-Aditya Yoga" && "Formed by the combination of Sun and Mercury. Enhances analytical ability, speech, and academic achievement."}
                      {yoga.name === "Mangal Dosha" && "Formed when Mars sits in house 1, 4, 7, 8, or 12. Denotes tension in close relationships; requires compatibility analysis."}
                      {!["Anapha Yoga", "Ubhayachari Yoga", "Gajakesari Yoga", "Budha-Aditya Yoga", "Mangal Dosha"].includes(yoga.name) && "Classic planetary yoga configuration indicating specific energetic alignments in your birth chart."}
                    </p>
                  </div>
                ))
              ) : (
                <div className="glass-panel p-6 rounded-2xl text-center text-xs text-white/40">
                  No major classical Yogas identified. Complete analysis available on Pro tier.
                </div>
              )}
            </div>
          </PaywallGate>
        )}

        {/* Tab Content 3: Vimshottari Dashas */}
        {activeTab === "dashas" && (
          <PaywallGate requiredPlan="basic" featureName="Vimshottari Dasha Cycles">
            <div className="glass-panel rounded-2xl p-6 space-y-4 relative overflow-hidden">
              <h4 className="font-bold text-sm text-gold-light border-b border-white/5 pb-2">Vimshottari Dasha cycles</h4>
              
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 font-light">
                {chart.dashas?.timeline ? (
                  chart.dashas.timeline.map((dasha: any, idx: number) => {
                    const isCurrent = chart.dashas.current.maha === dasha.planet;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent 
                            ? "bg-gold-base/5 border-gold-base/30 text-white" 
                            : "bg-white/[0.02] border-white/5 text-white/70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold flex items-center gap-1.5">
                            {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-gold-base animate-ping" />}
                            {dasha.planet} Mahadasha
                          </span>
                          <span className="text-[10px] font-mono opacity-60">
                            {dasha.starts_at} - {dasha.ends_at}
                          </span>
                        </div>
                        
                        {/* Antardashas */}
                        {dasha.antardashas && dasha.antardashas.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] opacity-75">
                            {dasha.antardashas.map((antar: any, aIdx: number) => (
                              <div key={aIdx} className="flex justify-between px-1.5 py-0.5 rounded bg-white/5">
                                <span>{antar.planet}</span>
                                <span className="font-mono opacity-50">{antar.ends_at}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-white/40">Dasha timeline details loading...</div>
                )}
              </div>
            </div>
          </PaywallGate>
        )}

      </div>

    </div>
  );
}
