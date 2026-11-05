// ============================================================
// NOTES BUILDER
// Authoring UI for note banks. Saves to localStorage,
// exports as notes-banks/<slug>-notes.js, publishes via
// /api/publish-notes (server-side GitHub token).
// ============================================================

const STORAGE_KEY = 'cbt_notes_builder_state';
const LOCAL_DRAFT = 'cbt_notes_builder_draft';

let appData = { subject: 'Untitled Subject', description: '', topics: [] };
let selectedTopicIndex = null;
let selectedLessonIndex = null;
let saveTimer = null;

window.addEventListener('DOMContentLoaded', init);

function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { appData = JSON.parse(saved); } catch {}
  }
  if (!appData.topics.length) {
    appData.topics.push({ name: 'Introduction', lessons: [] });
  }
  selectedTopicIndex = 0;
  document.getElementById('bank-subject-input').value = appData.subject;
  document.getElementById('bank-subject-input').addEventListener('input', (e) => {
    appData.subject = e.target.value;
    triggerAutoSave();
  });
  renderAll();
}

function triggerAutoSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      flashSaved();
    } catch {}
  }, 400);
}

function flashSaved() {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 1500);
}

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function renderAll() {
  renderTree();
  renderEditor();
  if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise().catch(() => {});
}

function renderTree() {
  const container = document.getElementById('topics-tree');
  container.innerHTML = '';
  appData.topics.forEach((topic, ti) => {
    const isSel = ti === selectedTopicIndex && selectedLessonIndex === null;
    const row = document.createElement('div');
    row.className = `flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition ${isSel ? 'bg-brand-dark/20 text-brand-light border border-brand/30' : 'text-mid hover:bg-ink-800'}`;
    row.innerHTML = `<span class="truncate">📂 ${escapeHtml(topic.name)}</span><span class="text-[10px] text-lo font-mono ml-2">${topic.lessons.length}</span>`;
    row.onclick = () => { selectedTopicIndex = ti; selectedLessonIndex = null; renderAll(); };
    container.appendChild(row);

    const lessonWrap = document.createElement('div');
    lessonWrap.className = 'ml-3 border-l border-ink-800 space-y-0.5';
    topic.lessons.forEach((lesson, li) => {
      const lIsSel = ti === selectedTopicIndex && li === selectedLessonIndex;
      const lRow = document.createElement('div');
      lRow.className = `flex items-center px-2 py-1 rounded text-xs cursor-pointer transition ${lIsSel ? 'bg-brand-dark/20 text-brand-light border border-brand/30' : 'text-lo hover:bg-ink-800/60'}`;
      lRow.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-brand mr-2 shrink-0"></span><span class="truncate">${escapeHtml(lesson.title || 'Untitled lesson')}</span>`;
      lRow.onclick = (e) => { e.stopPropagation(); selectedTopicIndex = ti; selectedLessonIndex = li; renderAll(); };
      lessonWrap.appendChild(lRow);
    });
    const addBtn = document.createElement('button');
    addBtn.className = 'w-full text-left px-2 py-1 text-[10px] text-lo hover:text-brand-light';
    addBtn.textContent = '+ Add lesson';
    addBtn.onclick = (e) => { e.stopPropagation(); addLesson(ti); };
    lessonWrap.appendChild(addBtn);
    container.appendChild(lessonWrap);
  });
}

function addTopic() {
  appData.topics.push({ name: 'New topic', lessons: [] });
  selectedTopicIndex = appData.topics.length - 1;
  selectedLessonIndex = null;
  triggerAutoSave();
  renderAll();
}

function addLesson(topicIndex) {
  appData.topics[topicIndex].lessons.push({
    title: 'New lesson',
    body: '# New lesson\n\nStart writing here.\n'
  });
  selectedTopicIndex = topicIndex;
  selectedLessonIndex = appData.topics[topicIndex].lessons.length - 1;
  triggerAutoSave();
  renderAll();
}

