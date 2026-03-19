import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Helmet } from 'react-helmet';
import { getPost, likePost, unlikePost, checkPostLiked, bookmarkPost, unbookmarkPost, checkBookmarked, checkSubscribed, subscribeToUser, unsubscribeFromUser, upsertReadingHistory, getPostTopics, getPostsByTopic, getPostsByTags } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Comments from '../components/posts/Comments';
import Highlights from '../components/posts/Highlights';
import ShareCard from '../components/share/ShareCard';
import ShareQuoteCard from '../components/share/ShareQuoteCard';
import PostCard from '../components/posts/PostCard';
import { randomGradient } from '../utils/randomGradient';
import toast from 'react-hot-toast';
import LoadingPage from '../components/ui/LoadingPage';
import './PostView.css';

export default function PostView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState({ state: 'idle', message: '' });
  const [shareGradient, setShareGradient] = useState(() => randomGradient());
  const [shareMode, setShareMode] = useState('post');
  const [quoteText, setQuoteText] = useState('');
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [postTopics, setPostTopics] = useState([]);
  const [pdfViewerUrl, setPdfViewerUrl] = useState('');
  const shareExportRef = useRef(null);
  const contentRef = useRef(null);
  const lastProgressRef = useRef({ value: 0, at: 0 });
  const lastTapRef = useRef(0);

  useEffect(() => {
    loadPost();
  }, [slug]);

  useEffect(() => {
    if (post && user) {
      checkPostLiked(post.id, user.id).then(({ liked }) => setLiked(liked));
      checkBookmarked(user.id, post.id).then(({ bookmarked }) => setBookmarked(bookmarked));
      checkSubscribed(user.id, post.author_id).then(({ subscribed }) => setSubscribed(subscribed));
    }
  }, [post, user]);

  useEffect(() => {
    if (!shareOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [shareOpen]);

  useEffect(() => {
    if (!post || !user) return undefined;
    const updateProgress = () => {
      if (!contentRef.current) return;
      const rect = contentRef.current.getBoundingClientRect();
      const contentTop = rect.top + window.scrollY;
      const contentHeight = contentRef.current.offsetHeight;
      const progress = Math.min(1, Math.max(0, (window.scrollY + window.innerHeight - contentTop) / contentHeight));
      const now = Date.now();
      if (now - lastProgressRef.current.at < 5000 && progress < 0.98) return;
      if (Math.abs(progress - lastProgressRef.current.value) < 0.05 && progress < 0.98) return;
      lastProgressRef.current = { value: progress, at: now };
      upsertReadingHistory({ userId: user.id, postId: post.id, progress: Math.round(progress * 100) });
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, [post, user]);

  useEffect(() => {
    if (!post) return;
    loadRelated();
  }, [post]);

  const loadPost = async () => {
    const { data, error } = await getPost(slug);
    if (error || !data) { toast.error('Post not found'); navigate('/'); return; }
    setPost(data);
    setLikeCount(data.like_count || 0);
    setPdfViewerUrl(await resolvePdfUrl(data.pdf_url));
    setLoading(false);
  };

  const resolvePdfUrl = async (rawUrl) => {
    if (!rawUrl) return '';
    try {
      const url = new URL(rawUrl);
      const marker = '/post-pdfs/';
      const idx = url.pathname.indexOf(marker);
      if (idx === -1) return rawUrl;
      const filePath = url.pathname.slice(idx + marker.length);
      const { data, error } = await supabase.storage
        .from('post-pdfs')
        .createSignedUrl(filePath, 60 * 60);
      if (error || !data?.signedUrl) return rawUrl;
      return data.signedUrl;
    } catch {
      return rawUrl;
    }
  };

  const handleLike = async () => {
    if (!user) { toast.error('Sign in to like'); return; }
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1);
      await unlikePost(post.id, user.id);
    } else {
      setLiked(true); setLikeCount(c => c + 1);
      await likePost(post.id, user.id);
    }
  };

  const handleDoubleTapLike = () => {
    if (!liked) handleLike();
  };

  const handleTouchLike = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTapLike();
    }
    lastTapRef.current = now;
  };

  const handleBookmark = async () => {
    if (!user) { toast.error('Sign in to bookmark'); return; }
    if (bookmarked) {
      setBookmarked(false);
      await unbookmarkPost(user.id, post.id);
      toast.success('Removed from bookmarks');
    } else {
      setBookmarked(true);
      await bookmarkPost(user.id, post.id);
      toast.success('Bookmarked');
    }
  };

  const handleSubscribe = async () => {
    if (!user) { toast.error('Sign in to subscribe'); return; }
    if (subscribed) {
      setSubscribed(false);
      await unsubscribeFromUser(user.id, post.author_id);
      toast.success('Unsubscribed');
    } else {
      setSubscribed(true);
      await subscribeToUser(user.id, post.author_id);
      toast.success(`Subscribed to ${post.author_full_name || post.author_username}`);
    }
  };

  const handleOpenShare = () => {
    setShareMode('post');
    setShareGradient(randomGradient());
    setShareStatus({ state: 'idle', message: '' });
    setShareOpen(true);
  };

  const handleShareQuote = (quote) => {
    setQuoteText(quote);
    setShareMode('quote');
    setShareGradient(randomGradient());
    setShareStatus({ state: 'idle', message: '' });
    setShareOpen(true);
  };

  const handleCopyLink = async () => {
    if (!navigator.clipboard) {
      setShareStatus({ state: 'error', message: 'Clipboard access not available.' });
      toast.error('Clipboard access not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus({ state: 'success', message: 'Link copied to clipboard.' });
      toast.success('Link copied');
    } catch (err) {
      setShareStatus({ state: 'error', message: 'Unable to copy link.' });
      toast.error('Unable to copy link');
    }
  };

  const renderShareImage = async () => {
    if (!shareExportRef.current) return null;
    setShareStatus({ state: 'loading', message: 'Generating share card…' });
    try {
      // Lazy-load to keep the share feature fast on initial page load.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(shareExportRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      return canvas;
    } catch (err) {
      setShareStatus({ state: 'error', message: 'Failed to generate image.' });
      return null;
    }
  };

  const handleDownloadImage = async () => {
    const canvas = await renderShareImage();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${post.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-share.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setShareStatus({ state: 'success', message: 'PNG downloaded.' });
  };

  const handleCopyImage = async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      setShareStatus({ state: 'error', message: 'Clipboard image not supported.' });
      toast.error('Clipboard image not supported');
      return;
    }
    const canvas = await renderShareImage();
    if (!canvas) return;
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        setShareStatus({ state: 'error', message: 'Unable to copy image.' });
        return;
      }
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      setShareStatus({ state: 'success', message: 'Image copied to clipboard.' });
    } catch (err) {
      setShareStatus({ state: 'error', message: 'Unable to copy image.' });
    }
  };

  const handleWebShare = async () => {
    if (!navigator.share) {
      toast.error('Web Share is not supported on this device.');
      return;
    }
    try {
      setShareStatus({ state: 'loading', message: 'Opening share sheet…' });
      await navigator.share({
        title: shareMode === 'quote' ? `Quote from ${post.title}` : post.title,
        text: shareMode === 'quote' ? `“${quoteText}”` : getShareExcerpt(post),
        url: window.location.href,
      });
      setShareStatus({ state: 'success', message: 'Share sheet opened.' });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setShareStatus({ state: 'error', message: 'Unable to share this post.' });
      } else {
        setShareStatus({ state: 'idle', message: '' });
      }
    }
  };

  const loadRelated = async () => {
    const topicsRes = await getPostTopics(post.id);
    const topics = (topicsRes.data || []).map((item) => item.topic).filter(Boolean);
    setPostTopics(topics);

    const byTags = await getPostsByTags(post.tags || [], post.id, 6);
    const topicPosts = topics.length > 0 ? await getPostsByTopic(topics[0].id, 6) : { data: [] };

    const merged = new Map();
    (byTags.data || []).forEach((item) => merged.set(item.id, item));
    (topicPosts.data || []).forEach((item) => {
      if (item?.post?.id) merged.set(item.post.id, item.post);
    });

    const items = Array.from(merged.values()).filter((item) => item?.id && item.id !== post.id);
    setRelatedPosts(items.slice(0, 4));
  };

  if (loading) return <LoadingPage variant="detail" />;

  const initials = post.author_full_name
    ? post.author_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : post.author_username?.[0]?.toUpperCase() || '?';

  const timeAgo = post.published_at ? formatDistanceToNow(new Date(post.published_at), { addSuffix: true }) : '';
  const shareMeta = buildShareMeta(post);
  const shareExcerpt = getShareExcerpt(post);
  const shareAuthor = post.author_full_name || post.author_username || 'Chronicles';
  const seoTitle = post.seo_title || post.title;
  const seoDescription = post.seo_description || shareExcerpt;
  const ogImage = post.cover_image_url || `${window.location.origin}/android-chrome-512x512.png`;
  const canonicalUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareHeading = shareMode === 'quote' ? 'Share this quote' : 'Share this post';
  const shareSub = shareMode === 'quote' ? 'Turn a highlight into a share card.' : 'Generate a shareable link and visual preview.';

  return (
    <div className="post-view-page">
      <Helmet>
        <title>{seoTitle} — Chronicles</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <div className="container-narrow">
        {/* Author header */}
        <div className="post-view-author">
          <Link to={`/@${post.author_username}`} className="post-view-author-link">
            {post.author_avatar_url
              ? <img src={post.author_avatar_url} alt={post.author_username} className="avatar" style={{ width: 44, height: 44 }} />
              : <div className="avatar-placeholder" style={{ width: 44, height: 44, fontSize: '1rem' }}>{initials}</div>
            }
            <div>
              <div className="author-fullname">{post.author_full_name || post.author_username}</div>
              <div className="author-meta">@{post.author_username} · {timeAgo}</div>
            </div>
          </Link>
          {user && user.id !== post.author_id && (
            <button
              className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleSubscribe}
            >
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          )}
        </div>

        {/* Post header */}
        <header className="post-view-header">
          <h1 className="post-view-title">{post.title}</h1>
          {post.subtitle && <p className="post-view-subtitle">{post.subtitle}</p>}
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div
            className="post-view-cover"
            onDoubleClick={handleDoubleTapLike}
            onTouchEnd={handleTouchLike}
          >
            <img src={post.cover_image_url} alt={post.title} />
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="prose post-view-content"
          onDoubleClick={handleDoubleTapLike}
          onTouchEnd={handleTouchLike}
          dangerouslySetInnerHTML={{ __html: post.content_html || post.content }}
        />

        <Highlights postId={post.id} containerRef={contentRef} onShareQuote={handleShareQuote} />

        {/* PDF attachment */}
        {post.pdf_url && (
          <div className="post-view-pdf">
            <div className="pdf-card">
              <div className="pdf-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div className="pdf-info">
                <div className="pdf-name">{post.pdf_filename || 'Attached PDF'}</div>
                <div className="pdf-label">PDF Document</div>
              </div>
            </div>
            <div className="pdf-viewer">
              <object data={pdfViewerUrl || post.pdf_url} type="application/pdf" className="pdf-frame" aria-label="PDF document">
                <iframe src={pdfViewerUrl || post.pdf_url} title="PDF document" className="pdf-frame" />
              </object>
            </div>
            <div className="pdf-actions">
              <a
                href={`${(pdfViewerUrl || post.pdf_url)}${(pdfViewerUrl || post.pdf_url).includes('?') ? '&' : '?'}download=1`}
                className="btn btn-secondary btn-sm"
                download
              >
                Download PDF
              </a>
              <a href={pdfViewerUrl || post.pdf_url} target="_blank" rel="noopener noreferrer" className="pdf-open-link">
              Open PDF in new tab
              </a>
            </div>
          </div>
        )}

        {/* Post actions */}
        <div className="post-view-actions">
          <button className={`action-btn ${liked ? 'active' : ''}`} onClick={handleLike}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{likeCount}</span>
          </button>
          <button className={`action-btn ${bookmarked ? 'active' : ''}`} onClick={handleBookmark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
          <button className="action-btn" onClick={handleOpenShare}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>Share</span>
          </button>
          {user?.id === post.author_id && (
            <Link to={`/dashboard/edit/${post.id}`} className="action-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Edit</span>
            </Link>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="post-view-tags">
            {post.tags.map(tag => <span key={tag} className="meta-tag">{tag}</span>)}
          </div>
        )}

        {/* Author card */}
        <div className="author-card card">
          <Link to={`/@${post.author_username}`} className="author-card-link">
            {post.author_avatar_url
              ? <img src={post.author_avatar_url} alt={post.author_username} className="avatar" style={{ width: 56, height: 56 }} />
              : <div className="avatar-placeholder" style={{ width: 56, height: 56, fontSize: '1.2rem' }}>{initials}</div>
            }
            <div className="author-card-info">
              <div className="author-card-name">{post.author_full_name || post.author_username}</div>
              <div className="author-card-handle">@{post.author_username}</div>
            </div>
          </Link>
          {user && user.id !== post.author_id && (
            <button className={`btn btn-sm ${subscribed ? 'btn-secondary' : 'btn-primary'}`} onClick={handleSubscribe}>
              {subscribed ? 'Subscribed ✓' : 'Subscribe'}
            </button>
          )}
        </div>

        <Comments postId={post.id} />

        {relatedPosts.length > 0 && (
          <div className="related-posts">
            <div className="related-header">
              <h3>If you liked this…</h3>
              {postTopics.length > 0 && (
                <div className="related-topics">
                  {postTopics.slice(0, 3).map((topic) => (
                    <Link key={topic.id} to={`/topics/${topic.slug}`} className="related-topic">
                      {topic.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="related-grid">
              {relatedPosts.map((item) => (
                <PostCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      {shareOpen && (
        <div className="share-modal" role="dialog" aria-modal="true">
          <div className="share-backdrop" onClick={() => setShareOpen(false)} />
          <div className="share-panel">
            <div className="share-panel-header">
              <div>
                <h3>{shareHeading}</h3>
                <p>{shareSub}</p>
              </div>
              <button className="icon-btn share-close" onClick={() => setShareOpen(false)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="share-panel-body">
              <div className="share-preview">
                <div className="share-preview-frame">
                  {shareMode === 'quote' ? (
                    <ShareQuoteCard
                      quote={quoteText}
                      title={post.title}
                      author={shareAuthor}
                      gradient={shareGradient}
                      size="preview"
                    />
                  ) : (
                    <ShareCard
                      title={post.title}
                      excerpt={shareExcerpt}
                      author={shareAuthor}
                      meta={shareMeta}
                      gradient={shareGradient}
                      size="preview"
                    />
                  )}
                </div>
                <div className="share-preview-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => setShareGradient(randomGradient())}>
                    Shuffle background
                  </button>
                </div>
              </div>

              <div className="share-actions">
                <div className="share-link-row">
                  <input className="form-input" value={window.location.href} readOnly />
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyLink}>Copy link</button>
                </div>
                <div className="share-button-row">
                  <button className="btn btn-primary btn-sm" onClick={handleDownloadImage} disabled={shareStatus.state === 'loading'}>
                    Download PNG
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCopyImage} disabled={shareStatus.state === 'loading'}>
                    Copy image
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={handleWebShare} disabled={shareStatus.state === 'loading'}>
                    Share…
                  </button>
                </div>
                {shareStatus.state !== 'idle' && (
                  <div className={`share-status ${shareStatus.state}`}>
                    {shareStatus.message}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="share-export-layer" aria-hidden="true">
            {shareMode === 'quote' ? (
              <ShareQuoteCard
                ref={shareExportRef}
                quote={quoteText}
                title={post.title}
                author={shareAuthor}
                gradient={shareGradient}
                size="export"
                animate={false}
              />
            ) : (
              <ShareCard
                ref={shareExportRef}
                title={post.title}
                excerpt={shareExcerpt}
                author={shareAuthor}
                meta={shareMeta}
                gradient={shareGradient}
                size="export"
                animate={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const stripHtml = (value = '') => value.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

const getShareExcerpt = (post) => {
  if (!post) return '';
  if (post.subtitle) return post.subtitle;
  const plain = stripHtml(post.content_html || post.content || '');
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
};

const getReadTime = (content) => {
  const words = content.split(/\s+/).filter(Boolean).length;
  if (!words) return '';
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
};

const buildShareMeta = (post) => {
  if (!post) return '';
  const published = post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : '';
  const plain = stripHtml(post.content_html || post.content || '');
  const readTime = getReadTime(plain);
  return [published, readTime].filter(Boolean).join(' · ');
};
