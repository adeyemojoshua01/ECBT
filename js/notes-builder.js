// ============================================================
// EDUNOTES STUDIO — Notes Builder Core Logic
// ============================================================

'use strict';

const LS_STATE = 'cbt_notes_builder_v3';
const LS_CREDS = 'cbt_notes_builder_creds';

const state = {
  subjects: [],
  activeSubjectId: null,
  activeTopicId: null,
  activeLessonId: null,
  device: 'mobile',
  dirty: false,
  mobileTreeOpen: false
};

let saveTimer = null;
let previewTimer = null;
let pendingImport = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadState();
  if (!state.subjects.length) {
    createBlankBank();
  }
  bindHeader();
  bindShortcuts();
  bindImportTabs();
  bindDeviceButtons();
  renderAll();
}

/* ============================================================
   STATE & PERSISTENCE
   ============================================================ */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.subjects)) {
        state.subjects = parsed.subjects;
        state.activeSubjectId = parsed.activeSubjectId;
        state.activeTopicId = parsed.activeTopicId;
        state.activeLessonId = parsed.activeLessonId;
        state.device = parsed.device || 'mobile';
      }
    }
  } catch (e) {}
}

function persist(showFeedback = false) {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
    flashSaved('Saved');
  } catch (e) {
    flashSaved('Storage Error', true);
  }
}

function scheduleSave() {
  state.dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { persist(); state.dirty = false; }, 400);
}

function flashSaved(text, isError = false) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.innerHTML = isError ? '⚠ ' + text : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ' + text;
  el.className = 'text-xs font-medium mr-2 flex items-center gap-1 transition-opacity ' + (isError ? 'text-rose' : 'text-success');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

/* ============================================================
   HELPERS
   ============================================================ */
function createBlankBank() {
  const subId = 'sub_' + Date.now();
  const topId = 'top_' + Date.now();
  const lesId = 'les_' + Date.now();
  state.subjects.push({
    id: subId, name: 'Untitled Subject', color: 'brand', desc: '',
    topics: [{ id: topId, name: 'Introduction', lessons: [
      { id: lesId, title: 'New lesson', body: '# New lesson\n\nStart writing here.', meta: { grade: 8, difficulty: 'Easy', duration: 5 } }
    ]}]
  });
  state.activeSubjectId = subId;
  state.activeTopicId = topId;
  state.activeLessonId = lesId;
  persist();
}

function getActive() {
  const sub = state.subjects.find(s => s.id === state.activeSubjectId);
  if (!sub) return {};
  const top = sub.topics.find(t => t.id === state.activeTopicId);
  if (!top) return { sub };
  const les = top.lessons.find(l => l.id === state.activeLessonId);
  return { sub, top, les };
}

function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subject'; }
function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

