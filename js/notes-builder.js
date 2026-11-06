'use strict';

const LS_STATE = 'cbt_notes_builder_v3';
const LS_UNDO  = 'cbt_notes_builder_undo_v3';
const LS_CREDS = 'cbt_notes_builder_creds';

const state = {
  subject: 'Untitled Subject',
  description: '',
  topics: [],
  selected: { topicIdx: 0, lessonIdx: null, subject: false },
  dirty: false,
  mobileTreeOpen: false,
  darkMode: false
};

const undo = { stack: [], redo: [] };
const MAX_UNDO = 50;
let saveTimer = null;
let previewTimer = null;
let pendingImport = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadState();
  restoreUndo();
  if (!state.topics.length) {
    state.topics.push({ name: 'Introduction', lessons: [] });
    state.selected = { topicIdx: 0, lessonIdx: null, subject: false };
  }
  
  // Set initial dark mode
  if (state.darkMode) document.documentElement.classList.add('dark');
  
  bindHeader();
  bindShortcuts();
  bindImportTabs();
  renderAll();
}

/* ============================================================
   STATE PERSISTENCE
   ============================================================ */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.topics)) {
      state.subject = parsed.subject || 'Untitled Subject';
      state.description = parsed.description || '';
      state.topics = parsed.topics;
      state.selected = parsed.selected || { topicIdx: 0, lessonIdx: null, subject: false };
      state.darkMode = parsed.darkMode || false;
    }
  } catch (e) { console.warn('loadState failed', e); }
}

function restoreUndo() {
  try {
    const raw = localStorage.getItem(LS_UNDO);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed) {
      undo.stack = (parsed.stack || []).slice(-10);
      undo.redo = [];
    }
  } catch {}
}

function persist() {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify({
      subject: state.subject,
      description: state.description,
      topics: state.topics,
      selected: state.selected,
      darkMode: state.darkMode
    }));
    localStorage.setItem(LS_UNDO, JSON.stringify({ stack: undo.stack.slice(-10) }));
    flashSaved('Saved');
    const status = document.getElementById('save-status');
    if (status) status.textContent = 'Saved ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (e) {
    flashSaved('Storage unavailable', true);
    const status = document.getElementById('save-status');
    if (status) status.textContent = 'Not saved: storage unavailable';
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
  el.textContent = '💾 ' + text;
  el.className = 'text-xs font-medium ml-2 transition-opacity ' + (isError ? 'text-danger' : 'text-success');
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

/* ============================================================
   UNDO / REDO
   ============================================================ */
function snapshot() {
  try {
    const copy = JSON.stringify({
      subject: state.subject,
      description: state.description,
      topics: state.topics,
      selected: state.selected
    });
    const last = undo.stack[undo.stack.length - 1];
    if (last === copy) return;
    undo.stack.push(copy);
    if (undo.stack.length > MAX_UNDO) undo.stack.shift();
    undo.redo = [];
    updateUndoButtons();
  } catch {}
}

function applySnapshot(json) {
  try {
    const obj = JSON.parse(json);
    state.subject = obj.subject;
    state.description = obj.description;
    state.topics = obj.topics;
    state.selected = obj.selected;
    renderAll();
    persist();
  } catch (e) { console.warn(e); }
}

function doUndo() {
  if (undo.stack.length < 2) return;
  const current = undo.stack.pop();
  undo.redo.push(current);
  applySnapshot(undo.stack[undo.stack.length - 1]);
  updateUndoButtons();
}

function doRedo() {
  if (!undo.redo.length) return;
  const next = undo.redo.pop();
  undo.stack.push(next);
  applySnapshot(next);
  updateUndoButtons();
}

function updateUndoButtons() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if (u) u.disabled = undo.stack.length < 2;
  if (r) r.disabled = !undo.redo.length;
}

function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  document.documentElement.classList.toggle('dark', state.darkMode);
  scheduleSave();
}

/* ============================================================
   HEADER EVENTS & NAVIGATION
   ============================================================ */
function bindHeader() {
  const subjectInput = document.getElementById('subject-input');
  if (subjectInput) {
    subjectInput.value = state.subject;
    subjectInput.addEventListener('input', e => {
      snapshot();
      state.subject = e.target.value;
      scheduleSave();
    });
  }
  document.getElementById('btn-undo').onclick = doUndo;
  document.getElementById('btn-redo').onclick = doRedo;
  document.getElementById('tree-search').addEventListener('input', renderTree);
}

function toggleMobileTree() {
  state.mobileTreeOpen = !state.mobileTreeOpen;
  const panel = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-backdrop');
  if (state.mobileTreeOpen) {
    panel.classList.remove('-translate-x-full');
    backdrop.classList.remove('hidden');
    renderMobileTree();
  } else {
    panel.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  }
}

