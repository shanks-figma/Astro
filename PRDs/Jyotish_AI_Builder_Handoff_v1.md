Jyotish AI
Builder Handoff — Complete Technical Spec v1.0
DB schema · Event contracts · Corpus format · Web screens · Env vars

Contents
1 — Database schema (all 16 tables + indexes)
2 — Event bus contracts (17 events, full payload schemas)
3 — Vedic corpus format, 20 sample rules, ingestion pipeline
4 — Web app screen specs (18 pages, API routes, components)
5 — Environment variables + third-party account checklist

How to use this document alongside the Agent PRDs
Read this doc first — set up the database schema and environment before any agent code.
Hand Agent PRDs one at a time to the builder, starting with the Kundli agent.
The builder references this doc for table definitions and event payloads as they build each agent.
Section 3 (corpus) is for the founder / domain expert — the builder only implements the ingestion pipeline.
Section 4 (screens) can be built in parallel with agent development once the DB is up.


Section 1 — Database schema
All tables live in a single Supabase (Postgres) instance. Row Level Security (RLS) is enabled on all user-facing tables. Service role key is used only by agent workers — never exposed to the browser.

Setup note for builder
Run these CREATE TABLE statements in order — foreign keys reference earlier tables.
Enable pgvector extension first: CREATE EXTENSION IF NOT EXISTS vector;
Enable RLS on every table after creation: ALTER TABLE {name} ENABLE ROW LEVEL SECURITY;
Create a 'service_role' Supabase policy that bypasses RLS for agent workers.

1.1 Core user tables
users + birth_details
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  language      TEXT NOT NULL DEFAULT 'en'  CHECK (language IN ('en','hi','hinglish')),
  life_context  TEXT CHECK (life_context IN ('career','relationship','health','wealth','spiritual','general')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Birth details (separate table — sensitive, minimal exposure)
CREATE TABLE public.birth_details (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dob           DATE NOT NULL,
  tob           TIME,                        -- NULL = unknown birth time
  tob_unknown   BOOLEAN NOT NULL DEFAULT FALSE,
  city          TEXT NOT NULL,
  latitude      NUMERIC(9,6) NOT NULL,
  longitude     NUMERIC(9,6) NOT NULL,
  timezone      TEXT NOT NULL,               -- IANA tz at birth date
  ayanamsa      TEXT NOT NULL DEFAULT 'lahiri' CHECK (ayanamsa IN ('lahiri','krishnamurti','raman')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)                            -- one birth detail per user
);

1.2 Chart tables
chart tables
-- Master chart record
CREATE TABLE public.charts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_id      UUID NOT NULL REFERENCES public.birth_details(id),
  ayanamsa      TEXT NOT NULL,
  lagna_sign    TEXT NOT NULL,
  lagna_degree  NUMERIC(6,3) NOT NULL,
  rashi         TEXT NOT NULL,               -- Moon sign
  nakshatra     TEXT NOT NULL,
  nakshatra_pada INT NOT NULL CHECK (nakshatra_pada BETWEEN 1 AND 4),
  raw_json      JSONB NOT NULL,              -- full chart payload from Kundli agent
  version       INT NOT NULL DEFAULT 1,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)                            -- one active chart per user
);

-- Planetary positions (queryable rows, also in raw_json)
CREATE TABLE public.chart_planets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id      UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  planet        TEXT NOT NULL,
  sign          TEXT NOT NULL,
  house         INT NOT NULL CHECK (house BETWEEN 1 AND 12),
  degree        NUMERIC(6,3) NOT NULL,
  retrograde    BOOLEAN NOT NULL DEFAULT FALSE,
  nakshatra     TEXT NOT NULL,
  pada          INT NOT NULL CHECK (pada BETWEEN 1 AND 4)
);

-- Dasha timeline
CREATE TABLE public.dashas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id      UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  level         TEXT NOT NULL CHECK (level IN ('maha','antar','pratyantar')),
  planet        TEXT NOT NULL,
  starts_at     DATE NOT NULL,
  ends_at       DATE NOT NULL,
  parent_id     UUID REFERENCES public.dashas(id)  -- NULL for Mahadasha
);

-- Detected Yogas
CREATE TABLE public.yogas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id      UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  planets       TEXT[] NOT NULL,
  houses        INT[] NOT NULL,
  strength      TEXT CHECK (strength IN ('strong','moderate','weak'))
);