function toggleMobileTree() {
  state.mobileTreeOpen = !state.mobileTreeOpen;
  const panel = document.getElementById('left-panel');
  const backdrop = document.getElementById('mobile-backdrop');
  if (state.mobileTreeOpen) {
    panel.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
  } else {
    panel.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

function toggleMobilePreview() {
  const modal = document.getElementById('modal-preview');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderPreview();
    document.getElementById('mobile-preview-content').innerHTML = document.getElementById('preview-content').innerHTML;
    hydrateMath(document.getElementById('mobile-preview-content'));
  } else {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
function addSubject() {
  const subId = 'sub_' + Date.now();
  state.subjects.push({ id: subId, name: 'New Subject', color: 'brand', desc: '', topics: [] });
  state.activeSubjectId = subId;
  state.activeTopicId = null; state.activeLessonId = null;
  renderAll();
  scheduleSave();
}

function addTopic() {
  const { sub } = getActive();
  if (!sub) return;
  const topId = 'top_' + Date.now();
  sub.topics.push({ id: topId, name: 'New Topic', lessons: [] });
  state.activeTopicId = topId;
  state.activeLessonId = null;
  renderAll();
  scheduleSave();
}

function addLesson(topicId) {
  const { sub } = getActive();
  const top = sub.topics.find(t => t.id === topicId);
  if (!top) return;
  const lesId = 'les_' + Date.now();
  top.lessons.push({ id: lesId, title: 'New lesson', body: '# New lesson\n\nStart writing here.', meta: { grade: 8, difficulty: 'Easy', duration: 5 } });
  state.activeTopicId = topicId;
  state.activeLessonId = lesId;
  renderAll();
  scheduleSave();
  if (state.mobileTreeOpen) toggleMobileTree();
}

function selectLesson(subId, topId, lesId) {
  state.activeSubjectId = subId;
  state.activeTopicId = topId;
  state.activeLessonId = lesId;
  renderAll();
  if (state.mobileTreeOpen) toggleMobileTree();
}

function selectSubject() {
  state.activeLessonId = null;
  state.activeTopicId = null;
  renderAll();
  if (state.mobileTreeOpen) toggleMobileTree();
}

function deleteLesson() {
  const { sub, top } = getActive();
  if (!sub || !top || !state.activeLessonId) return;
  if (!confirm('Delete this lesson?')) return;
  top.lessons = top.lessons.filter(l => l.id !== state.activeLessonId);
  state.activeLessonId = top.lessons.length ? top.lessons[0].id : null;
  renderAll();
  scheduleSave();
}

/* ============================================================
   RENDERING
   ============================================================ */
function renderAll() {
  renderTree();
  renderCenter();
  renderPreview();
  updateFooter();
}

function renderTree() {
  const container = document.getElementById('tree-scroll');
  container.innerHTML = '';
  
  state.subjects.forEach(sub => {
    const subDiv = document.createElement('div');
    subDiv.className = 'mb-2';
    
    const subRow = document.createElement('div');
    subRow.className = 'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-ink-800 transition-colors ' + (state.activeSubjectId === sub.id ? 'text-hi font-semibold' : 'text-mid');
    subRow.innerHTML = `<svg class="w-4 h-4 text-${sub.color || 'brand'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> <span class="flex-1 truncate text-sm">${escapeHtml(sub.name)}</span>`;
    subRow.onclick = () => { state.activeSubjectId = sub.id; renderAll(); };
    subDiv.appendChild(subRow);
    
    if (state.activeSubjectId === sub.id) {
      const topWrap = document.createElement('div');
      topWrap.className = 'ml-4 pl-2 border-l border-ink-700 mt-1 space-y-0.5';
      
      sub.topics.forEach(top => {
        const topRow = document.createElement('div');
        topRow.className = 'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs hover:bg-ink-800 transition-colors ' + (state.activeTopicId === top.id ? 'text-hi' : 'text-lo');
        topRow.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg> <span class="flex-1 truncate">${escapeHtml(top.name)}</span>`;
        topRow.onclick = (e) => { e.stopPropagation(); state.activeTopicId = top.id; renderAll(); };
        topWrap.appendChild(topRow);
        
        if (state.activeTopicId === top.id) {
          const lesWrap = document.createElement('div');
          lesWrap.className = 'ml-3 pl-2 border-l border-ink-700 mt-1 space-y-0.5';
          
          top.lessons.forEach(les => {
            const isActive = state.activeLessonId === les.id;
            const lesRow = document.createElement('div');
            lesRow.className = 'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ' + (isActive ? 'bg-brand/10 text-brand-light border-l-2 border-brand -ml-[2px]' : 'text-mid hover:bg-ink-800');
            lesRow.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${isActive?'bg-brand':'bg-ink-600'} shrink-0"></span> <span class="truncate flex-1">${escapeHtml(les.title)}</span>`;
            lesRow.onclick = (e) => { e.stopPropagation(); selectLesson(sub.id, top.id, les.id); };
            lesWrap.appendChild(lesRow);
          });
          
          const addLesBtn = document.createElement('button');
          addLesBtn.className = 'w-full text-left px-2 py-1.5 text-xs text-lo hover:text-hi mt-1';
          addLesBtn.innerHTML = '+ Add lesson';
          addLesBtn.onclick = (e) => { e.stopPropagation(); addLesson(top.id); };
          lesWrap.appendChild(addLesBtn);
          topWrap.appendChild(lesWrap);
        }
      });
      
      const addTopBtn = document.createElement('button');
      addTopBtn.className = 'w-full text-left px-2 py-1.5 text-xs text-lo hover:text-hi mt-2';
      addTopBtn.innerHTML = '+ New chapter';
      addTopBtn.onclick = (e) => { e.stopPropagation(); addTopic(); };
      topWrap.appendChild(addTopBtn);
      
      subDiv.appendChild(topWrap);
    }
    container.appendChild(subDiv);
  });
}

