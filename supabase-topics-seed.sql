-- Seed topics and post_topics
-- Run after topics table exists.

INSERT INTO public.topics (slug, name, description, color)
VALUES
  ('writing', 'Writing', 'Craft, voice, and the writing life.', '#4f46e5'),
  ('technology', 'Technology', 'Product, engineering, and the future of software.', '#0ea5e9'),
  ('design', 'Design', 'Taste, systems, and visual thinking.', '#f97316'),
  ('business', 'Business', 'Strategy, growth, and founder lessons.', '#22c55e'),
  ('culture', 'Culture', 'Ideas, media, and modern life.', '#a855f7'),
  ('productivity', 'Productivity', 'Habits, workflows, and better focus.', '#14b8a6')
ON CONFLICT (slug) DO NOTHING;

-- Link posts to topics by tags (simple starter mapping)
INSERT INTO public.post_topics (post_id, topic_id)
SELECT p.id, t.id
FROM public.posts p
JOIN public.topics t ON t.slug = ANY(p.tags)
WHERE p.tags IS NOT NULL
ON CONFLICT DO NOTHING;
