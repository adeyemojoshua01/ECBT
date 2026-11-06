'use strict';

const LS_STATE = 'cbt_notes_builder_v3';
const LS_CREDS = 'cbt_notes_builder_creds';

const state = {
  courses: [],
  activeCourseId: null,
  activeChapterId: null,
  activeLessonId: null,
  dirty: false
};

let saveTimer = null;
let pendingImport = null;

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (!state.courses.length) {
    // Create default empty structure
    const cid = uid('c');
    state.courses.push({ id: cid, title: 'Untitled Subject', subject: cid, chapters: [{ id: uid('ch'), title: 'Introduction', lessons: [] }] });
    state.activeCourseId = cid;
    state.activeChapterId = state.courses[0].chapters[0].id;
  }
  
  bindEvents();
  renderTree();
  renderEditor();
});

function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 9); }

function loadState() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.courses) state = { ...state, ...parsed };
    }
  } catch (e) {}
}

function persist() {
  try {
    localStorage.setItem(LS_STATE, JSON.stringify({
      courses: state.courses,
      activeCourseId: state.activeCourseId,
      activeChapterId: state.activeChapterId,
      activeLessonId: state.activeLessonId
    }));
    const st = document.getElementById('save-status');
    if (st) st.textContent = 'Saved ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } catch (e) {
    const st = document.getElementById('save-status');
    if (st) st.textContent = 'Error saving';
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 400);
}

/* ============================================================
   EVENTS & BINDING
   ============================================================ */
function bindEvents() {
  document.getElementById('lesson-title-input').addEventListener('input', e => {
    const lesson = getActiveLesson();
    if (lesson) { lesson.title = e.target.value; scheduleSave(); renderTree(); }
  });

  document.getElementById('lesson-body').addEventListener('input', e => {
    const lesson = getActiveLesson();
    if (lesson) { lesson.body = e.target.value; scheduleSave(); updatePreview(); updateWordCount(); }
  });

  document.querySelectorAll('.editor-toolbar button').forEach(btn => {
    btn.onclick = () => insertFormat(btn.dataset.format);
  });
  
  document.querySelectorAll('.import-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.import-tab').forEach(t => { t.style.color = 'var(--muted)'; t.style.borderBottom = 'none'; });
      tab.style.color = 'var(--primary)'; tab.style.borderBottom = '2px solid var(--primary)';
      document.querySelectorAll('.import-panel').forEach(p => p.style.display = p.dataset.panel === tab.dataset.tab ? 'block' : 'none');
    };
  });
}

function toggleMobileTree() {
  document.getElementById('left-panel').classList.toggle('mobile-hidden');
}

function toggleMobilePreview() {
  document.getElementById('right-panel').classList.toggle('mobile-open');
}

/* ============================================================
   RENDER TREE
   ============================================================ */
function getActiveLesson() {
  const c = state.courses.find(x => x.id === state.activeCourseId);
  if (!c) return null;
  const ch = c.chapters.find(x => x.id === state.activeChapterId);
  if (!ch) return null;
  return ch.lessons.find(x => x.id === state.activeLessonId) || null;
}

