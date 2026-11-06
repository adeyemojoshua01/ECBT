// ============================================================
// EDU NOTES STUDIO BUILDER
// Replicates the exact UI/UX of EduNotes Studio + GitHub Publish
// ============================================================

'use strict';

const STORAGE_KEY = 'cbt_notes_builder_v4';
const LS_CREDS = 'cbt_notes_builder_creds';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeNode = document.createElement('div');
const e = value => { escapeNode.textContent = String(value ?? ''); return escapeNode.innerHTML; };
const ea = value => e(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;');
const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
const slugify = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';

// ICONS (Pulled from edunotes.js)
const iconPaths = {
  book:'<path d="M12 5.5C8.5 3.4 5 3.4 2.5 4.5v14C5 17.4 8.5 17.4 12 19.5c3.5-2.1 7-2.1 9.5-1v-14C19 3.4 15.5 3.4 12 5.5Z"/><path d="M12 5.5v14M6 8l3 .5M6 11l3 .5M15 8.5l3-.5M15 11.5l3-.5"/>',
  library:'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="14" width="6.5" height="6.5" rx="1.5"/>',
  arrowLeft:'<path d="M20 12H5m5-5-5 5 5 5"/>',
  arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
  chevron:'<path d="m9 5 7 7-7 7"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  up:'<path d="m6 15 6-6 6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  moon:'<path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3 9 9 0 1 0 20.5 13.5Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  leaf:'<path d="M20 3C8 2 3 7 5 14c2 7 15 6 15-11Z"/><path d="M4 21 16 8M8 13h5m-2-3v5"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 15l-1 6 6-2"/>',
  cloud:'<path d="M6.5 18H6a4 4 0 0 1-.8-7.9 7 7 0 0 1 13.3-1.6A4.8 4.8 0 0 1 18.5 18H17"/><path d="m9 16 3 3 5-5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
  download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  link:'<path d="m9 15 6-6M9 7l3-3a5 5 0 0 1 7 7l-3 3M15 17l-3 3a5 5 0 0 1-7-7l3-3"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  tasks:'<path d="m3 6 2 2 3-4m-5 9 2 2 3-4m-5 9 2 2 3-4M11 6h10M11 13h10M11 20h10"/>',
  brackets:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  sigma:'<path d="M19 4H5l8 8-8 8h14"/>',
  quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.2 8.5a3 3 0 0 1 5.7 1.2c0 2-3 2-3 4m0 3h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  warning:'<path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5m0 3h.01"/>',
  bulb:'<path d="M8 16a7 7 0 1 1 8 0l-1 3H9l-1-3Zm1 6h6M12 7v5"/>',
  grip:'<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
  video:'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
  steps:'<path d="M3 18h6v-6h6V6h6M3 21h18"/>',
  send:'<path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2"/>'
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.book}</svg>`;
const brand = (compact = false) => `<span class="brand-mark">${icon('book')}</span>${compact ? '' : '<span class="brand-name">Edu<span>Notes</span></span>'}`;

// STATE
let state = {
  courses: [],
  progress: {}, bookmarks: {}, myNotes: {},
  ui: { theme: 'system', role: 'studio', studioSplit: .51, device: 'mobile' }
};
const runtime = { treeOpen:{}, previewReady:false, activeLesson:null, saveTimer:null, previewTimer:null, quizRegistry:{} };

// FORMATTERS & PARSERS (Pulled from edunotes.js)
function parseFrontmatter(raw) {
  const normalized = String(raw || '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^\uFEFF?---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!match) return { meta: {}, content: normalized };
  const meta = {};
  let listKey = null;
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (field) {
      const key = field[1];
      let value = field[2].trim();
      if (value.startsWith('[') && value.endsWith(']')) {
        try { value = JSON.parse(value); } catch { value = value.slice(1, -1).split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean); }
      } else if (value.startsWith('"')) {
        try { value = JSON.parse(value); } catch { value = value.replace(/^"|"$/g, ''); }
      } else { value = value.replace(/^'|'$/g, ''); }
      meta[key] = value;
      listKey = value === '' ? key : null;
    } else if (listKey && /^\s+-\s/.test(line)) {
      if (!Array.isArray(meta[listKey])) meta[listKey] = [];
      meta[listKey].push(line.replace(/^\s+-\s*/, '').replace(/^['"]|['"]$/g, ''));
    }
  }
  return { meta, content: normalized.slice(match[0].length).replace(/^\n/, '') };
}

function serializeLesson(meta, content) {
  const fields = Object.entries(meta).map(([key, value]) => {
    const output = Array.isArray(value) ? JSON.stringify(value) : (/[\n:#"']/.test(String(value)) ? JSON.stringify(String(value)) : String(value));
    return `${key}: ${output}`;
  });
  return `---\n${fields.join('\n')}\n---\n\n${content}`;
}

const allLessons = () => state.courses.flatMap(course => [...(course.chapters || [])].sort((a,b)=>a.order-b.order).flatMap(chapter => [...(chapter.lessons || [])].sort((a,b)=>a.order-b.order).map(lesson => ({course,chapter,lesson}))));
const findLesson = id => allLessons().find(x => x.lesson.id === id);
const findChapter = id => state.courses.flatMap(course => course.chapters.map(chapter => ({course,chapter}))).find(x => x.chapter.id === id);
const lessonTitle = (lesson,preview=false) => parseFrontmatter(preview ? lesson.body : (lesson.publishedBody||lesson.body)).meta.title || lesson.title || 'Untitled lesson';
const lessonMeta = (lesson,preview=false) => ({...lesson.frontmatter,...parseFrontmatter(preview ? lesson.body : (lesson.publishedBody||lesson.body)).meta});
const isDark = () => state.ui.theme === 'dark' || (state.ui.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
const wordCount = text => parseFrontmatter(text).content.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`$|>]/g,' ').trim().split(/\s+/).filter(Boolean).length;
const blockCount = text => (parseFrontmatter(text).content.match(/^```\w*/gm) || []).length / 2;
const currentStudio = () => findLesson(runtime.activeLesson);

// INIT
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Load from local storage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { state = JSON.parse(saved); } catch {}
  }
  // If empty, create a blank starter subject
  if (!state.courses || !state.courses.length) {
    const now = new Date().toISOString();
    const meta = { title:'Welcome to Studio', subject:'general', grade:8, difficulty:'Easy', duration:5, tags:[], prerequisites:[] };
    state.courses = [{
      id:'general', subject:'general', title:'General', color:'#2563EB', icon:'book', description:'',
      chapters:[{
        id:'chapter-1', title:'Getting Started', order:0,
        lessons:[{ id:'lesson-1', title:meta.title, order:0, status:'draft', frontmatter:meta, body:serializeLesson(meta,'# Welcome to your new Studio!\n\nStart writing here.'), publishedBody:null, version:0, createdAt:now, updatedAt:now }]
      }]
    }];
    runtime.activeLesson = 'lesson-1';
  } else if (!runtime.activeLesson) {
    runtime.activeLesson = allLessons()[0]?.lesson.id;
  }

  bindEvents();
  applyTheme();
  renderApp();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const status = $('#studio-save-status');
    if (status) status.innerHTML = `${icon('cloud')} Saved <span class="save-time">${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span>`;
  } catch {}
}

function scheduleSave() {
  clearTimeout(runtime.saveTimer);
  runtime.saveTimer = setTimeout(() => persist(), 500);
}

function applyTheme() {
  document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
}

// RENDER CORE
function renderApp() {
  const found = currentStudio();
  if(found) {
    runtime.treeOpen[found.course.id] = true;
    runtime.treeOpen[found.chapter.id] = true;
  }
  document.body.className = 'studio-active';
  $('#app').innerHTML = studioHTML(found?.lesson);
  initializeStudio(found?.lesson);
}

function studioStatus(lesson) {
  if (!lesson) return {label:'No lesson selected',published:false};
  if (lesson.status==='draft') return {label:'Draft',published:false};
  if (lesson.body!==lesson.publishedBody) return {label:'Unpublished changes',published:false};
  return {label:'Published v'+(lesson.version||1),published:true};
}

function metadataChips(lesson,course) {
  const meta=lessonMeta(lesson,true);
  const tags=Array.isArray(meta.tags)?meta.tags:String(meta.tags||'').split(',').filter(Boolean);
  return `<button class="meta-chip subject-chip subject-${ea(course.subject)}" data-action="edit-meta" data-key="subject" aria-label="Edit subject">${icon(course.icon||'book')} ${e(course.title)}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="grade" aria-label="Edit grade">Grade ${e(meta.grade||8)}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="difficulty" aria-label="Edit difficulty">${icon('leaf')} ${e(meta.difficulty||'Easy')}</button>
    <button class="meta-chip" data-action="edit-meta" data-key="duration" aria-label="Edit reading duration">${icon('clock')} ${e(meta.duration||5)} min</button>`;
}

function courseTreeHTML() {
  const selected=currentStudio();
  return state.courses.map(course=>{
    const open=runtime.treeOpen[course.id] ?? selected?.course.id===course.id;
    return `<div class="tree-course subject-${ea(course.subject)}"><button class="tree-course-toggle" data-action="tree-course" data-course="${ea(course.id)}" aria-expanded="${open}">${icon(open?'down':'chevron')}${icon(course.icon||'book')}<span>${e(course.title)}</span></button><div ${open?'':'hidden'}>
      ${[...course.chapters].sort((a,b)=>a.order-b.order).map(chapter=>{
        const chapterOpen=runtime.treeOpen[chapter.id] ?? selected?.chapter.id===chapter.id;
        return `<div class="tree-chapter"><div class="tree-chapter-heading"><button class="tree-chapter-toggle" data-action="tree-chapter" data-chapter="${ea(chapter.id)}" aria-expanded="${chapterOpen}">${icon(chapterOpen?'down':'chevron')}<span>${e(chapter.title)}</span></button></div>
          <div ${chapterOpen?'':'hidden'}>${[...chapter.lessons].sort((a,b)=>a.order-b.order).map(lesson=>`<div class="tree-lesson ${lesson.id===runtime.activeLesson?'active':''}" data-lesson="${ea(lesson.id)}" data-chapter="${ea(chapter.id)}"><button class="drag-handle" draggable="true" data-action="lesson-menu" data-lesson="${ea(lesson.id)}">${icon('grip')}</button><button class="tree-lesson-link" data-action="route" data-route="#/studio/${ea(lesson.id)}" ${lesson.id===runtime.activeLesson?'aria-current="page"':''}><span class="status-dot ${lesson.status==='draft'||lesson.body!==lesson.publishedBody?'draft':''}"></span><span>${e(lessonTitle(lesson,true))}</span></button></div>`).join('')}<button class="tree-new-lesson" data-action="new-lesson" data-chapter="${ea(chapter.id)}">${icon('plus','sm')} Add lesson</button></div>
        </div>`;
      }).join('')}
    </div></div>`;
  }).join('');
}

function studioHTML(lesson) {
  const found=lesson?findLesson(lesson.id):null;
  const status=studioStatus(lesson);
  const device=state.ui.device||'mobile';
  
  return `<div class="studio-shell">
    <header class="studio-topbar">
      <a href="index.html" class="studio-library" style="text-decoration:none; color:inherit;">
        ${icon('arrowLeft','sm')}${brand(true)}<span>Exit to CBT</span>
      </a>
      <span class="topbar-divider"></span>
      <span class="studio-chapter-label" id="studio-chapter-label">Chapter: <strong>${e(found?.chapter.title || 'None')}</strong></span>
      ${lesson?`<button class="studio-status ${status.published?'published':''}" id="studio-status" data-action="status-menu"><span class="status-dot"></span><span>${e(status.label)}</span>${icon('down','sm')}</button>`:''}
      
      <div class="studio-topbar-actions">
        <!-- REPLACED WITH BUILDER ACTIONS -->
        <button class="btn" data-action="import">${icon('upload','sm')} Import</button>
        <button class="btn" data-action="export">${icon('download','sm')} Export</button>
        <button class="btn" data-action="toggle-preview">${icon('eye','sm')} Preview</button>
        <button class="btn btn-primary" data-action="publish">${icon('send','sm')} Publish</button>
        
        <button class="icon-btn" data-action="theme" style="margin-left: 10px;">${icon(isDark()?'sun':'moon')}</button>
      </div>
    </header>
    
    <div class="studio-main">
      <aside class="studio-tree" id="studio-tree">
        <div class="tree-heading"><h2 class="eyebrow">COURSE OUTLINE</h2><button class="icon-btn" data-action="new-subject">${icon('plus','sm')}</button></div>
        <div class="tree-scroll" id="course-tree-content">${courseTreeHTML()}</div>
      </aside>
      
      <div class="studio-workspace" id="studio-workspace" style="--studio-split:${Number(state.ui.studioSplit)||.51}">
        ${lesson?`
        <section class="editor-pane" aria-label="Lesson editor">
          <div class="editor-heading">
            <div class="editor-heading-label"><span class="eyebrow">LESSON EDITOR</span></div>
            <input class="lesson-title-input" id="lesson-title-input" type="text" value="${ea(lessonTitle(lesson,true))}" placeholder="Lesson Title">
            <div class="metadata-chips" id="metadata-chips">${metadataChips(lesson,found.course)}</div>
          </div>
          
          <div class="editor-toolbar">
            <button data-format="bold"><strong>B</strong></button>
            <button data-format="italic"><em>I</em></button>
            <span class="toolbar-separator"></span>
            <button data-format="h1">H1</button>
            <button data-format="h2">H2</button>
            <span class="toolbar-separator"></span>
            <button data-format="link">${icon('link')}</button>
            <button data-format="list">${icon('list')}</button>
            <button data-format="code">${icon('brackets')}</button>
            <span class="toolbar-separator"></span>
            <button data-format="math">${icon('sigma')}</button>
            <button data-format="quiz">${icon('quiz')}</button>
            <button data-format="callout">${icon('info')}</button>
          </div>
          
          <textarea class="editor-textarea" id="markdown-editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="Write your lesson here..."></textarea>
        </section>
        
        <div class="split-handle" id="split-handle" role="separator"></div>
        
        <section class="preview-pane" aria-label="Live student page preview">
          <div class="preview-toolbar">
            <span class="preview-label"><span class="status-dot"></span> LIVE PREVIEW</span>
          </div>
          <div class="preview-viewport">
            <div class="device-frame" id="device-frame" data-device="${device}">
              <div class="device-chrome"><i></i><i></i><i></i><span>edunotes / your lesson</span></div>
              <iframe id="preview-frame" title="Exact student-facing lesson preview"></iframe>
            </div>
          </div>
        </section>
        `:`<div class="empty-state" style="flex:1"><h2>No lesson selected</h2></div>`}
      </div>
    </div>
    
    <div class="validation-bar" id="validation-bar">${icon('checkCircle')} Ready</div>
    <footer class="studio-footer">
      <span class="studio-wordcount" id="studio-wordcount">${lesson?wordCount(lesson.body):0} words</span>
      <span class="studio-save-status" id="studio-save-status">${icon('cloud')} Saved locally</span>
    </footer>
  </div>`;
}

// STUDIO ENGINE
function initializeStudio(lesson) {
  if (!lesson) return;
  const editor=$('#markdown-editor');
  editor.value=lesson.body;
  editor.addEventListener('input',()=>updateStudioFromRaw(editor.value));
  
  $('#lesson-title-input').addEventListener('input',event=>{
    const parsed=parseFrontmatter(editor.value);
    parsed.meta.title=event.target.value;
    editor.value=serializeLesson(parsed.meta,parsed.content);
    updateStudioFromRaw(editor.value);
  });

  const frame=$('#preview-frame');
  runtime.previewReady=false;
  frame.addEventListener('load',()=>{runtime.previewReady=true;renderPreview();});
  
  // Inject the exact CSS into the iframe
  const cssText = document.querySelector('link[href="css/edunotes.css"]') ? `@import url('css/edunotes.css');` : '';
  const fonts=$('link[href*="fonts.googleapis.com/css2"]')?.outerHTML || '';
  const mathStyle=$('link[href*="katex.min.css"]')?.outerHTML || '';
  
  frame.srcdoc=`<!DOCTYPE html><html lang="en" data-theme="${isDark()?'dark':'light'}"><head><meta charset="UTF-8"><title>Preview</title>${fonts}${mathStyle}<style>${cssText}</style></head><body class="preview-document"><main id="preview-root"></main></body></html>`;
  
  $('#split-handle')?.addEventListener('pointerdown',beginResize);
  updateValidation();
  renderPreview();
}

function renderPreview() {
  const frame=$('#preview-frame');
  const found=currentStudio();
  if (!frame || !found || !runtime.previewReady) return;
  const root=frame.contentDocument?.getElementById('preview-root');
  if (!root) return;
  
  // Use a simplified renderer for the iframe
  const html = `<div class="reader-page">
    <header class="lesson-header"><h1>${e(lessonTitle(found.lesson,true))}</h1></header>
    <div class="lesson-body">${renderMarkdown(found.lesson.body)}</div>
  </div>`;
  
  root.innerHTML = html;
  
  // Render math inside iframe
  if(frame.contentWindow.katex) {
    root.querySelectorAll('[data-latex]').forEach(node => {
      try { frame.contentWindow.katex.render(node.dataset.latex, node, { displayMode: node.dataset.display === 'true', throwOnError: false }); } catch {}
    });
  }
}

function updateStudioFromRaw(raw) {
  const found=currentStudio();
  if(!found) return;
  const lesson=found.lesson;
  lesson.body=raw;
  const parsed=parseFrontmatter(raw);
  lesson.title=parsed.meta.title || 'Untitled lesson';
  lesson.frontmatter={...lesson.frontmatter,...parsed.meta};
  lesson.updatedAt=new Date().toISOString();
  
  renderCourseTree(); // refresh tree title
  
  clearTimeout(runtime.previewTimer);
  runtime.previewTimer = setTimeout(() => {
    renderPreview();
    updateValidation();
  }, 400);
  
  const count=$('#studio-wordcount');
  if(count) count.innerHTML=`${wordCount(lesson.body)} words &middot; ${Math.floor(blockCount(lesson.body))} blocks`;
  
  scheduleSave();
}

function renderCourseTree() {
  const tree=$('#course-tree-content');
  if(tree) tree.innerHTML=courseTreeHTML();
}

function updateValidation() {
  const lesson=currentStudio()?.lesson;
  const bar=$('#validation-bar');
  if(!lesson || !bar) return;
  const issues=[];
  const fences=(lesson.body.match(/^```/gm) || []).length;
  if (fences%2!==0) issues.push('Unbalanced code fences');
  
  if(issues.length) {
    bar.innerHTML=`${icon('warning')} ${issues.length} issue(s) found`;
    bar.style.color='var(--warning-ink)';
  } else {
    bar.innerHTML=`${icon('checkCircle')} All checks passed`;
    bar.style.color='var(--muted)';
  }
}

