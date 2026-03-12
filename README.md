# Prose — Substack Clone

A full-featured publishing platform built with React + Supabase.  
Navy blue / white, Apple-style minimalist design.

---

## Features

- ✅ User registration, login, email verification, password reset
- ✅ Rich text editor (bold, italic, underline, headings, lists, links, blockquotes)
- ✅ Post cover images and PDF attachments (up to 50MB)
- ✅ Draft / publish workflow
- ✅ Public profile pages with follow / unfollow
- ✅ Subscribe to writers (newsletter system)
- ✅ Real-time comments with replies
- ✅ Like and bookmark posts
- ✅ Following feed (posts from followed writers)
- ✅ Full-text search (posts + authors)
- ✅ Dashboard with post stats (views, likes, comments)
- ✅ Fully responsive, mobile-ready

---

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon public key** from: Settings → API

### 2. Run the Database Schema

1. In your Supabase project, open the **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the entire file — this creates all tables, policies, indexes, and storage buckets

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install and Run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── components/
│   ├── editor/
│   │   └── RichEditor.jsx       # Tiptap WYSIWYG editor
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   └── posts/
│       ├── PostCard.jsx         # Feed post card
│       └── Comments.jsx         # Real-time comments section
├── hooks/
│   └── useAuth.jsx              # Auth context + hook
├── lib/
│   ├── supabase.js              # Supabase client init
│   └── api.js                   # All DB query functions
├── pages/
│   ├── Home.jsx                 # Discover / explore feed
│   ├── Auth.jsx                 # Sign in + Sign up
│   ├── Editor.jsx               # Post editor (create/edit)
│   ├── PostView.jsx             # Single post reader view
│   ├── Dashboard.jsx            # Writer dashboard
│   ├── Profile.jsx              # Public profile page
│   ├── Search.jsx               # Search posts + authors
│   ├── Settings.jsx             # Account & profile settings
│   └── FeedAndBookmarks.jsx     # Following feed + bookmarks
├── styles/
│   └── global.css               # Design system variables + utilities
└── App.jsx                      # Router + layout
```

---

## Database Schema Overview

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends Supabase auth) |
| `posts` | Articles with title, content HTML, cover image, PDF |
| `comments` | Nested comments (supports replies via parent_id) |
| `post_likes` | Many-to-many: users ↔ posts |
| `follows` | Many-to-many: users following users |
| `subscriptions` | Newsletter subscriptions (user-to-user) |
| `notifications` | In-app notifications |
| `bookmarks` | Saved posts per user |

**Storage Buckets:**
- `avatars` — profile photos
- `post-images` — post cover images
- `post-pdfs` — attached PDFs

---

## Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel
```

Set environment variables in the Vercel dashboard under Project → Settings → Environment Variables.

### Netlify

```bash
npm run build
# Upload the /build folder or connect your git repo
```

Set the same env variables in Netlify's dashboard.

---

## Key Supabase Configuration

### Email Verification
- Go to Authentication → Email Templates to customize verification emails
- Under Authentication → Settings, ensure "Confirm email" is enabled

### Storage
- All buckets are set to public in the schema
- Files are organized: `avatars/{user_id}/avatar.ext`, `post-images/{filename}`, `post-pdfs/{filename}`

### Realtime
- Comments use Supabase Realtime (postgres_changes)
- Make sure Realtime is enabled for the `comments` table in your Supabase project: Database → Replication → Tables

---

## Extending the Platform

**Add email notifications** — Use Supabase Edge Functions + Resend/SendGrid triggered by database webhooks on new posts/comments.

**Add a paywall** — Use Stripe + Supabase Edge Functions. The `is_paywalled` column is already in the posts table.

**Add image uploads in editor** — Extend RichEditor.jsx to handle file drops and upload to Supabase Storage.

**Add analytics** — Track `view_count` incrementing (stub RPC `increment_view_count` is called in `getPost`). Create the RPC in Supabase:
```sql
CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS void AS $$
  UPDATE posts SET view_count = view_count + 1 WHERE id = post_id;
$$ LANGUAGE sql SECURITY DEFINER;
```
