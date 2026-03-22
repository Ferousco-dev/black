import { supabase } from "./supabase";

// ============================================================
// AUTH
// ============================================================
export const signUp = async ({ email, password, username, fullName }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { data, error };
};

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return { data, error };
};

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

export const getSession = async () => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  return { session, error };
};

// ============================================================
// PROFILES
// ============================================================
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
};

export const getProfileByUsername = async (username) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();
  return { data, error };
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
};

export const uploadAvatar = async (userId, file) => {
  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });
  if (uploadError) return { data: null, error: uploadError };
  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
  return { data: data.publicUrl, error: null };
};

// ============================================================
// POSTS
// ============================================================
export const createPost = async (postData) => {
  const payload = {
    ...postData,
    seo_title: postData.seo_title || postData.title,
  };
  const { data, error } = await supabase
    .from("posts")
    .insert(payload)
    .select()
    .single();
  return { data, error };
};

export const updatePost = async (postId, updates) => {
  const payload = {
    ...updates,
    seo_title: updates.seo_title || updates.title,
  };
  const { data, error } = await supabase
    .from("posts")
    .update(payload)
    .eq("id", postId)
    .select()
    .single();
  return { data, error };
};

export const deletePost = async (postId) => {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return { error };
};

export const getPost = async (slug) => {
  const { data, error } = await supabase
    .from("posts_with_stats")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (data) {
    supabase
      .rpc("increment_view_count", { post_id: data.id })
      .then(() => {})
      .catch(() => {});
  }
  return { data, error };
};

export const getPosts = async ({
  page = 1,
  limit = 20,
  authorId,
  search,
  tags,
} = {}) => {
  let query = supabase
    .from("posts_with_stats")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (authorId) query = query.eq("author_id", authorId);
  if (search)
    query = query.textSearch("search_vector", search, { type: "websearch" });
  if (tags && tags.length > 0) query = query.overlaps("tags", tags);

  const { data, error, count } = await query;
  return { data, error, count };
};

