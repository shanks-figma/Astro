Jyotish AI
Product Requirements Document — v1.0
India-first · Vedic Astrology · AI Interpretation Layer · Consumer App

Document overview
Platform
Mobile (iOS + Android) — React Native
Target market
India-first; English + Hindi + Hinglish output
Astrology system
Vedic (Jyotish) — Lahiri ayanamsa
Monetization
Freemium subscription — ₹99–499/mo tiers
Phase scope
Phase 1 (MVP) — 3 months to launch
Builder target
AI builder (Cursor / Bolt / Lovable)

Problem statement
Existing Vedic astrology apps in India fall into two broken camps: generic content apps (Astrosage, Daily Horoscope) that serve identical sun-sign copy to millions of users, and marketplace apps (Astrotalk, Guruji) where quality is inconsistent, dark patterns are rampant, and the experience is built around converting users to paid calls.
Neither camp provides what a thoughtful user actually wants: a personalised, accurate, and readable interpretation of their specific birth chart — updated as planetary transits and Dasha periods change.

Core insight
Vedic astrology is highly individualised by design (9 planets × 12 houses × 27 Nakshatras × Dasha periods). No two charts are identical. The product opportunity is to make that specificity accessible via AI — accurate calculations + an LLM layer trained on canonical Vedic texts.

Product goals (Phase 1)
Generate accurate Vedic birth charts using Swiss Ephemeris with Lahiri ayanamsa
Provide AI-generated, personalised interpretations in plain English and Hindi
Deliver a freemium subscription model with a clear free → paid conversion funnel
Reach 500K MAU within 12 months of launch
Achieve 2–3% paid conversion rate within 6 months

Non-goals (Phase 1)
No human astrologer marketplace in Phase 1
No Western astrology or Tarot — Vedic only
No social / community features
No web app — mobile only


User segments

Primary — Life decision seekers (35% of TAM)
Age: 25–45
Language: Hindi + English (Hinglish)
Intent: Marriage timing, job change, property purchase, health concerns
Behaviour: High urgency, willing to pay, likely to return when a new life event occurs
Current behaviour: Paying ₹15–100/min on Astrotalk; frustrated by inconsistent astrologer quality

Secondary — Kundli / compatibility seekers (22% of TAM)
Age: 22–35
Intent: Pre-marriage Kundli matching (Ashtakoota + Mangal dosha check)
Behaviour: Often one-time high-intent visit; refer family members; share results
Current behaviour: Using Astrosage free tools; frustrated by ad overload and outdated UI

Tertiary — Urban spiritual self-explorers (15% of TAM)
Age: 18–30
Language: English-first
Intent: Personality understanding, self-reflection, social sharing
Current behaviour: Using Co-Star (Western); interested in Vedic but no good product exists


Technical architecture

Layer 1 — Calculation engine (build once, never touch)
This is math, not AI. Must be 100% accurate — a single wrong planetary position screenshot will destroy credibility.
Library: Swiss Ephemeris via pyswisseph (Python) or swisseph (Node.js)
Ayanamsa: Lahiri (SE_SIDM_LAHIRI) — government standard; expose toggle for power users
Calculations required: Lagna (Ascendant), Rashi (Moon sign), all 9 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu)
House system: Whole sign houses
Nakshatra: 27 Nakshatras with Pada (quarter)
Dasha: Vimshottari Dasha — current Mahadasha, Antardasha, and Pratyantar Dasha with start/end dates
Yogas: Detect top 20 common Yogas (Raj Yoga, Gajakesari, Dhana Yoga, etc.)
Output: Structured JSON — all positions in degrees + zodiac sign + house number

Critical constraint
The calculation layer must be a separate microservice with its own test suite. 100+ test cases against known charts (public figures with verified birth times) before any AI layer is built on top.

Layer 2 — Knowledge base / RAG (your actual moat)
This is what separates the product from generic ChatGPT astrology. A curated, structured corpus of Vedic rules that the LLM retrieves before generating interpretations.
Primary sources: Brihat Parashara Hora Shastra, Phaladeepika, Saravali, Jataka Parijata
Structure: Each rule chunked as: Planet × Sign × House → Effect (with domain tag: career / marriage / health / wealth / spirituality)
Size target: 15,000–25,000 rule chunks at MVP
Vector DB: Pinecone (managed) or pgvector (self-hosted on Supabase) — pgvector preferred for cost at MVP scale
Embedding model: text-embedding-3-small (OpenAI) or Voyage-2
Retrieval: Top-8 chunks per query, reranked by domain relevance