function renderCenter() {
  const pane = document.getElementById('center-pane');
  const { sub, top, les } = getActive();
  
  if (!sub) {
    pane.innerHTML = '<div class="flex items-center justify-center h-full text-lo">Select a lesson or create a new subject.</div>';
    return;
  }
  
  if (!les) {
    pane.innerHTML = `
      <div class="max-w-3xl mx-auto p-6 space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-hi">Subject Settings</h1>
          <button onclick="addTopic()" class="px-3 py-1.5 text-sm bg-brand text-white rounded-lg">+ Add Chapter</button>
        </div>
        <div>
          <label class="block text-xs font-semibold text-lo uppercase mb-1">Subject Name</label>
          <input id="sub-name" type="text" value="${escapeHtml(sub.name)}" class="w-full bg-ink-800 text-lg font-bold text-hi border border-ink-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand">
        </div>
        <div>
          <label class="block text-xs font-semibold text-lo uppercase mb-1">Description</label>
          <textarea id="sub-desc" rows="3" class="w-full bg-ink-800 text-sm text-hi border border-ink-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand">${escapeHtml(sub.desc || '')}</textarea>
        </div>
        <div class="pt-6 border-t border-ink-700 flex justify-end">
          <button onclick="deleteSubject()" class="px-4 py-2 text-sm text-rose hover:bg-rose/10 rounded-lg">Delete Subject</button>
        </div>
      </div>`;
    setTimeout(() => {
      document.getElementById('sub-name').addEventListener('input', e => { sub.name = e.target.value; renderTree(); scheduleSave(); });
      document.getElementById('sub-desc').addEventListener('input', e => { sub.desc = e.target.value; scheduleSave(); });
    }, 0);
    return;
  }

  pane.innerHTML = `
    <div class="flex-1 flex flex-col h-full">
      <div class="p-6 pb-2 shrink-0">
        <button onclick="selectSubject()" class="text-xs font-medium text-lo hover:text-hi mb-4 flex items-center gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg> Back to Settings
        </button>
        <input id="les-title" type="text" value="${escapeHtml(les.title)}" class="w-full bg-transparent text-3xl font-bold text-hi focus:outline-none placeholder-ink-600 mb-4" placeholder="Lesson title...">
        
        <div class="flex flex-wrap gap-2 mb-6">
          <div class="chip text-${sub.color || 'brand'}"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg> ${escapeHtml(sub.name)}</div>
          <div class="chip">Grade ${les.meta.grade || 8}</div>
          <div class="chip">${les.meta.difficulty || 'Easy'}</div>
          <div class="chip">${les.meta.duration || 5} min</div>
          <div class="chip">+ Tags</div>
        </div>
      </div>

      <div class="px-6 py-2 border-y border-ink-700 bg-ink-900/50 flex items-center gap-1 overflow-x-auto text-mid shrink-0">
        <button onclick="insertFormat('bold')" class="p-1.5 hover:bg-ink-700 rounded text-sm font-bold">B</button>
        <button onclick="insertFormat('italic')" class="p-1.5 hover:bg-ink-700 rounded text-sm italic">I</button>
        <span class="w-px h-4 bg-ink-700 mx-1"></span>
        <button onclick="insertFormat('h1')" class="p-1.5 hover:bg-ink-700 rounded text-xs font-bold">H1</button>
        <button onclick="insertFormat('h2')" class="p-1.5 hover:bg-ink-700 rounded text-xs font-bold">H2</button>
        <span class="w-px h-4 bg-ink-700 mx-1"></span>
        <button onclick="insertFormat('link')" class="p-1.5 hover:bg-ink-700 rounded text-xs">🔗</button>
        <button onclick="insertFormat('list')" class="p-1.5 hover:bg-ink-700 rounded text-xs">≡</button>
        <button onclick="insertFormat('code')" class="p-1.5 hover:bg-ink-700 rounded text-xs">&lt;/&gt;</button>
        <span class="w-px h-4 bg-ink-700 mx-1"></span>
        <button onclick="insertFormat('math')" class="p-1.5 hover:bg-ink-700 rounded text-xs font-serif italic">Σ</button>
        <button onclick="insertFormat('quiz')" class="p-1.5 hover:bg-ink-700 rounded text-xs">?</button>
        <button onclick="insertFormat('callout')" class="p-1.5 hover:bg-ink-700 rounded text-xs">💡</button>
      </div>

      <div class="flex-1 overflow-hidden relative">
        <textarea id="les-body" spellcheck="false" class="w-full h-full bg-canvas text-hi font-mono text-sm p-6 resize-none focus:outline-none leading-relaxed" style="tab-size: 2">${escapeHtml(les.body)}</textarea>
      </div>
    </div>
  `;

  setTimeout(() => {
    document.getElementById('les-title').addEventListener('input', e => {
      les.title = e.target.value;
      renderTree();
      scheduleSave();
    });
    document.getElementById('les-body').addEventListener('input', e => {
      les.body = e.target.value;
      scheduleSave();
      updateFooter();
      clearTimeout(previewTimer);
      previewTimer = setTimeout(renderPreview, 400);
    });
    document.getElementById('les-body').addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        e.target.setRangeText('  ', start, e.target.selectionEnd, 'end');
        e.target.dispatchEvent(new Event('input'));
      }
    });
  }, 0);
}

