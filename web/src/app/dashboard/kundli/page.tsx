"use client";

import { useEffect, useState } from "react";
import PaywallGate from "../../../components/PaywallGate";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", 
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const PLANET_SHORT_NAMES: Record<string, string> = {
  "Sun": "Su",
  "Moon": "Mo",
  "Mars": "Ma",
  "Mercury": "Me",
  "Jupiter": "Ju",
  "Venus": "Ve",
  "Saturn": "Sa",
  "Rahu": "Ra",
  "Ketu": "Ke"
};

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
      
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
                      const columns = Math.ceil(housePlanets.length / 2);
                      
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
              <h4 className="font-bold text-sm text-gold-light">{selectedPlanet.name} Placement Details</h4>
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
                <span className="text-white/40 block mb-0.5">Motion / State</span>
                <span className="font-medium text-white/90">
                  {selectedPlanet.retrograde ? "Retrograde (Reverse)" : "Direct (Forward)"}
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
                    <th className="p-4">Planet</th>
                    <th className="p-4">House</th>
                    <th className="p-4">Sign</th>
                    <th className="p-4">Nakshatra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/80 font-light">
                  {chart.planets.map((planet: any) => (
                    <tr 
                      key={planet.name} 
                      onClick={() => setSelectedPlanet(planet)}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-4 font-semibold text-white/90">{planet.name}</td>
                      <td className="p-4">House {planet.house}</td>
                      <td className="p-4">{planet.sign} ({planet.degree}°)</td>
                      <td className="p-4">{planet.nakshatra} (Pada {planet.pada})</td>
                    </tr>
                  ))}
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