At query time, the system extracts the user's relevant planetary positions and retrieves matching rules before sending to the LLM. The prompt includes the raw rules so the LLM synthesises rather than hallucinates.

Layer 3 — LLM interpretation layer
Model: Claude claude-sonnet-4-6 (primary) — do not fine-tune at MVP; iterate on prompts
System prompt controls: tone (warm, direct, not doom-heavy), language (English / Hindi / Hinglish based on user preference), domain focus, response length
Input to LLM: User's chart JSON + retrieved RAG chunks + current transit positions + user's stated life context
Output format: Structured sections (Current period summary → Key influences → Domain-specific guidance → Remedies if relevant)
Language: English default; Hindi output via prompt instruction — do not use a translation layer

Layer 4 — Personalisation memory
Store: User's stated life context (job seeker / in relationship / health concern) at onboarding
Update: Allow users to update context at any time from profile
Usage: Injected into every interpretation prompt as a context block
Future (Phase 2): Interaction history — questions asked, readings rated — feed back into personalisation


Backend specification

Tech stack
Component
Choice
API
Node.js (Express) or Python (FastAPI) — builder's choice
Database
Supabase (Postgres + Auth + Storage)
Chart calculation
Python microservice via pyswisseph — called by API
Vector DB
pgvector extension on Supabase (MVP); Pinecone if scale demands
LLM
Anthropic Claude API (claude-sonnet-4-6)
Payments
Razorpay — subscriptions + one-time purchases
Push notifications
Firebase Cloud Messaging
Hosting
Railway or Render (API) — low ops overhead for MVP

Core API endpoints
Endpoint
Description
POST /chart/generate
Birth details → full chart JSON (planets, houses, Dashas, Yogas)
GET /chart/:userId
Fetch stored chart for user
POST /reading/generate
Chart + context + query type → AI reading (streamed)
GET /transit/current
Today's planetary positions + aspect to user's natal chart
POST /compatibility/generate
Two chart JSONs → Ashtakoota score + AI narrative
GET /dasha/timeline/:userId
Full Vimshottari Dasha timeline with dates
POST /muhurta/check
Event type + date range → auspicious windows
POST /user/context
Update user life context for personalisation
POST /payment/subscribe
Razorpay subscription creation
GET /payment/status
Check subscription tier and expiry


App screens and flows

Onboarding flow
Screen 1: Name + Date of birth (DD/MM/YYYY picker)
Screen 2: Time of birth — exact time preferred; offer 'I don't know' → uses noon default with warning about reduced accuracy
Screen 3: Place of birth — city search with lat/long lookup (OpenCage Geocoding API)
Screen 4: Life context — single-select: 'Career & money', 'Love & relationships', 'Health & wellbeing', 'Spiritual growth', 'General guidance'
Screen 5: Language preference — English / हिंदी / Hinglish
Result: Kundli generated, user lands on Home screen

Home screen
Header: User's Lagna, Rashi, current Dasha period
Card 1: Today's reading — personalised 3–4 line summary for today based on transits + Dasha
Card 2: Current period — Mahadasha + Antardasha planet names, time remaining, one-line meaning
Card 3: Weekly highlight — one upcoming event worth knowing (transit, Dasha change)
Bottom nav: Home / Kundli / Ask / Profile

Kundli screen
North Indian chart diagram (SVG) with planets in houses
Tabs: Chart / Planets / Houses / Dashas / Yogas
Each tab shows data first (free) and AI interpretation locked behind paywall
'What does this mean?' CTA on each section → triggers AI reading (paid)

Ask screen (Phase 2 free, Phase 1 paid)
Open text field: 'Ask anything about your chart'
Suggested questions: 'When is a good time to change jobs?', 'What does my 7th house say about marriage?', 'What should I know about this year?'
Response: Streamed AI interpretation referencing their specific chart
Usage limit: 3 questions/month free; unlimited on paid tier


Monetisation and paywall

Feature
Access
Feature
Free / Paid
Kundli chart generation
Free
Planet + house positions (raw data)
Free
Nakshatra and Rashi summary
Free
Current Dasha period name
Free
AI interpretation of any section
Paid
Daily personalised reading
Paid (₹99/mo)
Weekly forecast
Paid (₹99/mo)
Ask-anything AI chat (3/mo free)
3 free; unlimited paid
Kundli Milan / compatibility
Paid (₹199/mo)
Muhurta auspicious timing
Paid (₹499 one-time or ₹199/mo)
Annual Varshaphal report
₹499 one-time