1.3 Readings table
readings
CREATE TABLE public.readings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chart_id        UUID NOT NULL REFERENCES public.charts(id),
  query_type      TEXT NOT NULL CHECK (query_type IN ('daily','domain','ask','dasha_alert','transit_alert')),
  domain          TEXT CHECK (domain IN ('career','relationship','health','wealth','spiritual')),
  prompt_snapshot TEXT NOT NULL,             -- full prompt sent to LLM (for audit)
  rag_chunk_ids   UUID[],                    -- which corpus chunks were used
  rag_chunk_count INT,
  output          TEXT NOT NULL,             -- final reading text
  output_language TEXT NOT NULL DEFAULT 'en',
  word_count      INT,
  confidence      TEXT CHECK (confidence IN ('high','medium','low')),
  user_rating     INT CHECK (user_rating BETWEEN 1 AND 5),
  flagged         BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason     TEXT,
  cache_key       TEXT UNIQUE,               -- user_id:query_type:date for cache lookup
  cached_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_readings_user_date ON public.readings(user_id, created_at DESC);
CREATE INDEX idx_readings_cache ON public.readings(cache_key) WHERE cache_key IS NOT NULL;
CREATE INDEX idx_readings_flagged ON public.readings(flagged) WHERE flagged = TRUE;

1.4 Corpus / knowledge base tables
corpus tables
-- pgvector extension must be enabled first
-- CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE public.corpus_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet        TEXT,                        -- NULL = applies to all planets
  sign          TEXT,
  house         INT CHECK (house BETWEEN 1 AND 12),
  aspect_from   TEXT,                        -- aspecting planet if applicable
  domain        TEXT[] NOT NULL,             -- ['career','wealth'] etc.
  effect        TEXT NOT NULL,               -- the actual rule text
  source_text   TEXT NOT NULL,               -- e.g. 'BPHS Ch.24 v.12'
  is_positive   BOOLEAN,                     -- NULL = neutral
  strength      TEXT CHECK (strength IN ('definitive','moderate','conditional')),
  embedding     vector(1536),                -- text-embedding-3-small
  corpus_version INT NOT NULL DEFAULT 1,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_corpus_embedding ON public.corpus_rules
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_corpus_domain ON public.corpus_rules USING GIN(domain);
CREATE INDEX idx_corpus_planet_house ON public.corpus_rules(planet, house);

-- Corpus gap tracking (from Corpus agent)
CREATE TABLE public.corpus_gaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet        TEXT,
  sign          TEXT,
  house         INT,
  domain        TEXT,
  frequency     INT NOT NULL DEFAULT 1,
  priority      TEXT CHECK (priority IN ('high','medium','low')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

-- Corpus versions
CREATE TABLE public.corpus_versions (
  version       INT PRIMARY KEY,
  rules_added   INT NOT NULL DEFAULT 0,
  rules_updated INT NOT NULL DEFAULT 0,
  changelog     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

1.5 Subscription + payment tables
subscription + payment tables
CREATE TABLE public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  tier              TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','basic','pro')),
  razorpay_sub_id   TEXT UNIQUE,             -- NULL for free tier
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','expired')),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at           TIMESTAMPTZ,             -- NULL = auto-renewing
  auto_renew        BOOLEAN NOT NULL DEFAULT TRUE,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)                            -- one subscription record per user
);

CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  amount_paise      INT NOT NULL,            -- INR in paise (₹99 = 9900)
  currency          TEXT NOT NULL DEFAULT 'INR',
  status            TEXT NOT NULL CHECK (status IN ('captured','failed','refunded')),
  payment_type      TEXT NOT NULL CHECK (payment_type IN ('subscription','one_time')),
  product_id        TEXT,                    -- e.g. 'varshaphal_report'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.dunning_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  attempt_number  INT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  channel         TEXT NOT NULL CHECK (channel IN ('email','push')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome         TEXT CHECK (outcome IN ('paid','ignored','bounced'))
);

1.6 Content + SEO tables
content + SEO tables
CREATE TABLE public.content_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  keyword       TEXT NOT NULL,
  search_volume INT,
  content_type  TEXT NOT NULL CHECK (content_type IN ('article','landing_page','faq')),
  body_md       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_review'
                  CHECK (status IN ('pending_review','approved','published','rejected')),
  reviewed_by   UUID REFERENCES public.profiles(id),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.keyword_rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword       TEXT NOT NULL,
  position      INT,                         -- NULL = not ranking
  page_url      TEXT,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_kwrank_keyword ON public.keyword_rankings(keyword, checked_at DESC);

