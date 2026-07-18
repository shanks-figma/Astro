Jyotish AI
Agent PRDs — v1.0
Seven autonomous agents · Web-first · Vedic AI · India consumer

Agents in this document
1. Kundli agent  —  Calculation engine
2. Interpretation agent  —  AI reading engine
3. Content agent  —  Scheduled content engine
4. Growth agent  —  SEO & acquisition engine
5. Retention agent  —  Engagement engine
6. Corpus agent  —  Knowledge base quality engine
7. Payments agent  —  Subscription lifecycle engine

How to use this document
Each agent section is self-contained. Hand one section at a time to the AI builder.
Build order: Kundli → Interpretation → Content → Retention → Growth → Corpus → Payments.
The Kundli agent must be complete and passing all tests before any other agent starts.
The Orchestrator is a thin event bus (BullMQ on Redis) — it does not need a separate spec.
All agents share the same Supabase instance and emit/consume from the same event queue.

Agent 1 — Kundli agent
Calculation engine
What it does
The Kundli agent is the calculation foundation for everything else. It takes a user's birth details (date, time, place) and produces a complete, validated Vedic chart as structured JSON. Every other agent depends on this output — nothing runs without an accurate chart. This agent has zero AI involvement; it is pure deterministic math.

Trigger
Trigger event
Condition
New user signup
User completes onboarding with birth details
Birth detail update
User edits date, time, or place of birth
Ayanamsa change
User switches ayanamsa in settings
Partner chart (Kundli Milan)
Second chart generated for compatibility

Inputs
Date of birth — DD/MM/YYYY
Time of birth — HH:MM (24hr); fallback: 12:00 noon if unknown
Place of birth — city name → resolved to latitude/longitude via OpenCage Geocoding API
Ayanamsa — default Lahiri; user-overridable to Krishnamurti or Raman

Processing steps
1. Geocode birth city → lat/long + timezone at birth date (historical timezone-aware)
2. Convert local birth time to UTC
3. Call Swiss Ephemeris (pyswisseph) with Julian Day Number
4. Calculate all 9 planetary positions (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu) in degrees
5. Apply Lahiri ayanamsa correction → sidereal positions
6. Compute Lagna (Ascendant) from birth time + place
7. Assign planets to houses (Whole sign system)
8. Determine Rashi (Moon sign) and Nakshatra + Pada
9. Calculate Vimshottari Dasha — full timeline from birth: Mahadasha → Antardasha → Pratyantar with ISO dates
10. Detect Yogas — scan for top 30 common formations (Raj Yoga, Gajakesari, Kemadruma, Dhana, Mangal Dosha, etc.)
11. Validate output — cross-check planet counts, house assignments, Dasha sum = 120 years
12. Store JSON to Supabase `charts` table, emit `chart.generated` event

Output schema (JSON)
chart JSON structure
{ user_id, generated_at, ayanamsa,
  lagna: { sign, degree },
  planets: [{ name, sign, house, degree, retrograde, nakshatra, pada }],
  houses: [{ number, sign, planets[] }],
  dashas: { current: { maha, antar, pratyantar, ends_at }, timeline: [...] },
  yogas: [{ name, planets[], house, strength }],
  birth_unknown_time: boolean
}

Error handling
Error
Handling
Unknown birth time
Set birth_unknown_time: true, use noon, disable Lagna-dependent readings, show accuracy warning in UI
Geocoding failure
Retry once; if still fails, prompt user to enter lat/long manually
Ephemeris library error
Log to Sentry, return 500, do not store partial chart
Invalid date (pre-1900)
Swiss Ephemeris handles back to 600 BC — flag dates pre-1900 for manual QA
Ayanamsa mismatch
On ayanamsa change, delete old chart and regenerate — never patch positions

Test requirements
Before any other agent is built, this agent must pass 50 test cases against verified charts (public figures with confirmed birth times and independently verified planetary positions).
Accuracy threshold: all 9 planet positions within 0.5° of reference
Dasha start/end dates within 1 day of reference
Yoga detection: 90%+ match against manual expert review on test set