Paywall trigger points
After viewing raw chart data: 'Understand what this means for you →'
After 3rd Ask question in a month
When tapping any locked AI interpretation section
7 days after onboarding via push notification if not converted


AI output guardrails

These are non-negotiable. Build them into the system prompt and add output validation before returning to the client.

Tone rules — enforce in system prompt
1. Never predict death, serious illness, or irreversible misfortune.
2. Never state a negative outcome as certain — use probability language ('this period may bring challenges', not 'this will ruin your career').
3. Always include an actionable element — what can the user do or be mindful of.
4. Avoid jargon dumps — explain Vedic terms the first time they're used.
5. Maximum reading length: 350 words for daily, 600 for domain-specific.

Hallucination prevention
Planetary positions in the prompt must come from the calculation engine JSON — never ask the LLM to calculate positions
Add output validation: if LLM output references a planet in a house that doesn't match the chart JSON, flag and regenerate
Show a 'View your chart data' link below every AI reading so users can verify positions themselves


Edge cases and hard decisions

Edge case
Handling
Unknown birth time
Use noon default. Show persistent banner: 'Readings are approximate — birth time improves accuracy'. Lagna and house-based readings disabled.
Ayanamsa preference
Default Lahiri. Add setting under Profile → Chart preferences → Ayanamsa (Lahiri / Krishnamurti / Raman). Changing ayanamsa regenerates chart.
Contradicting Yogas
If a positive and negative Yoga both apply, the LLM synthesis prompt must weight them: 'Consider both influences and explain how they may modify each other.'
Retrograde planets
Flag retrograde planets (R symbol on chart). Include retrograde status in RAG retrieval query.
Rahu / Ketu
Always show as axis pair. Rahu in house N = Ketu in house N+6. Handle in chart generation logic, not LLM.
Date/time edge cases
Handle: daylight saving for NRI users (use birth city timezone at birth date, not current), dates before 1900 (Swiss Ephemeris handles back to 600 BC).


Success metrics — Phase 1

Metric
Target
MAU at 3 months
50,000
MAU at 12 months
500,000
D7 retention
> 35%
D30 retention
> 18%
Free → paid conversion
2–3% at 6 months
Avg reading quality rating
> 4.1 / 5
Chart calculation error rate
< 0.01%
AI reading generation p95 latency
< 4 seconds


Build sequence for AI builder

Build in this order. Do not proceed to the next phase until the current one has a working demo.

Phase A — Calculation foundation (Week 1–2)
Set up Swiss Ephemeris microservice
Build chart generation endpoint — output full JSON
Write 20 test cases against known charts
Build North Indian chart SVG renderer
No AI yet — this phase is pure calculation

Phase B — RAG knowledge base (Week 2–3)
Set up pgvector on Supabase
Ingest initial 5,000 Vedic rule chunks (provided separately as structured CSV)
Build retrieval endpoint: chart positions → top-8 relevant rules
Test retrieval quality manually — 20 sample queries

Phase C — AI interpretation layer (Week 3–5)
Wire calculation output + RAG retrieval into LLM prompt
Build /reading/generate endpoint with streaming
Implement system prompt with tone guardrails
Test output quality across 10 diverse charts
Add output validation (planet position cross-check)

Phase D — App shell and auth (Week 4–6)
React Native app setup — Expo
Supabase Auth — phone OTP (primary) + Google Sign-in
Onboarding flow — birth details → chart generation
Kundli screen with chart SVG
Home screen with daily reading

Phase E — Paywall and payments (Week 6–8)
Razorpay subscription integration
Paywall gates on AI interpretation sections
Ask screen with 3-question free limit
Push notification: D7 conversion nudge

Phase F — Polish and launch prep (Week 8–12)
Hindi / Hinglish output tuning
Performance: chart generation < 1s, reading < 4s p95
App Store + Play Store submission
Basic analytics: Mixpanel or PostHog


Open questions (resolve before build starts)

Vedic rule corpus source — who curates the 15K rule chunks? Founder/domain expert must own this, not the builder.
App name — 'Jyotish AI' is a working title; check trademark availability.
Hindi copy — all in-app strings need native Hindi review before launch; do not rely on LLM translation for UI copy.
Legal — include standard disclaimer: 'For entertainment and self-reflection purposes only. Not a substitute for professional advice.'
First 1,000 users — acquisition plan (ASO, Reddit r/vedicastrology, Instagram Reels) needs to run in parallel with build.

— End of document —