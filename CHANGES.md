# Substack Plus — v2 Changes

## New Files Created

### Pages
- `src/pages/Analytics.jsx` + `.css` — Publisher analytics dashboard (views, MRR, post performance, bar chart)
- `src/pages/Monetization.jsx` + `.css` — Monetization hub (pricing, paid subscribers, tips, revenue overview)
- `src/pages/Discovery.jsx` + `.css` — Discovery page (search, topics, featured writers, trending/new/discussed filters)
- `src/pages/Community.jsx` + `.css` — Real-time chat rooms per publication (Supabase Realtime)

### Components
- `src/components/posts/Reactions.jsx` + `.css` — 6-emoji reactions bar (❤️ 🔥 💡 🎉 😢 😮)
- `src/components/posts/Highlights.jsx` + `.css` — Select any text to highlight it; public highlights shown below post
- `src/components/monetization/TipModal.jsx` + `.css` — Tip modal with preset amounts ($3/$5/$10/$25) + custom
- `src/components/editor/RichEditor.jsx` (updated) — Inline media (+menu), bubble toolbar, text align, highlight, word count
- `src/components/editor/RichEditor.css` (updated)

### Editor page updates (Editor.jsx + Editor.css)
- Settings sidebar: audience gating (everyone/free/paid), SEO fields, auto-save toggle
- Word count + reading time in topbar
- Auto-save every 30 seconds

### Updated Files
- `src/App.jsx` — 4 new routes: /discover, /community/:username, /dashboard/analytics, /dashboard/monetization
- `src/lib/api.js` — New functions: reactions, highlights, tips, analytics, paid access check, bookmark folders, post versions, Q&A
- `package.json` — Added 4 Tiptap extensions

### SQL
- `supabase-schema-v2.sql` — Run AFTER original schema. Adds:
  - Monetization: paid_subscriptions, tips, post_purchases, referrals, sponsorships, gift_subscriptions
  - Reactions: post_reactions (6 emojis)
  - Highlights: highlights table
  - Bookmarks: bookmark_folders, updated bookmarks table
  - Analytics: post_analytics, utm_links, subscriber_events, revenue_snapshots
  - Community: chat_rooms, chat_messages
  - Q&A: questions, question_upvotes
  - Subscribers: email_sequences, email_sequence_steps
  - Versioning: post_versions
  - Discovery: topics, post_topics, featured_writers
  - Audio: audio_tracks
  - Gifting: gift_subscriptions
  - Functions: user_can_access_post(), get_publisher_mrr(), save_post_version(), record_post_view()
  - Extended: profiles (Stripe, branding, pricing), posts (audience, SEO, audio, scheduling), subscriptions (tags, notes, source)
  - Full RLS policies for all new tables
  - 10 new indexes

## Install new Tiptap packages
```
npm install @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-highlight
```

## Stripe Integration (required for payments)
1. Create Stripe account at stripe.com
2. Enable Stripe Connect for writer payouts
3. Create a Supabase Edge Function to create PaymentIntents
4. Set webhook to update tip/subscription status on payment confirmation