Success metrics
Metric
Target
Chart generation time
< 800ms p95
Calculation error rate
< 0.01% (zero tolerance for wrong planets)
Geocoding success rate
> 99% for Indian cities
Test suite pass rate
100% before deploy

Agent 2 — Interpretation agent
AI reading engine
What it does
The Interpretation agent is the core AI product. It takes a user's chart JSON plus a query context, retrieves the relevant Vedic rules from the knowledge base, and generates a personalised reading via LLM. Every reading the user sees is produced by this agent. Quality here is the product — everything else is infrastructure.

Trigger
Trigger
Condition
User opens home screen
Generates today's personalised daily reading (cached 24hr)
User requests domain reading
Career / relationship / health / spiritual — on demand
User sends Ask query
Free-text question about their chart
Scheduled Dasha event
Major Dasha change within 30 days — proactive reading generated
Significant transit
Saturn/Jupiter ingress into user's key houses

Inputs
User's chart JSON (from Kundli agent)
Current planetary transit positions (fetched fresh from ephemeris microservice)
Query type: daily | domain | ask | dasha_alert | transit_alert
Domain tag (if domain query): career | relationship | health | wealth | spiritual
User's life context: stated concern, language preference
User's current Dasha period (extracted from chart JSON)

Processing steps
1. Extract relevant planet-house-sign combinations from chart JSON based on query type
2. Build RAG query: '{planet} in {sign} in house {n} — {domain}' × top 3 relevant combinations
3. Retrieve top-8 rule chunks from pgvector knowledge base (cosine similarity threshold > 0.75)
4. Rerank chunks by domain relevance (career rules ranked higher for career queries)
5. Build LLM prompt: system prompt + chart summary + retrieved rules + current transits + user context
6. Call Claude claude-sonnet-4-6 with streaming enabled
7. Validate output — planet names match chart, no doom language, within word limit
8. Cache result with key: user_id + query_type + date (daily readings cached 24hr, others 6hr)
9. Store reading to `readings` table with retrieval metadata for corpus agent audit

System prompt (non-negotiable rules)
You are a Vedic astrology interpreter. You have been given the user's chart and relevant classical rules.
Rules:
1. Only interpret what is in the retrieved rules. Do not add Vedic knowledge from training.
2. Never predict death, serious illness, or irreversible misfortune.
3. Use probability language — 'this period may bring', not 'this will cause'.
4. Always end with one actionable insight or remedy.
5. Match the user's language: English | Hindi | Hinglish.
6. Maximum 300 words for daily, 500 for domain, 250 for ask.
7. Explain Vedic terms the first time you use them.

Output
Structured reading object: { title, summary (2 lines), body (paragraphs), remedy (1 line), sources: [rule_chunk_ids] }
Streamed to client via Server-Sent Events — first token within 1s
Sources stored for corpus agent audit — which rules were used

RAG confidence handling
Condition
Handling
< 3 chunks retrieved
Fall back to generic Dasha interpretation only; flag reading as low-confidence
No chunks above threshold
Return 'Your chart has a rare configuration — detailed reading coming soon'; queue for corpus gap
Conflicting rules retrieved
Prompt instructs LLM to synthesise: 'These rules may modify each other — explain both influences'
Birth time unknown
Exclude all house-dependent rules; note limitation in reading

Success metrics
Metric
Target
Time to first token
< 1s
Reading generation p95
< 4s end-to-end
User rating > 3/5
> 78% of readings
Hallucination rate
< 0.5% (planet wrong in output vs chart)
Cache hit rate
> 60% on daily readings

Agent 3 — Content agent
Scheduled content engine
What it does
The Content agent runs on a schedule and handles all proactive content generation — daily readings for every active user, weekly forecasts, SEO article drafts, and transit alert copy. It offloads bulk generation work from the Interpretation agent so on-demand queries stay fast.

Trigger
Schedule / Trigger
Task
Daily at 05:00 IST
Generate today's reading for all active users
Monday 06:00 IST
Generate weekly forecast for paid subscribers
On planet ingress (transit)
Generate transit alert content for affected users
On Dasha change (D-30)
Generate 'upcoming period' reading for affected users
Weekly Sunday 22:00 IST
Generate 3 SEO article drafts based on trending queries

