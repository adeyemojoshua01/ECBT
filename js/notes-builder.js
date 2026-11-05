// ============================================================
// NOTES BUILDER — full editor application (Mobile & Desktop)
// ============================================================

'use strict';

const LS_STATE = 'cbt_notes_builder_v2';
const LS_UNDO  = 'cbt_notes_builder_undo_v2';
const LS_CREDS = 'cbt_notes_builder_creds';

const state = {
  subject: 'Untitled Subject',
  description: '',
  topics: [],
  selected: { topicIdx: 0, lessonIdx: null, subject: false },
  device: 'mobile',
  mode: 'edit',
  dirty: false,
  mobileTreeOpen: false
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
  bindHeader();
  bindShortcuts();
  bindImportTabs();
  bindDeviceButtons();
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
      state.device = parsed.device || 'mobile';
      state.mode = parsed.mode || 'edit';
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
      device: state.device,
      mode: state.mode
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
  el.textContent = text;
  el.className = 'text-[10px] font-mono ml-2 whitespace-nowrap ' + (isError ? 'text-amber' : 'text-emerald');
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

/* ============================================================
   HEADER EVENTS & MOBILE NAVIGATION
   ============================================================ */
function bindHeader() {
  const subjectInput = document.getElementById('subject-input');
  if (subjectInput) {
    subjectInput.value = state.subject;
    subjectInput.addEventListener('input', e => {
      snapshot();
      state.subject = e.target.value;
      updateMobileSubjectLabel();
      scheduleSave();
    });
  }
  document.getElementById('btn-undo').onclick = doUndo;
  document.getElementById('btn-redo').onclick = doRedo;
  document.getElementById('tree-search').addEventListener('input', renderTree);
}

function updateMobileSubjectLabel() {
  const btn = document.getElementById('mobile-subject-btn');
  if (btn) btn.textContent = state.subject || 'Untitled Subject';
}

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
    if (cmd && key === 'b') { e.preventDefault(); insertFormat('bold'); return; }
    if (cmd && key === 'i') { e.preventDefault(); insertFormat('italic'); return; }
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
    const empty = document.createElement('div');
    empty.className = 'text-center text-lo text-sm py-8 px-2';
    empty.textContent = 'No topics yet. Click "+ New topic" to start.';
    container.appendChild(empty);
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
    row.className = 'flex items-center justify-between px-3 py-3 min-h-[44px] rounded-lg text-sm cursor-pointer transition ' +
      (isTopicSel ? 'bg-brand-dark/30 text-brand-light border border-brand/40' : 'text-mid hover:bg-ink-800');
    row.setAttribute('role', 'treeitem');
    row.setAttribute('aria-expanded', 'true');
    row.innerHTML = `<span class="truncate flex-1 font-semibold">📂 ${escapeHtml(topic.name)}</span>
      <span class="text-xs text-lo font-mono ml-2 bg-ink-800 px-1.5 py-0.5 rounded">${topic.lessons.length}</span>`;
    row.onclick = () => {
      state.selected = { topicIdx: ti, lessonIdx: null, subject: false };
      renderAll();
      if (window.innerWidth < 900) toggleMobileTree(); // Auto-close on mobile
    };
    row.oncontextmenu = e => showTopicContext(e, ti);
    wrapper.appendChild(row);

    // Lessons
    const lessonWrap = document.createElement('div');
    lessonWrap.className = 'ml-3 pl-3 border-l border-ink-700 space-y-1 mt-1';

    (query ? matchingLessons : topic.lessons.map((l, li) => ({ l, li }))).forEach(({ l, li }) => {
      const isSel = state.selected.topicIdx === ti && state.selected.lessonIdx === li;
      const lRow = document.createElement('div');
      lRow.className = 'flex items-center gap-2 px-2 py-2.5 min-h-[40px] rounded-md text-sm cursor-pointer transition ' +
        (isSel ? 'bg-brand-dark/30 text-brand-light border border-brand/40' : 'text-lo hover:bg-ink-800/60');
      
      const status = !l.body?.trim() ? 'bg-amber' : (validateLessonText(l.body).length ? 'bg-rose' : 'bg-brand');
      
      lRow.innerHTML = `<span class="w-2 h-2 rounded-full ${status} shrink-0"></span>
        <span class="truncate flex-1 leading-tight">${escapeHtml(l.title || 'Untitled lesson')}</span>`;
      
      lRow.onclick = e => {
        e.stopPropagation();
        state.selected = { topicIdx: ti, lessonIdx: li, subject: false };
        renderAll();
        if (window.innerWidth < 900) toggleMobileTree(); // Auto-close on mobile
      };
      lRow.oncontextmenu = e => showLessonContext(e, ti, li);
      
      lessonWrap.appendChild(lRow);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'w-full text-left px-2 py-2 text-xs text-lo hover:text-brand-light min-h-[40px] mt-1 rounded-md hover:bg-ink-800/50';
    addBtn.innerHTML = '<span class="text-brand-light font-bold mr-1">+</span> Add lesson';
    addBtn.onclick = e => { e.stopPropagation(); addLesson(ti); };
    lessonWrap.appendChild(addBtn);
    wrapper.appendChild(lessonWrap);

    container.appendChild(wrapper);
  });
}

