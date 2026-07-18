-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  language      TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','hi','hinglish')),
  life_context  TEXT CHECK (life_context IN ('career','relationship','health','wealth','spiritual','general')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Birth Details Table
CREATE TABLE IF NOT EXISTS public.birth_details (
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
  UNIQUE(user_id)
);

ALTER TABLE public.birth_details ENABLE ROW LEVEL SECURITY;

-- 3. Charts Table
CREATE TABLE IF NOT EXISTS public.charts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_id      UUID NOT NULL REFERENCES public.birth_details(id),
  ayanamsa      TEXT NOT NULL,
  lagna_sign    TEXT NOT NULL,
  lagna_degree  NUMERIC(6,3) NOT NULL,
  rashi         TEXT NOT NULL,               -- Moon sign
  nakshatra     TEXT NOT NULL,
  nakshatra_pada INT NOT NULL CHECK (nakshatra_pada BETWEEN 1 AND 4),
  raw_json      JSONB NOT NULL,              -- full chart payload
  version       INT NOT NULL DEFAULT 1,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.charts ENABLE ROW LEVEL SECURITY;

-- 4. Planetary Positions Table
CREATE TABLE IF NOT EXISTS public.chart_planets (
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

ALTER TABLE public.chart_planets ENABLE ROW LEVEL SECURITY;

-- 5. Dasha Timeline Table
CREATE TABLE IF NOT EXISTS public.dashas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id      UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  level         TEXT NOT NULL CHECK (level IN ('maha','antar','pratyantar')),
  planet        TEXT NOT NULL,
  starts_at     DATE NOT NULL,
  ends_at       DATE NOT NULL,
  parent_id     UUID REFERENCES public.dashas(id)
);

ALTER TABLE public.dashas ENABLE ROW LEVEL SECURITY;

-- 6. Detected Yogas Table
CREATE TABLE IF NOT EXISTS public.yogas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id      UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  planets       TEXT[] NOT NULL,
  houses        INT[] NOT NULL,
  strength      TEXT CHECK (strength IN ('strong','moderate','weak'))
);

ALTER TABLE public.yogas ENABLE ROW LEVEL SECURITY;

-- 7. Readings Table
CREATE TABLE IF NOT EXISTS public.readings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chart_id        UUID NOT NULL REFERENCES public.charts(id),
  query_type      TEXT NOT NULL CHECK (query_type IN ('daily','domain','ask','dasha_alert','transit_alert')),
  domain          TEXT CHECK (domain IN ('career','relationship','health','wealth','spiritual')),
  prompt_snapshot TEXT NOT NULL,
  rag_chunk_ids   UUID[],
  rag_chunk_count INT,
  output          TEXT NOT NULL,
  output_language TEXT NOT NULL DEFAULT 'en',
  word_count      INT,
  confidence      TEXT CHECK (confidence IN ('high','medium','low')),
  user_rating     INT CHECK (user_rating BETWEEN 1 AND 5),
  flagged         BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason     TEXT,
  cache_key       TEXT UNIQUE,
  cached_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_readings_user_date ON public.readings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_cache ON public.readings(cache_key) WHERE cache_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_readings_flagged ON public.readings(flagged) WHERE flagged = TRUE;

-- 8. Corpus Rules Table (for pgvector RAG)
CREATE TABLE IF NOT EXISTS public.corpus_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet        TEXT,
  sign          TEXT,
  house         INT CHECK (house BETWEEN 1 AND 12),
  aspect_from   TEXT,
  domain        TEXT[] NOT NULL,
  effect        TEXT NOT NULL,
  source_text   TEXT NOT NULL,
  is_positive   BOOLEAN,
  strength      TEXT CHECK (strength IN ('definitive','moderate','conditional')),
  embedding     vector(384),
  corpus_version INT NOT NULL DEFAULT 1,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.corpus_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_corpus_embedding ON public.corpus_rules
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_corpus_domain ON public.corpus_rules USING GIN(domain);
CREATE INDEX IF NOT EXISTS idx_corpus_planet_house ON public.corpus_rules(planet, house);

-- 9. Corpus Gaps Table
CREATE TABLE IF NOT EXISTS public.corpus_gaps (
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

ALTER TABLE public.corpus_gaps ENABLE ROW LEVEL SECURITY;

-- 10. Corpus Versions Table
CREATE TABLE IF NOT EXISTS public.corpus_versions (
  version       INT PRIMARY KEY,
  rules_added   INT NOT NULL DEFAULT 0,
  rules_updated INT NOT NULL DEFAULT 0,
  changelog     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.corpus_versions ENABLE ROW LEVEL SECURITY;

-- 11. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  tier              TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','basic','pro')),
  razorpay_sub_id   TEXT UNIQUE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','cancelled','expired')),
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at           TIMESTAMPTZ,
  auto_renew        BOOLEAN NOT NULL DEFAULT TRUE,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 12. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id),
  razorpay_payment_id TEXT UNIQUE NOT NULL,
  amount_paise      INT NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'INR',
  status            TEXT NOT NULL CHECK (status IN ('captured','failed','refunded')),
  payment_type      TEXT NOT NULL CHECK (payment_type IN ('subscription','one_time')),
  product_id        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 13. Dunning Log Table
CREATE TABLE IF NOT EXISTS public.dunning_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  attempt_number  INT NOT NULL CHECK (attempt_number BETWEEN 1 AND 3),
  channel         TEXT NOT NULL CHECK (channel IN ('email','push')),
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome         TEXT CHECK (outcome IN ('paid','ignored','bounced'))
);

ALTER TABLE public.dunning_log ENABLE ROW LEVEL SECURITY;

-- 14. Content Drafts Table (SEO content pipeline)
CREATE TABLE IF NOT EXISTS public.content_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  keyword       TEXT NOT NULL,
  search_volume INT,
  content_type  TEXT NOT NULL CHECK (content_type IN ('article','landing_page','faq')),
  body_md       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','approved','published','rejected')),
  reviewed_by   UUID REFERENCES public.profiles(id),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;

-- 15. Keyword Rankings Table
CREATE TABLE IF NOT EXISTS public.keyword_rankings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword       TEXT NOT NULL,
  position      INT,
  page_url      TEXT,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_kwrank_keyword ON public.keyword_rankings(keyword, checked_at DESC);

-- 16. Notification Log Table
CREATE TABLE IF NOT EXISTS public.notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  channel       TEXT NOT NULL CHECK (channel IN ('push','email','in_app')),
  event_type    TEXT NOT NULL,
  subject       TEXT,
  body_preview  TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- 17. User Engagement Table
CREATE TABLE IF NOT EXISTS public.user_engagement (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id),
  last_active   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_count INT NOT NULL DEFAULT 0,
  readings_viewed INT NOT NULL DEFAULT 0,
  ask_count_month INT NOT NULL DEFAULT 0,
  churn_score   NUMERIC(4,3),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_user ON public.user_engagement(user_id);