Daily reading generation (batch)
1. Query `users` table — all users with chart + active session in last 30 days
2. Fetch today's transit positions (one call, cached for all users)
3. For each user: call Interpretation agent with query_type='daily', transit positions, chart JSON
4. Rate limit: max 50 concurrent LLM calls; queue remainder with BullMQ
5. Store results to `readings` table with date key
6. Mark reading as 'ready' in user record — push notification triggered by Retention agent
7. Log batch stats: total generated, failed, avg latency, cache hits

SEO article generation
Weekly agent run: finds high-volume Vedic astrology search queries not yet covered by existing pages, generates structured article drafts, queues for human review before publish.
1. Pull top 50 queries from Google Search Console API (or Ahrefs API if connected)
2. Filter: queries with > 500 monthly searches in India, not already covered by existing page
3. For each target query: generate article outline + 600-word draft via LLM
4. Article structure: H1 (exact keyword) → intro → 3-5 H2 sections → FAQ → CTA to free Kundli
5. Store drafts to `content_drafts` table with status='pending_review'
6. Notify founder via Slack: 'X article drafts ready for review'
7. Founder approves/edits → status='approved' → Next.js page auto-generated on next deploy

SEO content rules
Every article must: link to free Kundli generator, include one real user question as FAQ,
mention a specific Vedic concept (not just generic astrology), be in English first (Hindi version queued separately).
Never publish AI content without founder review — one factually wrong article can damage domain trust.

Success metrics
Metric
Target
Daily batch completion time
< 45 min for 10K users
Batch failure rate
< 1%
SEO drafts per week
3 minimum
Article approval rate
> 70% (indicates good targeting)
Organic traffic from content pages
Month-on-month growth

Agent 4 — Growth agent
SEO & acquisition engine
What it does
The Growth agent owns organic acquisition. Its primary job is SEO — monitoring keyword rankings, identifying gaps, and generating landing pages for high-intent Vedic astrology queries. Secondary: monitoring product mentions and competitor activity. This agent runs mostly on a weekly schedule with some event-driven triggers.

Trigger
Schedule / Trigger
Task
Weekly Monday 07:00 IST
Keyword rank check + gap analysis
Weekly Wednesday 07:00 IST
Competitor page monitoring
On new ranking drop > 5 positions
Alert + generate replacement content
Monthly 1st
Full acquisition report for founder

Keyword monitoring
1. Pull current rankings for target keyword list from Google Search Console API
2. Compare against previous week — flag any keyword that dropped > 5 positions
3. Check competitor pages (Astrosage, Astrotalk) for new content on monitored queries via sitemap diff
4. Identify unranked queries with > 200 monthly searches — add to content gap list
5. Prioritise gap list by: search volume × user intent score × estimated difficulty
6. Pass top 5 priority queries to Content agent for article generation

Landing page generation
High-intent Vedic queries map directly to programmatic landing pages. The Growth agent identifies these and queues page generation.
Page types to generate:
Combination pages: '[Sign] + [Sign] compatibility', 'Kundli for [Name] meaning'
Transit pages: '[Planet] transit [Sign] [Year] effects in Hindi'
Dasha pages: '[Planet] Mahadasha effects on career / marriage / health'
Remedy pages: 'Mangal dosha remedies', 'Shani sade sati 2025 remedies'
Each page: SSR via Next.js, < 2s LCP, structured data (FAQ schema), internal link to free Kundli generator
Pages auto-deployed on approval — no manual coding

Acquisition report (monthly)
Organic sessions vs previous month
Top 10 pages by new user acquisition
Keywords entered top 10 this month
Conversion rate: organic visitor → Kundli generated
Estimated organic value (sessions × avg CPC for keyword)
Delivered as Slack message + stored in `reports` table

Success metrics
Metric
Target
Keywords in top 10 (India)
> 50 within 6 months
Organic sessions (month 6)
> 100K/month
Organic → signup conversion
> 8%
Programmatic pages live
> 200 within 3 months
Content gap closure rate
> 3 pages/week

Agent 5 — Retention agent
Engagement engine
What it does
The Retention agent monitors user engagement and sends timely, contextually relevant communications to keep users active and convert free users to paid. It is entirely event-driven — it never sends generic broadcast messages. Every nudge is tied to something happening in the user's chart or behaviour.

