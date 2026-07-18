Jyotish AI — Master Builder Prompt
Read this before writing a single line of code.
Copy the prompt in Section 2 into your AI builder session. Attach all three PRD docs.

Section 1 — How to use this prompt + the PRD docs
You have three documents:
Jyotish AI PRD v1 — product requirements, user segments, monetisation, app screens
Jyotish AI Agent PRDs v1 — specs for all 7 autonomous agents
Jyotish AI Builder Handoff v1 — DB schema, event contracts, corpus format, web screens, env vars
This document — the master prompt to paste into your AI builder session

Workflow
Step 1: Open a new session in your AI builder (Cursor, Bolt, Lovable, or Claude Code).
Step 2: Paste the entire prompt from Section 2 as your first message.
Step 3: Attach all three PRD docs when the builder asks for context.
Step 4: Follow the build sequence — never skip ahead.
Step 5: When starting each new agent, paste the Phase Prompt from Section 3.


Section 2 — Master prompt (paste this first)

Instructions for use
Copy everything between the dashed lines below.
Paste it as your very first message in the AI builder session.
Do not summarise or paraphrase — paste the full text.

— PROMPT START —
You are building Jyotish AI — a Vedic astrology web application for the Indian consumer market. Read everything below carefully before asking any questions or writing any code.
PROJECT OVERVIEW
Jyotish AI is an India-first, web-based Vedic astrology platform that generates accurate birth charts (Kundli) and delivers personalised AI-powered interpretations. It is not a generic horoscope app. It is not a human astrologer marketplace. It is an AI interpretation layer built on top of precise Vedic calculation and a curated classical text knowledge base.
The product has three layers:
1. A calculation engine (Swiss Ephemeris) that produces deterministic, verifiable Vedic charts
2. A RAG knowledge base (pgvector) containing structured Vedic rules from classical texts
3. An LLM layer (Claude claude-sonnet-4-6) that synthesises retrieved rules into personalised readings
BUSINESS CONTEXT
Market: India-first consumer app. Target user: 25–45 year old Indians making life decisions (marriage timing, career change, property purchase) who currently pay ₹15–100/minute to human astrologers on Astrotalk.
Revenue model: Freemium subscription. Free tier includes chart generation and raw data. Paid tiers (₹99/mo Basic, ₹199/mo Pro) unlock AI interpretations, daily readings, and advanced features.
Competitive gap: Astrosage dominates SEO with terrible UX. Astrotalk dominates intent with dark patterns. Neither provides an accurate, readable, AI-personalised Vedic interpretation. That is the product.
TECH STACK — DO NOT DEVIATE WITHOUT ASKING
Web app: Next.js 14 (App Router), TypeScript, Tailwind CSS, deployed on Vercel
Database: Supabase (Postgres + Auth + Storage), pgvector for embeddings
Chart calculation: Python microservice using pyswisseph, Lahiri ayanamsa, Whole sign houses
LLM: Anthropic Claude API (claude-sonnet-4-6) — do not substitute with GPT or Gemini
Embeddings: OpenAI text-embedding-3-small (for corpus only — not for chat)
Queue: BullMQ on Redis (Railway managed) — all agent communication goes through this
Payments: Razorpay (INR subscriptions + one-time payments)
Email: Resend. Push: Firebase Cloud Messaging. Errors: Sentry. Alerts: Slack webhook
ARCHITECTURE — 7 AUTONOMOUS AGENTS
The backend is not a monolith. It is seven autonomous agents communicating via a BullMQ event queue. Each agent has a single responsibility and a clear trigger. The full spec for each agent is in the Agent PRDs document.
Agent 1 — Kundli agent: Calculates Vedic chart from birth details via Swiss Ephemeris. Pure math, no AI. Must be 100% accurate.
Agent 2 — Interpretation agent: Takes chart + user query, retrieves relevant Vedic rules from pgvector, generates AI reading via Claude API.
Agent 3 — Content agent: Runs nightly. Generates daily readings for all active users. Generates weekly SEO article drafts.
Agent 4 — Growth agent: Weekly. Monitors keyword rankings, identifies SEO gaps, queues landing page generation.
Agent 5 — Retention agent: Event-driven. Detects inactivity and upcoming Dasha changes, sends contextual nudges.
Agent 6 — Corpus agent: Weekly. Audits reading quality, identifies RAG knowledge gaps, queues rules for human review.
Agent 7 — Payments agent: Event-driven via Razorpay webhooks. Handles subscription lifecycle, failed payment recovery, tier management.
NON-NEGOTIABLES — READ BEFORE EVERY DECISION
1. The Kundli agent calculation must be verified against 50 known charts before any AI layer is built on top. One wrong planetary position will destroy user trust instantly — astrology users are knowledgeable.
2. The LLM must NEVER calculate planetary positions. Positions come from the calculation engine JSON, passed into the prompt. The LLM only interprets — never calculates.
3. AI readings must never predict death, serious illness, or irreversible misfortune. This is baked into the system prompt and must survive all future prompt changes.
4. The Vedic rule corpus is never auto-populated by AI. The ingestion pipeline accepts human-authored CSV files only. AI-generated Vedic rules without expert review will degrade trust.
5. All monetary amounts are stored in paise (₹1 = 100 paise). Never store decimal rupees. ₹99 = 9900 paise.
6. RLS (Row Level Security) must be enabled on all Supabase tables before the first production deploy. The service role key is never exposed to the browser or client-side code.
7. The Razorpay webhook handler must validate the webhook signature on every call before processing. Never process an unverified webhook.
8. Do not use phone OTP as the primary auth method on web. Use Google OAuth + Email OTP. Phone OTP is a mobile-first pattern.
9. All agent workers run on Railway, not Vercel. Vercel has a 10s function timeout — agent jobs can run for minutes. Railway has no such limit.
10. Claude API responses are streamed to the client via Server-Sent Events (SSE). Do not buffer the full response before sending — first token must reach the client within 1 second.
BUILD SEQUENCE — FOLLOW IN ORDER
Phase A (Week 1–2): DB setup + Kundli calculation engine + chart SVG renderer. No AI. No frontend.
Phase B (Week 2–3): pgvector setup + corpus ingestion pipeline + retrieval endpoint. No LLM yet.
Phase C (Week 3–5): Interpretation agent — wire calc output + RAG into Claude prompt. Test on 10 diverse charts.
Phase D (Week 4–6): Next.js app shell — auth, onboarding, Kundli screen, home screen with daily reading.
Phase E (Week 6–8): Paywall, Razorpay subscriptions, Ask screen, retention nudges.
Phase F (Week 8–12): Content agent, Growth agent, SEO pages, Corpus agent, admin panel.
DOCUMENTS ATTACHED — READ THEM IN THIS ORDER
1. Builder Handoff v1 — start here. Contains the full DB schema (run these SQL statements first), event bus contracts, corpus CSV format, all web app screen specs, and every environment variable you need to set up.
2. Agent PRDs v1 — reference this when building each agent. Each section is self-contained. Do not read ahead.
3. Product PRD v1 — reference this for user flows, paywall logic, and feature scope decisions.
YOUR FIRST TASK
Do not write any application code yet. First:
1. Confirm you have read and understood all three attached documents.
2. List every third-party account and API key you will need before Phase A can begin (cross-check against Section 5 of the Builder Handoff).
3. Ask me any clarifying questions you need answered before writing code. Especially: anything about the Vedic astrology domain that seems ambiguous in the spec.
4. Once I confirm your questions are answered, begin Phase A: set up the Supabase project, run all CREATE TABLE statements from Section 1 of the Builder Handoff, and confirm the schema is live.
— PROMPT END —


