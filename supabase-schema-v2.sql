-- ============================================================
-- SUBSTACK PLUS — FULL SCHEMA v2
-- Run AFTER the original supabase-schema.sql
-- Adds: Monetization, Analytics, Community, Discovery,
--        Reader Experience, Publication Branding, SEO
-- ============================================================

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

-- Profiles: branding, subscription tiers, referral, Stripe
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id        TEXT,   -- Stripe Connect for payouts
  ADD COLUMN IF NOT EXISTS publication_name         TEXT,
  ADD COLUMN IF NOT EXISTS publication_logo_url     TEXT,
  ADD COLUMN IF NOT EXISTS publication_favicon_url  TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain            TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS accent_color             TEXT DEFAULT '#1a1a2e',
  ADD COLUMN IF NOT EXISTS font_style               TEXT DEFAULT 'serif',  -- serif | sans | mono
  ADD COLUMN IF NOT EXISTS dark_mode_enabled        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paid_tier_enabled        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS monthly_price_usd        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS annual_price_usd         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS founding_price_usd       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS referral_code            TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  ADD COLUMN IF NOT EXISTS total_revenue_cents      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_links             JSONB DEFAULT '{}',    -- {twitter, instagram, youtube, ...}
  ADD COLUMN IF NOT EXISTS newsletter_header_html   TEXT,
  ADD COLUMN IF NOT EXISTS newsletter_footer_html   TEXT,
  ADD COLUMN IF NOT EXISTS welcome_email_html       TEXT,
  ADD COLUMN IF NOT EXISTS is_verified              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_admin                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspended_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason         TEXT,
  ADD COLUMN IF NOT EXISTS force_logout_at          TIMESTAMPTZ;

-- Posts: SEO, audience gating, audio, scheduling, version tracking
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audience                 TEXT DEFAULT 'everyone' CHECK (audience IN ('everyone','free','paid')),
  ADD COLUMN IF NOT EXISTS seo_title                TEXT,
  ADD COLUMN IF NOT EXISTS seo_description          TEXT,
  ADD COLUMN IF NOT EXISTS audio_url                TEXT,    -- text-to-speech or manual upload
  ADD COLUMN IF NOT EXISTS scheduled_at             TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_count               INTEGER DEFAULT 0,   -- distinct reads (not just views)
  ADD COLUMN IF NOT EXISTS scroll_depth_avg         NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count              INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS word_count               INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reading_time_mins        INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS featured                 BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS allow_comments           BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_reactions          BOOLEAN DEFAULT TRUE;

-- Comments: reaction counts cached
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS reaction_counts          JSONB DEFAULT '{}';

-- ============================================================
-- 2. MONETIZATION
-- ============================================================

-- Paid subscriptions (Stripe-powered)
CREATE TABLE IF NOT EXISTS public.paid_subscriptions (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscriber_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  publisher_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id    TEXT,
  tier                  TEXT NOT NULL CHECK (tier IN ('monthly','annual','founding')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','paused')),
  amount_cents          INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  canceled_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, publisher_id)
);

-- One-time tips
CREATE TABLE IF NOT EXISTS public.tips (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id               UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  stripe_payment_intent TEXT UNIQUE,
  amount_cents          INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  message               TEXT,
  status                TEXT DEFAULT 'succeeded' CHECK (status IN ('pending','succeeded','failed','refunded')),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Pay-per-post purchases
CREATE TABLE IF NOT EXISTS public.post_purchases (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  buyer_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id               UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent TEXT UNIQUE,
  amount_cents          INTEGER NOT NULL,
  currency              TEXT DEFAULT 'usd',
  status                TEXT DEFAULT 'succeeded',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(buyer_id, post_id)
);

-- Post price (for pay-per-post)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS price_cents     INTEGER,          -- NULL = not for individual sale
  ADD COLUMN IF NOT EXISTS price_currency  TEXT DEFAULT 'usd';

-- Referral tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  referrer_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  publisher_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reward_granted  BOOLEAN DEFAULT FALSE,
  reward_type     TEXT,   -- 'free_month' | 'credit' | 'merch'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id, publisher_id)
);