// ============================================================
// TOPICS & DISCOVERY
// ============================================================
export const getTopics = async (limit = 30) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('post_count', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getTopicBySlug = async (slug) => {
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('slug', slug)
    .single();
  return { data, error };
};

export const getPostTopics = async (postId) => {
  const { data, error } = await supabase
    .from('post_topics')
    .select('topic:topics(*)')
    .eq('post_id', postId);
  return { data, error };
};

export const getPostsByTopic = async (topicId, limit = 12) => {
  const { data, error } = await supabase
    .from('post_topics')
    .select('post:posts_with_stats(*)')
    .eq('topic_id', topicId)
    .order('published_at', { foreignTable: 'post', ascending: false })
    .limit(limit);
  return { data, error };
};

export const getPostsByTags = async (tags = [], excludePostId = null, limit = 6) => {
  if (!tags.length) return { data: [], error: null };
  let query = supabase
    .from('posts_with_stats')
    .select('*')
    .eq('is_published', true)
    .overlaps('tags', tags)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (excludePostId) query = query.neq('id', excludePostId);
  const { data, error } = await query;
  return { data, error };
};

export const getForYouFeed = async (userId, page = 1, limit = 15) => {
  const fetchLimit = page * limit + 10;

  const { data: followedUsers } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  const followedIds = followedUsers?.map((f) => f.following_id) || [];

  const { data: history } = await supabase
    .from("reading_history")
    .select("post:posts_with_stats(tags)")
    .eq("user_id", userId)
    .order("last_read_at", { ascending: false })
    .limit(20);
  const tagSet = new Set();
  (history || []).forEach((item) => {
    const tags = item.post?.tags || [];
    tags.forEach((tag) => tagSet.add(tag));
  });
  const tags = Array.from(tagSet);

  const followedPostsQuery = followedIds.length
    ? supabase
        .from("posts_with_stats")
        .select("*")
        .eq("is_published", true)
        .in("author_id", followedIds)
        .order("published_at", { ascending: false })
        .limit(fetchLimit)
    : null;

  const tagPostsQuery = tags.length
    ? supabase
        .from("posts_with_stats")
        .select("*")
        .eq("is_published", true)
        .overlaps("tags", tags)
        .order("published_at", { ascending: false })
        .limit(fetchLimit)
    : null;

  const recentPostsQuery = supabase
    .from("posts_with_stats")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(fetchLimit);

  const [followedPostsRes, tagPostsRes, recentPostsRes] = await Promise.all([
    followedPostsQuery,
    tagPostsQuery,
    recentPostsQuery,
  ]);

  const merged = new Map();
  (followedPostsRes?.data || []).forEach((post) => merged.set(post.id, post));
  (tagPostsRes?.data || []).forEach((post) => merged.set(post.id, post));
  (recentPostsRes?.data || []).forEach((post) => merged.set(post.id, post));

  const items = Array.from(merged.values()).sort((a, b) => {
    const aDate = new Date(a.published_at || a.created_at).getTime();
    const bDate = new Date(b.published_at || b.created_at).getTime();
    return bDate - aDate;
  });

  const start = (page - 1) * limit;
  const end = start + limit;
  return { data: items.slice(start, end), error: null };
};

// ============================================================
// ADMIN
// ============================================================
const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const getAdminStats = async () => {
  const [usersRes, postsRes, commentsRes, activeRes] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("posts").select("*", { count: "exact", head: true }),
    supabase.from("comments").select("*", { count: "exact", head: true }),
    supabase
      .from("reading_history")
      .select("user_id, last_read_at")
      .gte("last_read_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const activeUserSet = new Set((activeRes.data || []).map((row) => row.user_id));
  return {
    data: {
      totalUsers: usersRes.count || 0,
      totalPosts: postsRes.count || 0,
      totalComments: commentsRes.count || 0,
      activeUsers: activeUserSet.size,
    },
    error: usersRes.error || postsRes.error || commentsRes.error || activeRes.error,
  };
};

const fetchAllRows = async ({ table, select, pageSize = 1000, orderBy = null }) => {
  let offset = 0;
  let all = [];
  while (true) {
    let query = supabase.from(table).select(select).range(offset, offset + pageSize - 1);
    if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
    const { data, error } = await query;
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
};

export const getAdminMetrics = async () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const dauSince = new Date(now - oneDay).toISOString();
  const mauSince = new Date(now - 30 * oneDay).toISOString();
  const retentionSince = new Date(now - 7 * oneDay).toISOString();
  const eligibleSince = new Date(now - 7 * oneDay).toISOString();
  const seriesSince = new Date(now - 13 * oneDay).toISOString();

  const [dauRes, mauRes, activeRes, eligibleRes, postsRes, commentsRes, topicsRes] =
    await Promise.all([
      supabase.from("reading_history").select("user_id, last_read_at").gte("last_read_at", dauSince),
      supabase.from("reading_history").select("user_id, last_read_at").gte("last_read_at", mauSince),
      supabase.from("reading_history").select("user_id, last_read_at").gte("last_read_at", retentionSince),
      supabase.from("profiles").select("id", { count: "exact", head: true }).lte("created_at", eligibleSince),
      supabase.from("posts").select("created_at").gte("created_at", seriesSince),
      supabase.from("comments").select("created_at").gte("created_at", seriesSince),
      supabase.from("post_topics").select("topic_id, topic:topics(name, slug, color)"),
    ]);

  const dauUsers = new Set((dauRes.data || []).map((row) => row.user_id));
  const mauUsers = new Set((mauRes.data || []).map((row) => row.user_id));
  const retentionUsers = new Set((activeRes.data || []).map((row) => row.user_id));
  const eligibleUsers = eligibleRes.count || 0;
  const retentionRate = eligibleUsers > 0 ? Math.round((retentionUsers.size / eligibleUsers) * 100) : 0;

  const buildSeries = (rows) => {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(now - (13 - index) * oneDay);
      return date.toISOString().slice(0, 10);
    });
    const counts = new Map(days.map((day) => [day, 0]));
    (rows || []).forEach((row) => {
      const day = new Date(row.created_at).toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    return days.map((day) => ({ day, count: counts.get(day) || 0 }));
  };

  const postSeries = buildSeries(postsRes.data);
  const commentSeries = buildSeries(commentsRes.data);

  const topicCounts = new Map();
  (topicsRes.data || []).forEach((row) => {
    if (!row.topic) return;
    const key = row.topic_id;
    const current = topicCounts.get(key) || { ...row.topic, count: 0 };
    current.count += 1;
    topicCounts.set(key, current);
  });

  const topTopics = Array.from(topicCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    data: {
      dau: dauUsers.size,
      mau: mauUsers.size,
      retentionRate,
      postSeries,
      commentSeries,
      topTopics,
    },
    error:
      dauRes.error ||
      mauRes.error ||
      activeRes.error ||
      eligibleRes.error ||
      postsRes.error ||
      commentsRes.error ||
      topicsRes.error,
  };
};

export const getAdminUsers = async ({ limit = 50, query = "", status = "all", role = "all" } = {}) => {
  let request = supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, created_at, is_admin, is_verified, is_suspended, suspended_at, force_logout_at"
    )
    .order("created_at", { ascending: false });

  if (query) {
    request = request.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
  }
  if (status === "active") request = request.eq("is_suspended", false);
  if (status === "suspended") request = request.eq("is_suspended", true);
  if (role === "admin") request = request.eq("is_admin", true);
  if (role === "user") request = request.eq("is_admin", false);

  const { data, error } = await request.limit(limit);
  return { data, error };
};

export const getAdminUsersExport = async () =>
  fetchAllRows({
    table: "profiles",
    select:
      "id, username, full_name, created_at, is_admin, is_verified, is_suspended, suspended_at, suspended_reason",
    orderBy: { column: "created_at", ascending: false },
  });

export const setUserVerified = async ({ userId, isVerified }) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_verified: isVerified })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
};