1.7 Retention + notification tables
retention + notification tables
CREATE TABLE public.notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  channel       TEXT NOT NULL CHECK (channel IN ('push','email','in_app')),
  event_type    TEXT NOT NULL,               -- e.g. 'dasha_alert', 'daily_ready'
  subject       TEXT,
  body_preview  TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ
);

CREATE TABLE public.user_engagement (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_count INT NOT NULL DEFAULT 0,
  readings_viewed INT NOT NULL DEFAULT 0,
  ask_count_month INT NOT NULL DEFAULT 0,    -- resets monthly
  churn_score   NUMERIC(4,3),               -- 0.000 – 1.000
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_engagement_user ON public.user_engagement(user_id);

1.8 Table dependency map
Table
Depends on
Notes
profiles
auth.users
Core user record
birth_details
profiles
Birth data, 1:1 with profiles
charts
profiles, birth_details
Generated Kundli, 1:1 per user
chart_planets
charts
9 rows per chart
dashas
charts
~40 rows per chart (full timeline)
yogas
charts
Variable per chart
corpus_rules
none
Independent — has pgvector index
corpus_gaps
none
Logged by Corpus agent
readings
profiles, charts
Every AI reading ever generated
subscriptions
profiles
1:1 with profiles
payments
profiles
N payments per user
dunning_log
profiles
Failed payment retry log
content_drafts
profiles (reviewer)
SEO content pipeline
keyword_rankings
none
Weekly SEO rank snapshots
notification_log
profiles
All comms sent
user_engagement
profiles
1:1 — updated on every session

Section 2 — Event bus contracts
All agents communicate via BullMQ queues on Redis. Each agent listens to one or more named queues and emits events that other agents consume. This section defines every event: its name, which agent emits it, which agents consume it, and the exact JSON payload.

Infrastructure note
Queue library: BullMQ (npm) on Redis 7+.
Redis host: Railway managed Redis — one instance, shared across all agents.
Queue naming convention: jyotish:{event_name}  e.g. jyotish:chart.generated
All payloads are JSON. All timestamps are ISO 8601 UTC strings.
Failed jobs retry 3x with exponential backoff (1min, 5min, 30min) then dead-letter.
Dead-letter queue: jyotish:dead — alert founder via Slack on any entry.

2.1 Event catalogue
Event name
Emitter
Consumers
When
chart.generated
Kundli agent
Interpretation, Content, Retention
User's chart is ready
chart.updated
Kundli agent
Interpretation, Content
Birth details changed — new chart
reading.requested
Web app / API
Interpretation agent
User triggered a reading
reading.generated
Interpretation agent
Retention, Corpus
Reading completed and stored
reading.rated
Web app / API
Corpus agent
User rated a reading
dasha.change.upcoming
Content agent
Retention agent
Dasha change within 30 days
transit.significant
Content agent
Retention, Interpretation
Major transit affecting user
content.draft.created
Content agent
None (Slack notify only)
New SEO draft ready for review
content.published
Web app (admin)
None (triggers Next.js rebuild)
Founder approved content
keyword.rank.dropped
Growth agent
Content agent
Keyword fell > 5 positions
engagement.inactive.3d
Retention agent
Notification worker
User inactive 3 days
engagement.inactive.7d
Retention agent
Notification worker
User inactive 7 days
subscription.activated
Payments agent
Profiles (tier update)
Payment captured
subscription.failed
Payments agent (Rzp webhook)
Retention agent
Payment failed — start dunning
subscription.cancelled
Payments agent (Rzp webhook)
Retention, Profiles
User cancelled
upgrade.prompted
Retention agent
Payments agent (track)
Upgrade CTA shown to user
free.limit.reached
Web app / API
Retention agent
User hit 3 Ask questions/month

2.2 Event payload schemas
chart.generated
{
  "event":    "chart.generated",
  "user_id":  "uuid",
  "chart_id": "uuid",
  "birth_id": "uuid",
  "ayanamsa": "lahiri",
  "lagna":    "Scorpio",
  "rashi":    "Capricorn",
  "current_maha_dasha":  "Saturn",
  "current_antar_dasha": "Mercury",
  "maha_ends_at": "2031-04-14",
  "tob_unknown":  false,
  "emitted_at":   "2025-08-01T09:32:00Z"
}

reading.requested
{
  "event":       "reading.requested",
  "user_id":     "uuid",
  "chart_id":    "uuid",
  "query_type":  "daily" | "domain" | "ask" | "dasha_alert" | "transit_alert",
  "domain":      "career" | "relationship" | "health" | "wealth" | "spiritual" | null,
  "ask_text":    "string | null",        // populated for query_type="ask"
  "language":    "en" | "hi" | "hinglish",
  "life_context":"career",               // from user profile
  "emitted_at":  "2025-08-01T09:32:00Z"
}

reading.generated
{
  "event":          "reading.generated",
  "reading_id":     "uuid",
  "user_id":        "uuid",
  "query_type":     "daily",
  "confidence":     "high" | "medium" | "low",
  "rag_chunk_count": 7,
  "word_count":     284,
  "cached_until":   "2025-08-02T05:00:00Z",
  "emitted_at":     "2025-08-01T09:32:04Z"
}

dasha.change.upcoming
{
  "event":           "dasha.change.upcoming",
  "user_id":         "uuid",
  "chart_id":        "uuid",
  "current_maha":    "Jupiter",
  "incoming_maha":   "Saturn",
  "change_date":     "2025-09-04",
  "days_until":      28,
  "emitted_at":      "2025-08-07T06:00:00Z"
}

subscription.activated / subscription.failed / subscription.cancelled
{
  "event":              "subscription.activated",  // or .failed / .cancelled
  "user_id":            "uuid",
  "subscription_id":    "uuid",
  "tier":               "basic" | "pro",
  "razorpay_sub_id":    "sub_XXXXX",
  "razorpay_payment_id":"pay_XXXXX",   // null for .cancelled
  "amount_paise":       9900,           // null for .cancelled
  "failure_reason":     null,           // populated for .failed
  "emitted_at":         "2025-08-01T09:32:00Z"
}

engagement.inactive.3d / engagement.inactive.7d
{
  "event":           "engagement.inactive.3d",
  "user_id":         "uuid",
  "last_active":     "2025-07-29T14:22:00Z",
  "upcoming_event":  {            // best hook to use in nudge copy
    "type":   "transit",          // "transit" | "dasha_change" | null
    "planet": "Saturn",
    "date":   "2025-08-12"
  },
  "emitted_at":      "2025-08-01T06:00:00Z"
}

2.3 Queue processing rules
Queue
Worker
Concurrency
Max retries
Retry strategy
Dedup?
reading.requested
Interpretation
10
3
exponential
Yes — per cache_key
chart.generated
Kundli
5
3
exponential
No
dasha.change.upcoming
Content
50
2
fixed 5min
Yes — per user per dasha
engagement.inactive.3d
Retention
100
1
none
Yes — per user per week
subscription.activated
Payments
20
5
exponential
No

Section 3 — Vedic corpus format + ingestion spec
The RAG knowledge base is the core moat of Jyotish AI. This section defines the exact format for rule entries, the CSV schema the domain expert must produce, the ingestion pipeline the builder implements, and 20 sample rules to validate the pipeline end-to-end.

Who owns the corpus
The builder implements the ingestion pipeline. The founder / domain expert authors the rules.
No AI-generated rules enter the corpus without expert review.
Target at MVP: 5,000 rules across all planet × house × sign combinations most common in Indian charts.
Priority order: Saturn rules first (most queried), then Jupiter, then Moon, then Rahu/Ketu.

3.1 CSV schema
Column
Type
Required
Valid values / notes
planet
TEXT
Yes*
Sun | Moon | Mars | Mercury | Jupiter | Venus | Saturn | Rahu | Ketu | null
sign
TEXT
Yes*
Aries | Taurus | ... | Pisces | null
house
INT
Yes*
1–12 | null
aspect_from
TEXT
No
Planet name if rule is about an aspect
domains
TEXT
Yes
Pipe-separated: career|wealth or just career
effect
TEXT
Yes
The rule in plain English. Max 300 chars.
source_text
TEXT
Yes
Book + chapter + verse: 'BPHS Ch.24 v.12'
is_positive
BOOL
No
true | false | leave blank for neutral
strength
TEXT
Yes
definitive | moderate | conditional

*At least one of planet, sign, or house must be non-null. A rule can omit sign if it applies regardless of sign (e.g. Saturn in 7th regardless of sign).

3.2 Sample rules (20 entries for pipeline validation)
corpus_sample.csv — 20 validation rules
planet,sign,house,aspect_from,domains,effect,source_text,is_positive,strength
Saturn,Capricorn,1,,career|general,Native gains perseverance and authority. Rise in career after age 35.,BPHS Ch.3 v.14,true,definitive
Saturn,,7,,marriage|relationship,Delay in marriage. Partner may be older or from a different background.,Phaladeepika Ch.7 v.4,false,moderate
Jupiter,Sagittarius,9,,wealth|spiritual,Strong Dharma — fortune through ethical conduct. Father is influential.,BPHS Ch.8 v.22,true,definitive
Jupiter,,5,,career|wealth,Gajakesari potential. Intelligence and good progeny. Success in education.,Saravali Ch.16 v.8,true,moderate
Mars,Aries,1,,career|health,High energy and ambition. Prone to anger and accidents. Leadership qualities.,BPHS Ch.5 v.6,true,moderate
Mars,,7,,marriage,Mangal Dosha — tension in marriage. Partner should also have Mars in key houses.,Phaladeepika Ch.7 v.9,false,conditional
Moon,Cancer,4,,relationship|general,Emotional security from home. Strong bond with mother. Intuitive nature.,BPHS Ch.6 v.3,true,definitive
Moon,,6,,health,Mind is troubled by enemies or illness. Tendency toward anxiety. Meditation helps.,Saravali Ch.14 v.2,false,moderate
Rahu,,10,,career,Unconventional career path. Fame through technology, foreign connections, or media.,BPHS Ch.24 v.18,,conditional
Ketu,,12,,spiritual,Strong past-life spiritual merit. Moksha potential. Foreign residence possible.,BPHS Ch.25 v.7,true,moderate
Sun,Leo,1,,career|general,Leadership and authority. Government or administrative career favoured.,BPHS Ch.4 v.2,true,definitive
Sun,,8,,wealth|health,Obstacles to father. Hidden wealth possible. Research or occult inclination.,Saravali Ch.12 v.5,false,conditional
Mercury,Gemini,3,,career|wealth,Excellent communication. Writing, journalism, or business skills. Siblings supportive.,BPHS Ch.7 v.11,true,definitive
Venus,Taurus,7,,marriage|wealth,Attractive and wealthy spouse. Marriage brings prosperity. Love of beauty.,Phaladeepika Ch.8 v.3,true,definitive
Venus,,6,,marriage,Delay in marriage or health issues for spouse. Service-oriented partnerships.,Saravali Ch.15 v.4,false,moderate
Saturn,Scorpio,8,,wealth|spiritual,Long life indicated. Research, mining, or insurance career. Hidden wealth.,BPHS Ch.11 v.9,,conditional
Jupiter,Cancer,4,,relationship|wealth,Exalted Jupiter — wisdom and prosperity from family. Dharmakarmadhipati Yoga potential.,BPHS Ch.8 v.14,true,definitive
Mars,Capricorn,10,,career,Exalted Mars — exceptional drive in career. Engineering or defence favoured.,BPHS Ch.5 v.18,true,definitive
Moon,Scorpio,8,,health|spiritual,Emotional intensity. Hidden fears. Transformation through crisis. Occult interest.,Saravali Ch.14 v.6,false,moderate
Mercury,,12,,career|spiritual,Losses through communication or abroad. Spiritual writing. Foreign language skills.,BPHS Ch.7 v.19,,conditional

3.3 Ingestion pipeline (builder implements)
1. Validate CSV — check required columns, valid enum values, max 300 chars on effect field
2. Check duplicates — hash (planet+sign+house+effect) and skip if already in corpus_rules
3. Prepare embedding input — concatenate: '{planet} in {sign} in house {house}: {effect} [{domains}]'
4. Batch embed — call OpenAI text-embedding-3-small with batch of 100 at a time
5. Upsert to corpus_rules table with all fields + embedding vector
6. Update corpus_versions — increment version, log rules_added count
7. Run validation queries — pull 5 random rules, verify embedding retrieval returns them for obvious queries
8. Report — log total ingested, skipped duplicates, any validation failures

3.4 Retrieval query construction (Interpretation agent uses this)
pgvector retrieval query
-- Example: user has Saturn in Scorpio in house 7, querying for marriage domain

SELECT id, planet, sign, house, effect, source_text, strength,
       1 - (embedding <=> $1::vector) AS similarity
FROM   public.corpus_rules
WHERE  active = TRUE
  AND  domains @> ARRAY['marriage']   -- domain filter first (uses GIN index)
ORDER BY embedding <=> $1::vector     -- cosine similarity sort
LIMIT  8;

-- $1 is the embedding of: 'Saturn in Scorpio in house 7 marriage effects'
-- Discard any result where similarity < 0.72
-- If fewer than 3 results remain: widen to no domain filter, retry


Section 4 — Web app screen specs
Jyotish AI is a Next.js 14 App Router web application deployed on Vercel. This section defines every page: its URL, purpose, what renders on it, auth requirements, and SEO metadata. The builder implements these screens against the APIs defined in the Agent PRDs.

Tech stack (web)
Framework: Next.js 14 (App Router)
Styling: Tailwind CSS
Auth: Supabase Auth — Google OAuth + Email OTP (phone OTP as fallback)
State: Zustand for client state, React Query for server state
Payments: Razorpay Checkout JS (client) + webhook handler (server)
Hosting: Vercel (web) + Railway (API workers + Redis)
Language: TypeScript throughout

4.1 URL structure
Route
Auth
Purpose
/
Public
Landing page — hero + features + free Kundli CTA
/kundli
Public
Free Kundli generator (main acquisition page)
/kundli/[slug]
Public
Shareable chart page (user's public Kundli)
/sign-in
Public
Auth — Google + Email OTP
/onboarding
Auth req.
Birth details collection + life context
/dashboard
Auth req.
Home — daily reading + current Dasha
/dashboard/kundli
Auth req.
Full chart — planets, houses, Dashas, Yogas
/dashboard/readings
Auth req.
Reading history
/dashboard/ask
Auth req.
Ask-anything AI chat
/dashboard/compatibility
Auth req.
Kundli Milan — enter partner details
/dashboard/muhurta
Auth req.
Auspicious timing checker
/pricing
Public
Plans + upgrade CTA
/account
Auth req.
Profile, birth details, language, ayanamsa
/reports/[report_id]
Auth req.
Generated PDF report viewer
/astrology/[slug]
Public
SEO content pages (auto-generated)
/astrology/kundli-[sign]
Public
Programmatic: Kundli for each Rashi
/astrology/dasha/[planet]
Public
Programmatic: Mahadasha effect pages
/admin
Admin only
Content draft review + corpus gap queue

4.2 Page specs
/ — Landing page
Purpose: Conversion — visitor → free Kundli generation
Auth: Public — redirect to /dashboard if already signed in
SEO title: Free Kundli Online | Vedic Birth Chart | Jyotish AI
SEO desc: Generate your accurate Vedic Kundli free. AI-powered personalised interpretations in Hindi and English.
Hero: headline + subheadline + 'Generate free Kundli' CTA (no sign-in required)
Section: 3 feature cards — Accurate Vedic calculations / AI personalised readings / Dasha timeline
Section: Sample reading preview (blurred after line 3 — 'Sign in to read yours')
Section: Social proof — user count + rating
Section: Pricing preview — free vs paid comparison
Footer: links to top SEO pages (Saturn Mahadasha, Kundli Milan, etc.)

/kundli — Free Kundli generator
Purpose: Primary acquisition + conversion hook — highest intent page
Auth: Public — no sign-in to generate, sign-in to save + get AI reading
SEO title: Free Online Kundli | Janam Kundali | Vedic Horoscope
SEO desc: Generate accurate Vedic Kundli with Dasha, Nakshatra, and Yoga analysis. Free, instant, no sign-up.
Form: Name (optional), Date of birth (date picker), Time of birth (time picker + 'I don't know' toggle), Place of birth (city autocomplete)
On submit: call POST /api/chart/generate — show loading state with 'Calculating planetary positions...'
Result: North Indian Kundli SVG chart + planet table + current Dasha period
Locked sections (shown but blurred): AI interpretation, Yoga analysis, full Dasha timeline
CTA after result: 'Save your Kundli + get personalised AI readings — Free'
CTA tapping unlock: redirects to /sign-in?redirect=/onboarding with chart data in session

/onboarding — Birth details collection
Purpose: Collect birth data for signed-in user, generate and store their chart
Auth: Required — redirect /sign-in if not auth'd
Steps: 5-step wizard — no back button on step 1
Step 1: Name confirmation
Step 2: Date of birth — date picker, validate range 1900–2010
Step 3: Time of birth — time picker + 'I don't know my birth time' checkbox (shows accuracy warning)
Step 4: Place of birth — city search with debounced autocomplete (OpenCage API)
Step 5: Life context — single select cards: Career & money / Love & relationships / Health & wellbeing / Spiritual growth / General guidance
Step 5 also: Language preference — English / हिंदी / Hinglish
On complete: POST /api/chart/generate → loading screen 'Reading the stars...' → redirect /dashboard

/dashboard — Home
Purpose: Primary engagement surface — daily return destination
Auth: Required
Header: 'Namaste, [name]' + Lagna + Rashi chips + current Dasha badge
Card 1 — Today's reading: title + 4-line AI summary. Full reading behind 'Read more →' (paywall for free tier after day 1)
Card 2 — Current period: Mahadasha planet icon + name + Antardasha + time remaining progress bar + 'What does this mean?' link
Card 3 — Upcoming: next significant event (Dasha change / major transit) with date + 1-line preview
Card 4 (paid only): Weekly outlook — 3 domain pills (career / relationship / health) each with 1-line preview
Bottom nav: Home / Kundli / Ask / Account
Paywall state (free): today's reading visible for first 7 days, then shows 2 lines + blur + 'Unlock with Basic ₹99/mo'

/dashboard/kundli — Full chart
Purpose: Chart exploration — data free, AI interpretation paywalled
Auth: Required
Tab 1 — Chart: North Indian SVG chart (interactive — tap planet to highlight)
Tab 2 — Planets: table of all 9 planets with sign / house / degree / retrograde / Nakshatra
Tab 3 — Houses: each house, its sign, planets in it, house significance
Tab 4 — Dashas: Vimshottari timeline — current Maha highlighted, scroll to see full 120yr timeline
Tab 5 — Yogas: detected Yogas list with name, planets involved, strength badge, 1-line meaning
Each section: data visible free, 'What does this mean for me?' button → triggers AI reading (paid gate)

/dashboard/ask — AI chat
Purpose: Open-ended AI interpretation — highest engagement, paid feature
Auth: Required
Free tier: 3 questions per month — counter shown 'X of 3 used'
Chat interface: message list + text input
Suggested questions shown when empty: 'When is a good time to change jobs?' / 'What does my 7th house say about marriage?' / 'What should I watch out for this year?'
On send: POST /api/reading/generate with query_type='ask', ask_text=input — streamed response
Each AI response: reading text + 'Was this helpful?' thumbs up/down rating
At 3rd question (free): after response, show upgrade prompt banner (not blocking)
At 4th question attempt (free): paywall modal — 'Unlimited questions with Basic ₹99/mo'

/dashboard/compatibility — Kundli Milan
Purpose: Marriage compatibility — high-intent paid feature
Auth: Required + Pro tier (₹199/mo)
Form: Partner's birth details — same fields as onboarding (name, DOB, TOB, place)
On submit: generate partner chart → POST /api/compatibility/generate
Result: Ashtakoota score (N/36) with breakdown table + Mangal Dosha status + AI narrative
AI narrative: 'Based on your charts, here is what this combination suggests...' — 400 words
Save option: 'Save this compatibility report' — stored to user's account
Paywall for free/basic: show Ashtakoota score only, blur AI narrative, CTA to Pro

/pricing — Plans
Purpose: Conversion — free → paid
Auth: Public
3 columns: Free / Basic ₹99/mo / Pro ₹199/mo
Feature comparison table with checkmarks
One-time reports section below: Varshaphal ₹499 / Detailed Kundli PDF ₹299
CTA: 'Start with Basic' (primary) / 'Upgrade to Pro' (secondary)
On CTA click (not signed in): /sign-in?redirect=/pricing&plan=basic
On CTA click (signed in): Razorpay Checkout modal

/astrology/[slug] — SEO content pages
Purpose: Organic acquisition — the Growth agent generates these
Auth: Public
Rendering: SSG (Static Site Generation) — rebuilt on content publish
H1: exact target keyword
Intro paragraph: 200–300 words
3–5 H2 sections with body content
FAQ section (structured data: FAQPage schema)
CTA box: 'Get your personalised [topic] reading — Generate free Kundli'
Internal links: 3 related content pages + link to /kundli
Metadata: title = keyword + ' | Jyotish AI', description = first 160 chars of intro

/admin — Content + corpus management
Purpose: Founder-only — review SEO drafts, view corpus gaps
Auth: Required + admin role in profiles table
Tab 1 — Content drafts: list of pending_review drafts with keyword, search volume, word count, preview link, Approve / Reject buttons
Tab 2 — Corpus gaps: table of open gaps sorted by priority + frequency. Link to add new rules CSV.
Tab 3 — Metrics: readings generated today, avg rating this week, active subscribers, batch job status

4.3 Shared UI components
Component
Description
<KundliChart />
SVG North Indian chart — accepts chart JSON, highlights selected planet
<ReadingCard />
Reading display — title, body, rating widget, paywall state
<DashaTimeline />
Horizontal scrollable Dasha timeline with current period highlighted
<PlanetBadge />
Pill showing planet name + sign + house
<PaywallGate />
Blur overlay + CTA — wraps any paid content, accepts plan prop
<LanguageToggle />
EN / HI / Hinglish switcher — persists to user profile
<AskInput />
Chat input with suggestion chips, character count, send button
<SubscriptionBadge />
Free / Basic / Pro badge — shown in header and account page
4.4 API routes (Next.js /app/api)
Method
Route
Auth
Description
POST
/api/chart/generate
Public
Generate chart from birth details. Returns chart JSON. Does NOT save — POST /api/chart/save to persist.
POST
/api/chart/save
Auth
Save generated chart to user account. Emits chart.generated event.
GET
/api/chart/me
Auth
Fetch current user's chart JSON
POST
/api/reading/generate
Auth
Generate AI reading. Streaming SSE response. Checks cache first.
POST
/api/reading/rate
Auth
Rate a reading 1–5. Emits reading.rated event.
GET
/api/reading/history
Auth
List user's past readings, paginated
GET
/api/transit/today
Public
Today's planetary transit positions (cached 24hr)
POST
/api/compatibility/generate
Auth+Pro
Generate Kundli Milan from two birth detail objects
POST
/api/payment/create-order
Auth
Create Razorpay order for one-time purchase
POST
/api/payment/verify
Auth
Verify Razorpay payment signature after checkout
POST
/api/webhook/razorpay
Public
Razorpay webhook handler — validates signature, emits subscription events
GET
/api/admin/drafts
Admin
List content drafts
POST
/api/admin/drafts/[id]/approve
Admin
Approve draft — triggers Next.js rebuild

Section 5 — Environment variables
Every variable the builder needs to set up across Vercel (web) and Railway (workers). Never commit any of these to git.

5.1 Vercel (Next.js web app)
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # server-side only, never NEXT_PUBLIC_

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXX
RAZORPAY_KEY_SECRET=XXXX               # server-side only
RAZORPAY_WEBHOOK_SECRET=XXXX           # for webhook signature validation

# App
NEXT_PUBLIC_APP_URL=https://jyotishai.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXX   # Google Analytics 4

5.2 Railway (agent workers)
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (BullMQ)
REDIS_URL=redis://default:XXXX@redis.railway.internal:6379

# Anthropic (Interpretation + Content agents)
ANTHROPIC_API_KEY=sk-ant-XXXX

# OpenAI (embeddings only — text-embedding-3-small)
OPENAI_API_KEY=sk-XXXX

# Geocoding (Kundli agent)
OPENCAGE_API_KEY=XXXX

# Razorpay (Payments agent)
RAZORPAY_KEY_ID=rzp_live_XXXX
RAZORPAY_KEY_SECRET=XXXX

# Notifications
FIREBASE_PROJECT_ID=XXXX               # FCM push notifications
FIREBASE_CLIENT_EMAIL=XXXX
FIREBASE_PRIVATE_KEY=XXXX
RESEND_API_KEY=re_XXXX                 # Transactional email

# Monitoring
SENTRY_DSN=https://XXXX@sentry.io/XXXX
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXXX  # founder alerts

# Google (Growth agent)
GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=XXXX
GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=XXXX
GOOGLE_SEARCH_CONSOLE_PROPERTY=sc-domain:jyotishai.com

5.3 Third-party account checklist
Service
Setup action
Supabase
Create project, enable pgvector, enable auth providers (Google, Email)
Railway
Create project, add Redis service, add worker service
Vercel
Connect GitHub repo, add environment variables
Razorpay
Create account, complete KYC, create subscription plans for ₹99 and ₹199
OpenCage
Sign up for Geocoding API — free tier 2,500 req/day, sufficient for MVP
OpenAI
API key for text-embedding-3-small (embeddings only, not chat)
Anthropic
API key for claude-sonnet-4-6
Firebase
Create project, enable FCM, download service account JSON
Resend
Sign up for transactional email, verify domain DNS
Sentry
Create project, get DSN for error monitoring
Google Search Console
Verify domain ownership, create service account for API access

— End of document —