function renderPreview() {
  const el = document.getElementById('preview-content');
  const { les } = getActive();
  if (!les) { el.innerHTML = '<div class="text-lo italic text-sm">Select a lesson to preview.</div>'; return; }
  
  el.innerHTML = `<h1>${escapeHtml(les.title)}</h1>` + renderMarkdown(les.body);
  hydrateMath(el);
}

function updateFooter() {
  const { les } = getActive();
  const wc = document.getElementById('word-count');
  const vb = document.getElementById('validation-btn');
  const vt = document.getElementById('validation-text');
  
  if (!les) {
    wc.textContent = '0 words · 0 blocks';
    vb.className = 'flex items-center gap-1.5 text-lo cursor-default';
    vt.textContent = 'Ready';
    return;
  }
  
  const words = (les.body || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`$|>]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const blocks = ((les.body || '').match(/^```\w+/gm) || []).length;
  wc.textContent = `${words} words · ${blocks} blocks`;
  
  const issues = validateLesson(les.body);
  if (issues.length) {
    vb.className = 'flex items-center gap-1.5 text-amber';
    vt.textContent = `${issues.length} check${issues.length>1?'s':''} needed`;
  } else {
    vb.className = 'flex items-center gap-1.5 text-success';
    vt.textContent = 'All checks passed';
  }
}

function validateLesson(body) {
  const issues = [];
  if (!body.trim()) { issues.push('Lesson is empty'); return issues; }
  const fences = (body.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) issues.push('Unbalanced code fences');
  return issues;
}

/* ============================================================
   MARKDOWN PARSER
   ============================================================ */
function renderMarkdown(source) {
  if (!source) return '';
  const blocks = [];
  let prepared = String(source).replace(/^```(quiz|callout|math|steps|video)[ \t]*\n([\s\S]*?)^```[ \t]*(?:\n|$)/gmi, (_, type, raw) => {
    blocks.push(renderBlock(type.toLowerCase(), raw));
    return `\n\n<div data-block="${blocks.length - 1}"></div>\n\n`;
  });

  let html = window.marked ? marked.parse(prepared, { gfm: true }) : `<p>${escapeHtml(prepared)}</p>`;
  if (window.DOMPurify) {
    html = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['a','blockquote','br','code','del','div','em','h1','h2','h3','h4','hr','img','input','li','ol','p','pre','span','strong','table','thead','tbody','td','th','tr','ul','sub','sup'],
      ALLOWED_ATTR: ['href','src','alt','title','class','type','checked','disabled','data-block'],
      ALLOW_DATA_ATTR: true
    });
  }
  const container = document.createElement('div');
  container.innerHTML = html;
  container.querySelectorAll('[data-block]').forEach(node => {
    const div = document.createElement('div');
    div.innerHTML = blocks[Number(node.dataset.block)] || '';
    node.replaceWith(div.firstElementChild || div);
  });
  container.querySelectorAll('p, li, td, th, span, strong, em').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\$\$([^$]+?)\$\$/g, (_, m) => `<span class="math-display" data-latex="${escapeHtml(m)}" data-display="true"></span>`).replace(/\$([^\n$]+?)\$/g, (_, m) => `<span class="math-inline" data-latex="${escapeHtml(m)}" data-display="false"></span>`);
  });
  return container.innerHTML;
}