export const getAdminPosts = async (limit = 50) => {
  const { data, error } = await supabase
    .from("posts_with_stats")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getAdminPostsExport = async () =>
  fetchAllRows({
    table: "posts_with_stats",
    select: "id, title, slug, author_username, is_published, created_at, published_at, like_count, comment_count",
    orderBy: { column: "created_at", ascending: false },
  });

export const getAdminComments = async (limit = 50) => {
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, author:profiles(username, full_name), post:posts(title, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const getAdminCommentsExport = async () =>
  fetchAllRows({
    table: "comments",
    select: "id, content, created_at, author:profiles(username), post:posts(title, slug)",
    orderBy: { column: "created_at", ascending: false },
  });

export const setUserSuspended = async ({ userId, isSuspended, reason = null }) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_suspended: isSuspended,
      suspended_at: isSuspended ? new Date().toISOString() : null,
      suspended_reason: isSuspended ? reason : null,
    })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
};

export const setUserRole = async ({ userId, isAdmin }) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
};

export const forceUserLogout = async ({ userId }) => {
  const { data, error } = await supabase
    .from("profiles")
    .update({ force_logout_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  return { data, error };
};

export const getAdminUserHistory = async (userId) => {
  const [postsRes, commentsRes, readingRes] = await Promise.all([
    supabase
      .from("posts")
      .select("id, title, slug, created_at, is_published")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("comments")
      .select("id, content, created_at, post:posts(title, slug)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("reading_history")
      .select("id, progress, last_read_at, post:posts(title, slug)")
      .eq("user_id", userId)
      .order("last_read_at", { ascending: false })
      .limit(5),
  ]);

  return {
    data: {
      posts: postsRes.data || [],
      comments: commentsRes.data || [],
      reading: readingRes.data || [],
    },
    error: postsRes.error || commentsRes.error || readingRes.error,
  };
};

const fetchAllProfileIds = async () => {
  const pageSize = 1000;
  let offset = 0;
  let all = [];
  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    all = all.concat(data || []);
    if (!data || data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
};

export const getAdminBroadcasts = async (limit = 20) => {
  const { data, error } = await supabase
    .from("admin_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const createAdminBroadcast = async ({ title, body, type, link }) => {
  const { data: broadcast, error } = await supabase
    .from("admin_broadcasts")
    .insert({ title, body, type, link })
    .select()
    .single();
  if (error) return { data: null, error };

  const { data: profiles, error: profilesError } = await fetchAllProfileIds();
  if (profilesError) return { data: broadcast, error: profilesError };

  const notificationType =
    type === "warning" ? "admin_warning" : type === "update" ? "admin_update" : "admin_broadcast";
  const payload = (profiles || []).map((profile) => ({
    user_id: profile.id,
    type: notificationType,
    title,
    body,
    link,
  }));

  const chunks = chunkArray(payload, 500);
  for (const chunk of chunks) {
    const { error: insertError } = await supabase.from("notifications").insert(chunk);
    if (insertError) return { data: broadcast, error: insertError };
  }

  await supabase
    .from("admin_broadcasts")
    .update({ sent_count: payload.length })
    .eq("id", broadcast.id);

  return { data: broadcast, error: null };
};

export const getSecurityEvents = async (limit = 50) => {
  const { data, error } = await supabase
    .from("security_events")
    .select("*, user:profiles(username, full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const createSecurityEvent = async (payload) => {
  const { data, error } = await supabase
    .from("security_events")
    .insert(payload)
    .select()
    .single();
  return { data, error };
};

export const getBannedIps = async (limit = 50) => {
  const { data, error } = await supabase
    .from("banned_ips")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const createBannedIp = async ({ ipRange, reason }) => {
  const { data, error } = await supabase
    .from("banned_ips")
    .insert({ ip_range: ipRange, reason })
    .select()
    .single();
  return { data, error };
};

export const updateBannedIp = async ({ id, active }) => {
  const updates = active ? { active: true, revoked_at: null } : { active: false, revoked_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from("banned_ips")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
};

export const getRateLimitRules = async (limit = 50) => {
  const { data, error } = await supabase
    .from("rate_limit_rules")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const createRateLimitRule = async ({ scope, maxRequests, windowSeconds }) => {
  const { data, error } = await supabase
    .from("rate_limit_rules")
    .insert({
      scope,
      max_requests: maxRequests,
      window_seconds: windowSeconds,
    })
    .select()
    .single();
  return { data, error };
};

export const updateRateLimitRule = async ({ id, active }) => {
  const { data, error } = await supabase
    .from("rate_limit_rules")
    .update({ active })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
};

export const getUserDraftPosts = async (userId) => {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", userId)
    .eq("is_published", false)
    .order("updated_at", { ascending: false });
  return { data, error };
};

export const getUserPublishedPosts = async (userId) => {
  const { data, error } = await supabase
    .from("posts_with_stats")
    .select("*")
    .eq("author_id", userId)
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return { data, error };
};

export const uploadPostImage = async (file) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;
  const { error } = await supabase.storage
    .from("post-images")
    .upload(fileName, file);
  if (error) return { data: null, error };
  const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
  return { data: data.publicUrl, error: null };
};

export const uploadPostPDF = async (file) => {
  const fileName = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("post-pdfs")
    .upload(fileName, file, { contentType: "application/pdf" });
  if (error) return { data: null, error };
  const { data } = supabase.storage.from("post-pdfs").getPublicUrl(fileName);
  return { data: data.publicUrl, error: null };
};

export const publishPost = async (postId) => {
  const { data, error } = await supabase
    .from("posts")
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();
  return { data, error };
};

export const unpublishPost = async (postId) => {
  const { data, error } = await supabase
    .from("posts")
    .update({ is_published: false })
    .eq("id", postId)
    .select()
    .single();
  return { data, error };
};

// ============================================================
// COMMENTS
// ============================================================
export const getComments = async (postId) => {
  const { data, error } = await supabase
    .from("comments")
    .select(
      `*, author:profiles(id, username, full_name, avatar_url), likes:comment_likes(count)`
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return { data, error };
};

export const createComment = async ({
  postId,
  authorId,
  content,
  parentId = null,
}) => {
  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      author_id: authorId,
      content,
      parent_id: parentId,
    })
    .select(`*, author:profiles(id, username, full_name, avatar_url)`)
    .single();
  if (!error && data) {
    await maybeNotifyOnComment({
      postId,
      comment: data,
      parentId,
      authorId,
    });
  }
  return { data, error };
};

export const updateComment = async (commentId, content) => {
  const { data, error } = await supabase
    .from("comments")
    .update({ content, is_edited: true })
    .eq("id", commentId)
    .select()
    .single();
  return { data, error };
};

// ============================================================
// READING HISTORY
// ============================================================
export const upsertReadingHistory = async ({ userId, postId, progress = 0 }) => {
  const { data, error } = await supabase
    .from('reading_history')
    .upsert(
      { user_id: userId, post_id: postId, progress, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,post_id' }
    )
    .select()
    .single();
  return { data, error };
};

export const getResumeReading = async (userId, limit = 5) => {
  const { data, error } = await supabase
    .from('reading_history')
    .select('progress, last_read_at, post:posts_with_stats(*)')
    .eq('user_id', userId)
    .order('last_read_at', { ascending: false })
    .limit(limit);
  return { data, error };
};

export const deleteComment = async (commentId) => {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);
  return { error };
};

// ============================================================
// LIKES
// ============================================================
export const likePost = async (postId, userId) => {
  const { data, error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: userId })
    .select()
    .single();
  if (!error && data) {
    await maybeNotifyOnLike({ postId, actorId: userId });
  }
  return { data, error };
};

export const unlikePost = async (postId, userId) => {
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  return { error };
};

export const checkPostLiked = async (postId, userId) => {
  const { data, error } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();
  return { liked: !!data, error };
};

// ============================================================
// FOLLOWS
// ============================================================
export const followUser = async (followerId, followingId) => {
  const { data, error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, following_id: followingId })
    .select()
    .single();
  if (!error && data) {
    await maybeNotifyOnFollow({ followerId, followingId });
  }
  return { data, error };
};

export const unfollowUser = async (followerId, followingId) => {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  return { error };
};

export const checkFollowing = async (followerId, followingId) => {
  const { data, error } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return { following: !!data, error };
};

export const getFollowers = async (userId) => {
  const { data, error } = await supabase
    .from("follows")
    .select(
      "follower:profiles!follower_id(id, username, full_name, avatar_url, is_verified)"
    )
    .eq("following_id", userId);
  return { data: data?.map((d) => d.follower), error };
};

export const getFollowing = async (userId) => {
  const { data, error } = await supabase
    .from("follows")
    .select(
      "following:profiles!following_id(id, username, full_name, avatar_url, is_verified)"
    )
    .eq("follower_id", userId);
  return { data: data?.map((d) => d.following), error };
};

// ============================================================
// SUBSCRIPTIONS
// ============================================================
export const subscribeToUser = async (subscriberId, publisherId) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ subscriber_id: subscriberId, publisher_id: publisherId })
    .select()
    .single();
  return { data, error };
};

export const unsubscribeFromUser = async (subscriberId, publisherId) => {
  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("subscriber_id", subscriberId)
    .eq("publisher_id", publisherId);
  return { error };
};

export const checkSubscribed = async (subscriberId, publisherId) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("subscriber_id", subscriberId)
    .eq("publisher_id", publisherId)
    .maybeSingle();
  return { subscribed: !!data, error };
};

export const getSubscriberCount = async (publisherId) => {
  const { count, error } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("publisher_id", publisherId);
  return { count, error };
};

// ============================================================
// BOOKMARKS
// ============================================================
export const bookmarkPost = async (userId, postId) => {
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ user_id: userId, post_id: postId })
    .select()
    .single();
  return { data, error };
};

