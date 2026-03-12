-- Run this in your Supabase SQL Editor
-- This creates the RPC function called by the frontend when a post is viewed

CREATE OR REPLACE FUNCTION public.increment_view_count(post_id UUID)
RETURNS void AS $$
  UPDATE public.posts
  SET view_count = view_count + 1
  WHERE id = post_id AND is_published = TRUE;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execution to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO authenticated;