-- Sponsorship slots
CREATE TABLE IF NOT EXISTS public.sponsorships (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sponsor_name    TEXT NOT NULL,
  sponsor_logo    TEXT,
  sponsor_url     TEXT,
  sponsor_blurb   TEXT,
  slot_type       TEXT DEFAULT 'post' CHECK (slot_type IN ('post','newsletter','banner')),
  post_id         UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  amount_cents    INTEGER,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','pending','ended')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. REACTIONS (beyond simple likes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji      TEXT NOT NULL CHECK (emoji IN ('❤️','🔥','💡','🎉','😢','😮')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- ============================================================
-- 4. READER HIGHLIGHTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.highlights (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id       UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  selected_text TEXT NOT NULL,
  start_offset  INTEGER,
  end_offset    INTEGER,
  note          TEXT,
  is_public     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4b. READING HISTORY (resume shelf)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reading_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  progress numeric DEFAULT 0,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- ============================================================
-- 5. BOOKMARKS WITH FOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookmark_folders (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.bookmark_folders(id) ON DELETE SET NULL;

-- ============================================================
-- 6. ANALYTICS
-- ============================================================

-- Per-post daily stats (aggregated)
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id         UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  views           INTEGER DEFAULT 0,
  reads           INTEGER DEFAULT 0,         -- reached >70% scroll
  unique_visitors INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,         -- link clicks inside post
  shares          INTEGER DEFAULT 0,
  email_opens     INTEGER DEFAULT 0,
  email_clicks    INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  revenue_cents   INTEGER DEFAULT 0,
  UNIQUE(post_id, date)
);

-- UTM link tracker
CREATE TABLE IF NOT EXISTS public.utm_links (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id      UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  destination  TEXT NOT NULL,
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  short_code   TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  click_count  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriber-level analytics
CREATE TABLE IF NOT EXISTS public.subscriber_events (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subscriber_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email           TEXT,
  event_type      TEXT NOT NULL CHECK (event_type IN ('subscribed','unsubscribed','upgraded','downgraded','churned','referred')),
  source          TEXT,   -- 'organic' | 'referral' | 'social' | ...
  utm_source      TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Publisher daily revenue snapshot
CREATE TABLE IF NOT EXISTS public.revenue_snapshots (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  mrr_cents       INTEGER DEFAULT 0,   -- Monthly Recurring Revenue
  arr_cents       INTEGER DEFAULT 0,
  new_paid        INTEGER DEFAULT 0,
  churned_paid    INTEGER DEFAULT 0,
  tips_cents      INTEGER DEFAULT 0,
  purchases_cents INTEGER DEFAULT 0,
  UNIQUE(publisher_id, date)
);

-- ============================================================
-- 7. COMMUNITY: CHAT ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  is_paid_only BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id     UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  author_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL,
  reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_edited   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. Q&A (Reader Questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  asker_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  answer_text   TEXT,
  is_anonymous  BOOLEAN DEFAULT FALSE,
  is_published  BOOLEAN DEFAULT FALSE,
  upvote_count  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  answered_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.question_upvotes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

-- ============================================================
-- 9. SUBSCRIBER MANAGEMENT
-- ============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS tier           TEXT DEFAULT 'free' CHECK (tier IN ('free','paid')),
  ADD COLUMN IF NOT EXISTS tags           TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes          TEXT,
  ADD COLUMN IF NOT EXISTS referral_code  TEXT,
  ADD COLUMN IF NOT EXISTS source         TEXT;

-- Welcome email sequences
CREATE TABLE IF NOT EXISTS public.email_sequences (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  publisher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL,
  trigger_type TEXT DEFAULT 'subscribe' CHECK (trigger_type IN ('subscribe','upgrade','custom')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE CASCADE NOT NULL,
  step_number INTEGER NOT NULL,
  delay_days  INTEGER DEFAULT 0,
  subject     TEXT NOT NULL,
  body_html   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. VERSION HISTORY (post drafts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_versions (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id       UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  author_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title         TEXT,
  content_html  TEXT,
  version_label TEXT,
  word_count    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. DISCOVERY
-- ============================================================

-- Topic pages
CREATE TABLE IF NOT EXISTS public.topics (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT DEFAULT '#6366f1',
  post_count  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_topics (
  post_id    UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  topic_id   UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY(post_id, topic_id)
);

-- Featured writers
CREATE TABLE IF NOT EXISTS public.featured_writers (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  blurb        TEXT,
  display_order INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ============================================================
-- 12. AUDIO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audio_tracks (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id        UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  audio_url      TEXT NOT NULL,
  duration_secs  INTEGER,
  generated_by   TEXT DEFAULT 'tts' CHECK (generated_by IN ('tts','upload')),
  tts_voice      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. GIFTING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gift_subscriptions (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  gifter_id             UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_email       TEXT NOT NULL,
  recipient_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  publisher_id          UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tier                  TEXT NOT NULL CHECK (tier IN ('monthly','annual')),
  stripe_payment_intent TEXT UNIQUE,
  amount_cents          INTEGER NOT NULL,
  redemption_code       TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 12),
  redeemed_at           TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================
DROP TRIGGER IF EXISTS update_paid_subscriptions_updated_at ON public.paid_subscriptions;
CREATE TRIGGER update_paid_subscriptions_updated_at
  BEFORE UPDATE ON public.paid_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 14b. ADMIN HELPERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 14c. ADMIN OPERATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_broadcasts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL CHECK (type IN ('announcement','warning','update')),
  link TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('suspicious_login','rate_limit','ip_block','manual')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banned_ips (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ip_range TEXT NOT NULL,
  reason TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.rate_limit_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scope TEXT NOT NULL,
  max_requests INTEGER NOT NULL,
  window_seconds INTEGER NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. RLS FOR NEW TABLES
-- ============================================================
ALTER TABLE public.paid_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsorships        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_analytics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_upvotes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_topics         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_writers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_tracks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_broadcasts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_rules    ENABLE ROW LEVEL SECURITY;

-- ADMIN RLS
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;
CREATE POLICY "Admins can view all posts" ON public.posts FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;
CREATE POLICY "Admins can view all comments" ON public.comments FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view reading history" ON public.reading_history;
CREATE POLICY "Admins can view reading history" ON public.reading_history FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.admin_broadcasts;
CREATE POLICY "Admins manage broadcasts" ON public.admin_broadcasts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage security events" ON public.security_events;
CREATE POLICY "Admins manage security events" ON public.security_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage banned ips" ON public.banned_ips;
CREATE POLICY "Admins manage banned ips" ON public.banned_ips FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage rate limits" ON public.rate_limit_rules;
CREATE POLICY "Admins manage rate limits" ON public.rate_limit_rules FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PAID SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users see own paid subscriptions" ON public.paid_subscriptions;
CREATE POLICY "Users see own paid subscriptions"   ON public.paid_subscriptions FOR SELECT USING (auth.uid() = subscriber_id OR auth.uid() = publisher_id);
DROP POLICY IF EXISTS "System inserts paid subscriptions" ON public.paid_subscriptions;
CREATE POLICY "System inserts paid subscriptions"  ON public.paid_subscriptions FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "System updates paid subscriptions" ON public.paid_subscriptions;
CREATE POLICY "System updates paid subscriptions"  ON public.paid_subscriptions FOR UPDATE USING (TRUE);

-- TIPS
DROP POLICY IF EXISTS "Tips visible to sender and recipient" ON public.tips;
CREATE POLICY "Tips visible to sender and recipient" ON public.tips FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Authenticated users can tip" ON public.tips;
CREATE POLICY "Authenticated users can tip"          ON public.tips FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- POST PURCHASES
DROP POLICY IF EXISTS "Buyers see own purchases" ON public.post_purchases;
CREATE POLICY "Buyers see own purchases"    ON public.post_purchases FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "Authenticated users can buy" ON public.post_purchases;
CREATE POLICY "Authenticated users can buy" ON public.post_purchases FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- REACTIONS
DROP POLICY IF EXISTS "Reactions are public" ON public.post_reactions;
CREATE POLICY "Reactions are public"              ON public.post_reactions FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can react" ON public.post_reactions;
CREATE POLICY "Authenticated users can react"     ON public.post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.post_reactions;
CREATE POLICY "Users can remove own reactions"    ON public.post_reactions FOR DELETE USING (auth.uid() = user_id);

-- HIGHLIGHTS
DROP POLICY IF EXISTS "Public highlights are viewable" ON public.highlights;
CREATE POLICY "Public highlights are viewable"    ON public.highlights FOR SELECT USING (is_public = TRUE OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users can highlight" ON public.highlights;
CREATE POLICY "Authenticated users can highlight" ON public.highlights FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own highlights" ON public.highlights;
CREATE POLICY "Users can update own highlights"   ON public.highlights FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own highlights" ON public.highlights;
CREATE POLICY "Users can delete own highlights"   ON public.highlights FOR DELETE USING (auth.uid() = user_id);

-- READING HISTORY
DROP POLICY IF EXISTS "Users manage own reading history" ON public.reading_history;
CREATE POLICY "Users manage own reading history"  ON public.reading_history FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BOOKMARK FOLDERS
DROP POLICY IF EXISTS "Users see own bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users see own bookmark folders"    ON public.bookmark_folders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create bookmark folders" ON public.bookmark_folders;
CREATE POLICY "Users can create bookmark folders" ON public.bookmark_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own folders" ON public.bookmark_folders;
CREATE POLICY "Users can update own folders"      ON public.bookmark_folders FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own folders" ON public.bookmark_folders;
CREATE POLICY "Users can delete own folders"      ON public.bookmark_folders FOR DELETE USING (auth.uid() = user_id);

-- ANALYTICS (publisher only)
DROP POLICY IF EXISTS "Publishers see own analytics" ON public.post_analytics;
CREATE POLICY "Publishers see own analytics"   ON public.post_analytics     FOR SELECT USING (EXISTS(SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid()));
DROP POLICY IF EXISTS "System inserts analytics" ON public.post_analytics;
CREATE POLICY "System inserts analytics"       ON public.post_analytics     FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "System updates analytics" ON public.post_analytics;
CREATE POLICY "System updates analytics"       ON public.post_analytics     FOR UPDATE USING (TRUE);
DROP POLICY IF EXISTS "Publishers see revenue" ON public.revenue_snapshots;
CREATE POLICY "Publishers see revenue"         ON public.revenue_snapshots  FOR SELECT USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Publishers see subscriber events" ON public.subscriber_events;
CREATE POLICY "Publishers see subscriber events" ON public.subscriber_events FOR SELECT USING (auth.uid() = publisher_id);

-- CHAT
DROP POLICY IF EXISTS "Chat rooms are public" ON public.chat_rooms;
CREATE POLICY "Chat rooms are public"          ON public.chat_rooms    FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Publishers manage chat rooms" ON public.chat_rooms;
CREATE POLICY "Publishers manage chat rooms"   ON public.chat_rooms    FOR ALL    USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Chat messages are public" ON public.chat_messages;
CREATE POLICY "Chat messages are public"       ON public.chat_messages FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can chat" ON public.chat_messages;
CREATE POLICY "Authenticated users can chat"   ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can edit own messages" ON public.chat_messages;
CREATE POLICY "Users can edit own messages"    ON public.chat_messages FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages"  ON public.chat_messages FOR DELETE USING (auth.uid() = author_id);

-- Q&A
DROP POLICY IF EXISTS "Published questions are public" ON public.questions;
CREATE POLICY "Published questions are public"  ON public.questions       FOR SELECT USING (is_published = TRUE OR auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Authenticated users can ask" ON public.questions;
CREATE POLICY "Authenticated users can ask"     ON public.questions       FOR INSERT WITH CHECK (auth.uid() = asker_id);
DROP POLICY IF EXISTS "Publishers manage questions" ON public.questions;
CREATE POLICY "Publishers manage questions"     ON public.questions       FOR UPDATE USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Question upvotes are public" ON public.question_upvotes;
CREATE POLICY "Question upvotes are public"     ON public.question_upvotes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can upvote" ON public.question_upvotes;
CREATE POLICY "Authenticated users can upvote"  ON public.question_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can remove upvotes" ON public.question_upvotes;
CREATE POLICY "Users can remove upvotes"        ON public.question_upvotes FOR DELETE USING (auth.uid() = user_id);

-- POST VERSIONS
DROP POLICY IF EXISTS "Authors see own versions" ON public.post_versions;
CREATE POLICY "Authors see own versions"  ON public.post_versions FOR SELECT USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors insert versions" ON public.post_versions;
CREATE POLICY "Authors insert versions"   ON public.post_versions FOR INSERT WITH CHECK (auth.uid() = author_id);

-- TOPICS
DROP POLICY IF EXISTS "Topics are public" ON public.topics;
CREATE POLICY "Topics are public"         ON public.topics      FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Post topics are public" ON public.post_topics;
CREATE POLICY "Post topics are public"    ON public.post_topics FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authors manage post topics" ON public.post_topics;
CREATE POLICY "Authors manage post topics" ON public.post_topics
  FOR ALL
  USING (
    EXISTS(
      SELECT 1 FROM public.posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.posts
      WHERE id = post_id AND author_id = auth.uid()
    )
  );

-- AUDIO
DROP POLICY IF EXISTS "Audio tracks are public" ON public.audio_tracks;
CREATE POLICY "Audio tracks are public"   ON public.audio_tracks FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authors manage audio" ON public.audio_tracks;
CREATE POLICY "Authors manage audio"      ON public.audio_tracks FOR ALL USING (EXISTS(SELECT 1 FROM public.posts WHERE id = post_id AND author_id = auth.uid()));

-- GIFT SUBSCRIPTIONS
DROP POLICY IF EXISTS "Gifter sees own gifts" ON public.gift_subscriptions;
CREATE POLICY "Gifter sees own gifts"     ON public.gift_subscriptions FOR SELECT USING (auth.uid() = gifter_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Authenticated users gift" ON public.gift_subscriptions;
CREATE POLICY "Authenticated users gift"  ON public.gift_subscriptions FOR INSERT WITH CHECK (auth.uid() = gifter_id);

-- UTM LINKS
DROP POLICY IF EXISTS "Publishers see own UTM links" ON public.utm_links;
CREATE POLICY "Publishers see own UTM links"   ON public.utm_links FOR SELECT USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Publishers create UTM links" ON public.utm_links;
CREATE POLICY "Publishers create UTM links"    ON public.utm_links FOR INSERT WITH CHECK (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "System updates UTM click count" ON public.utm_links;
CREATE POLICY "System updates UTM click count" ON public.utm_links FOR UPDATE USING (TRUE);

-- EMAIL SEQUENCES
DROP POLICY IF EXISTS "Publishers see own sequences" ON public.email_sequences;
CREATE POLICY "Publishers see own sequences"   ON public.email_sequences      FOR SELECT USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Publishers manage sequences" ON public.email_sequences;
CREATE POLICY "Publishers manage sequences"    ON public.email_sequences      FOR ALL USING (auth.uid() = publisher_id);
DROP POLICY IF EXISTS "Publishers see own seq steps" ON public.email_sequence_steps;
CREATE POLICY "Publishers see own seq steps"   ON public.email_sequence_steps FOR SELECT USING (EXISTS(SELECT 1 FROM public.email_sequences WHERE id = sequence_id AND publisher_id = auth.uid()));
DROP POLICY IF EXISTS "Publishers manage seq steps" ON public.email_sequence_steps;
CREATE POLICY "Publishers manage seq steps"    ON public.email_sequence_steps FOR ALL USING (EXISTS(SELECT 1 FROM public.email_sequences WHERE id = sequence_id AND publisher_id = auth.uid()));

-- SPONSORSHIPS
DROP POLICY IF EXISTS "Sponsorships publicly visible" ON public.sponsorships;
CREATE POLICY "Sponsorships publicly visible"  ON public.sponsorships FOR SELECT USING (status = 'active');
DROP POLICY IF EXISTS "Publishers manage sponsorships" ON public.sponsorships;
CREATE POLICY "Publishers manage sponsorships" ON public.sponsorships FOR ALL USING (auth.uid() = publisher_id);

-- ============================================================
-- 16. STORAGE BUCKETS (new)
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true)                  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('publication-logos', 'publication-logos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('sponsor-logos', 'sponsor-logos', true)   ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Audio publicly accessible" ON storage.objects;
CREATE POLICY "Audio publicly accessible"        ON storage.objects FOR SELECT USING (bucket_id = 'audio');
DROP POLICY IF EXISTS "Authors can upload audio" ON storage.objects;
CREATE POLICY "Authors can upload audio"         ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Logos publicly accessible" ON storage.objects;
CREATE POLICY "Logos publicly accessible"        ON storage.objects FOR SELECT USING (bucket_id = 'publication-logos');
DROP POLICY IF EXISTS "Users upload own publication logo" ON storage.objects;
CREATE POLICY "Users upload own publication logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'publication-logos' AND auth.role() = 'authenticated');

-- ============================================================
-- 17. FUNCTIONS & HELPERS
-- ============================================================

-- Check if user has access to a paywalled post
CREATE OR REPLACE FUNCTION public.user_can_access_post(p_user_id UUID, p_post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_audience   TEXT;
  v_author_id  UUID;
  v_has_paid   BOOLEAN;
BEGIN
  SELECT audience, author_id INTO v_audience, v_author_id
    FROM public.posts WHERE id = p_post_id;
  IF v_author_id = p_user_id THEN RETURN TRUE; END IF;
  IF v_audience = 'everyone' THEN RETURN TRUE; END IF;
  IF v_audience = 'free' THEN
    RETURN EXISTS(SELECT 1 FROM public.subscriptions WHERE subscriber_id = p_user_id AND publisher_id = v_author_id);
  END IF;
  IF v_audience = 'paid' THEN
    RETURN EXISTS(SELECT 1 FROM public.paid_subscriptions WHERE subscriber_id = p_user_id AND publisher_id = v_author_id AND status = 'active')
        OR EXISTS(SELECT 1 FROM public.post_purchases WHERE buyer_id = p_user_id AND post_id = p_post_id);
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get publisher MRR
CREATE OR REPLACE FUNCTION public.get_publisher_mrr(p_publisher_id UUID)
RETURNS INTEGER AS $$
DECLARE v_mrr INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN tier = 'annual'  THEN amount_cents / 12
      WHEN tier = 'founding' THEN amount_cents
      ELSE amount_cents
    END
  ), 0) INTO v_mrr
  FROM public.paid_subscriptions
  WHERE publisher_id = p_publisher_id AND status = 'active';
  RETURN v_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save a post version snapshot
CREATE OR REPLACE FUNCTION public.save_post_version(p_post_id UUID, p_label TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE v_post public.posts;
BEGIN
  SELECT * INTO v_post FROM public.posts WHERE id = p_post_id;
  INSERT INTO public.post_versions (post_id, author_id, title, content_html, version_label, word_count)
  VALUES (v_post.id, v_post.author_id, v_post.title, v_post.content_html, p_label, v_post.word_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment post analytics safely (upsert)
CREATE OR REPLACE FUNCTION public.record_post_view(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.post_analytics (post_id, date, views, unique_visitors)
    VALUES (p_post_id, CURRENT_DATE, 1, 1)
  ON CONFLICT (post_id, date)
    DO UPDATE SET views = post_analytics.views + 1;
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 18. UPDATED POSTS_WITH_STATS VIEW
-- ============================================================
DROP VIEW IF EXISTS public.posts_with_stats CASCADE;
CREATE OR REPLACE VIEW public.posts_with_stats AS
SELECT
  p.*,
  pr.username             AS author_username,
  pr.full_name            AS author_full_name,
  pr.avatar_url           AS author_avatar_url,
  pr.publication_name     AS publication_name,
  pr.accent_color         AS author_accent_color,
  pr.paid_tier_enabled    AS author_paid_tier,
  pr.is_verified          AS author_is_verified,
  COUNT(DISTINCT pl.id)   AS like_count,
  COUNT(DISTINCT c.id)    AS comment_count,
  COUNT(DISTINCT b.id)    AS bookmark_count,
  COUNT(DISTINCT pr2.id)  AS reaction_count,
  COUNT(DISTINCT h.id)    AS highlight_count,
  COALESCE((SELECT SUM(amount_cents) FROM public.tips WHERE post_id = p.id AND status = 'succeeded'), 0) AS tips_total_cents
FROM public.posts p
JOIN public.profiles pr ON p.author_id = pr.id
LEFT JOIN public.post_likes pl    ON p.id = pl.post_id
LEFT JOIN public.comments c       ON p.id = c.post_id
LEFT JOIN public.bookmarks b      ON p.id = b.post_id
LEFT JOIN public.post_reactions pr2 ON p.id = pr2.post_id
LEFT JOIN public.highlights h     ON p.id = h.post_id AND h.is_public = TRUE
GROUP BY p.id, pr.username, pr.full_name, pr.avatar_url,
         pr.publication_name, pr.accent_color, pr.paid_tier_enabled, pr.is_verified;

-- ============================================================
-- 19. NOTIFICATIONS: add new types
-- ============================================================
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'new_post', 'new_comment', 'new_follower', 'post_like', 'comment_reply', 'post_mention',
    'new_reaction', 'new_highlight', 'new_tip', 'new_paid_subscriber',
    'new_question', 'milestone', 'new_chat_message',
    'admin_broadcast', 'admin_warning', 'admin_update'
  ));

-- ============================================================
-- 20. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS paid_subs_publisher_idx  ON public.paid_subscriptions(publisher_id, status);
CREATE INDEX IF NOT EXISTS paid_subs_subscriber_idx ON public.paid_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS tips_recipient_idx        ON public.tips(recipient_id);
CREATE INDEX IF NOT EXISTS reactions_post_idx        ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS highlights_post_idx       ON public.highlights(post_id, is_public);
CREATE INDEX IF NOT EXISTS reading_history_user_last_idx ON public.reading_history(user_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS analytics_post_date_idx   ON public.post_analytics(post_id, date DESC);
CREATE INDEX IF NOT EXISTS chat_room_idx             ON public.chat_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS questions_publisher_idx   ON public.questions(publisher_id, is_published);
CREATE INDEX IF NOT EXISTS versions_post_idx         ON public.post_versions(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_topics_topic_idx     ON public.post_topics(topic_id);

-- ============================================================
-- DONE — Run this after supabase-schema.sql
-- ============================================================