Section 3 — Phase prompts (paste at start of each phase)
When you move from one phase to the next, paste the relevant prompt below to re-orient the builder. AI builders lose context over long sessions — these resets prevent drift.

Phase A prompt — DB + Kundli calculation engine
We are now starting Phase A of Jyotish AI.
Phase A scope: Supabase schema setup + Swiss Ephemeris calculation microservice + chart SVG renderer.
No AI code in this phase. No frontend. Pure calculation and data.

Your deliverables for Phase A:
1. All CREATE TABLE statements from Section 1 of the Builder Handoff executed and confirmed live.
2. Python microservice (FastAPI) that accepts birth details and returns the full chart JSON.
   - Library: pyswisseph
   - Ayanamsa: Lahiri (SE_SIDM_LAHIRI)
   - Houses: Whole sign
   - Returns: all 9 planets, Lagna, Nakshatra, full Vimshottari Dasha timeline, top 30 Yogas
3. Test suite: 20 test cases against known charts (I will provide the test data).
4. POST /api/chart/generate endpoint that calls the Python microservice and returns chart JSON.
5. North Indian Kundli SVG component that renders from the chart JSON.

Do NOT proceed to Phase B until the test suite passes 100%.
Ask me for the test chart data before writing the test suite.

Phase B prompt — RAG knowledge base
We are now starting Phase B of Jyotish AI.
Phase A is complete: DB is live, chart calculation is verified.
Phase B scope: pgvector setup + Vedic rule corpus ingestion + retrieval endpoint.
No LLM calls in this phase. No frontend.