function showTopicContext(e, ti) {
  e.preventDefault();
  const topic = state.topics[ti];
  if (confirm(`Delete topic "${topic.name}" and its ${topic.lessons.length} lesson(s)?`)) {
    snapshot();
    state.topics.splice(ti, 1);
    if (!state.topics.length) state.topics.push({ name: 'Introduction', lessons: [] });
    state.selected = { topicIdx: 0, lessonIdx: null, subject: false };
    renderAll();
    scheduleSave();
  }
}

function showLessonContext(e, ti, li) {
  e.preventDefault();
  const lesson = state.topics[ti].lessons[li];
  if (confirm(`Delete lesson "${lesson.title}"?`)) {
    snapshot();
    state.topics[ti].lessons.splice(li, 1);
    state.selected = { topicIdx: ti, lessonIdx: null, subject: false };
    renderAll();
    scheduleSave();
  }
}

/* ============================================================
   ACTIONS: add/select
   ============================================================ */
function addTopic() {
  snapshot();
  state.topics.push({ name: 'New topic', lessons: [] });
  state.selected = { topicIdx: state.topics.length - 1, lessonIdx: null, subject: false };
  renderAll();
  scheduleSave();
  if (window.innerWidth < 900) toggleMobileTree();
}

function addLesson(topicIdx) {
  snapshot();
  state.topics[topicIdx].lessons.push({ title: 'New lesson', body: '# New lesson\n\nStart writing here.\n' });
  state.selected = { topicIdx, lessonIdx: state.topics[topicIdx].lessons.length - 1, subject: false };
  renderAll();
  scheduleSave();
  if (window.innerWidth < 900) toggleMobileTree();
  setTimeout(() => document.getElementById('lesson-title')?.focus(), 80);
}

function selectSubject() {
  state.selected = { topicIdx: state.selected.topicIdx, lessonIdx: null, subject: true };
  renderAll();
  if (window.innerWidth < 900 && state.mobileTreeOpen) toggleMobileTree();
}

/* ============================================================
   RENDER CENTER PANE
   ============================================================ */
