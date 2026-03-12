import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createPost, updatePost, publishPost, uploadPostImage, uploadPostPDF, supabase } from '../lib/api';
import { supabase as sb } from '../lib/supabase';
import RichEditor from '../components/editor/RichEditor';
import toast from 'react-hot-toast';
import './Editor.css';

function wordCount(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}
function readingTime(words) {
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

export default function Editor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pdfFilename, setPdfFilename] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [postId, setPostId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [audience, setAudience] = useState('everyone'); // everyone | paid | free
  const autoSaveTimer = useRef(null);
  const postIdRef = useRef(null);

  useEffect(() => { postIdRef.current = postId; }, [postId]);

  useEffect(() => {
    if (isEditing) loadPost();
  }, [id]);

  // Auto-save every 30s
  useEffect(() => {
    if (!autoSaveEnabled) return;
    autoSaveTimer.current = setInterval(() => {
      if (title.trim() && (postIdRef.current || isEditing)) {
        handleSave(true);
      }
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [autoSaveEnabled, title, content, subtitle, tags, coverImageUrl, pdfUrl]);

  const loadPost = async () => {
    const { data } = await sb.from('posts').select('*').eq('id', id).single();
    if (!data) { toast.error('Post not found'); navigate('/dashboard'); return; }
    if (data.author_id !== user?.id) { toast.error('Unauthorized'); navigate('/dashboard'); return; }
    setTitle(data.title);
    setSubtitle(data.subtitle || '');
    setContent(data.content_html || data.content || '');
    setTags(data.tags?.join(', ') || '');
    setCoverImageUrl(data.cover_image_url || '');
    setPdfUrl(data.pdf_url || '');
    setPdfFilename(data.pdf_filename || '');
    setSeoTitle(data.seo_title || '');
    setSeoDesc(data.seo_description || '');
    setAudience(data.audience || 'everyone');
    setPostId(data.id);
    setIsPublished(data.is_published);
  };

  const generateSlug = (t) => t.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Date.now().toString(36);

  const handleCoverImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const { data, error } = await uploadPostImage(file);
    if (error) toast.error('Image upload failed');
    else setCoverImageUrl(data);
  };

  const handlePDF = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { toast.error('PDF must be under 50MB'); return; }
    setPdfFile(file);
    setPdfFilename(file.name);
  };

  const uploadPDFIfNeeded = async () => {
    if (!pdfFile) return pdfUrl;
    const { data, error } = await uploadPostPDF(pdfFile);
    if (error) { toast.error('PDF upload failed'); return null; }
    setPdfUrl(data);
    return data;
  };

  const getTagsArray = () => tags.split(',').map(t => t.trim()).filter(Boolean);

  const handleSave = async (silent = false) => {
    if (!title.trim()) { if (!silent) toast.error('Please add a title'); return; }
    setSaving(true);
    const uploadedPdfUrl = await uploadPDFIfNeeded();

    const payload = {
      author_id: user.id,
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      content: content.replace(/<[^>]+>/g, ''),
      content_html: content,
      cover_image_url: coverImageUrl || null,
      pdf_url: uploadedPdfUrl || null,
      pdf_filename: pdfFilename || null,
      tags: getTagsArray(),
      slug: generateSlug(title),
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      audience,
    };

    let result;
    if (postIdRef.current || isEditing) {
      result = await updatePost(postIdRef.current || id, payload);
    } else {
      result = await createPost(payload);
      if (result.data) { setPostId(result.data.id); postIdRef.current = result.data.id; }
    }

    if (result.error) { if (!silent) toast.error('Save failed: ' + result.error.message); }
    else { setLastSaved(new Date()); if (!silent) toast.success('Draft saved'); }
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Add a title and content before publishing'); return; }
    setPublishing(true);
    await handleSave(true);
    const pid = postIdRef.current || id;
    if (!pid) { setPublishing(false); return; }
    const { data, error } = await publishPost(pid);
    if (error) toast.error('Publish failed: ' + error.message);
    else { toast.success('Published! 🎉'); setIsPublished(true); navigate(`/p/${data.slug}`); }
    setPublishing(false);
  };

  const words = wordCount(content);

  return (
    <div className="editor-page">
      <div className="editor-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="editor-topbar-center">
          {words > 0 && (
            <span className="editor-stats">{words.toLocaleString()} words · {readingTime(words)}</span>
          )}
          {lastSaved && <span className="save-status">Saved {lastSaved.toLocaleTimeString()}</span>}
          {autoSaveEnabled && <span className="autosave-badge">Auto-save on</span>}
        </div>
        <div className="editor-topbar-right">
          <button className={`btn btn-ghost btn-sm ${showSettings?'active':''}`} onClick={() => setShowSettings(s=>!s)} title="Post settings">
            <SettingsIcon/> Settings
          </button>
          <button className="btn btn-secondary btn-sm" onClick={()=>handleSave(false)} disabled={saving}>
            {saving ? <span className="spinner" style={{width:14,height:14}}/> : 'Save draft'}
          </button>
          {!isPublished ? (
            <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? <span className="spinner" style={{width:14,height:14}}/> : 'Publish →'}
            </button>
          ) : (
            <span className="badge badge-success">✓ Published</span>
          )}
        </div>
      </div>

      <div className="editor-layout">
        <div className="editor-main">
          <div className="editor-container">
            {/* Cover image */}
            <div className="cover-upload">
              {coverImageUrl ? (
                <div className="cover-preview">
                  <img src={coverImageUrl} alt="Cover"/>
                  <button className="cover-remove" onClick={()=>setCoverImageUrl('')}>Remove cover</button>
                </div>
              ) : (
                <label className="cover-upload-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Add cover image
                  <input type="file" accept="image/*" onChange={handleCoverImage} hidden/>
                </label>
              )}
            </div>

            <input type="text" className="editor-title" placeholder="Post title…" value={title} onChange={e=>setTitle(e.target.value)}/>
            <input type="text" className="editor-subtitle" placeholder="Subtitle (optional)" value={subtitle} onChange={e=>setSubtitle(e.target.value)}/>
            <hr className="editor-divider"/>

            <RichEditor content={content} onChange={setContent} placeholder="Tell your story…"/>

            {/* PDF attachment */}
            <div className="editor-extras">
              <div className="editor-extra-section">
                <h4 className="extra-label">Attach PDF</h4>
                {pdfUrl ? (
                  <div className="pdf-attached">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <span>{pdfFilename||'PDF attached'}</span>
                    <button className="remove-pdf" onClick={()=>{setPdfUrl('');setPdfFile(null);setPdfFilename('');}}>Remove</button>
                  </div>
                ) : (
                  <label className="pdf-upload-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Upload PDF (max 50MB)
                    <input type="file" accept=".pdf" onChange={handlePDF} hidden/>
                  </label>
                )}
              </div>
              <div className="editor-extra-section">
                <h4 className="extra-label">Tags</h4>
                <input type="text" className="form-input" placeholder="tech, writing, science (comma separated)" value={tags} onChange={e=>setTags(e.target.value)}/>
              </div>
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="editor-settings-panel">
            <h3 className="settings-panel-title">Post Settings</h3>

            <div className="setting-group">
              <label className="setting-label">Audience</label>
              <div className="audience-options">
                {[{v:'everyone',label:'Everyone',desc:'Free & paid readers'},{v:'free',label:'Free readers',desc:'All subscribers'},{v:'paid',label:'Paid only',desc:'Paid subscribers only'}].map(o=>(
                  <button key={o.v} className={`audience-opt ${audience===o.v?'active':''}`} onClick={()=>setAudience(o.v)}>
                    <span className="ao-label">{o.label}</span>
                    <span className="ao-desc">{o.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">SEO Title</label>
              <input className="form-input form-input-sm" placeholder="Custom title for search engines" value={seoTitle} onChange={e=>setSeoTitle(e.target.value)} maxLength={60}/>
              <span className="char-count">{seoTitle.length}/60</span>
            </div>

            <div className="setting-group">
              <label className="setting-label">SEO Description</label>
              <textarea className="form-input form-input-sm" rows={3} placeholder="Custom description for search engines and social sharing" value={seoDesc} onChange={e=>setSeoDesc(e.target.value)} maxLength={160}/>
              <span className="char-count">{seoDesc.length}/160</span>
            </div>

            <div className="setting-group">
              <label className="setting-label setting-toggle-label">
                <span>Auto-save</span>
                <button className={`toggle-btn ${autoSaveEnabled?'on':''}`} onClick={()=>setAutoSaveEnabled(v=>!v)}>
                  <span className="toggle-knob"/>
                </button>
              </label>
              <p className="setting-desc">Automatically save your draft every 30 seconds</p>
            </div>

            {words > 0 && (
              <div className="setting-group">
                <label className="setting-label">Content Stats</label>
                <div className="content-stats">
                  <div className="stat-pill"><span>{words.toLocaleString()}</span>words</div>
                  <div className="stat-pill"><span>{readingTime(words)}</span>read time</div>
                  <div className="stat-pill"><span>{content.replace(/<[^>]+>/g,'').length.toLocaleString()}</span>chars</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsIcon(){return<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><circle cx="12"cy="12"r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;}