Your deliverables for Phase B:
1. pgvector extension enabled on Supabase.
2. Corpus ingestion script that:
   - Reads the CSV format from Section 3 of the Builder Handoff
   - Validates all fields before ingestion
   - Generates embeddings via OpenAI text-embedding-3-small
   - Upserts to corpus_rules table with deduplication
   - Updates corpus_versions table
3. GET /api/corpus/retrieve endpoint that:
   - Accepts planet, sign, house, domain as params
   - Returns top 8 matching rules using pgvector cosine similarity
   - Filters out results below 0.72 similarity threshold
   - Falls back to no-domain filter if fewer than 3 results returned
4. Manual retrieval test: run 10 queries and show me the retrieved rules.

I will provide the initial corpus CSV file before ingestion begins.
Do NOT proceed to Phase C until retrieval quality is confirmed on the test queries.

Phase C prompt — Interpretation agent (AI layer)
We are now starting Phase C of Jyotish AI.
Phase B is complete: corpus is ingested and retrieval is verified.
Phase C scope: Interpretation agent — the core AI reading engine.

Your deliverables for Phase C:
1. POST /api/reading/generate endpoint that:
   - Accepts: user_id, chart_id, query_type, domain (optional), ask_text (optional)
   - Fetches chart JSON from Supabase
   - Fetches today's transit positions from the Kundli microservice
   - Calls corpus retrieval endpoint with relevant planet/house/domain params
   - Builds the prompt (system prompt + chart summary + retrieved rules + user context)
   - Calls Claude claude-sonnet-4-6 with streaming
   - Streams response to client via SSE
   - Stores completed reading to readings table with rag_chunk_ids and prompt_snapshot
   - Emits reading.generated event to BullMQ
2. System prompt implementation with all guardrails from the Interpretation Agent PRD.
   Critical: no doom predictions, probability language, 300-word limit for daily readings.
3. Output validator: cross-check that planet names in LLM output match the chart JSON.
4. Cache logic: cache_key = user_id:query_type:date, cached_until = next 05:00 IST.
5. Test: generate readings for 10 diverse charts (I will provide them). Show me the output.

The system prompt is your most important deliverable in this phase.
Show it to me before wiring it into the endpoint. I will review and approve.

Phase D prompt — Next.js app shell
We are now starting Phase D of Jyotish AI.
Phase C is complete: AI reading generation is working and verified.
Phase D scope: Next.js web app — auth, onboarding, Kundli screen, home screen.

Your deliverables for Phase D:
1. Next.js 14 App Router project initialised with TypeScript + Tailwind CSS.
2. Supabase Auth: Google OAuth + Email OTP. Protected routes via middleware.
3. /onboarding: 5-step wizard collecting birth details. On complete, calls POST /api/chart/save.
4. /kundli: public chart generator (no auth required to generate, auth required to save).
   - Birth details form → chart generation → North Indian SVG chart
   - Locked sections shown blurred with paywall CTA
5. /dashboard: daily reading card + current Dasha card + upcoming event card.
   - Daily reading fetched from readings table (generated by Content agent at 05:00 IST)
   - Falls back to generating on-demand if no pre-generated reading exists
6. /dashboard/kundli: tabbed chart explorer — Chart / Planets / Houses / Dashas / Yogas.
7. Bottom nav: Home / Kundli / Ask / Account.