export const unbookmarkPost = async (userId, postId) => {
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  return { error };
};

export const getUserBookmarks = async (userId) => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("post:posts_with_stats(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return { data: data?.map((d) => d.post), error };
};

export const checkBookmarked = async (userId, postId) => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();
  return { bookmarked: !!data, error };
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const getNotifications = async (userId) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!actor_id(id, username, avatar_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return { data, error };
};

export const markNotificationRead = async (notificationId) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  return { error };
};

export const markAllNotificationsRead = async (userId) => {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { error };
};

export const getUnreadNotificationCount = async (userId) => {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return { count, error };
};

// ============================================================
// NOTIFICATION HELPERS
// ============================================================
const createNotification = async ({
  userId,
  type,
  title,
  body = null,
  link = null,
  actorId = null,
  postId = null,
  commentId = null,
}) => {
  if (!userId || !type || !title) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link,
    actor_id: actorId,
    post_id: postId,
    comment_id: commentId,
  });
};

const truncateText = (text = "", max = 120) => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

const getProfileLite = async (userId) => {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("id", userId)
    .single();
  return data;
};

const getPostLite = async (postId) => {
  const { data } = await supabase
    .from("posts_with_stats")
    .select("id, title, slug, author_id")
    .eq("id", postId)
    .single();
  return data;
};