function renderTree() {
  const container = document.getElementById('tree-scroll');
  container.innerHTML = '';

  state.courses.forEach(course => {
    const isOpen = state.activeCourseId === course.id;
    const cDiv = document.createElement('div');
    cDiv.className = 'tree-course';
    cDiv.innerHTML = `
      <button class="tree-course-toggle">
        <svg class="icon" style="width:14px; height:14px; transform:rotate(${isOpen ? '90deg' : '0deg'}); transition:transform 0.2s;" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>
        <svg class="icon" style="width:16px; height:16px; color:var(--primary);" viewBox="0 0 24 24"><path d="M12 5.5C8.5 3.4 5 3.4 2.5 4.5v14C5 17.4 8.5 17.4 12 19.5c3.5-2.1 7-2.1 9.5-1v-14C19 3.4 15.5 3.4 12 5.5Z"/></svg>
        <span>${escapeHtml(course.title)}</span>
      </button>
      <div class="tree-children" style="display:${isOpen ? 'block' : 'none'};">
        ${course.chapters.map(ch => `
          <div class="tree-chapter">
            <div style="display:flex; align-items:center; padding:4px 8px; font-size:11px; color:var(--muted);">
              <span>${escapeHtml(ch.title)}</span>
            </div>
            ${ch.lessons.map(l => `
              <div class="tree-lesson ${l.id === state.activeLessonId ? 'active' : ''}" onclick="selectLesson('${course.id}', '${ch.id}', '${l.id}')">
                <div class="tree-lesson-link">
                  <span class="status-dot"></span>
                  <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(l.title || 'Untitled')}</span>
                </div>
              </div>
            `).join('')}
            <button onclick="addLesson('${course.id}', '${ch.id}')" style="font-size:11px; color:var(--muted); padding:8px; display:flex; align-items:center; gap:4px;">
              <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Add lesson
            </button>
          </div>
        `).join('')}
        <button onclick="addChapter('${course.id}')" style="font-size:11px; color:var(--muted); padding:8px 8px 8px 24px; display:flex; align-items:center; gap:4px;">
          <svg class="icon" style="width:12px; height:12px;" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> New chapter
        </button>
      </div>
    `;
    cDiv.querySelector('.tree-course-toggle').onclick = () => {
      state.activeCourseId = isOpen ? null : course.id;
      renderTree();
    };
    container.appendChild(cDiv);
  });
}

function addLesson(courseId, chapterId) {
  const c = state.courses.find(x => x.id === courseId);
  const ch = c.chapters.find(x => x.id === chapterId);
  const newLesson = { id: uid('l'), title: 'New lesson', body: '# New lesson\n\nStart writing here.\n' };
  ch.lessons.push(newLesson);
  selectLesson(courseId, chapterId, newLesson.id);
}

function addChapter(courseId) {
  const c = state.courses.find(x => x.id === courseId);
  c.chapters.push({ id: uid('ch'), title: 'New Chapter', lessons: [] });
  scheduleSave();
  renderTree();
}

function addSubject() {
  const cid = uid('c');
  state.courses.push({ id: cid, title: 'New Subject', subject: cid, chapters: [{ id: uid('ch'), title: 'Introduction', lessons: [] }] });
  state.activeCourseId = cid;
  scheduleSave();
  renderTree();
}

function selectLesson(courseId, chapterId, lessonId) {
  state.activeCourseId = courseId;
  state.activeChapterId = chapterId;
  state.activeLessonId = lessonId;
  renderTree();
  renderEditor();
  if (window.innerWidth < 900) toggleMobileTree();
}

/* ============================================================
   RENDER EDITOR
   ============================================================ */
function renderEditor() {
  const lesson = getActiveLesson();
  const titleInput = document.getElementById('lesson-title-input');
  const bodyInput = document.getElementById('lesson-body');
  const chipSubject = document.getElementById('chip-subject');

  if (!lesson) {
    titleInput.value = '';
    bodyInput.value = '';
    chipSubject.textContent = 'Select a lesson';
    document.getElementById('preview-content').innerHTML = '';
    return;
  }

  const course = state.courses.find(c => c.id === state.activeCourseId);
  titleInput.value = lesson.title;
  bodyInput.value = lesson.body || '';
  chipSubject.textContent = course ? course.title : 'Subject';

  updatePreview();
  updateWordCount();
}

function updatePreview() {
  const lesson = getActiveLesson();
  const preview = document.getElementById('preview-content');
  if (!lesson || !preview) return;
  preview.innerHTML = `<h1>${escapeHtml(lesson.title)}</h1>` + renderMarkdown(lesson.body || '');
  hydrateMath(preview);
}