function renderBlock(type, raw) {
  if (type === 'quiz') return renderQuizBlock(raw);
  if (type === 'math') return `<div class="math-display" data-latex="${escapeHtml(raw.trim())}" data-display="true"></div>`;
  if (type === 'callout') {
    let variant = 'note', title = 'Note';
    const content = raw.split('\n').filter(l => {
      if (/^type:/i.test(l)) { variant = l.split(':')[1].trim(); return false; }
      if (/^title:/i.test(l)) { title = l.split(':')[1].trim(); return false; }
      return true;
    }).join('\n');
    return `<div class="callout ${variant}"><div><div class="callout-title">${escapeHtml(title)}</div><div>${escapeHtml(content)}</div></div></div>`;
  }
  if (type === 'steps') {
    const steps = raw.trim().split(/\n(?=\d+[.)]\s|[-*]\s)/).map(l => l.replace(/^(?:\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean);
    return `<ol class="worked-steps">${steps.map((s, i) => `<li><span class="step-num">${i + 1}</span><div>${escapeHtml(s)}</div></li>`).join('')}</ol>`;
  }
  return '';
}

function renderQuizBlock(raw) {
  let data = { options: [] };
  let current = '';
  raw.split('\n').forEach(l => {
    const f = l.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (f) { current = f[1].toLowerCase(); if (current !== 'options') data[current] = f[2].trim(); }
    else if (current === 'options' && /^\s*-\s+/.test(l)) data.options.push(l.replace(/^\s*-\s+/, '').trim());
  });
  const answerIdx = Number(data.answer) - 1;
  return `<div class="quiz-block">
    <div class="text-[10px] font-bold text-brand-light uppercase tracking-widest mb-2">Check your understanding</div>
    <div class="text-sm font-semibold mb-4 text-hi">${escapeHtml(data.question || 'Question')}</div>
    ${data.options.map((opt, i) => `<div class="quiz-option ${i === answerIdx ? 'correct' : ''}"><span class="w-5 h-5 rounded-full border border-ink-600 flex items-center justify-center text-[10px]">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(opt)}</span></div>`).join('')}
  </div>`;
}

function hydrateMath(root) {
  if (!window.katex) return;
  root.querySelectorAll('[data-latex]').forEach(node => {
    if (node.dataset.rendered === 'true') return;
    try {
      katex.render(node.dataset.latex, node, { displayMode: node.dataset.display === 'true', throwOnError: false });
      node.dataset.rendered = 'true';
    } catch {}
  });
}

/* ============================================================
   TOOLBAR INSERT
   ============================================================ */
const SCAFFOLDS = {
  bold: () => '**bold text**', italic: () => '*italic text*', h1: () => '\n# Heading\n', h2: () => '\n## Heading\n',
  link: () => '[link](url)', list: () => '\n- item\n', code: () => '\n```\ncode\n```\n',
  math: () => '\n```math\nx = \\frac{a}{b}\n```\n', quiz: () => '\n```quiz\nquestion: Question?\noptions:\n  - Option A\n  - Option B\n  - Option C\nanswer: 1\nexplanation: Because...\n```\n',
  callout: () => '\n```callout\ntype: tip\ntitle: Title\nContent here.\n```\n'
};

function insertFormat(type) {
  const editor = document.getElementById('les-body');
  if (!editor) return;
  editor.focus();
  editor.setRangeText(SCAFFOLDS[type](), editor.selectionStart, editor.selectionEnd, 'end');
  editor.dispatchEvent(new Event('input'));
}