// SIMPLIFIED MARKDOWN RENDERER (For iframe)
function renderMarkdown(source) {
  if (!source) return '<p class="text-lo italic">No content yet.</p>';
  let prepared = String(source).replace(/^```(quiz|callout|math|steps|video)[ \t]*\n([\s\S]*?)^```[ \t]*(?:\n|$)/gmi, (_, type, raw) => {
     return `\n\n<div class="custom-block">${raw}</div>\n\n`;
  });
  
  let html = '';
  if (window.marked) {
    html = marked.parse(parseFrontmatter(prepared).content, { gfm: true });
  } else {
    html = prepared.split(/\n\n+/).map(p => `<p>${e(p)}</p>`).join('');
  }
  
  const container = document.createElement('div');
  container.innerHTML = html;
  
  container.querySelectorAll('p, li, td, th, span, strong, em').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\$\$([^$]+?)\$\$/g, (_, m) => `<span class="math-display" data-latex="${ea(m)}" data-display="true"></span>`)
                               .replace(/\$([^\n$]+?)\$/g, (_, m) => `<span class="math-inline" data-latex="${ea(m)}" data-display="false"></span>`);
  });
  
  return container.innerHTML;
}

function beginResize(event) {
  if (event.button!==0) return;
  event.preventDefault();
  const handle=event.currentTarget;
  handle.classList.add('dragging');
  $('#preview-frame').style.pointerEvents='none';
  document.body.style.cursor='col-resize';
  const move=moveEvent=>{
    const rect=$('#studio-workspace').getBoundingClientRect();
    const val = Math.max(.3, Math.min(.7, (moveEvent.clientX-rect.left)/rect.width));
    $('#studio-workspace').style.setProperty('--studio-split', String(val));
    state.ui.studioSplit = val;
  };
  const end=()=>{
    handle.classList.remove('dragging');
    if($('#preview-frame')) $('#preview-frame').style.pointerEvents='';
    document.body.style.cursor='';
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',end);
    window.removeEventListener('pointercancel',end);
    scheduleSave();
  };
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',end);
  window.addEventListener('pointercancel',end);
}