function renderEditor() {
  const pane = document.getElementById('editor-pane');
  pane.innerHTML = '';

  if (selectedTopicIndex === null) {
    pane.innerHTML = '<div class="text-center text-lo py-12">Select a topic or lesson on the left.</div>';
    return;
  }
  const topic = appData.topics[selectedTopicIndex];

  if (selectedLessonIndex === null) {
    const wrap = document.createElement('div');
    wrap.className = 'max-w-2xl mx-auto space-y-6';
    wrap.innerHTML = `
      <div>
        <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1">Topic name</label>
        <input id="topic-name-input" type="text" value="${escapeHtml(topic.name)}"
               class="w-full bg-ink-800 text-lg font-bold text-hi border border-ink-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand">
      </div>
      <div class="pt-6 border-t border-ink-700/60 flex justify-between">
        <button onclick="deleteTopic(${selectedTopicIndex})" class="px-4 py-2 text-xs font-semibold text-rose hover:bg-rose/10 rounded-xl border border-rose/30">Delete topic</button>
        <button onclick="addLesson(${selectedTopicIndex})" class="px-4 py-2 text-xs font-semibold bg-brand text-ink-900 rounded-xl hover:bg-brand-light">+ Add lesson</button>
      </div>`;
    pane.appendChild(wrap);
    const input = document.getElementById('topic-name-input');
    input.addEventListener('input', (e) => { topic.name = e.target.value; triggerAutoSave(); renderTree(); });
    return;
  }

  const lesson = topic.lessons[selectedLessonIndex];
  const wrap = document.createElement('div');
  wrap.className = 'max-w-3xl mx-auto space-y-4';
  wrap.innerHTML = `
    <div class="flex items-center justify-between bg-ink-900 border border-ink-700 rounded-xl p-3">
      <span class="text-xs text-lo">Topic: <strong class="text-hi">${escapeHtml(topic.name)}</strong></span>
      <button onclick="deleteLesson()" class="px-3 py-1 text-xs text-rose hover:bg-rose/10 rounded-lg border border-rose/30">Delete lesson</button>
    </div>
    <div>
      <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1">Lesson title</label>
      <input id="lesson-title-input" type="text" value="${escapeHtml(lesson.title)}"
             class="w-full bg-ink-800 text-lg font-bold text-hi border border-ink-700 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand">
    </div>
    <div>
      <label class="block text-xs font-semibold text-lo uppercase tracking-wider mb-1">Lesson body (markdown)</label>
      <textarea id="lesson-body-input" rows="24"
                class="w-full bg-ink-800 font-mono text-xs text-hi border border-ink-700 rounded-xl p-3 focus:outline-none focus:border-brand">${escapeHtml(lesson.body)}</textarea>
      <p class="text-[11px] text-lo mt-1">Supports headings, lists, tables, <code class="text-brand-light">$inline$</code> and <code class="text-brand-light">$$display$$</code> math, and EduNotes blocks: <code class="text-brand-light">```callout / quiz / steps / math / video</code>.</p>
    </div>`;
  pane.appendChild(wrap);

  document.getElementById('lesson-title-input').addEventListener('input', (e) => {
    lesson.title = e.target.value;
    triggerAutoSave();
    renderTree();
  });
  document.getElementById('lesson-body-input').addEventListener('input', (e) => {
    lesson.body = e.target.value;
    triggerAutoSave();
  });
}

function deleteTopic(index) {
  if (!confirm('Delete this topic and all its lessons?')) return;
  appData.topics.splice(index, 1);
  if (!appData.topics.length) appData.topics.push({ name: 'Introduction', lessons: [] });
  selectedTopicIndex = 0;
  selectedLessonIndex = null;
  triggerAutoSave();
  renderAll();
}

function deleteLesson() {
  if (selectedLessonIndex === null) return;
  if (!confirm('Delete this lesson?')) return;
  appData.topics[selectedTopicIndex].lessons.splice(selectedLessonIndex, 1);
  selectedLessonIndex = null;
  triggerAutoSave();
  renderAll();
}

/* ---------- Export ---------- */

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subject';
}

function buildBankText() {
  let text = 'Subject: ' + (appData.subject || 'Untitled Subject') + '\n';
  if (appData.description) text += 'Description: ' + appData.description + '\n';
  text += '\n';
  for (const topic of appData.topics) {
    if (!topic.lessons.length) continue;
    text += 'Topic: ' + topic.name + '\n\n';
    for (const lesson of topic.lessons) {
      text += 'Lesson: ' + (lesson.title || 'Untitled lesson') + '\n\n';
      text += (lesson.body || '').trim() + '\n\n';
    }
  }
  return text.trim();
}

function buildExportCode() {
  const bankText = buildBankText();
  const escaped = bankText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `window.CBT_NOTE_BANKS = window.CBT_NOTE_BANKS || [];\n\nwindow.CBT_NOTE_BANKS.push(\`${escaped}\`);\n`;
}

function openExportModal() {
  document.getElementById('modal-export').classList.remove('hidden');
  document.getElementById('export-filename').value = slugify(appData.subject) + '-notes.js';
  document.getElementById('export-code-preview').textContent = buildExportCode();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function copyExportCode() {
  const code = document.getElementById('export-code-preview').textContent;
  navigator.clipboard.writeText(code).then(() => alert('Copied to clipboard.'));
}

function downloadExportFile() {
  const code = buildExportCode();
  const name = document.getElementById('export-filename').value || 'notes-bank.js';
  const blob = new Blob([code], { type: 'application/javascript;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  closeModal('modal-export');
}

/* ---------- Publish ---------- */

function openPublishModal() {
  document.getElementById('modal-publish').classList.remove('hidden');
  document.getElementById('gh-owner').value = localStorage.getItem('gh_owner') || '';
  document.getElementById('gh-repo').value  = localStorage.getItem('gh_repo')  || '';
  document.getElementById('publish-filename').value = slugify(appData.subject) + '-notes.js';
}

async function executePublish() {
  const owner = document.getElementById('gh-owner').value.trim();
  const repo  = document.getElementById('gh-repo').value.trim();
  const filename = document.getElementById('publish-filename').value.trim();

  if (!owner || !repo || !filename) {
    alert('Please fill in the owner, repo, and filename.');
    return;
  }
  localStorage.setItem('gh_owner', owner);
  localStorage.setItem('gh_repo', repo);

  const btn = document.getElementById('btn-do-publish');
  btn.textContent = 'Publishing...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/publish-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        code: buildExportCode(),
        repoOwner: owner,
        repoName: repo
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Publish failed');
    alert('Published. Vercel will deploy shortly.');
    closeModal('modal-publish');
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.textContent = 'Publish';
    btn.disabled = false;
  }
}