const getCommentLite = async (commentId) => {
  const { data } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .single();
  return data;
};

const maybeNotifyOnLike = async ({ postId, actorId }) => {
  const post = await getPostLite(postId);
  if (!post || post.author_id === actorId) return;
  const actor = await getProfileLite(actorId);
  const actorName = actor?.full_name || actor?.username || "Someone";
  await createNotification({
    userId: post.author_id,
    type: "post_like",
    title: `${actorName} liked your post`,
    body: post.title,
    link: `/p/${post.slug}`,
    actorId,
    postId: post.id,
  });
};

const maybeNotifyOnFollow = async ({ followerId, followingId }) => {
  if (followerId === followingId) return;
  const actor = await getProfileLite(followerId);
  const actorName = actor?.full_name || actor?.username || "Someone";
  await createNotification({
    userId: followingId,
    type: "new_follower",
    title: `${actorName} followed you`,
    link: `/@${actor?.username || ""}`,
    actorId: followerId,
  });
};

const maybeNotifyOnComment = async ({ postId, comment, parentId, authorId }) => {
  const post = await getPostLite(postId);
  if (!post) return;
  const actor = await getProfileLite(authorId);
  const actorName = actor?.full_name || actor?.username || "Someone";
  const body = truncateText(comment.content || "", 120);

  if (post.author_id && post.author_id !== authorId) {
    await createNotification({
      userId: post.author_id,
      type: "new_comment",
      title: `${actorName} commented on your post`,
      body,
      link: `/p/${post.slug}`,
      actorId: authorId,
      postId: post.id,
      commentId: comment.id,
    });
  }

  if (parentId) {
    const parent = await getCommentLite(parentId);
    if (parent?.author_id && parent.author_id !== authorId) {
      await createNotification({
        userId: parent.author_id,
        type: "comment_reply",
        title: `${actorName} replied to your comment`,
        body,
        link: `/p/${post.slug}`,
        actorId: authorId,
        postId: post.id,
        commentId: comment.id,
      });
    }
  }
};