function renderAll() {
  updateMobileSubjectLabel();
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
    pane.innerHTML = '<div class="text-center text-lo py-16 text-sm">Select a topic or lesson on the left, or create a new topic.</div>';
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
  wrap.className = 'w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-20';
  wrap.innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <button onclick="state.selected.subject=false; renderAll();" class="sm:hidden p-2 -ml-2 text-mid hover:text-hi">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h2 class="text-lg font-bold text-hi">Bank settings</h2>
    </div>
    <div>
      <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1">Subject name</label>
      <input id="settings-subject" type="text" value="${escapeHtml(state.subject)}"
        class="w-full bg-ink-800 text-base font-bold text-hi border border-ink-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand min-h-[44px]">
      <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1 mt-4">Description (optional)</label>
      <textarea id="settings-description" rows="3"
        class="w-full bg-ink-800 text-sm text-hi border border-ink-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand">${escapeHtml(state.description)}</textarea>
    </div>
    <div class="pt-4 border-t border-ink-700">
      <p class="text-sm text-lo">${state.topics.length} topics · ${totalLessons()} lessons · ~${totalMinutes()} min reading</p>
    </div>
    <div class="pt-4 border-t border-ink-700">
      <button onclick="deleteBank()" class="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-rose hover:bg-rose/10 rounded-xl border border-rose/30 min-h-[44px]">Delete entire bank</button>
    </div>`;
  setTimeout(() => {
    document.getElementById('settings-subject').addEventListener('input', e => {
      snapshot(); state.subject = e.target.value;
      updateMobileSubjectLabel();
      if (document.getElementById('subject-input')) document.getElementById('subject-input').value = state.subject;
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
  wrap.className = 'w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6 pb-20';
  wrap.innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <button onclick="state.selected.lessonIdx=null; state.mobileTreeOpen=false; document.getElementById('left-panel').classList.remove('-translate-x-full'); document.getElementById('mobile-backdrop').classList.remove('hidden');" class="sm:hidden p-2 -ml-2 text-mid hover:text-hi">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <h2 class="text-lg font-bold text-hi">Edit Topic</h2>
    </div>
    <div>
      <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1">Topic name</label>
      <input id="topic-name" type="text" value="${escapeHtml(topic.name)}"
        class="w-full bg-ink-800 text-lg font-bold text-hi border border-ink-700 rounded-xl px-4 py-3 focus:outline-none focus:border-brand min-h-[44px]">
    </div>
    <div class="bg-ink-900 border border-ink-700 rounded-xl p-4">
      <p class="text-xs font-semibold text-lo uppercase tracking-wider mb-3">${topic.lessons.length} lessons in this topic</p>
      ${topic.lessons.length ? `<ul class="space-y-2 text-sm text-mid">${topic.lessons.map((l, i) => `<li class="flex items-center justify-between gap-2"><span class="truncate">${i + 1}. ${escapeHtml(l.title)}</span><span class="text-lo shrink-0 text-xs">${estimateMinutes(l.body)} min</span></li>`).join('')}</ul>` : '<p class="text-sm text-lo italic">No lessons yet.</p>'}
    </div>
    <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-ink-700">
      <button onclick="deleteTopic(${ti})" class="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-rose bg-rose/5 hover:bg-rose/10 rounded-xl border border-rose/30 min-h-[44px]">Delete topic</button>
      <button onclick="addLesson(${ti})" class="w-full sm:flex-1 px-6 py-3 text-sm font-semibold bg-brand text-ink-900 rounded-xl hover:bg-brand-light min-h-[44px]">+ Add lesson</button>
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
  if (document.getElementById('subject-input')) document.getElementById('subject-input').value = state.subject;
  renderAll(); scheduleSave();
}

function renderLessonEditor(ti, li) {
  const topic = state.topics[ti];
  const lesson = topic.lessons[li];
  const wrap = document.createElement('div');
  wrap.className = 'h-full flex flex-col';
  wrap.innerHTML = `
    <div class="px-4 py-3 border-b border-ink-700/60 bg-ink-900/40 flex items-center justify-between gap-2 shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <button onclick="state.mobileTreeOpen=false; document.getElementById('left-panel').classList.remove('-translate-x-full'); document.getElementById('mobile-backdrop').classList.remove('hidden');" class="sm:hidden p-1.5 -ml-1 text-mid hover:text-hi rounded-md">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="text-[10px] font-mono text-lo truncate">TOPIC · ${escapeHtml(topic.name)}</div>
      </div>
      <div class="flex gap-1 shrink-0">
        <button onclick="duplicateLesson(${ti}, ${li})" class="px-2 py-1 text-[10px] rounded bg-ink-800 hover:bg-ink-700 border border-ink-700 text-mid hover:text-hi">Duplicate</button>
        <button onclick="deleteLesson(${ti}, ${li})" class="px-2 py-1 text-[10px] rounded bg-rose/10 hover:bg-rose/20 border border-rose/30 text-rose-light">Delete</button>
      </div>
    </div>
    <div class="px-4 sm:px-5 pt-4 shrink-0">
      <label class="block text-[10px] font-semibold text-lo uppercase tracking-wider mb-1">Lesson title</label>
      <input id="lesson-title" type="text" value="${escapeHtml(lesson.title)}"
        class="w-full bg-transparent text-lg sm:text-xl font-bold text-hi border-b border-ink-700 pb-2 focus:outline-none focus:border-brand">
    </div>
    <div class="px-4 sm:px-5 pt-3 flex items-center gap-1 flex-wrap shrink-0 border-b border-ink-700/60 pb-3">
      <button data-format="bold" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Bold"><strong>B</strong></button>
      <button data-format="italic" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Italic"><em>I</em></button>
      <span class="w-px h-5 bg-ink-700 mx-1"></span>
      <button data-format="h1" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi text-sm font-bold">H1</button>
      <button data-format="h2" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi text-sm font-bold">H2</button>
      <span class="w-px h-5 bg-ink-700 mx-1"></span>
      <button data-format="link" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Link">🔗</button>
      <button data-format="list" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="List">•</button>
      <button data-format="code" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Code">&lt;/&gt;</button>
      <span class="w-px h-5 bg-ink-700 mx-1"></span>
      <button data-format="math" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Math">Σ</button>
      <button data-format="quiz" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Quiz">?</button>
      <button data-format="callout" class="toolbar-btn min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-ink-800 text-hi" title="Callout">💡</button>
    </div>
    <div class="flex-1 flex min-h-0 relative">
      <textarea id="lesson-body" spellcheck="false"
        class="editor-pane w-full bg-canvas text-hi font-mono text-sm sm:text-xs p-4 resize-none focus:outline-none pb-20 sm:pb-4"
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
  if (!source) return '<p class="text-lo italic">No content yet.</p>';
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
  if (type === 'math') return `<div class="math-display" data-latex="${escapeAttr(raw.trim())}" data-display="true"></div>`;
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
      if (embed) return `<figure><iframe src="${escapeAttr(embed)}" class="w-full aspect-video rounded border border-ink-700" loading="lazy" allowfullscreen></iframe><figcaption class="text-xs text-lo mt-1 text-center">${escapeHtml(f.caption || f.title || '')}</figcaption></figure>`;
    } catch {}
    return `<div class="text-rose text-xs p-3 border border-rose/40 rounded">Invalid video URL: ${escapeHtml(src)}</div>`;
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
    <div class="text-[10px] font-bold text-brand-light uppercase tracking-wider mb-2">Practice quiz</div>
    <div class="text-sm font-semibold mb-3">${escapeHtml(question)}</div>
    ${data.options.map((opt, i) => `<div class="quiz-option ${i === answerIdx ? 'correct' : ''}"><span class="w-4 h-4 rounded-full border border-ink-600 flex items-center justify-center text-[9px]">${String.fromCharCode(65 + i)}</span><span>${renderSimple(opt)}</span></div>`).join('')}
    ${data.explanation ? `<div class="mt-3 pt-3 border-t border-ink-700 text-xs text-mid">${renderSimple(data.explanation)}</div>` : ''}
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
    el.innerHTML = '<p class="text-lo italic text-sm">Select a lesson to preview.</p>';
    return;
  }
  const lesson = state.topics[state.selected.topicIdx].lessons[li];
  el.innerHTML = `<h1>${escapeHtml(lesson.title)}</h1>` + renderMarkdown(lesson.body);
  hydrateMath(el);
  applyDevice();
}

