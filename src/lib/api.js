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
  const { data, error } = await supabase
    .from("posts")
    .insert(postData)
    .select()
    .single();
  return { data, error };
};

export const updatePost = async (postId, updates) => {
  const { data, error } = await supabase
    .from("posts")
    .update(updates)
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
    .upload(fileName, file);
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
      "follower:profiles!follower_id(id, username, full_name, avatar_url)"
    )
    .eq("following_id", userId);
  return { data: data?.map((d) => d.follower), error };
};

export const getFollowing = async (userId) => {
  const { data, error } = await supabase
    .from("follows")
    .select(
      "following:profiles!following_id(id, username, full_name, avatar_url)"
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