function updateWordCount() {
  const lesson = getActiveLesson();
  const el = document.getElementById('word-count');
  if (!lesson || !el) return;
  const words = (lesson.body || '').replace(/```[\s\S]*?```/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  el.textContent = `${words} words · 2 blocks`;
}

/* ============================================================
   TOOLBAR
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
  callout: () => '\n```callout\ntype: tip\ntitle: A worked example\nWalk through the idea step by step.\n```\n'
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
   MARKDOWN PARSING (For Preview)
   ============================================================ */
function renderMarkdown(source) {
  if (!source) return '';
  // Quick standalone preview renderer (no custom block HTML parsing here for simplicity, 
  // marked does the heavy lifting).
  let html = window.marked ? marked.parse(source, { gfm: true }) : `<p>${escapeHtml(source)}</p>`;
  if (window.DOMPurify) html = DOMPurify.sanitize(html);
  
  // Wrap math $...$
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('p, li, td, th, span, strong, em').forEach(el => {
    el.innerHTML = el.innerHTML.replace(/\$\$([^$]+?)\$\$/g, (_, m) => `<span class="math-display" data-latex="${escapeHtml(m)}" data-display="true"></span>`)
                               .replace(/\$([^\n$]+?)\$/g, (_, m) => `<span class="math-inline" data-latex="${escapeHtml(m)}" data-display="false"></span>`);
  });
  return div.innerHTML;
}

function hydrateMath(root) {
  if (!window.katex) return;
  root.querySelectorAll('[data-latex]').forEach(node => {
    try {
      katex.render(node.dataset.latex, node, { displayMode: node.dataset.display === 'true', throwOnError: false, strict: 'ignore' });
    } catch {}
  });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ============================================================
   IMPORT / EXPORT
   ============================================================ */
function openImportModal() { document.getElementById('modal-import').classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => processImportText(reader.result);
  reader.readAsText(file);
}

function parsePasted() {
  const text = document.getElementById('import-paste').value;
  if (text.trim()) processImportText(text);
}

async function fetchFromGitHub() {
  const owner = document.getElementById('import-gh-owner').value.trim();
  const repo = document.getElementById('import-gh-repo').value.trim();
  const file = document.getElementById('import-gh-filename').value.trim();
  if (!owner || !repo || !file) return alert('Fill all fields');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/notes-banks/${file}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3.raw' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    processImportText(await res.text());
  } catch (e) { alert('Fetch failed: ' + e.message); }
}

function processImportText(raw) {
  let text = String(raw);
  const m = text.match(/window\.CBT_NOTE_BANKS\.push\(\s*`([\s\S]*?)`\s*\)/);
  if (m) text = m[1].replace(/\\`/g, '`').replace(/\\\$/g, '$').replace(/\\\\/g, '\\');

  const subjectChunks = text.split(/\n(?=Subject:\s*)/i);
  const allCourses = [];

  for (const chunk of subjectChunks) {
    if (!chunk.trim()) continue;
    let subject = null;
    const topics = [];
    let currentTopic = null, currentLesson = null, lessonLines = [];

    function flushLesson() {
      if (!currentLesson) return;
      const body = lessonLines.join('\n').trim();
      if (currentTopic) currentTopic.lessons.push({ id: uid('l'), title: currentLesson, body });
      currentLesson = null; lessonLines = [];
    }
    function flushTopic() {
      flushLesson();
      if (currentTopic && currentTopic.lessons.length) topics.push(currentTopic);
      currentTopic = null;
    }

    chunk.split('\n').forEach(l => {
      const subM = l.match(/^Subject:\s*(.*)$/i); if (subM) { subject = subM[1].trim(); return; }
      const topM = l.match(/^Topic:\s*(.*)$/i); if (topM) { flushTopic(); currentTopic = { id: uid('ch'), title: topM[1].trim(), lessons: [] }; return; }
      const lessM = l.match(/^Lesson:\s*(.*)$/i); if (lessM) { flushLesson(); currentLesson = lessM[1].trim(); lessonLines = []; return; }
      if (currentLesson) lessonLines.push(l);
    });
    flushTopic();

    if (subject && topics.length) {
      allCourses.push({ id: uid('c'), title: subject, subject: subject, chapters: topics });
    }
  }

  if (allCourses.length === 0) {
    document.getElementById('import-summary').style.display = 'block';
    document.getElementById('import-summary').textContent = 'Could not parse bank. Check format.';
    document.getElementById('import-confirm').disabled = true;
    return;
  }

  pendingImport = allCourses;
  document.getElementById('import-summary').style.display = 'block';
  document.getElementById('import-summary').textContent = `Parsed: ${allCourses.length} Subjects, ${allCourses.reduce((a,c)=>a+c.chapters.reduce((b,ch)=>b+ch.lessons.length,0),0)} Lessons`;
  document.getElementById('import-confirm').disabled = false;
}

function executeImport() {
  if (!pendingImport) return;
  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  if (mode === 'replace') {
    if(!confirm('Replace all current content?')) return;
    state.courses = pendingImport;
  } else if (mode === 'merge') {
    pendingImport.forEach(newC => {
      const existing = state.courses.find(c => c.title.toLowerCase() === newC.title.toLowerCase());
      if (existing) existing.chapters.push(...newC.chapters);
      else state.courses.push(newC);
    });
  } else {
    state.courses.push(...pendingImport);
  }
  state.activeCourseId = state.courses[0].id;
  state.activeChapterId = state.courses[0].chapters[0]?.id;
  pendingImport = null;
  closeModal('modal-import');
  persist();
  renderTree();
}

/* ============================================================
   EXPORT & PUBLISH
   ============================================================ */
function buildBankText() {
  let text = '';
  state.courses.forEach(course => {
    text += `Subject: ${course.title}\n\n`;
    course.chapters.forEach(ch => {
      if (!ch.lessons.length) return;
      text += `Topic: ${ch.title}\n\n`;
      ch.lessons.forEach(l => {
        text += `Lesson: ${l.title}\n\n${(l.body||'').trim()}\n\n`;
      });
    });
  });
  return text.trim();
}

function openExportModal() {
  // We'll just use download for now to keep it simple
  const text = buildBankText();
  const blob = new Blob([`window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(String.raw\`${text}\`);\n`], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'notes-bank.js'; a.click();
  URL.revokeObjectURL(url);
}

function openPublishModal() {
  document.getElementById('modal-publish').classList.add('open');
  const creds = localStorage.getItem(LS_CREDS);
  if (creds) {
    const c = JSON.parse(creds);
    document.getElementById('gh-owner').value = c.owner || '';
    document.getElementById('gh-repo').value = c.repo || '';
  }
  document.getElementById('publish-filename').value = (state.courses[0]?.title || 'notes').toLowerCase().replace(/\s+/g, '-') + '.js';
  document.getElementById('publish-preflight').textContent = '✓ Ready to publish ' + state.courses.length + ' subjects';
  document.getElementById('publish-script-tag').style.display = 'none';
}

async function executePublish() {
  const owner = document.getElementById('gh-owner').value.trim();
  const repo = document.getElementById('gh-repo').value.trim();
  const filename = document.getElementById('publish-filename').value.trim();
  if (!owner || !repo || !filename) return alert('Fill all fields');
  localStorage.setItem(LS_CREDS, JSON.stringify({ owner, repo }));

  const btn = document.getElementById('publish-btn');
  btn.textContent = 'Publishing...'; btn.disabled = true;

  const bankText = buildBankText();
  const escaped = bankText.replace(/\\/g, '\\\\').replace(/\$\{/g, '\\${');
  const code = `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(String.raw\`${escaped}\`);\n`;

  try {
    const res = await fetch('/api/publish-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, code, repoOwner: owner, repoName: repo })
    });
    if (!res.ok) throw new Error((await res.json()).error);
    
    document.getElementById('publish-script-tag').style.display = 'block';
    document.getElementById('script-tag-text').textContent = `<script defer src="notes-banks/${filename}"><\/script>`;
    alert('Published successfully!');
  } catch (e) {
    alert('Error: ' + e.message);
  } finally {
    btn.textContent = 'Publish'; btn.disabled = false;
  }
}

function copyScriptTag() {
  navigator.clipboard.writeText(document.getElementById('script-tag-text').textContent).then(() => alert('Copied!'));
}
