import { useState, useEffect, useCallback } from 'react';
import { getPosts } from '../lib/api';

export function usePosts({ authorId, search, tags, limit = 15 } = {}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    reset();
  }, [authorId, search, JSON.stringify(tags)]);

  const reset = async () => {
    setLoading(true);
    setPage(1);
    setPosts([]);
    const { data, error } = await getPosts({ page: 1, limit, authorId, search, tags });
    if (error) setError(error.message);
    else { setPosts(data || []); setHasMore((data || []).length === limit); }
    setLoading(false);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const { data, error } = await getPosts({ page: next, limit, authorId, search, tags });
    if (!error) {
      setPosts(prev => [...prev, ...(data || [])]);
      setHasMore((data || []).length === limit);
      setPage(next);
    }
    setLoadingMore(false);
  }, [page, loadingMore, hasMore, limit, authorId, search, tags]);

  return { posts, loading, loadingMore, hasMore, loadMore, error, refresh: reset };
}