function toggleMobilePreview() {
  const modal = document.getElementById('modal-mobile-preview');
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderPreview();
    const content = document.getElementById('mobile-preview-content');
    content.innerHTML = document.getElementById('preview-content').innerHTML;
    hydrateMath(content);
  } else {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function bindShortcuts() {
  document.addEventListener('keydown', e => {
    const cmd = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (cmd && key === 's') { e.preventDefault(); persist(); return; }
    if (cmd && e.key === 'Enter') { e.preventDefault(); openPublishModal(); return; }
    if (cmd && key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
    if (cmd && key === 'z' && e.shiftKey) { e.preventDefault(); doRedo(); return; }
    if (cmd && key === 'y') { e.preventDefault(); doRedo(); return; }
    if (e.key === 'Escape') {
      document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(m => {
        m.classList.add('hidden');
        m.classList.remove('flex');
      });
      if (state.mobileTreeOpen) toggleMobileTree();
    }
  });
}

/* ============================================================
   TREE RENDER
   ============================================================ */
function renderTree() {
  const container = document.getElementById('tree-scroll');
  if (!container) return;
  const query = (document.getElementById('tree-search')?.value || '').toLowerCase().trim();
  container.innerHTML = '';

  if (!state.topics.length) {
    container.innerHTML = '<div class="text-center text-muted text-sm py-8 px-2">No topics yet. Click "+ New Topic" to start.</div>';
    return;
  }

  state.topics.forEach((topic, ti) => {
    const topicMatches = !query || topic.name.toLowerCase().includes(query);
    const matchingLessons = topic.lessons.map((l, li) => ({ l, li })).filter(({ l }) =>
      !query || l.title.toLowerCase().includes(query) || (l.body || '').toLowerCase().includes(query)
    );
    if (query && !topicMatches && matchingLessons.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-2';

    // Topic Row
    const row = document.createElement('div');
    const isTopicSel = state.selected.topicIdx === ti && state.selected.lessonIdx === null;
    row.className = 'flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition ' +
      (isTopicSel ? 'bg-primarySoft text-primary font-semibold border border-primary/20' : 'text-text hover:bg-surface2 font-medium');
    
    row.innerHTML = `<span class="truncate flex-1">📂 ${escapeHtml(topic.name)}</span>
      <span class="text-xs text-muted font-mono bg-surface2 px-2 py-0.5 rounded-full border border-border">${topic.lessons.length}</span>`;
    row.onclick = () => {
      state.selected = { topicIdx: ti, lessonIdx: null, subject: false };
      renderAll();
      if (window.innerWidth < 1024) toggleMobileTree();
    };
    wrapper.appendChild(row);

    // Lessons
    const lessonWrap = document.createElement('div');
    lessonWrap.className = 'ml-4 pl-3 border-l border-border space-y-1 mt-1';

    (query ? matchingLessons : topic.lessons.map((l, li) => ({ l, li }))).forEach(({ l, li }) => {
      const isSel = state.selected.topicIdx === ti && state.selected.lessonIdx === li;
      const lRow = document.createElement('div');
      lRow.className = 'flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer transition ' +
        (isSel ? 'bg-primarySoft text-primary font-semibold' : 'text-muted hover:bg-surface2 hover:text-text');
      
      const status = !l.body?.trim() ? 'bg-warning' : (validateLessonText(l.body).length ? 'bg-danger' : 'bg-success');
      
      lRow.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${status} shrink-0"></span>
        <span class="truncate flex-1 leading-tight">${escapeHtml(l.title || 'Untitled lesson')}</span>`;
      
      lRow.onclick = e => {
        e.stopPropagation();
        state.selected = { topicIdx: ti, lessonIdx: li, subject: false };
        renderAll();
        if (window.innerWidth < 1024) toggleMobileTree();
      };
      lessonWrap.appendChild(lRow);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'w-full text-left px-2 py-2 text-xs text-muted hover:text-primary transition mt-1 rounded-md hover:bg-primarySoft/50';
    addBtn.innerHTML = '<span class="text-primary font-bold mr-1">+</span> Add lesson';
    addBtn.onclick = e => { e.stopPropagation(); addLesson(ti); };
    lessonWrap.appendChild(addBtn);
    wrapper.appendChild(lessonWrap);

    container.appendChild(wrapper);
  });
}

function renderMobileTree() {
  const container = document.getElementById('mobile-tree-scroll');
  if (!container) return;
  container.innerHTML = document.getElementById('tree-scroll').innerHTML;
  // Rebind clicks for mobile copy
  container.querySelectorAll('.cursor-pointer').forEach(el => {
    el.addEventListener('click', (e) => {
      // Re-dispatch click to the original event handlers by simply re-rendering
      // This is handled natively by the click logic if we just re-attach
    });
  });
  // Simpler approach: just clone the tree entirely for mobile
  container.innerHTML = '';
  state.topics.forEach((topic, ti) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition ' +
      (state.selected.topicIdx === ti && state.selected.lessonIdx === null ? 'bg-primarySoft text-primary font-semibold' : 'text-text hover:bg-surface2');
    row.innerHTML = `<span>📂 ${escapeHtml(topic.name)}</span>`;
    row.onclick = () => { state.selected = { topicIdx: ti, lessonIdx: null }; renderAll(); toggleMobileTree(); };
    container.appendChild(row);
    
    topic.lessons.forEach((l, li) => {
      const lRow = document.createElement('div');
      lRow.className = 'flex items-center gap-2 px-3 py-2 pl-6 rounded-md text-sm cursor-pointer transition ' +
        (state.selected.topicIdx === ti && state.selected.lessonIdx === li ? 'bg-primarySoft text-primary font-semibold' : 'text-muted hover:bg-surface2');
      lRow.innerHTML = `<span>${escapeHtml(l.title)}</span>`;
      lRow.onclick = () => { state.selected = { topicIdx: ti, lessonIdx: li }; renderAll(); toggleMobileTree(); };
      container.appendChild(lRow);
    });
  });
}

function addTopic() {
  snapshot();
  state.topics.push({ name: 'New topic', lessons: [] });
  state.selected = { topicIdx: state.topics.length - 1, lessonIdx: null, subject: false };
  renderAll();
  scheduleSave();
  if (window.innerWidth < 1024) toggleMobileTree();
}

function addLesson(topicIdx) {
  snapshot();
  state.topics[topicIdx].lessons.push({ title: 'New lesson', body: '# New lesson\n\nStart writing here.\n' });
  state.selected = { topicIdx, lessonIdx: state.topics[topicIdx].lessons.length - 1, subject: false };
  renderAll();
  scheduleSave();
  if (window.innerWidth < 1024) toggleMobileTree();
  setTimeout(() => document.getElementById('lesson-title')?.focus(), 80);
}

function selectSubject() {
  state.selected = { topicIdx: state.selected.topicIdx, lessonIdx: null, subject: true };
  renderAll();
  if (window.innerWidth < 1024 && state.mobileTreeOpen) toggleMobileTree();
}

/* ============================================================
   RENDER CENTER PANE
   ============================================================ */
function renderAll() {
  renderTree();
  renderCenter();
  renderPreview();
  updateWordCount();
  updateValidationBar();
  updateUndoButtons();
}

function renderCenter() {
  const pane = document.getElementById('center-pane');
  if (!pane) return;
  pane.innerHTML = '';

  if (state.selected.subject) {
    pane.appendChild(renderSubjectEditor());
    return;
  }
  const ti = state.selected.topicIdx;
  if (ti == null || !state.topics[ti]) {
    pane.innerHTML = '<div class="text-center text-muted py-20 text-sm">Select a topic or lesson on the left, or create a new topic.</div>';
    return;
  }

  if (state.selected.lessonIdx === null) {
    pane.appendChild(renderTopicEditor(ti));
  } else {
    pane.appendChild(renderLessonEditor(ti, state.selected.lessonIdx));
  }
}

function renderSubjectEditor() {
  const wrap = document.createElement('div');
  wrap.className = 'w-full max-w-3xl mx-auto p-6 md:p-10 space-y-8';
  wrap.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <button onclick="state.selected.subject=false; renderAll();" class="md:hidden p-2 -ml-2 text-muted hover:text-text">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h2 class="text-2xl font-bold text-text">Bank Settings</h2>
    </div>
    <div class="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
      <div>
        <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Subject name</label>
        <input id="settings-subject" type="text" value="${escapeHtml(state.subject)}"
          class="input-base text-lg font-bold">
      </div>
      <div>
        <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Description (optional)</label>
        <textarea id="settings-description" rows="3"
          class="input-base">${escapeHtml(state.description)}</textarea>
      </div>
    </div>
    <div class="pt-4 border-t border-border">
      <p class="text-sm text-muted">${state.topics.length} topics · ${totalLessons()} lessons · ~${totalMinutes()} min reading</p>
    </div>
    <div class="pt-4 border-t border-border">
      <button onclick="deleteBank()" class="btn text-danger border-danger/30 hover:bg-danger/10">Delete entire bank</button>
    </div>`;
  setTimeout(() => {
    document.getElementById('settings-subject').addEventListener('input', e => {
      snapshot(); state.subject = e.target.value;
      document.getElementById('subject-input').value = state.subject;
      scheduleSave();
    });
    document.getElementById('settings-description').addEventListener('input', e => {
      snapshot(); state.description = e.target.value; scheduleSave();
    });
  }, 0);
  return wrap;
}

function renderTopicEditor(ti) {
  const topic = state.topics[ti];
  const wrap = document.createElement('div');
  wrap.className = 'w-full max-w-3xl mx-auto p-6 md:p-10 space-y-6';
  wrap.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <button onclick="toggleMobileTree()" class="md:hidden p-2 -ml-2 text-muted hover:text-text">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h2 class="text-2xl font-bold text-text">Edit Topic</h2>
    </div>
    <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Topic name</label>
      <input id="topic-name" type="text" value="${escapeHtml(topic.name)}" class="input-base text-lg font-bold">
    </div>
    <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <p class="text-xs font-bold text-muted uppercase tracking-wider mb-4">${topic.lessons.length} lessons in this topic</p>
      ${topic.lessons.length ? `<ul class="space-y-3 text-sm text-text">${topic.lessons.map((l, i) => `<li class="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"><span class="truncate font-medium">${i + 1}. ${escapeHtml(l.title)}</span><span class="text-muted shrink-0 text-xs bg-surface2 px-2 py-1 rounded">${estimateMinutes(l.body)} min</span></li>`).join('')}</ul>` : '<p class="text-sm text-muted italic">No lessons yet.</p>'}
    </div>
    <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
      <button onclick="deleteTopic(${ti})" class="btn text-danger border-danger/30 hover:bg-danger/10">Delete topic</button>
      <button onclick="addLesson(${ti})" class="btn btn-primary sm:flex-1">+ Add lesson</button>
    </div>`;
  setTimeout(() => {
    document.getElementById('topic-name').addEventListener('input', e => {
      snapshot(); topic.name = e.target.value; renderTree(); scheduleSave();
    });
  }, 0);
  return wrap;
}

function deleteTopic(ti) {
  if (!confirm('Delete this topic and all its lessons?')) return;
  snapshot();
  state.topics.splice(ti, 1);
  if (!state.topics.length) state.topics.push({ name: 'Introduction', lessons: [] });
  state.selected = { topicIdx: 0, lessonIdx: null, subject: false };
  renderAll(); scheduleSave();
}

function deleteBank() {
  if (!confirm('Delete the entire bank? This cannot be undone except with Ctrl+Z.')) return;
  snapshot();
  state.topics = [{ name: 'Introduction', lessons: [] }];
  state.selected = { topicIdx: 0, lessonIdx: null, subject: false };
  state.subject = 'Untitled Subject';
  document.getElementById('subject-input').value = state.subject;
  renderAll(); scheduleSave();
}

function renderLessonEditor(ti, li) {
  const topic = state.topics[ti];
  const lesson = topic.lessons[li];
  const wrap = document.createElement('div');
  wrap.className = 'h-full flex flex-col bg-surface';
  wrap.innerHTML = `
    <div class="px-4 py-3 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-surface">
      <div class="flex items-center gap-2 min-w-0">
        <button onclick="toggleMobileTree()" class="md:hidden p-1.5 -ml-1 text-muted hover:text-text rounded-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="text-xs font-semibold text-muted truncate uppercase tracking-wider">${escapeHtml(topic.name)}</div>
      </div>
      <div class="flex gap-2 shrink-0">
        <button onclick="duplicateLesson(${ti}, ${li})" class="btn text-xs py-1">Duplicate</button>
        <button onclick="deleteLesson(${ti}, ${li})" class="btn text-xs py-1 text-danger border-danger/30 hover:bg-danger/10">Delete</button>
      </div>
    </div>
    
    <div class="px-6 md:px-10 pt-6 pb-2 shrink-0 max-w-4xl w-full mx-auto">
      <label class="block text-xs font-bold text-muted uppercase tracking-wider mb-2">Lesson title</label>
      <input id="lesson-title" type="text" value="${escapeHtml(lesson.title)}"
        class="w-full bg-transparent text-3xl font-bold text-text border-b-2 border-border pb-2 focus:outline-none focus:border-primary transition placeholder-muted">
    </div>
    
    <div class="px-6 md:px-10 flex items-center gap-1 flex-wrap shrink-0 border-b border-border pb-3 max-w-4xl w-full mx-auto">
      <button data-format="bold" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text font-bold" title="Bold">B</button>
      <button data-format="italic" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text italic" title="Italic">I</button>
      <span class="w-px h-5 bg-border mx-1"></span>
      <button data-format="h1" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text font-bold text-xs">H1</button>
      <button data-format="h2" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text font-bold text-xs">H2</button>
      <span class="w-px h-5 bg-border mx-1"></span>
      <button data-format="link" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="Link">🔗</button>
      <button data-format="list" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="List">•</button>
      <button data-format="code" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="Code">&lt;/&gt;</button>
      <span class="w-px h-5 bg-border mx-1"></span>
      <button data-format="math" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="Math">Σ</button>
      <button data-format="quiz" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="Quiz">?</button>
      <button data-format="callout" class="toolbar-btn p-2 rounded hover:bg-surface2 text-text" title="Callout">💡</button>
    </div>
    
    <div class="flex-1 flex min-h-0 relative max-w-4xl w-full mx-auto w-full">
      <textarea id="lesson-body" spellcheck="false"
        class="editor-textarea"
        style="tab-size:2">${escapeHtml(lesson.body)}</textarea>
    </div>`;
  setTimeout(() => bindLessonEditor(ti, li), 0);
  return wrap;
}

function duplicateLesson(ti, li) {
  snapshot();
  const lesson = state.topics[ti].lessons[li];
  const copy = JSON.parse(JSON.stringify(lesson));
  copy.title += ' (Copy)';
  state.topics[ti].lessons.splice(li + 1, 0, copy);
  state.selected = { topicIdx: ti, lessonIdx: li + 1, subject: false };
  renderAll(); scheduleSave();
}

function deleteLesson(ti, li) {
  if (!confirm('Delete this lesson?')) return;
  snapshot();
  state.topics[ti].lessons.splice(li, 1);
  state.selected = { topicIdx: ti, lessonIdx: null, subject: false };
  renderAll(); scheduleSave();
}

function bindLessonEditor(ti, li) {
  const lesson = state.topics[ti].lessons[li];
  const titleInput = document.getElementById('lesson-title');
  const bodyInput = document.getElementById('lesson-body');

  titleInput?.addEventListener('input', e => {
    snapshot();
    lesson.title = e.target.value;
    renderTree();
    scheduleSave();
  });

  bodyInput?.addEventListener('input', e => {
    snapshot();
    lesson.body = e.target.value;
    scheduleSave();
    updateWordCount();
    updateValidationBar();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      renderPreview();
    }, 400);
  });

  bodyInput?.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = bodyInput.selectionStart, end = bodyInput.selectionEnd;
      bodyInput.setRangeText('  ', start, end, 'end');
      bodyInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.onclick = () => insertFormat(btn.dataset.format);
  });
}

/* ============================================================
   TOOLBAR INSERT
   ============================================================ */
const SCAFFOLDS = {
  bold: () => '**bold text**',
  italic: () => '*italic text*',
  h1: () => '\n# Heading\n',
  h2: () => '\n## Heading\n',
  link: () => '[link text](https://example.com)',
  list: () => '\n- item\n',
  tasks: () => '\n- [ ] task\n',
  code: () => '\n```javascript\n// code\n```\n',
  math: () => '\n```math\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n```\n',
  quiz: () => '\n```quiz\nquestion: What is the key idea?\noptions:\n  - First option\n  - Second option\n  - Third option\nanswer: 2\nexplanation: Explain why option 2 is correct.\n```\n',
  callout: () => '\n```callout\ntype: tip\ntitle: A worked example\nWalk through the idea step by step.\n```\n',
  steps: () => '\n```steps\n1. **Start here.** First step.\n2. **Connect.** Second step.\n3. **Finish.** Bring it together.\n```\n',
  video: () => '\n```video\nurl: https://www.youtube.com/watch?v=VIDEO_ID\ntitle: Descriptive title\ncaption: What to notice\n```\n'
};

function insertFormat(type) {
  const editor = document.getElementById('lesson-body');
  if (!editor) return;
  const scaffold = SCAFFOLDS[type];
  if (!scaffold) return;
  const start = editor.selectionStart, end = editor.selectionEnd;
  editor.focus();
  editor.setRangeText(scaffold(), start, end, 'end');
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/* ============================================================
   MARKDOWN RENDERER
   ============================================================ */
function renderMarkdown(source) {
  if (!source) return '<p class="text-muted italic">No content yet.</p>';
  const blocks = [];
  let prepared = String(source).replace(/^```(quiz|callout|math|steps|video)[ \t]*\n([\s\S]*?)^```[ \t]*(?:\n|$)/gmi,
    (_, type, raw) => {
      blocks.push(renderBlock(type.toLowerCase(), raw));
      return `\n\n<div data-block="${blocks.length - 1}"></div>\n\n`;
    });

  let html = '';
  if (window.marked) {
    html = marked.parse(prepared, { gfm: true });
  } else {
    html = prepared.split(/\n\n+/).map(p => `<p>${escapeHtml(p)}</p>`).join('');
  }
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
    const idx = Number(node.dataset.block);
    const div = document.createElement('div');
    div.innerHTML = blocks[idx] || '';
    node.replaceWith(div.firstElementChild || div);
  });
  container.querySelectorAll('p, li, td, th, span, strong, em').forEach(el => {
    el.innerHTML = wrapMath(el.innerHTML);
  });
  return container.innerHTML;
}

function wrapMath(html) {
  return html.replace(/\$\$([^$]+?)\$\$/g, (_, m) => `<span class="math-display" data-latex="${escapeAttr(m)}" data-display="true"></span>`)
             .replace(/\$([^\n$]+?)\$/g, (_, m) => `<span class="math-inline" data-latex="${escapeAttr(m)}" data-display="false"></span>`);
}

function renderBlock(type, raw) {
  if (type === 'quiz') return renderQuizBlock(raw);
  if (type === 'math') return `<div class="math-display text-center py-4 overflow-x-auto" data-latex="${escapeAttr(raw.trim())}" data-display="true"></div>`;
  if (type === 'callout') {
    const lines = raw.trim().split('\n');
    let variant = 'note', title = '';
    const content = lines.filter(l => {
      if (/^type:/i.test(l)) { variant = l.replace(/^type:\s*/i, '').trim(); return false; }
      if (/^title:/i.test(l)) { title = l.replace(/^title:\s*/i, '').trim(); return false; }
      return true;
    }).join('\n');
    if (!['note','tip','warning','exam-focus'].includes(variant)) variant = 'note';
    return `<div class="callout ${variant}"><div><div class="callout-title">${escapeHtml(title || 'Note')}</div><div>${renderSimple(content)}</div></div></div>`;
  }
  if (type === 'steps') {
    const steps = raw.trim().split(/\n(?=\d+[.)]\s|[-*]\s)/).map(l => l.replace(/^(?:\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean);
    return `<ol class="worked-steps">${steps.map((s, i) => `<li><span class="step-num">${i + 1}</span><div>${renderSimple(s)}</div></li>`).join('')}</ol>`;
  }
  if (type === 'video') {
    const f = {};
    raw.trim().split('\n').forEach(l => { const m = l.match(/^(url|src|title|caption):\s*(.*)$/i); if (m) f[m[1].toLowerCase()] = m[2]; });
    const src = f.url || f.src || raw.trim().split('\n')[0];
    try {
      const u = new URL(src);
      let embed = '';
      if (/youtube\.com$|youtu\.be$/.test(u.hostname)) {
        const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
        if (id) embed = `https://www.youtube-nocookie.com/embed/${id}`;
      } else if (/vimeo\.com$/.test(u.hostname)) {
        const id = u.pathname.split('/').filter(Boolean).pop();
        if (id) embed = `https://player.vimeo.com/video/${id}`;
      }
      if (embed) return `<figure><iframe src="${escapeAttr(embed)}" class="w-full aspect-video rounded-xl border border-border" loading="lazy" allowfullscreen></iframe><figcaption class="text-xs text-muted mt-2 text-center">${escapeHtml(f.caption || f.title || '')}</figcaption></figure>`;
    } catch {}
    return `<div class="text-danger text-xs p-4 border border-danger/40 rounded-xl bg-danger/5">Invalid video URL: ${escapeHtml(src)}</div>`;
  }
  return '';
}

function renderQuizBlock(raw) {
  let data;
  try { data = JSON.parse(raw); } catch {
    data = { options: [] };
    let current = '';
    raw.split('\n').forEach(l => {
      const f = l.match(/^([a-zA-Z]+):\s*(.*)$/);
      if (f) {
        current = f[1].toLowerCase();
        if (current !== 'options') data[current] = f[2].replace(/^['"]|['"]$/g, '');
      } else if (current === 'options' && /^\s*-\s+/.test(l)) data.options.push(l.replace(/^\s*-\s+/, '').replace(/^['"]|['"]$/g, ''));
      else if (l.trim() && current && current !== 'options') data[current] += ' ' + l.trim();
    });
  }
  const answerRaw = data.answer ?? data.correct;
  const answerIdx = Number.isInteger(data.correctIndex) ? data.correctIndex : (Number(answerRaw) - 1);
  const question = data.question || '';
  return `<div class="quiz-block">
    <div class="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Practice quiz</div>
    <div class="text-base font-semibold mb-4">${escapeHtml(question)}</div>
    ${data.options.map((opt, i) => `<div class="quiz-option ${i === answerIdx ? 'correct' : ''}"><span class="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] font-bold">${String.fromCharCode(65 + i)}</span><span>${renderSimple(opt)}</span></div>`).join('')}
    ${data.explanation ? `<div class="mt-4 pt-4 border-t border-border text-sm text-muted">${renderSimple(data.explanation)}</div>` : ''}
  </div>`;
}

function renderSimple(md) {
  if (!md) return '';
  let html = escapeHtml(md);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\$([^\n$]+?)\$/g, (_, m) => `<span class="math-inline" data-latex="${escapeAttr(m)}" data-display="false"></span>`);
  return html;
}

function hydrateMath(root) {
  if (!window.katex) return;
  root.querySelectorAll('[data-latex]').forEach(node => {
    if (node.dataset.rendered === 'true') return;
    try {
      katex.render(node.dataset.latex, node, { displayMode: node.dataset.display === 'true', throwOnError: false, strict: 'ignore' });
      node.dataset.rendered = 'true';
    } catch {}
  });
}

/* ============================================================
   PREVIEW PANEL
   ============================================================ */
function renderPreview() {
  const el = document.getElementById('preview-content');
  if (!el) return;
  const li = state.selected.lessonIdx;
  if (li == null || !state.topics[state.selected.topicIdx]?.lessons[li]) {
    el.innerHTML = '<p class="text-muted italic text-sm text-center py-10">Select a lesson to preview.</p>';
    return;
  }
  const lesson = state.topics[state.selected.topicIdx].lessons[li];
  el.innerHTML = `<h1>${escapeHtml(lesson.title)}</h1>` + renderMarkdown(lesson.body);
  hydrateMath(el);
}

/* ============================================================
   WORD COUNT / VALIDATION
   ============================================================ */
function updateWordCount() {
  const el = document.getElementById('word-count');
  if (!el) return;
  const li = state.selected.lessonIdx;
  if (li == null) {
    el.textContent = totalLessons() + ' lessons · ' + totalMinutes() + ' min total';
    return;
  }
  const lesson = state.topics[state.selected.topicIdx]?.lessons[li];
  if (!lesson) return;
  const words = countWords(lesson.body || '');
  const blocks = ((lesson.body || '').match(/^```\w+/gm) || []).length;
  el.textContent = `${words} words · ${blocks} blocks`;
}

function countWords(text) {
  return (text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`$|>]/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function estimateMinutes(text) {
  return Math.max(1, Math.ceil(countWords(text) / 180));
}

function totalLessons() { return state.topics.reduce((s, t) => s + t.lessons.length, 0); }
function totalMinutes() { return state.topics.reduce((s, t) => s + t.lessons.reduce((a, l) => a + estimateMinutes(l.body), 0), 0); }

function validateLessonText(body) {
  const issues = [];
  if (!body || !body.trim()) { issues.push('Lesson is empty'); return issues; }
  const fences = (body.match(/^```/gm) || []).length;
  if (fences % 2 !== 0) issues.push('Unbalanced code fences');
  const mathBlocks = body.match(/^```math\b[\s\S]*?^```/gm) || [];
  for (const block of mathBlocks) {
    if (window.katex) {
      try { katex.renderToString(block.replace(/^```math\b/, '').replace(/```$/, ''), { throwOnError: true }); }
      catch { issues.push('Invalid LaTeX in math block'); break; }
    }
  }
  return issues;
}

function updateValidationBar() {
  const iconEl = document.getElementById('validation-icon');
  const textEl = document.getElementById('validation-text');
  const btn = document.getElementById('validation-btn');
  if (!iconEl || !textEl || !btn) return;
  
  const li = state.selected.lessonIdx;
  if (li == null) {
    iconEl.textContent = '✓';
    iconEl.className = 'text-success';
    textEl.textContent = 'All checks passed';
    btn.className = 'flex items-center gap-1.5 hover:text-text text-muted transition';
    return;
  }
  const lesson = state.topics[state.selected.topicIdx]?.lessons[li];
  const issues = validateLessonText(lesson?.body);
  if (!issues.length) {
    iconEl.textContent = '✓';
    iconEl.className = 'text-success';
    textEl.textContent = 'All checks passed';
    btn.className = 'flex items-center gap-1.5 hover:text-text text-muted transition';
  } else {
    iconEl.textContent = '⚠';
    iconEl.className = 'text-warning';
    textEl.textContent = issues.length + ' issue' + (issues.length > 1 ? 's' : '');
    btn.className = 'flex items-center gap-1.5 hover:text-text text-warning font-medium transition';
  }
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s).replace(/\n/g, ' '); }
function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subject'; }

function showToast(message, type = 'info') {
  const host = document.getElementById('toast-host');
  const colors = { 
    info: 'bg-surface border-border text-text shadow-lg', 
    success: 'bg-success/10 border-success text-success', 
    warning: 'bg-warning/10 border-warning text-warning', 
    error: 'bg-danger/10 border-danger text-danger' 
  };
  const el = document.createElement('div');
  el.className = `px-4 py-2.5 rounded-xl border text-sm font-medium shadow-lg pointer-events-auto ${colors[type] || colors.info}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('hidden');
  m.classList.add('flex');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('hidden');
  m.classList.remove('flex');
}

/* ============================================================
   EXPORT
   ============================================================ */
function buildBankText() {
  let text = 'Subject: ' + (state.subject || 'Untitled Subject') + '\n';
  if (state.description) text += 'Description: ' + state.description + '\n';
  text += '\n';
  for (const topic of state.topics) {
    if (!topic.lessons.length) continue;
    text += 'Topic: ' + topic.name + '\n\n';
    for (const lesson of topic.lessons) {
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

function updateExportPreview() {
  const format = document.querySelector('input[name="export-format"]:checked')?.value || 'js';
  const el = document.getElementById('export-preview');
  if (format === 'zip') {
    el.textContent = `ZIP bundle will contain ${totalLessons()} .md file(s):\n\n` +
      state.topics.flatMap(t => t.lessons.map(l => `  ${slugify(t.name)}/${slugify(l.title)}.md`)).join('\n');
    document.getElementById('export-stats').textContent = totalLessons() + ' files';
  } else {
    const code = buildJSExport();
    el.textContent = code;
    document.getElementById('export-stats').textContent = (new Blob([code]).size / 1024).toFixed(1) + ' KB';
  }
}

function openExportModal() {
  openModal('modal-export');
  document.getElementById('export-filename').value = slugify(state.subject) + '-notes.js';
  updateExportPreview();
}

function copyExport() {
  const code = document.getElementById('export-preview').textContent;
  copyText(code).then(ok => {
    showToast(ok ? 'Copied.' : 'Copy failed.', ok ? 'success' : 'error');
  });
}

async function downloadExport() {
  const format = document.querySelector('input[name="export-format"]:checked')?.value || 'js';
  if (format === 'zip') return downloadZip();
  const code = buildJSExport();
  const name = document.getElementById('export-filename').value || 'notes-bank.js';
  downloadBlob(new Blob([code], { type: 'application/javascript;charset=utf-8' }), name);
  showToast('Downloaded ' + name, 'success');
  closeModal('modal-export');
}

async function downloadZip() {
  if (typeof JSZip === 'undefined') {
    showToast('Zip library not loaded. Try .js export instead.', 'error');
    return;
  }
  try {
    const zip = new JSZip();
    state.topics.forEach(topic => {
      topic.lessons.forEach(lesson => {
        const fm = `---\ntitle: ${lesson.title}\nsubject: ${state.subject}\ntopic: ${topic.name}\nduration: ${estimateMinutes(lesson.body)}\n---\n\n`;
        zip.file(`${slugify(topic.name)}/${slugify(lesson.title)}.md`, fm + (lesson.body || ''));
      });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, slugify(state.subject) + '-notes.zip');
    showToast('Downloaded .zip', 'success');
    closeModal('modal-export');
  } catch (e) {
    showToast('Zip failed: ' + e.message, 'error');
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/* ============================================================
   IMPORT
   ============================================================ */
let importTab = 'file';

function bindImportTabs() {
  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.onclick = () => {
      importTab = tab.dataset.tab;
      document.querySelectorAll('.import-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
        t.classList.toggle('text-primary', t === tab);
        t.classList.toggle('border-b-2', t === tab);
        t.classList.toggle('border-primary', t === tab);
        t.classList.toggle('text-muted', t !== tab);
      });
      document.querySelectorAll('.import-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== importTab));
    };
  });
  const initial = document.querySelector('.import-tab');
  if (initial) initial.click();
}

function openImportModal() {
  openModal('modal-import');
  const stored = localStorage.getItem(LS_CREDS);
  if (stored) {
    try {
      const c = JSON.parse(stored);
      document.getElementById('import-gh-owner').value = c.owner || '';
      document.getElementById('import-gh-repo').value = c.repo || '';
    } catch {}
  }
  document.getElementById('import-summary').classList.add('hidden');
  document.getElementById('import-confirm').disabled = true;
  pendingImport = null;
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => processImportText(reader.result);
  reader.readAsText(file);
  event.target.value = '';
}

function parsePasted() {
  const text = document.getElementById('import-paste').value;
  if (text.trim()) processImportText(text);
}

async function fetchFromGitHub() {
  const owner = document.getElementById('import-gh-owner').value.trim();
  const repo = document.getElementById('import-gh-repo').value.trim();
  const file = document.getElementById('import-gh-filename').value.trim();
  if (!owner || !repo || !file) return showToast('Fill owner, repo, filename.', 'warning');
  localStorage.setItem(LS_CREDS, JSON.stringify({ owner, repo }));
  
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/notes-banks/${file}`;
  try {
    showToast('Fetching…');
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3.raw' } });
    if (!res.ok) {
       if (res.status === 404) throw new Error('File not found. Check the repo name and folder.');
       throw new Error('HTTP ' + res.status);
    }
    const text = await res.text();
    processImportText(text);
  } catch (e) {
    showToast('Fetch failed: ' + e.message, 'error');
  }
}

function processImportText(text) {
  const parsed = parseBankText(text);
  if (!parsed) {
    document.getElementById('import-summary').classList.remove('hidden');
    document.getElementById('import-summary-head').textContent = 'Could not parse bank';
    document.getElementById('import-warnings').innerHTML = '<div>Check that the file has "Subject:" and "Topic:" lines.</div>';
    document.getElementById('import-confirm').disabled = true;
    return;
  }
  pendingImport = parsed;
  const totalL = parsed.topics.reduce((s, t) => s + t.lessons.length, 0);
  document.getElementById('import-summary').classList.remove('hidden');
  document.getElementById('import-summary-head').textContent = `Parsed: "${parsed.subject}" · ${parsed.topics.length} topics · ${totalL} lessons`;
  document.getElementById('import-warnings').innerHTML = '';
  document.getElementById('import-confirm').disabled = false;
}

function parseBankText(raw) {
  if (!raw) return null;
  let text = String(raw);

  const m = text.match(/window\.CBT_NOTE_BANKS\.push\(\s*`([\s\S]*?)`\s*\)/);
  if (m) {
    text = m[1].replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
  } else {
    const m2 = text.match(/`([\s\S]*?)`/);
    if (m2) text = m2[1];
  }

  const lines = text.split('\n');
  let subject = null, description = '';
  const topics = [];
  let currentTopic = null, currentLesson = null, lessonLines = [];

  function flushLesson() {
    if (!currentLesson) return;
    const body = lessonLines.join('\n').trim();
    if (currentTopic) currentTopic.lessons.push({ title: currentLesson, body });
    currentLesson = null; lessonLines = [];
  }
  function flushTopic() {
    flushLesson();
    if (currentTopic && currentTopic.lessons.length) topics.push(currentTopic);
    currentTopic = null;
  }

  lines.forEach(raw => {
    const l = raw;
    const subM = l.match(/^Subject:\s*(.*)$/i);
    if (subM) { flushTopic(); subject = subM[1].trim(); return; }
    const descM = l.match(/^Description:\s*(.*)$/i);
    if (descM) { description = descM[1].trim(); return; }
    const topM = l.match(/^Topic:\s*(.*)$/i);
    if (topM) { flushTopic(); currentTopic = { name: topM[1].trim(), lessons: [] }; return; }
    const lessM = l.match(/^Lesson:\s*(.*)$/i);
    if (lessM) { flushLesson(); currentLesson = lessM[1].trim(); lessonLines = []; return; }
    if (currentLesson) lessonLines.push(l);
  });
  flushTopic();

  if (!subject || !topics.length) return null;
  return { subject, description, topics };
}

function executeImport() {
  if (!pendingImport) return;
  const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'merge';
  if (mode === 'replace') {
    if (!confirm('Replace the entire current bank? This will overwrite your current content.')) return;
  }
  snapshot();

  if (mode === 'replace') {
    state.subject = pendingImport.subject;
    state.description = pendingImport.description;
    state.topics = pendingImport.topics;
    state.selected = { topicIdx: 0, lessonIdx: null, subject: false };
  } else if (mode === 'merge') {
    for (const t of pendingImport.topics) {
      let existing = state.topics.find(et => et.name.toLowerCase() === t.name.toLowerCase());
      if (!existing) {
        state.topics.push(t);
        continue;
      }
      for (const l of t.lessons) {
        if (!existing.lessons.some(el => el.title.toLowerCase() === l.title.toLowerCase())) {
          existing.lessons.push(l);
        }
      }
    }
  } else {
    state.topics.push(...pendingImport.topics);
  }

  if (document.getElementById('subject-input')) document.getElementById('subject-input').value = state.subject;
  pendingImport = null;
  renderAll();
  scheduleSave();
  closeModal('modal-import');
  showToast('Imported.', 'success');
}

/* ============================================================
   PUBLISH
   ============================================================ */
function openPublishModal() {
  openModal('modal-publish');
  const creds = localStorage.getItem(LS_CREDS);
  if (creds) {
    try {
      const c = JSON.parse(creds);
      document.getElementById('gh-owner').value = c.owner || '';
      document.getElementById('gh-repo').value = c.repo || '';
    } catch {}
  }
  document.getElementById('publish-filename').value = slugify(state.subject) + '-notes.js';
  updatePreflight();
  document.getElementById('publish-script-tag').classList.add('hidden');
}

function updatePreflight() {
  const issues = [];
  if (!state.subject.trim()) issues.push('Missing subject name');
  if (!state.topics.length) issues.push('No topics');
  const totalL = totalLessons();
  if (!totalL) issues.push('No lessons');
  
  state.topics.forEach(t => t.lessons.forEach(l => {
    const v = validateLessonText(l.body);
    if (v.length && issues.length < 3) issues.push(`${l.title}: ${v[0]}`);
  }));
  
  const el = document.getElementById('publish-preflight');
  el.innerHTML = issues.length
    ? `<div class="text-danger font-semibold mb-1">${issues.length} issue${issues.length > 1 ? 's' : ''} found:</div>` + issues.map(i => `<div class="text-danger">⚠ ${escapeHtml(i)}</div>`).join('')
    : `<div class="text-success font-semibold flex items-center gap-2"><span class="text-lg">✓</span> ${state.topics.length} topics · ${totalL} lessons. Ready to publish.</div>`;
}

async function executePublish() {
  const owner = document.getElementById('gh-owner').value.trim();
  const repo = document.getElementById('gh-repo').value.trim();
  const filename = document.getElementById('publish-filename').value.trim();
  if (!owner || !repo || !filename) return showToast('Fill owner, repo, filename.', 'warning');

  localStorage.setItem(LS_CREDS, JSON.stringify({ owner, repo }));

  const btn = document.getElementById('publish-btn');
  const originalText = btn.textContent;
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
    const tag = `<script defer src="notes-banks/${filename}"></script>`;
    document.getElementById('script-tag-text').textContent = tag;
    document.getElementById('publish-script-tag').classList.remove('hidden');
  } catch (e) {
    showToast('Publish failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = originalText;
  }
}

function copyScriptTag() {
  const text = document.getElementById('script-tag-text').textContent;
  copyText(text).then(ok => showToast(ok ? 'Copied. Paste into notes.html before the script tags.' : 'Copy failed.', ok ? 'success' : 'error'));
}