function applyDevice() {
  const el = document.getElementById('preview-content');
  const frame = el?.parentElement;
  if (!frame) return;
  const widths = { mobile: 390, tablet: 768, desktop: 1000 };
  const w = widths[state.device] || 390;
  el.style.maxWidth = w + 'px';
  el.style.margin = '0 auto';
  const label = document.getElementById('preview-width-label');
  if (label) label.textContent = w + ' px';
  document.querySelectorAll('.device-btn').forEach(b => {
    b.classList.toggle('text-brand-light', b.dataset.device === state.device);
    b.classList.toggle('bg-ink-800', b.dataset.device === state.device);
  });
}

function bindDeviceButtons() {
  document.querySelectorAll('.device-btn').forEach(btn => {
    btn.onclick = () => { state.device = btn.dataset.device; applyDevice(); scheduleSave(); };
  });
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
    iconEl.className = 'text-emerald';
    textEl.textContent = 'All checks passed';
    btn.className = 'flex items-center gap-1.5 hover:text-hi text-lo';
    return;
  }
  const lesson = state.topics[state.selected.topicIdx]?.lessons[li];
  const issues = validateLessonText(lesson?.body);
  if (!issues.length) {
    iconEl.textContent = '✓';
    iconEl.className = 'text-emerald';
    textEl.textContent = 'All checks passed';
    btn.className = 'flex items-center gap-1.5 hover:text-hi text-lo';
  } else {
    iconEl.textContent = '⚠';
    iconEl.className = 'text-amber';
    textEl.textContent = issues.length + ' issue' + (issues.length > 1 ? 's' : '');
    btn.className = 'flex items-center gap-1.5 hover:text-hi text-amber';
  }
}