/* ============================================================
   EXPORT & IMPORT
   ============================================================ */
function buildBankText() {
  let out = '';
  state.subjects.forEach(sub => {
    out += `Subject: ${sub.name}\nDescription: ${sub.desc || ''}\n\n`;
    sub.topics.forEach(top => {
      out += `Topic: ${top.name}\n\n`;
      top.lessons.forEach(les => {
        out += `Lesson: ${les.title}\n\n${les.body.trim()}\n\n`;
      });
    });
  });
  return out.trim();
}

function openExportModal() {
  openModal('modal-export');
  const { sub } = getActive();
  document.getElementById('export-filename').value = (sub ? slugify(sub.name) : 'notes-bank') + '.js';
  updateExportPreview();
}

function updateExportPreview() {
  const format = document.querySelector('input[name="export-format"]:checked').value;
  const el = document.getElementById('export-preview');
  if (format === 'zip') {
    el.textContent = 'ZIP will contain individual .md files for each lesson.';
    document.getElementById('export-stats').textContent = 'ZIP';
  } else {
    const code = `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(\`${buildBankText().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\`);\n`;
    el.textContent = code;
    document.getElementById('export-stats').textContent = (new Blob([code]).size / 1024).toFixed(1) + ' KB';
  }
}

function downloadExport() {
  const format = document.querySelector('input[name="export-format"]:checked').value;
  const name = document.getElementById('export-filename').value || 'notes-bank.js';
  if (format === 'zip') {
    if (typeof JSZip === 'undefined') return showToast('Zip lib not loaded.', 'error');
    const zip = new JSZip();
    state.subjects.forEach(sub => {
      sub.topics.forEach(top => {
        top.lessons.forEach(les => {
          zip.file(`${slugify(sub.name)}/${slugify(les.title)}.md`, `# ${les.title}\n\n${les.body}`);
        });
      });
    });
    zip.generateAsync({ type: 'blob' }).then(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = slugify(state.subjects[0].name) + '.zip'; a.click();
      closeModal('modal-export');
    });
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([document.getElementById('export-preview').textContent], {type: 'text/javascript'})); a.download = name; a.click();
    closeModal('modal-export');
  }
}

function openImportModal() { openModal('modal-import'); }

function parsePasted() {
  const text = document.getElementById('import-paste').value;
  if (text) processImport(text);
}