Trigger
Trigger event
Action
User inactive 3 days
Send 'your reading is ready' push notification
User inactive 7 days
Send email: upcoming transit or Dasha event relevant to their chart
User inactive 21 days
Send re-engagement email with personalised chart insight
Dasha change in 30 days
Push + email: 'Major life period changing — here's what to expect'
Significant transit (Saturn/Jupiter)
Push: planet entering key house for user
User hits free reading limit
In-app prompt + email: upgrade to continue
Subscription expires in 3 days
Push + email: renewal reminder
Failed payment
Email sequence: 3 attempts over 7 days before cancellation

Nudge rules (non-negotiable)
Communication rules
1. Max 1 push notification per user per day.
2. Max 2 emails per user per week.
3. Every message must reference something specific to the user's chart — no generic copy.
4. No nudges between 22:00 and 07:00 IST.
5. User can mute any channel from profile — respect immediately.
6. After 3 consecutive ignored pushes, downgrade to email only for 7 days.

Dasha change nudge (highest value)
This is the most powerful retention and conversion trigger. When a user is 30 days from a Mahadasha change, the agent generates a bespoke 'entering [Planet] period' reading and sends it as a teaser — full reading behind paywall.
Push: 'Your [Planet] Mahadasha begins in 28 days. Here's what shifts →'
Tapping push: opens teaser reading (first 2 paragraphs free, rest blurred)
CTA: 'Unlock your full [Planet] Mahadasha guide — ₹99/mo'
Email (3 days later if not converted): longer teaser + 3 user questions the reading answers

Churn prediction
Score each user weekly: days_since_last_open × 0.4 + readings_rated_low × 0.3 + subscription_age × 0.3
Users above churn threshold: flag for high-touch retention sequence
High-touch sequence: personalised email from 'founder' with specific chart insight + offer
Track: churn sequence conversion rate — iterate copy monthly

Success metrics
Metric
Target
D7 retention
> 35%
D30 retention
> 18%
Push notification open rate
> 22%
Email open rate
> 28%
Dasha nudge → paid conversion
> 12%
Monthly churn rate (paid)
< 8%

Agent 6 — Corpus agent
Knowledge base quality engine
What it does
The Corpus agent maintains the quality of the RAG knowledge base over time. It audits reading quality, identifies gaps in Vedic rule coverage, flags low-confidence retrievals, and queues updates for human review. Without this agent, the knowledge base stagnates and reading quality drifts downward as user charts reveal edge cases not covered in the initial corpus.

Trigger
Schedule / Trigger
Task
Weekly Sunday 23:00 IST
Full quality audit of week's readings
On reading rated < 2/5 by user
Immediate flag — inspect retrieval metadata
On RAG retrieval < 3 chunks
Log gap — add to gap queue
Monthly 1st
Corpus coverage report

Weekly quality audit
1. Pull all readings generated this week from `readings` table
2. Filter: readings with user rating ≤ 2/5, or flagged by output validator
3. For each flagged reading: retrieve the rule chunks that were used (stored in reading metadata)
4. Classify failure type:
Coverage gap — no relevant rules existed for this planet/house/sign combination
Retrieval failure — rules existed but weren't retrieved (embedding issue)
Synthesis failure — rules were retrieved but LLM output was poor (prompt issue)
5. Coverage gaps → add to `corpus_gaps` table with priority score
6. Retrieval failures → flag chunk for re-embedding
7. Synthesis failures → add example to prompt improvement queue
8. Generate weekly summary: X gaps found, Y re-embeds queued, Z prompt issues
9. Send summary to founder via Slack

Gap queue management
Coverage gaps are the most important output. Each gap represents a chart configuration the system can't interpret well.
Gap record: { planet, sign, house, domain, frequency, priority_score }
Priority score = frequency × domain_importance (marriage/career > general)
Top 10 gaps sent to founder weekly: 'These 10 chart configurations need new rules'
Founder or domain expert adds rules → ingested into pgvector on next corpus refresh
Gap closure tracked — alert when gap frequency drops after new rules added