Design principles:
- Clean, minimal. No clutter. The chart and reading are the product.
- Hindi support: all strings go through a simple i18n map from day one.
- Mobile-first responsive — most Indian users will be on mobile browsers.
- No dark mode at MVP. Single clean light theme.

Show me the onboarding flow first before building the dashboard.

Phase E prompt — Paywall + payments + Ask screen
We are now starting Phase E of Jyotish AI.
Phase D is complete: app shell with auth, onboarding, and core screens.
Phase E scope: monetisation layer — Razorpay subscriptions, paywall gates, Ask screen.

Your deliverables for Phase E:
1. Razorpay subscription integration:
   - POST /api/payment/create-order for one-time purchases
   - POST /api/payment/verify for signature verification after checkout
   - POST /api/webhook/razorpay — validates signature, emits subscription events to BullMQ
   - Payments agent worker that consumes subscription events and updates subscriptions table
2. PaywallGate component: wraps any paid content, blurs it, shows upgrade CTA.
   - Accepts tier prop: 'basic' | 'pro'
   - Shows user's current tier and the tier required
3. /pricing page: Free / Basic ₹99/mo / Pro ₹199/mo comparison + one-time reports.
4. /dashboard/ask: AI chat screen.
   - Free tier: 3 questions/month (tracked in user_engagement.ask_count_month)
   - Streamed SSE response from /api/reading/generate
   - Thumbs up/down rating on each response
   - Suggested questions when empty
5. Retention agent (basic): push notification and email triggers for:
   - D3 inactivity: 'Your reading is ready'
   - D7 inactivity: personalised chart event
   - Free limit reached: upgrade prompt

IMPORTANT: Test the full payment flow in Razorpay test mode before showing me.
Show me the webhook handler code before wiring it to production.

Phase F prompt — Content, Growth, Corpus agents + admin
We are now starting Phase F of Jyotish AI.
Phase E is complete: full monetisation flow working end to end.
Phase F scope: automated agents + SEO + admin panel.

Your deliverables for Phase F:
1. Content agent (BullMQ worker, runs at 05:00 IST daily):
   - Batch generates daily readings for all active users
   - Concurrency: 50 simultaneous LLM calls, queue remainder
   - Marks readings as ready in DB, emits events for Retention agent
   - Generates 3 SEO article drafts weekly (Sunday 22:00 IST)
2. Growth agent (BullMQ worker, runs weekly Monday 07:00 IST):
   - Pulls keyword rankings from Google Search Console API
   - Identifies gaps (>200 monthly searches, not ranked)
   - Passes top 5 gaps to Content agent
   - Sends weekly ranking report to Slack
3. Corpus agent (BullMQ worker, runs weekly Sunday 23:00 IST):
   - Pulls readings rated ≤2/5 from the past week
   - Classifies failure: coverage gap / retrieval failure / synthesis failure
   - Logs gaps to corpus_gaps table
   - Sends gap summary to Slack
4. /astrology/[slug]: SSG pages for SEO content. Auto-rebuild on content publish.
5. /admin: content draft review + corpus gap table + daily metrics.
   - Approve button triggers Next.js ISR revalidation
6. Full Dasha change nudge: when user is 30 days from Mahadasha change,
   generate teaser reading, send push + email with paywall CTA.

Deliver agents in order: Content → Growth → Corpus.
Show me each agent's BullMQ worker code before wiring to production cron.



Section 4 — Common questions and answers for the builder
These are questions AI builders typically ask that slow down the build. The answers are here so you don't need to come back to the founder for these.