function processImport(raw) {
  if (!raw) return;
  let clean = raw.replace(/window\.CBT_NOTE_BANKS\.push\(\s*`([\s\S]*?)`\s*\)/, '$1').replace(/\\`/g, '`');
  pendingImport = [];
  
  clean.split(/\n(?=Subject:\s*)/i).forEach(chunk => {
    if (!chunk.trim()) return;
    let sub = { name: 'Imported', desc: '', color: 'brand', topics: [] };
    let currentTop = null, currentLes = null, bodyLines = [];

    const flushLes = () => { if (currentLes) currentLes.body = bodyLines.join('\n').trim(); bodyLines = []; };

    chunk.split('\n').forEach(l => {
      if (l.match(/^Subject:/i)) { sub.name = l.replace(/^Subject:/i, '').trim(); return; }
      if (l.match(/^Description:/i)) { sub.desc = l.replace(/^Description:/i, '').trim(); return; }
      if (l.match(/^Topic:/i)) { flushLes(); currentLes = null; currentTop = { name: l.replace(/^Topic:/i, '').trim(), lessons: [] }; sub.topics.push(currentTop); return; }
      if (l.match(/^Lesson:/i)) { flushLes(); currentLes = { title: l.replace(/^Lesson:/i, '').trim(), body: '', meta: { grade: 8, difficulty: 'Easy', duration: 5 } }; if (currentTop) currentTop.lessons.push(currentLes); return; }
      if (currentLes) bodyLines.push(l);
    });
    flushLes();
    if (sub.topics.length) pendingImport.push(sub);
  });

  if (!pendingImport.length) return showToast('Could not parse file.', 'error');
  
  let totalLessons = pendingImport.reduce((a, s) => a + s.topics.reduce((b, t) => b + t.lessons.length, 0), 0);
  document.getElementById('import-summary').classList.remove('hidden');
  document.getElementById('import-summary-head').textContent = `Parsed: ${pendingImport.length} Subjects · ${totalLessons} Lessons`;
  document.getElementById('import-confirm').disabled = false;
}

function executeImport() {
  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  if (mode === 'replace') state.subjects = [];
  
  pendingImport.forEach(sub => {
    sub.id = 'sub_' + Math.random().toString(36).substr(2, 5);
    sub.topics.forEach(t => { t.id = 'top_' + Math.random().toString(36).substr(2, 5); t.lessons.forEach(l => l.id = 'les_' + Math.random().toString(36).substr(2, 5)); });
    state.subjects.push(sub);
  });
  
  state.activeSubjectId = state.subjects[0].id;
  state.activeTopicId = null; state.activeLessonId = null;
  persist(); renderAll(); closeModal('modal-import');
  showToast('Imported successfully', 'success');
}

/* ============================================================
   PUBLISH
   ============================================================ */
function openPublishModal() {
  openModal('modal-publish');
  const { sub } = getActive();
  document.getElementById('publish-filename').value = (sub ? slugify(sub.name) : 'notes') + '-notes.js';
  document.getElementById('publish-script-tag').classList.add('hidden');
  
  const issues = [];
  state.subjects.forEach(s => s.topics.forEach(t => t.lessons.forEach(l => { if (!l.body.trim()) issues.push(`"${l.title}" is empty`); })));
  
  document.getElementById('publish-preflight').innerHTML = issues.length 
    ? `<div class="text-amber font-semibold mb-1">${issues.length} issue(s) found:</div>` + issues.map(i => `<div>• ${escapeHtml(i)}</div>`).join('')
    : `<div class="text-success font-semibold">✓ Ready to publish</div><div class="mt-1">${state.subjects.length} Subjects · ${state.subjects.reduce((a,s)=>a+s.topics.length,0)} Chapters</div>`;
}

async function executePublish() {
  const owner = document.getElementById('gh-owner').value.trim();
  const repo = document.getElementById('gh-repo').value.trim();
  const filename = document.getElementById('publish-filename').value.trim();
  if (!owner || !repo || !filename) return showToast('Fill all fields', 'warning');
  
  const btn = document.getElementById('publish-btn');
  btn.disabled = true; btn.textContent = 'Publishing...';
  
  const code = `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(\`${buildBankText().replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')}\`);\n`;
  
  try {
    const res = await fetch('/api/publish-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, code, repoOwner: owner, repoName: repo })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    
    showToast('Published to GitHub!', 'success');
    document.getElementById('script-tag-text').textContent = `<script defer src="notes-banks/${filename}"></script>`;
    document.getElementById('publish-script-tag').classList.remove('hidden');
  } catch (e) {
    showToast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Publish';
  }
}

function copyScriptTag() {
  const text = document.getElementById('script-tag-text').textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!', 'success'));
}

/* ============================================================
   UTILS
   ============================================================ */
function showToast(msg, type = 'info') {
  const host = document.getElementById('toast-host');
  const colors = { info: 'bg-ink-800 border-ink-600 text-hi', success: 'bg-success/20 border-success text-success', warning: 'bg-amber/20 border-amber text-amber', error: 'bg-rose/20 border-rose text-rose' };
  const el = document.createElement('div');
  el.className = `px-4 py-2 rounded-lg border text-sm shadow-xl pointer-events-auto ${colors[type] || colors.info}`;
  el.textContent = msg; host.appendChild(el); setTimeout(() => el.remove(), 3000);
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('flex'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); }

function bindHeader() {}
function bindShortcuts() {}
function bindImportTabs() {
  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.import-tab').forEach(t => t.className = 'import-tab px-3 py-1.5 text-sm font-medium rounded-lg text-mid hover:bg-ink-800/50');
      tab.className = 'import-tab active px-3 py-1.5 text-sm font-medium rounded-lg bg-ink-800 text-hi';
      document.querySelectorAll('.import-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tab.dataset.tab));
    };
  });
}
function bindDeviceButtons() {
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('bg-ink-800', 'text-hi'));
      btn.classList.add('bg-ink-800', 'text-hi');
    };
  });
}