// ============================================================
// SEARCH
// ============================================================
export const searchPosts = async (query, limit = 20) => {
  const { data, error } = await supabase
    .from("posts_with_stats")
    .select("*")
    .eq("is_published", true)
    .or(`title.ilike.%${query}%,subtitle.ilike.%${query}%`)
    .order("published_at", { ascending: false })
    .limit(limit);
  return { data, error };
};

export const searchAuthors = async (query, limit = 10) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit);
  return { data, error };
};

// ============================================================
// FEED
// ============================================================
export const getFeedPosts = async (userId, page = 1, limit = 20) => {
  // Get posts from followed users
  const { data: followedUsers } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followedIds = followedUsers?.map((f) => f.following_id) || [];
  if (followedIds.length === 0) return getPosts({ page, limit });

  const { data, error } = await supabase
    .from("posts_with_stats")
    .select("*")
    .eq("is_published", true)
    .in("author_id", followedIds)
    .order("published_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  return { data, error };
};

// ============================================================
// REACTIONS
// ============================================================
export const toggleReaction = async (postId, userId, emoji) => {
  const { data: existing } = await supabase.from('post_reactions').select('id').eq('post_id', postId).eq('user_id', userId).eq('emoji', emoji).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('post_reactions').delete().eq('id', existing.id);
    return { added: false, error };
  }
  const { error } = await supabase.from('post_reactions').insert({ post_id: postId, user_id: userId, emoji });
  return { added: true, error };
};