Q1. What ayanamsa should I use?
Lahiri (SE_SIDM_LAHIRI in Swiss Ephemeris). This is the Indian government standard. Do not use Krishnamurti or Raman as default. Expose a settings toggle for power users, but Lahiri is the default and what all calculations should be tested against.
Q2. What house system should I use?
Whole sign houses. In Vedic astrology, the ascendant sign becomes house 1 in its entirety — not the degree of the ascendant. This is different from Western Placidus or Koch systems. Every house calculation must use Whole sign.
Q3. How do I handle birth time unknown?
Set tob_unknown = true in birth_details. Use 12:00 noon as TOB for calculation. Set lagna_unknown = true in the chart. Disable all Lagna-dependent readings (anything referencing house positions of planets). Show a persistent yellow banner: 'Readings are approximate — adding your birth time improves accuracy.' Never silently use noon without flagging it.
Q4. What is the North Indian Kundli chart format?
The North Indian chart is a fixed diamond grid with 12 rhombus-shaped houses. House 1 (Lagna) is always at the top centre. Houses go clockwise: 1 (top centre), 2 (top right), 3 (right), 4 (bottom right), 5 (bottom centre-right), 6 (bottom right of centre), 7 (bottom centre), 8 (bottom left of centre), 9 (bottom left), 10 (left), 11 (top left), 12 (top centre-left). Render as SVG. Planets shown as abbreviated Sanskrit names (Su, Mo, Ma, Me, Ju, Ve, Sa, Ra, Ke). Retrograde planets marked with R superscript.
Q5. How does the Vimshottari Dasha system work?
Vimshottari is a 120-year cycle of planetary periods. Order: Sun (6yr), Moon (10yr), Mars (7yr), Rahu (18yr), Jupiter (16yr), Saturn (19yr), Mercury (17yr), Ketu (7yr), Venus (20yr). The starting planet and remaining years are calculated from the Moon's Nakshatra at birth. Each Mahadasha subdivides into Antardashas (sub-periods) in the same order, proportional. Swiss Ephemeris handles this calculation — do not implement the math yourself. Store the full timeline to the dashas table with parent_id for the hierarchy.
Q6. What are the most important Yogas to detect?
Detect these 30 at MVP: Raj Yoga, Gajakesari Yoga, Dhana Yoga, Pancha Mahapurusha Yoga (5 variants: Ruchaka, Bhadra, Hamsa, Malavya, Sasa), Kemadruma Yoga, Mangal Dosha, Neecha Bhanga Raj Yoga, Viparita Raj Yoga (3 variants), Budha-Aditya Yoga, Chandra-Mangal Yoga, Sunapha Yoga, Anapha Yoga, Durudhura Yoga, Vesi Yoga, Vasi Yoga, Ubhayachari Yoga, Kahala Yoga, Chamara Yoga, Shakata Yoga. Each Yoga has specific planetary condition rules — these are in the Vedic texts. The builder does not need to know Vedic astrology: the Yoga detection logic is defined algorithmically by planetary positions, aspects, and house lords.
Q7. How should I structure the LLM prompt?
System prompt (fixed, never changes per user): role definition + tone rules + output format + guardrails. User message: chart summary JSON + retrieved RAG rules + current transit JSON + user life context + query type + language instruction. Never put the system prompt in the user message. Never put user data in the system prompt. Keep the system prompt under 800 tokens — it is called on every reading generation.
Q8. How do I handle Hindi output?
Pass the language instruction in the user message: 'Respond entirely in Hindi using Devanagari script.' or 'Respond in Hinglish — English sentences with Hindi words for emotional or spiritual concepts.' Do NOT use a translation API as a post-processing step. Claude handles Hindi natively. Test Hindi output quality on 5 readings before shipping — check with a native Hindi speaker if possible.
Q9. What should the daily reading cache logic look like?
Cache key: '{user_id}:daily:{YYYY-MM-DD}'. Cached until: next day at 05:00 IST (the Content agent's next batch run). On /dashboard load: check readings table for today's cache key. If found and cached_until is in the future: return cached reading. If not found: call Interpretation agent with query_type='daily' (generates on-demand for this user). Never regenerate a cached reading in the same cache window.
Q10. How do I set up the BullMQ event bus?
One Redis instance on Railway. Queue names follow the pattern 'jyotish:{event_name}' e.g. 'jyotish:chart.generated'. Each agent worker is a separate Node.js process on Railway, consuming from its assigned queues. The Next.js API routes emit events via a shared BullMQ client — they do not process jobs. Dead-letter queue: 'jyotish:dead'. Any job that lands in dead-letter sends a Slack alert immediately. See Section 2 of the Builder Handoff for all event payload schemas.
Q11. What is the exact Razorpay webhook flow?
1. Razorpay sends POST to /api/webhook/razorpay. 2. Validate X-Razorpay-Signature header using HMAC-SHA256 with RAZORPAY_WEBHOOK_SECRET. 3. If invalid: return 400, log to Sentry. 4. If valid: parse event type (payment.captured, subscription.charged, etc.). 5. Emit corresponding BullMQ event to 'jyotish:subscription.activated' etc. 6. Return 200 immediately — never do DB work inside the webhook handler. 7. The Payments agent worker processes the event asynchronously. This pattern prevents webhook timeouts.
Q12. Where does the Kundli SVG render — server or client?
Client-side React component. The SVG is generated in the browser from the chart JSON. Reason: the chart is interactive (tap a planet to highlight it, show its details). SSR the page shell and reading text — that's what matters for SEO. The chart SVG itself does not need to be in the SSR output. Use dynamic import with ssr:false for the KundliChart component.


Section 5 — What to do if stuck
If the AI builder gets stuck or produces something wrong, use these recovery prompts.

If the builder starts deviating from the tech stack
Stop. Do not use [library/framework the builder suggested].
The tech stack is fixed as specified in the master prompt.
Specifically: Next.js 14 App Router, Supabase, pyswisseph, Claude claude-sonnet-4-6, BullMQ, Razorpay.
If you believe the spec requires a change to the stack, explain why and I will decide.
Do not make that decision yourself.

If the builder implements house system wrong
This implementation is incorrect. You are using [Western/Placidus/Koch] houses.
Jyotish AI uses Whole sign houses exclusively.
In Whole sign: the ascending sign becomes house 1 in its entirety.
Every subsequent sign is the next house, regardless of degree.
Reimplement the house assignment using Whole sign logic.
Validate: test chart with Scorpio rising — all planets in Scorpio must be in house 1,
all planets in Sagittarius must be in house 2, etc.

If the builder lets the LLM calculate planetary positions
This is a critical error. The LLM must never calculate planetary positions.
Planetary positions come ONLY from the Swiss Ephemeris microservice.
The LLM receives positions as input — it does not derive them.
Remove any prompt instruction that asks the LLM to calculate, estimate,
or infer planetary positions. The prompt must state positions explicitly:
'The user's Sun is in Capricorn in house 3 at 14.2 degrees.'
The LLM's job is interpretation only.

If the builder skips the test suite for the Kundli agent
We cannot proceed to Phase B without validating the Kundli calculation.
An unvalidated calculation engine means every reading built on top is potentially wrong.
Here are the test charts to validate against: [you will provide these]
For each test chart: compare output planet positions against reference values.
Acceptance threshold: all 9 planets within 0.5 degrees of reference.
Dasha start/end dates within 1 day of reference.
Do not proceed until this passes.

If the builder adds AI-generated rules to the corpus
Stop. Do not add AI-generated Vedic rules to the corpus.
All corpus rules must come from the human-authored CSV file I provide.
The corpus ingestion pipeline accepts CSV only — it does not call an LLM.
If you have identified a corpus gap, log it to the corpus_gaps table.
I will provide new rules from a Vedic expert. You ingest them.
Under no circumstances should the system auto-generate Vedic interpretive rules.



Section 6 — A note for the founder
Hand this document to the builder at the start of the project. Do not paraphrase — the builder needs the full context, especially the non-negotiables.

Three things only you can do, that no builder can do for you:
The Vedic rule corpus. The 20 sample rules in the Builder Handoff need to grow to at least 500 before the AI layer is testable. Find a Jyotish expert — ideally someone who has studied from primary Sanskrit texts (BPHS, Phaladeepika, Saravali). Pay them to produce structured rules in the CSV format. This is the product's actual moat.
The test chart data for Phase A. You need 20 birth charts with verified planetary positions to validate the Kundli calculation engine. Use public figures with confirmed birth times and cross-check against established Vedic software (Jagannatha Hora, AstroSage). Provide these to the builder before Phase A begins.
The Hindi copy review. Before launch, every AI-generated reading in Hindi needs a review by a native Hindi speaker. The builder cannot do this. LLMs write grammatically correct but occasionally stilted Hindi. One cringe-worthy translation will get screenshotted and shared.

— End of document —