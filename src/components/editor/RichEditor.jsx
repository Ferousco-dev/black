import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { useCallback, useRef } from 'react';
import { uploadPostImage } from '../../lib/api';
import toast from 'react-hot-toast';
import './RichEditor.css';

function InlineToolbar({ editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);
  return (
    <div className="bubble-menu">
      <button className={`bm-btn ${editor.isActive('bold')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleBold().run();}} title="Bold"><b>B</b></button>
      <button className={`bm-btn ${editor.isActive('italic')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleItalic().run();}} title="Italic"><i>I</i></button>
      <button className={`bm-btn ${editor.isActive('underline')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleUnderline().run();}} title="Underline"><u>U</u></button>
      <button className={`bm-btn ${editor.isActive('highlight')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleHighlight().run();}} title="Highlight"><HighlightIcon/></button>
      <span className="bm-divider"/>
      <button className={`bm-btn ${editor.isActive('heading',{level:2})?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleHeading({level:2}).run();}} title="H2">H2</button>
      <button className={`bm-btn ${editor.isActive('heading',{level:3})?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleHeading({level:3}).run();}} title="H3">H3</button>
      <span className="bm-divider"/>
      <button className={`bm-btn ${editor.isActive('link')?'active':''}`} onMouseDown={e=>{e.preventDefault();setLink();}} title="Link"><LinkIcon/></button>
      <button className={`bm-btn ${editor.isActive('blockquote')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleBlockquote().run();}} title="Quote"><QuoteIcon/></button>
      <button className={`bm-btn ${editor.isActive('code')?'active':''}`} onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleCode().run();}} title="Code"><CodeIcon/></button>
    </div>
  );
}

function PlusMenu({ editor }) {
  const fileRef = useRef();
  return (
    <div className="floating-plus-menu">
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();fileRef.current.click();}} title="Image"><ImageIcon/><span>Image</span></button>
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleBlockquote().run();}} title="Quote"><QuoteIcon/><span>Quote</span></button>
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleCodeBlock().run();}} title="Code block"><CodeIcon/><span>Code</span></button>
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleBulletList().run();}} title="List"><BulletIcon/><span>List</span></button>
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();editor.chain().focus().toggleOrderedList().run();}} title="Numbered list"><OrderedIcon/><span>Numbered</span></button>
      <button className="plus-item" onMouseDown={e=>{e.preventDefault();editor.chain().focus().setHorizontalRule().run();}} title="Divider"><DividerIcon/><span>Divider</span></button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={async(e)=>{
        const file=e.target.files[0]; if(!file) return;
        if(file.size>10*1024*1024){toast.error('Image must be under 10MB');return;}
        const tid=toast.loading('Uploading…');
        const {data,error}=await uploadPostImage(file);
        toast.dismiss(tid);
        if(error){toast.error('Upload failed');return;}
        editor.chain().focus().setImage({src:data,alt:file.name}).run();
        toast.success('Image inserted');
        e.target.value='';
      }}/>
    </div>
  );
}

function StaticToolbar({ editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const groups = [
    [
      { label: <b>B</b>, title:'Bold', action:()=>editor.chain().focus().toggleBold().run(), active:editor.isActive('bold') },
      { label: <i>I</i>, title:'Italic', action:()=>editor.chain().focus().toggleItalic().run(), active:editor.isActive('italic') },
      { label: <u>U</u>, title:'Underline', action:()=>editor.chain().focus().toggleUnderline().run(), active:editor.isActive('underline') },
      { label: <HighlightIcon/>, title:'Highlight', action:()=>editor.chain().focus().toggleHighlight().run(), active:editor.isActive('highlight') },
    ],
    [
      { label:'H1', title:'Heading 1', action:()=>editor.chain().focus().toggleHeading({level:1}).run(), active:editor.isActive('heading',{level:1}) },
      { label:'H2', title:'Heading 2', action:()=>editor.chain().focus().toggleHeading({level:2}).run(), active:editor.isActive('heading',{level:2}) },
      { label:'H3', title:'Heading 3', action:()=>editor.chain().focus().toggleHeading({level:3}).run(), active:editor.isActive('heading',{level:3}) },
    ],
    [
      { label:<BulletIcon/>, title:'Bullet list', action:()=>editor.chain().focus().toggleBulletList().run(), active:editor.isActive('bulletList') },
      { label:<OrderedIcon/>, title:'Ordered list', action:()=>editor.chain().focus().toggleOrderedList().run(), active:editor.isActive('orderedList') },
      { label:<QuoteIcon/>, title:'Blockquote', action:()=>editor.chain().focus().toggleBlockquote().run(), active:editor.isActive('blockquote') },
      { label:<CodeIcon/>, title:'Code block', action:()=>editor.chain().focus().toggleCodeBlock().run(), active:editor.isActive('codeBlock') },
    ],
    [
      { label:<AlignLeftIcon/>, title:'Align left', action:()=>editor.chain().focus().setTextAlign('left').run(), active:editor.isActive({textAlign:'left'}) },
      { label:<AlignCenterIcon/>, title:'Align center', action:()=>editor.chain().focus().setTextAlign('center').run(), active:editor.isActive({textAlign:'center'}) },
      { label:<AlignRightIcon/>, title:'Align right', action:()=>editor.chain().focus().setTextAlign('right').run(), active:editor.isActive({textAlign:'right'}) },
    ],
    [
      { label:<LinkIcon/>, title:'Link', action:setLink, active:editor.isActive('link') },
      { label:<DividerIcon/>, title:'Horizontal rule', action:()=>editor.chain().focus().setHorizontalRule().run(), active:false },
    ],
    [
      { label:<UndoIcon/>, title:'Undo', action:()=>editor.chain().focus().undo().run(), active:false },
      { label:<RedoIcon/>, title:'Redo', action:()=>editor.chain().focus().redo().run(), active:false },
    ],
  ];

  return (
    <div className="editor-toolbar">
      {groups.map((group,gi)=>(
        <span key={gi} className="toolbar-group">
          {group.map((t,i)=>(
            <button key={i} type="button" title={t.title} className={`toolbar-btn ${t.active?'active':''}`} onClick={t.action}>{t.label}</button>
          ))}
          {gi<groups.length-1 && <span className="toolbar-divider"/>}
        </span>
      ))}
    </div>
  );
}

export default function RichEditor({ content, onChange, placeholder='Start writing, or press + on an empty line to insert media…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      Image.configure({ HTMLAttributes:{ class:'inline-img' } }),
      Link.configure({ openOnClick:false, HTMLAttributes:{ rel:'noopener noreferrer', target:'_blank' } }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types:['heading','paragraph'] }),
    ],
    content,
    onUpdate: ({editor})=>onChange(editor.getHTML()),
    editorProps: { attributes:{ class:'ProseMirror' } },
  });

  if (!editor) return null;

  return (
    <div className="rich-editor">
      <StaticToolbar editor={editor}/>
      <BubbleMenu editor={editor} tippyOptions={{duration:100}}>
        <InlineToolbar editor={editor}/>
      </BubbleMenu>
      <FloatingMenu editor={editor} tippyOptions={{duration:100}}>
        <PlusMenu editor={editor}/>
      </FloatingMenu>
      <div className="editor-content-wrapper">
        <EditorContent editor={editor}/>
      </div>
      <div className="editor-hint">
        Press <kbd>+</kbd> on an empty line to insert an image, quote, code block, or divider
      </div>
    </div>
  );
}

function LinkIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;}
function BulletIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="9"y1="6"x2="20"y2="6"/><line x1="9"y1="12"x2="20"y2="12"/><line x1="9"y1="18"x2="20"y2="18"/><circle cx="4"cy="6"r="1.5"fill="currentColor"stroke="none"/><circle cx="4"cy="12"r="1.5"fill="currentColor"stroke="none"/><circle cx="4"cy="18"r="1.5"fill="currentColor"stroke="none"/></svg>;}
function OrderedIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="10"y1="6"x2="21"y2="6"/><line x1="10"y1="12"x2="21"y2="12"/><line x1="10"y1="18"x2="21"y2="18"/><path d="M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"strokeWidth="1.5"/></svg>;}
function QuoteIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>;}
function CodeIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;}
function ImageIcon(){return<svg width="14"height="14"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><rect x="3"y="3"width="18"height="18"rx="2"/><circle cx="8.5"cy="8.5"r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;}
function DividerIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="3"y1="12"x2="21"y2="12"/></svg>;}
function HighlightIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;}
function AlignLeftIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="3"y1="6"x2="21"y2="6"/><line x1="3"y1="12"x2="15"y2="12"/><line x1="3"y1="18"x2="18"y2="18"/></svg>;}
function AlignCenterIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="3"y1="6"x2="21"y2="6"/><line x1="6"y1="12"x2="18"y2="12"/><line x1="4"y1="18"x2="20"y2="18"/></svg>;}
function AlignRightIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><line x1="3"y1="6"x2="21"y2="6"/><line x1="9"y1="12"x2="21"y2="12"/><line x1="6"y1="18"x2="21"y2="18"/></svg>;}
function UndoIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>;}
function RedoIcon(){return<svg width="13"height="13"viewBox="0 0 24 24"fill="none"stroke="currentColor"strokeWidth="2"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>;}