What the corpus agent does NOT do
It does not auto-add Vedic rules. All new rule content must be reviewed by a domain expert before ingestion.
AI-generated Vedic rules without human review will degrade trust faster than gaps do.
The agent's job is to surface gaps precisely, not to fill them autonomously.

Corpus refresh process
1. Domain expert provides new rules as structured CSV: planet, sign, house, effect, domain, source_text
2. Corpus agent validates format and checks for duplicates
3. Generate embeddings via text-embedding-3-small
4. Upsert into pgvector with metadata
5. Run retrieval test on 20 known queries — verify new rules surface correctly
6. Update corpus version number + changelog in `corpus_versions` table

Success metrics
Metric
Target
Weeks to identify a coverage gap
< 1 week after first occurrence
Gap queue resolution time
< 2 weeks for high-priority gaps
RAG retrieval < 3 chunks rate
< 5% of readings
Corpus size growth (rules)
> 500 new rules per month (initial phase)
Reading quality trend
Average rating increasing month-on-month

Agent 7 — Payments agent
Subscription lifecycle engine
What it does
The Payments agent manages the entire subscription lifecycle — new subscriptions, renewals, failed payments, downgrades, cancellations, and upgrade nudges. It integrates with Razorpay and ensures no revenue leaks from unhandled payment states. It also feeds signals to the Retention agent for conversion nudges.

Trigger
Trigger
Action
Razorpay webhook: payment.captured
Activate subscription, update user tier
Razorpay webhook: payment.failed
Start failed payment recovery sequence
Razorpay webhook: subscription.charged
Log renewal, send confirmation
Razorpay webhook: subscription.cancelled
Downgrade user, send offboarding email
Subscription expires in 3 days
Trigger renewal reminder to Retention agent
User hits free tier limit
Emit upgrade_prompt event to Retention agent
Daily 08:00 IST
Reconciliation check — Razorpay vs database

Subscription tiers
Tier
Access
Free
Kundli generation, planet/house data, 3 Ask questions/month
Basic — ₹99/mo
Daily readings, weekly forecast, unlimited Ask
Pro — ₹199/mo
Basic + Kundli Milan, transit alerts, Muhurta checks
One-time reports
Varshaphal ₹499, Detailed Kundli PDF ₹299

Failed payment recovery
Failed payments are the biggest preventable revenue leak. The agent handles the full dunning sequence automatically.
Attempt 1 (Day 0): Log failure, send email 'Payment didn't go through — retry'
Attempt 2 (Day 3): Push notification + email with direct payment link
Attempt 3 (Day 7): Email with offer — '1 month at 50% off if you complete payment today'
Day 8: If still unpaid, downgrade to free, send 'Your Pro access has paused' email
Day 8–30: User retains all chart data, readings history accessible, features locked
After day 30: Send 'We miss you' reactivation email with no discount

Reconciliation (daily)
Pull all Razorpay transactions from previous day via API
Compare against `subscriptions` table — flag any payment captured but not reflected in DB
Flag any active subscription in DB with no corresponding Razorpay subscription ID
Alert founder via Slack if discrepancy > 0 — never auto-correct without human confirmation

Upgrade nudge signals
The Payments agent emits events that the Retention agent acts on — it does not send communications directly.
Event: free_limit_reached → Retention agent sends in-app upgrade prompt
Event: high_engagement_free_user (> 5 sessions in 7 days, not paid) → Retention agent sends upgrade email
Event: subscription_renewal_due_3d → Retention agent sends renewal reminder

Data stored
Table
Key fields
`subscriptions`
user_id, tier, razorpay_sub_id, status, starts_at, ends_at, auto_renew
`payments`
payment_id, user_id, amount, currency, status, razorpay_payment_id, created_at
`invoices`
invoice_id, user_id, amount, period, pdf_url, sent_at
`dunning_log`
user_id, attempt_number, sent_at, outcome

Success metrics
Metric
Target
Failed payment recovery rate
> 35% of failed payments recovered
Reconciliation discrepancies
0 unresolved after 24hr
Subscription activation latency
< 30s from payment.captured webhook
Dunning email open rate
> 40%
Monthly revenue churn
< 6%
— End of document —