/* ============================================================
   GITHUB PUBLISHING & EXPORTING (The Builder Feature)
   ============================================================ */
function buildBankText() {
  let text = 'Subject: ' + (currentStudio()?.course.title || 'Untitled Subject') + '\n';
  const chapters = currentStudio()?.course.chapters || [];
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      text += '\nTopic: ' + chapter.title + '\n\n';
      text += 'Lesson: ' + (lesson.title || 'Untitled lesson') + '\n\n';
      text += (lesson.body || '').trim() + '\n\n';
    }
  }
  return text.trim();
}

function buildJSExport() {
  const escaped = buildBankText().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(\`${escaped}\`);\n`;
}

async function executePublish() {
  const owner = $('#gh-owner').value.trim();
  const repo = $('#gh-repo').value.trim();
  const filename = $('#publish-filename').value.trim();
  if (!owner || !repo || !filename) return showToast('Fill owner, repo, filename.', 'warning');

  localStorage.setItem(LS_CREDS, JSON.stringify({ owner, repo }));
  const btn = $('#publish-btn');
  btn.disabled = true; btn.textContent = 'Publishing…';

  try {
    const res = await fetch('/api/publish-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, code: buildJSExport(), repoOwner: owner, repoName: repo })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Publish failed');

    showToast('Published to GitHub.', 'success');
    $('#script-tag-text').textContent = `<script defer src="notes-banks/${filename}"></script>`;
    $('#publish-script-tag').classList.remove('hidden');
    btn.textContent = 'Published!';
  } catch (e) {
    showToast('Publish failed: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Publish';
  }
}

/* ============================================================
   EVENT BINDINGS
   ============================================================ */
function showToast(message, type = 'info') {
  const host = $('#toast-host');
  const el = document.createElement('div');
  el.className = `toast`; el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function openModal(id) { const m = $('#'+id); if(m){ m.classList.remove('hidden'); m.classList.add('flex'); } }
function closeModal(id) { const m = $('#'+id); if(m){ m.classList.add('hidden'); m.classList.remove('flex'); } }

function bindEvents() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    const fmt = e.target.closest('[data-format]');
    
    if (fmt) {
      e.preventDefault();
      const editor = $('#markdown-editor');
      const type = fmt.dataset.format;
      const scaffolds = {
        bold: '**bold**', italic: '*italic*', h1: '\n# Heading\n', h2: '\n## Heading\n',
        link: '[link](https://)', list: '\n- item\n', code: '\n```javascript\n// code\n```\n',
        math: '\n```math\nx = 1\n```\n', quiz: '\n```quiz\nquestion: ...\noptions:\n  - A\n  - B\nanswer: 1\nexplanation: ...\n```\n',
        callout: '\n```callout\ntype: tip\ntitle: Note\nContent\n```\n'
      };
      if (scaffolds[type] && editor) {
        editor.setRangeText(scaffolds[type], editor.selectionStart, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
      }
      return;
    }

    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'theme') { state.ui.theme = isDark() ? 'light' : 'dark'; applyTheme(); renderApp(); scheduleSave(); }
    if (action === 'toggle-preview') { document.body.classList.toggle('preview-open'); }
    if (action === 'new-subject') { /* Simplified: creates a new lesson in General */ }
    if (action === 'new-lesson') {
      const found = findChapter(btn.dataset.chapter);
      if(found) {
        const meta = { title:'New Lesson', subject:found.course.id, grade:8, difficulty:'Easy', duration:5 };
        const lesson = { id:uid('lesson'), title:meta.title, order:found.chapter.lessons.length, status:'draft', frontmatter:meta, body:serializeLesson(meta,'## New Lesson\n\nStart writing...'), publishedBody:null, version:0, createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
        found.chapter.lessons.push(lesson);
        runtime.activeLesson = lesson.id;
        persist(); renderApp();
      }
    }
    if (action === 'route') {
      const match = btn.dataset.route.match(/#\/studio\/(.*)/);
      if(match) { runtime.activeLesson = match[1]; renderApp(); }
    }
    if (action === 'tree-course') { runtime.treeOpen[btn.dataset.course] = !runtime.treeOpen[btn.dataset.course]; renderCourseTree(); }
    if (action === 'tree-chapter') { runtime.treeOpen[btn.dataset.chapter] = !runtime.treeOpen[btn.dataset.chapter]; renderCourseTree(); }
    
    if (action === 'publish') { 
      const c = JSON.parse(localStorage.getItem(LS_CREDS)||'{}');
      $('#gh-owner').value = c.owner||''; $('#gh-repo').value = c.repo||'';
      $('#publish-filename').value = slugify(currentStudio()?.course.title||'notes')+'-notes.js';
      $('#publish-script-tag').classList.add('hidden');
      openModal('modal-publish'); 
    }
    if (action === 'export') {
      $('#export-preview').textContent = buildJSExport();
      openModal('modal-export');
    }
    
    if (action === 'close-dialog') btn.closest('dialog')?.close();
  });

  document.addEventListener('DOMContentLoaded', () => {
    // Bind Modal buttons
    $('#publish-btn').onclick = executePublish;
    $('#export-download').onclick = () => {
      const blob = new Blob([buildJSExport()], {type:'text/javascript'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'notes.js'; a.click();
    };
    $('#export-copy').onclick = () => {
      navigator.clipboard.writeText(buildJSExport());
      showToast('Copied!', 'success');
    };
  });
}