export const getReactions = async (postId) => {
  const { data, error } = await supabase.from('post_reactions').select('emoji, user_id').eq('post_id', postId);
  return { data, error };
};

// ============================================================
// HIGHLIGHTS
// ============================================================
export const saveHighlight = async ({ postId, userId, selectedText, isPublic = true }) => {
  const { data, error } = await supabase.from('highlights').insert({ post_id: postId, user_id: userId, selected_text: selectedText, is_public: isPublic }).select().single();
  return { data, error };
};

export const getHighlights = async (postId) => {
  const { data, error } = await supabase.from('highlights').select('*, user:profiles!user_id(username, avatar_url)').eq('post_id', postId).eq('is_public', true).order('created_at', { ascending: false }).limit(20);
  return { data, error };
};

// ============================================================
// TIPS
// ============================================================
export const sendTip = async ({ senderId, recipientId, postId, amountCents, message }) => {
  const { data, error } = await supabase.from('tips').insert({ sender_id: senderId, recipient_id: recipientId, post_id: postId || null, amount_cents: amountCents, message: message || null, status: 'pending' }).select().single();
  return { data, error };
};

// ============================================================
// ANALYTICS
// ============================================================
export const recordPostView = async (postId) => {
  await supabase.rpc('record_post_view', { p_post_id: postId });
};

export const getPostAnalytics = async (postId, days = 30) => {
  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const { data, error } = await supabase.from('post_analytics').select('*').eq('post_id', postId).gte('date', since).order('date');
  return { data, error };
};

// ============================================================
// PAID SUBSCRIPTIONS
// ============================================================
export const checkPaidAccess = async (userId, postId) => {
  const { data, error } = await supabase.rpc('user_can_access_post', { p_user_id: userId, p_post_id: postId });
  return { access: data, error };
};

export const getPublisherMRR = async (publisherId) => {
  const { data, error } = await supabase.rpc('get_publisher_mrr', { p_publisher_id: publisherId });
  return { mrr: data, error };
};

// ============================================================
// BOOKMARK FOLDERS
// ============================================================
export const getBookmarkFolders = async (userId) => {
  const { data, error } = await supabase.from('bookmark_folders').select('*').eq('user_id', userId).order('created_at');
  return { data, error };
};

export const createBookmarkFolder = async (userId, name, color = '#6366f1') => {
  const { data, error } = await supabase.from('bookmark_folders').insert({ user_id: userId, name, color }).select().single();
  return { data, error };
};

export const bookmarkPostToFolder = async (userId, postId, folderId = null) => {
  const { data, error } = await supabase.from('bookmarks').upsert({ user_id: userId, post_id: postId, folder_id: folderId }, { onConflict: 'user_id,post_id' }).select().single();
  return { data, error };
};

// ============================================================
// POST VERSIONS
// ============================================================
export const savePostVersion = async (postId, label = null) => {
  const { data, error } = await supabase.rpc('save_post_version', { p_post_id: postId, p_label: label });
  return { data, error };
};

export const getPostVersions = async (postId) => {
  const { data, error } = await supabase.from('post_versions').select('id, version_label, word_count, created_at').eq('post_id', postId).order('created_at', { ascending: false }).limit(20);
  return { data, error };
};

// ============================================================
// Q&A
// ============================================================
export const submitQuestion = async ({ publisherId, askerId, questionText, isAnonymous = false }) => {
  const { data, error } = await supabase.from('questions').insert({ publisher_id: publisherId, asker_id: askerId, question_text: questionText, is_anonymous: isAnonymous }).select().single();
  return { data, error };
};

export const getPublishedQuestions = async (publisherId) => {
  const { data, error } = await supabase.from('questions').select('*, asker:profiles!asker_id(username, avatar_url)').eq('publisher_id', publisherId).eq('is_published', true).order('upvote_count', { ascending: false });
  return { data, error };
};