function showValidationModal() {
  const li = state.selected.lessonIdx;
  if (li == null) return showToast('All checks passed.');
  const lesson = state.topics[state.selected.topicIdx].lessons[li];
  const issues = validateLessonText(lesson?.body);
  if (!issues.length) return showToast('✓ All checks passed.');
  showConfirm('Validation', issues.map((i, n) => (n + 1) + '. ' + i).join('\n'), () => {}, 'Close');
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
  const colors = { info: 'bg-ink-800 border-ink-600 text-hi', success: 'bg-emerald/20 border-emerald text-emerald-light', warning: 'bg-amber/20 border-amber text-amber-light', error: 'bg-rose/20 border-rose text-rose-light' };
  const el = document.createElement('div');
  el.className = `px-4 py-2 rounded-lg border text-sm shadow-xl pointer-events-auto ${colors[type] || colors.info}`;
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

function showConfirm(title, message, onConfirm, okLabel = 'Confirm', danger = true) {
  const m = document.getElementById('modal-confirm');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  const ok = document.getElementById('confirm-ok');
  ok.textContent = okLabel;
  ok.className = 'touch-btn px-6 text-sm font-semibold rounded-lg ' + (danger ? 'bg-rose text-white hover:bg-rose-light' : 'bg-brand text-ink-900 hover:bg-brand-light');
  ok.onclick = () => { closeModal('modal-confirm'); onConfirm(); };
  document.getElementById('confirm-cancel').onclick = () => closeModal('modal-confirm');
  openModal('modal-confirm');
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
  const bankText = buildBankText();
  // Only escape backslashes and template literal variables, NOT backticks
  const escaped = bankText.replace(/\\/g, '\\\\').replace(/\$\{/g, '\\${');
  return `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(String.raw\`${escaped}\`);\n`;
}

function updateExportPreview() {
  const format = document.querySelector('input[name="export-format"]:checked')?.value || 'js';
  const el = document.getElementById('export-preview');
  if (format === 'zip') {
    el.textContent = `ZIP bundle will contain ${totalLessons()} .md file(s), one per lesson:\n\n` +
      state.topics.flatMap(t => t.lessons.map(l => `  ${slugify(t.name)}/${slugify(l.title)}.md`)).join('\n') +
      '\n\nEach .md file will have frontmatter (title, subject, duration) and the lesson markdown.';
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
    showToast(ok ? 'Copied.' : 'Copy failed — select and copy manually.', ok ? 'success' : 'error');
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
        t.classList.toggle('text-brand-light', t === tab);
        t.classList.toggle('border-b-2', t === tab);
        t.classList.toggle('border-brand', t === tab);
      });
      document.querySelectorAll('.import-panel').forEach(p => p.classList.toggle('hidden', p.dataset.panel !== importTab));
    };
  });
  // trigger initial tab state
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
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/notes-banks/${file}`;
  try {
    showToast('Fetching…');
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
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
  const warnings = [];
  parsed.topics.forEach(t => t.lessons.forEach(l => {
    if (!l.body?.trim()) warnings.push(`Lesson "${l.title}" is empty`);
  }));
  document.getElementById('import-warnings').innerHTML = warnings.map(w => `<div>⚠ ${escapeHtml(w)}</div>`).join('');
  document.getElementById('import-confirm').disabled = false;
}

function parseBankText(raw) {
  if (!raw) return null;
  let text = String(raw);

  // Strip window.CBT_NOTE_BANKS.push(` ... `) wrapper if present
  const m = text.match(/window\.CBT_NOTE_BANKS\.push\(\s*`([\s\S]*?)`\s*\)/);
  if (m) {
    text = m[1].replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');
  } else {
    // Try to find backtick content
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
  updateMobileSubjectLabel();
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
  let errors = 0;
  state.topics.forEach(t => t.lessons.forEach(l => {
    const v = validateLessonText(l.body);
    if (v.length) { errors++; if (issues.length < 5) issues.push(`${l.title}: ${v[0]}`); }
  }));
  const el = document.getElementById('publish-preflight');
  el.innerHTML = issues.length
    ? `<div class="text-rose font-semibold">${issues.length} issue${issues.length > 1 ? 's' : ''}:</div>` + issues.map(i => `<div>⚠ ${escapeHtml(i)}</div>`).join('')
    : `<div class="text-emerald font-semibold">✓ ${state.topics.length} topics · ${totalL} lessons · ready to publish</div>`;
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
  copyText(text).then(ok => showToast(ok ? 'Copied. Paste into notes.html before note-loader.js.' : 'Copy failed.', ok ? 'success' : 'error'));
}
