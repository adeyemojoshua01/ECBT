'use strict';

  const STORAGE_KEY = 'edunotes.v1';
  const FENCE = '```';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeNode = document.createElement('div');
  const e = value => { escapeNode.textContent = String(value ?? ''); return escapeNode.innerHTML; };
  const ea = value => e(value).replace(/"/g, '&#34;').replace(/'/g, '&#39;');
  const uid = prefix => prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  const localDate = (date = new Date()) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const slugify = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  const iconPaths = {
    book:'<path d="M12 5.5C8.5 3.4 5 3.4 2.5 4.5v14C5 17.4 8.5 17.4 12 19.5c3.5-2.1 7-2.1 9.5-1v-14C19 3.4 15.5 3.4 12 5.5Z"/><path d="M12 5.5v14M6 8l3 .5M6 11l3 .5M15 8.5l3-.5M15 11.5l3-.5"/>',
    library:'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="14" width="6.5" height="6.5" rx="1.5"/>',
    learning:'<path d="m2 8.5 10-5 10 5-10 5-10-5Z"/><path d="M6 11v6c3.5 2.7 8.5 2.7 12 0v-6M22 9v6"/>',
    bookmark:'<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/>',
    bookmarkFilled:'<path fill="currentColor" stroke="none" d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/>',
    math:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2M8 18h2m4 0h2"/>',
    science:'<path d="M9 3h6M10 3v6l-5.5 9a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3M8 14h8"/><path d="M9 17h.01M14 18h.01"/>',
    english:'<path d="M4 19.5h16M6 16 11.5 3h1L18 16M8 11h8"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
    code:'<rect x="2.5" y="4" width="19" height="14" rx="2.5"/><path d="m9 8-3 3 3 3m6-6 3 3-3 3M8 21h8m-4-3v3"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',
    arrowLeft:'<path d="M20 12H5m5-5-5 5 5 5"/>',
    arrowUpRight:'<path d="M6 18 18 6M6 6h12v12"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    up:'<path d="m6 15 6-6 6 6"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    circle:'<circle cx="12" cy="12" r="8"/>',
    progress:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flame:'<path d="M12 2c1 5-4 6-4 10 0 1 .5 2 1.5 2.5C9 10 13 10 14 7c2 2 5 5 5 8a7 7 0 0 1-14 0c0-5 4-7 7-13Z"/>',
    moon:'<path d="M20.5 13.5A8.5 8.5 0 0 1 10.5 3 9 9 0 1 0 20.5 13.5Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    keyboard:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
    leaf:'<path d="M20 3C8 2 3 7 5 14c2 7 15 6 15-11Z"/><path d="M4 21 16 8M8 13h5m-2-3v5"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2.1 2.1 0 0 0-5-5L4 15l-1 6 6-2"/>',
    note:'<path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V10Z"/><path d="M14 3v7h7M7 14h10M7 17h7"/>',
    sparkles:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    cloud:'<path d="M6.5 18H6a4 4 0 0 1-.8-7.9 7 7 0 0 1 13.3-1.6A4.8 4.8 0 0 1 18.5 18H17"/><path d="m9 16 3 3 5-5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/>',
    download:'<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    desktop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    tablet:'<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M11 18h2"/>',
    mobile:'<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 5h4m-3 13h2"/>',
    eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    panel:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    link:'<path d="m9 15 6-6M9 7l3-3a5 5 0 0 1 7 7l-3 3M15 17l-3 3a5 5 0 0 1-7-7l3-3"/>',
    list:'<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
    tasks:'<path d="m3 6 2 2 3-4m-5 9 2 2 3-4m-5 9 2 2 3-4M11 6h10M11 13h10M11 20h10"/>',
    brackets:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
    sigma:'<path d="M19 4H5l8 8-8 8h14"/>',
    quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.2 8.5a3 3 0 0 1 5.7 1.2c0 2-3 2-3 4m0 3h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    warning:'<path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5m0 3h.01"/>',
    bulb:'<path d="M8 16a7 7 0 1 1 8 0l-1 3H9l-1-3Zm1 6h6M12 7v5"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    grip:'<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
    more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    video:'<rect x="2" y="5" width="14" height="14" rx="2"/><path d="m16 10 6-4v12l-6-4"/>',
    steps:'<path d="M3 18h6v-6h6V6h6M3 21h18"/>',
    send:'<path d="m22 2-7 20-4-9L2 9 22 2ZM11 13 22 2"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.book}</svg>`;
  const brand = (compact = false) => `<span class="brand-mark">${icon('book')}</span>${compact ? '' : '<span class="brand-name">Edu<span>Notes</span></span>'}`;

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

    function makeSeed() {
    // Built-in seed data has been extracted to notes-banks/edunotes-core-notes.js
    return {
      courses: [],
      progress: {},
      bookmarks: [], myNotes: {},
      ui:{role:'student',theme:'system',studioSplit:.51,device:'mobile',name:'Alex Morgan',streak:{count:0,lastDate:null},lastLesson:null,lastRoute:'#/library'}
    };
  }
          

  let state;
  let storageUnavailable = false;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (stored && Array.isArray(stored.courses)) {
      state = stored;
      state.progress ||= {}; state.bookmarks ||= []; state.myNotes ||= {};
      state.ui = { role:'student',theme:'system',studioSplit:.51,device:'mobile',name:'Alex Morgan',streak:{count:0,lastDate:null},lastLesson:'math-linear',...state.ui };
      for (const course of state.courses) for (const chapter of course.chapters || []) for (const lesson of chapter.lessons || []) {
        if (lesson.status === 'published' && !lesson.publishedBody) lesson.publishedBody = lesson.body;
      }
    } else state = makeSeed();
  } catch { state = makeSeed(); }

  const runtime = { homeFilter:'all',learningFilter:'all',searchIndex:0,treeOpen:{},chapterOpen:{},treeHidden:false,previewOpen:false,activeLesson:null,readerCleanup:null,saveTimer:null,toastTimer:null,previewReady:false,dragId:null,notesLesson:null,quizRegistry:{},lastFocus:null };
  const allLessons = () => state.courses.flatMap(course => [...(course.chapters || [])].sort((a,b)=>a.order-b.order).flatMap(chapter => [...(chapter.lessons || [])].sort((a,b)=>a.order-b.order).map(lesson => ({course,chapter,lesson}))));
  const findLesson = id => allLessons().find(x => x.lesson.id === id);
  const publishedLessons = () => allLessons().filter(x => x.lesson.status === 'published');
  const findChapter = id => state.courses.flatMap(course => course.chapters.map(chapter => ({course,chapter}))).find(x => x.chapter.id === id);
  const studentSource = lesson => lesson.publishedBody || lesson.body;
  const lessonTitle = (lesson,preview=false) => parseFrontmatter(preview ? lesson.body : studentSource(lesson)).meta.title || lesson.title || 'Untitled lesson';
  const lessonMeta = (lesson,preview=false) => ({...lesson.frontmatter,...parseFrontmatter(preview ? lesson.body : studentSource(lesson)).meta});
  const durationOf = lesson => Math.max(1,parseInt(lessonMeta(lesson).duration,10) || 5);
  const progressOf = id => state.progress[id] || {status:'new',percent:0};
  const isDark = () => state.ui.theme === 'dark' || (state.ui.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const currentStreak = () => {
    const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
    return [localDate(now),localDate(yesterday)].includes(state.ui.streak.lastDate)?state.ui.streak.count:0;
  };
  const wordCount = text => parseFrontmatter(text).content.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`$|>]/g,' ').trim().split(/\s+/).filter(Boolean).length;
  const blockCount = text => (parseFrontmatter(text).content.match(/^```\w*/gm) || []).length / 2;
  const formatTime = date => new Date(date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});

  function applyTheme() {
    document.documentElement.dataset.theme = isDark() ? 'dark' : 'light';
    $('meta[name="theme-color"]').content = isDark() ? '#0B1220' : '#F6F8FB';
    $$('.theme-label').forEach(el => el.textContent = isDark() ? 'Light appearance' : 'Dark appearance');
    $$('[data-action="theme"]').forEach(el => el.setAttribute('aria-pressed',String(isDark())));
    const frame = $('#preview-frame');
    if (frame?.contentDocument?.documentElement) frame.contentDocument.documentElement.dataset.theme = document.documentElement.dataset.theme;
  }
  applyTheme();

  function persist(showFeedback=false) {
    clearTimeout(runtime.saveTimer);
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      storageUnavailable = false;
      const status = $('#studio-save-status');
      if (status) status.innerHTML = `${icon('cloud')} Saved <span class="save-time">${e(formatTime(Date.now()))}</span>`;
      const noteStatus = $('#notes-save-status');
      if (noteStatus) noteStatus.textContent = 'Saved on this device';
      $$('[data-storage-status]').forEach(node=>node.textContent='Your progress is saved on this device');
      if (showFeedback) toast('Draft saved on this device.');
      return true;
    } catch {
      if (!storageUnavailable || showFeedback) toast('Local storage is unavailable. Export your lesson to keep a copy.','warning');
      storageUnavailable = true;
      const status = $('#studio-save-status');
      if (status) status.textContent = 'Not saved: storage unavailable';
      const noteStatus = $('#notes-save-status');
      if (noteStatus) noteStatus.textContent = 'Not saved: browser storage unavailable';
      $$('[data-storage-status]').forEach(node=>node.textContent='Storage unavailable. Changes stay in this tab only.');
      return false;
    }
  }

  function scheduleSave() {
    clearTimeout(runtime.saveTimer);
    runtime.saveTimer = setTimeout(() => persist(),500);
  }

  function toast(message, type='checkCircle') {
    clearTimeout(runtime.toastTimer);
    $('#toast-host').innerHTML = `<div class="toast">${icon(type)}<span>${e(message)}</span></div>`;
    runtime.toastTimer = setTimeout(() => { $('#toast-host').innerHTML = ''; },2500);
  }

  function navigate(route) {
    closePopover();
    closeDrawer();
    closeMobileNav();
    $$('dialog[open]').forEach(dialog => dialog.close());
    if (location.hash === route) renderApp();
    else location.hash = route;
  }

  function ring(percent) {
    return `<svg class="progress-ring" viewBox="0 0 34 34" role="img" aria-label="${Math.round(percent)} percent complete" style="--progress:${Math.max(0,Math.min(100,percent))/100}"><circle class="ring-track" cx="17" cy="17" r="14.5" fill="none" stroke-width="3"/><circle class="ring-fill" cx="17" cy="17" r="14.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
  }

  function subjectChip(course) {
    return `<span class="subject-chip subject-${ea(course.subject)}">${icon(course.icon || 'book')} ${e(course.title)}</span>`;
  }

  function learningStatus(status) {
    return `<span class="lesson-status ${ea(status)}" role="img" aria-label="${status === 'complete' ? 'Completed' : status === 'in-progress' ? 'In progress' : 'Not started'}">${icon(status === 'complete' ? 'checkCircle' : status === 'in-progress' ? 'progress' : 'circle')}</span>`;
  }

  function safeHTML(html) {
    if (window.DOMPurify) return DOMPurify.sanitize(html, {
      ALLOWED_TAGS:['a','blockquote','br','code','del','div','em','h1','h2','h3','h4','h5','h6','hr','img','input','li','ol','p','pre','span','strong','table','thead','tbody','td','th','tr','ul'],
      ALLOWED_ATTR:['href','src','alt','title','class','type','checked','disabled','role','aria-label','data-latex','data-display','data-edunotes-block'],
      ALLOW_DATA_ATTR:false
    });
    const template = document.createElement('template');
    template.innerHTML = html;
    const allowed = new Set(['A','BLOCKQUOTE','BR','CODE','DEL','DIV','EM','H1','H2','H3','H4','H5','H6','HR','IMG','INPUT','LI','OL','P','PRE','SPAN','STRONG','TABLE','THEAD','TBODY','TD','TH','TR','UL']);
    for (const node of [...template.content.querySelectorAll('*')]) {
      if (['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META'].includes(node.tagName)) { node.remove(); continue; }
      if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
      for (const attr of [...node.attributes]) {
        if (!['href','src','alt','title','class','type','checked','disabled','role','aria-label','data-latex','data-display','data-edunotes-block'].includes(attr.name)) node.removeAttribute(attr.name);
      }
      for (const attr of ['href','src']) {
        const value = node.getAttribute(attr);
        if (value && !/^(https?:\/\/|mailto:|#|\/|\.\/)/i.test(value)) node.removeAttribute(attr);
      }
      if (node.tagName === 'INPUT') { node.type = 'checkbox'; node.disabled = true; }
    }
    return template.innerHTML;
  }

  function mathHTML(latex, display=false) {
    const tag = display ? 'div' : 'span';
    return `<${tag} class="${display ? 'math-display' : 'math-inline'}" data-latex="${ea(latex.trim())}" data-display="${display}" role="math" aria-label="${ea(latex.trim())}">${e(latex.trim())}</${tag}>`;
  }

  function protectMath(source) {
    return source.split(/(`[^`\n]*`)/g).map((part,index) => index % 2 ? part : part.replace(/\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g, (_,display,inline) => display ? '\n\n' + mathHTML(display,true) + '\n\n' : mathHTML(inline,false))).join('');
  }

  function fallbackMarkdown(source, inline=false) {
    const protectedNodes = [];
    let text = source.replace(/<(span|div)\b[^>]*(?:data-latex|data-edunotes-block)=[^>]*>[\s\S]*?<\/\1>/g, html => {
      protectedNodes.push(html); return `EDUPROTECTED${protectedNodes.length-1}TOKEN`;
    });
    text = e(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
    if (!inline) {
      text = text.split(/\n\n+/).map(block => {
        if (/^EDUPROTECTED\d+TOKEN$/.test(block.trim())) return block;
        if (/^#{1,6} /.test(block)) return block.replace(/^(#{1,6}) (.+)$/gm,(_,hashes,title)=>`<h${hashes.length}>${title}</h${hashes.length}>`);
        if (/^- /.test(block)) return '<ul>' + block.split('\n').map(line=>'<li>'+line.replace(/^- /,'')+'</li>').join('') + '</ul>';
        if (/^\d+\. /.test(block)) return '<ol>' + block.split('\n').map(line=>'<li>'+line.replace(/^\d+\. /,'')+'</li>').join('') + '</ol>';
        return '<p>' + block.replace(/\n/g,'<br>') + '</p>';
      }).join('\n');
    }
    return text.replace(/EDUPROTECTED(\d+)TOKEN/g,(_,index)=>protectedNodes[Number(index)] || '');
  }

  function inlineHTML(text) {
    const source = protectMath(String(text || ''));
    return safeHTML(window.marked ? marked.parseInline(source) : fallbackMarkdown(source,true));
  }

  function basicMarkdown(text) {
    const source = protectMath(String(text || ''));
    return safeHTML(window.marked ? marked.parse(source,{gfm:true}) : fallbackMarkdown(source));
  }

  function parseQuiz(raw) {
    let data;
    try { data = JSON.parse(raw); } catch {
      data = {options:[]};
      let current = '';
      for (const line of raw.split('\n')) {
        const field = line.match(/^([a-zA-Z]+):\s*(.*)$/);
        if (field) {
          current = field[1].toLowerCase();
          if (current === 'options') {
            if (field[2].trim().startsWith('[')) { try { data.options = JSON.parse(field[2]); } catch {} }
          } else data[current] = field[2].replace(/^['"]|['"]$/g,'');
        } else if (current === 'options' && /^\s*-\s+/.test(line)) data.options.push(line.replace(/^\s*-\s+/,'').replace(/^['"]|['"]$/g,''));
        else if (line.trim() && current && current !== 'options') data[current] += ' ' + line.trim();
      }
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
    const options = Array.isArray(data.options) ? data.options.map(String) : [];
    const answer = data.answer ?? data.correct;
    let answerIndex = null;
    if (Number.isInteger(data.correctIndex)) answerIndex = data.correctIndex;
    else if (answer !== undefined && answer !== null && String(answer).trim() !== '') {
      if (/^\d+$/.test(String(answer).trim())) answerIndex = Number(answer)-1;
      else if (/^[A-Za-z]$/.test(String(answer).trim())) answerIndex = String(answer).toUpperCase().charCodeAt(0)-65;
      else answerIndex = options.findIndex(option=>option === String(answer));
    }
    if (answerIndex === null || answerIndex < 0 || answerIndex >= options.length) answerIndex = null;
    return {question:String(data.question || data.prompt || ''),options,answerIndex,explanation:String(data.explanation || 'Review the lesson and compare each step with your answer.')};
  }

  function renderQuiz(raw, context) {
    const quiz = parseQuiz(raw);
    const index = context.quizIndex++;
    const key = `${context.instance}-quiz-${index}`;
    const valid = quiz.question && quiz.options.length >= 2 && quiz.answerIndex !== null;
    runtime.quizRegistry[key] = {...quiz,key,index,lessonId:context.lessonId,preview:context.preview,submitted:false,valid};
    return `<form class="quiz-block" data-quiz="${ea(key)}" aria-label="Practice question ${index+1}">
      <div class="quiz-top"><span class="quiz-label">${icon('quiz','sm')} A little check-in</span>${context.preview ? '<span class="preview-badge">Preview</span>' : '<span class="muted" style="font-size:10px">Question '+(index+1)+'</span>'}</div>
      <fieldset><legend>${inlineHTML(quiz.question || 'Add your question in Studio')}</legend>
        ${quiz.options.map((option,i)=>`<label class="quiz-option" data-option="${i}"><input type="radio" name="${ea(key)}" value="${i}" ${valid ? '' : 'disabled'}><span>${inlineHTML(option)}</span></label>`).join('')}
      </fieldset>
      <div class="quiz-bottom"><button type="submit" class="btn btn-primary quiz-submit" disabled>Check my answer ${icon('arrow','sm')}</button><small>${context.preview ? 'Practice freely. Nothing is recorded.' : 'Take your time. You have one attempt.'}</small></div>
      ${valid ? '' : '<p class="block-error">Add a question, at least two options, and a valid answer to finish this quiz.</p>'}
      <div class="quiz-live" aria-live="polite" aria-atomic="true"></div>
    </form>`;
  }

  function renderCustomBlock(type, raw, context) {
    if (type === 'quiz') return renderQuiz(raw,context);
    if (type === 'math') return mathHTML(raw,true);
    if (type === 'callout') {
      const lines = raw.trim().split('\n');
      let variant = 'note', title = '';
      const content = lines.filter((line,i) => {
        if (/^type:/i.test(line)) { variant=line.replace(/^type:\s*/i,'').trim(); return false; }
        if (/^title:/i.test(line)) { title=line.replace(/^title:\s*/i,'').trim(); return false; }
        if (i === 0 && /^(note|tip|warning|exam-focus)$/.test(line.trim())) { variant=line.trim(); return false; }
        return true;
      }).join('\n');
      if (!['note','tip','warning','exam-focus'].includes(variant)) variant='note';
      const names = {note:'Worth remembering',tip:'A helpful tip',warning:'Watch out', 'exam-focus':'Exam focus'};
      const icons = {note:'info',tip:'bulb',warning:'warning','exam-focus':'target'};
      return `<aside class="callout ${variant}">${icon(icons[variant])}<div><strong class="callout-title">${e(title || names[variant])}</strong><div class="callout-copy">${basicMarkdown(content)}</div></div></aside>`;
    }
    if (type === 'steps') {
      const steps = raw.trim().split(/\n(?=\d+[.)]\s|[-*]\s)/).map(line=>line.replace(/^(?:\d+[.)]|[-*])\s*/, '').trim()).filter(Boolean);
      return `<ol class="worked-steps">${steps.map((step,i)=>`<li><span class="step-num" aria-hidden="true">${i+1}</span><div class="step-content">${inlineHTML(step)}</div></li>`).join('')}</ol>`;
    }
    if (type === 'video') {
      const fields = {};
      for (const line of raw.trim().split('\n')) { const field=line.match(/^(url|src|title|caption):\s*(.*)$/i); if(field) fields[field[1].toLowerCase()]=field[2]; }
      const source = fields.url || fields.src || raw.trim().split('\n')[0];
      const title = fields.title || 'Lesson video';
      try {
        const url = new URL(source);
        if (!['https:','http:'].includes(url.protocol)) throw new Error('Unsupported URL');
        let embed = '';
        if (/(^|\.)youtube\.com$/.test(url.hostname) || /(^|\.)youtube-nocookie\.com$/.test(url.hostname)) {
          const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
          if (/^[\w-]{11}$/.test(id || '')) embed='https://www.youtube-nocookie.com/embed/'+id;
        } else if (url.hostname === 'youtu.be') {
          const id=url.pathname.slice(1); if (/^[\w-]{11}$/.test(id)) embed='https://www.youtube-nocookie.com/embed/'+id;
        } else if (/(^|\.)vimeo\.com$/.test(url.hostname)) {
          const id=url.pathname.split('/').filter(Boolean).pop(); if (/^\d+$/.test(id || '')) embed='https://player.vimeo.com/video/'+id;
        }
        if (embed) return `<figure class="video-block"><iframe src="${ea(embed)}" title="${ea(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowfullscreen></iframe><figcaption>${e(fields.caption || title)} &middot; <a href="${ea(url.href)}" target="_blank" rel="noopener noreferrer">Open original video</a></figcaption></figure>`;
        if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return `<figure class="video-block"><video src="${ea(url.href)}" controls preload="metadata" aria-label="${ea(title)}"></video><figcaption>${e(fields.caption || title)}</figcaption></figure>`;
      } catch {}
      return '<div class="block-error">Use a YouTube, Vimeo, or direct .mp4 / .webm video URL.</div>';
    }
    return '';
  }

  // This pipeline is used verbatim by the student reader and the iframe preview.
  function renderMarkdown(source, context) {
    const blocks = [];
    let prepared = source.replace(/^```(quiz|callout|math|steps|video)[ \t]*\n([\s\S]*?)^```[ \t]*(?:\n|$)/gmi,(_,type,raw)=>{
      blocks.push(renderCustomBlock(type.toLowerCase(),raw,context));
      return `\n\n<div data-edunotes-block="${blocks.length-1}"></div>\n\n`;
    });
    prepared = prepared.split(/(^```[^\n]*\n[\s\S]*?^```[ \t]*(?:\n|$))/gm).map((part,index)=>index%2 ? part : protectMath(part)).join('');
    const html = safeHTML(window.marked ? marked.parse(prepared,{gfm:true}) : fallbackMarkdown(prepared));
    const container = document.createElement('div');
    container.innerHTML = html;
    $$('[data-edunotes-block]',container).forEach(node=>{ node.outerHTML=blocks[Number(node.dataset.edunotesBlock)] || ''; });
    const headings = $$('h2',container).map((node,index)=>{
      const id = `${context.instance}-${slugify(node.textContent)}-${index}`;
      node.id=id;
      return {id,title:node.textContent};
    });
    $$('a[href]',container).forEach(link=>{
      if (/^https?:/i.test(link.getAttribute('href'))) { link.target='_blank'; link.rel='noopener noreferrer'; }
    });
    $$('input[type="checkbox"]',container).forEach(input=>{ input.disabled=true; });
    return {html:container.innerHTML,headings};
  }

  function hydrateMath(root) {
    $$('[data-latex]',root).forEach(node=>{
      if (!window.katex || node.dataset.rendered === 'true') return;
      try {
        katex.render(node.dataset.latex,node,{displayMode:node.dataset.display==='true',throwOnError:false,trust:false,strict:'ignore',output:'htmlAndMathml'});
        node.dataset.rendered='true';
      } catch { node.textContent=node.dataset.latex; }
    });
  }

  function completeButton(lessonId, preview=false) {
    const complete = !preview && progressOf(lessonId).status === 'complete';
    return `<button class="btn toc-complete mark-complete ${complete ? 'is-complete' : ''}" data-action="complete" data-lesson="${ea(lessonId)}" ${complete ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${icon(complete ? 'checkCircle' : 'check','sm')} ${complete ? 'Lesson completed' : 'Mark complete'}</button>`;
  }

  function renderLesson(lesson, preview=false) {
    const found = findLesson(lesson.id);
    if (!found) return '';
    const {course,chapter} = found;
    const meta = lessonMeta(lesson,preview);
    const instance = (preview?'preview':'reader')+'-'+lesson.id;
    const context = {instance,lessonId:lesson.id,preview,quizIndex:0};
    Object.keys(runtime.quizRegistry).filter(key=>key.startsWith(instance+'-quiz-')).forEach(key=>delete runtime.quizRegistry[key]);
    const rendered = renderMarkdown(parseFrontmatter(preview ? lesson.body : studentSource(lesson)).content,context);
    const siblings = publishedLessons().filter(x=>x.course.id === course.id);
    const current = siblings.findIndex(x=>x.lesson.id === lesson.id);
    const previous = current > 0 ? siblings[current-1].lesson : null;
    const next = current >= 0 && current < siblings.length-1 ? siblings[current+1].lesson : null;
    const bookmarked = !preview && state.bookmarks.includes(lesson.id);
    const completed = !preview && progressOf(lesson.id).status === 'complete';
    const changed = lesson.status === 'draft' || lesson.body !== lesson.publishedBody;
    return `<article class="reader-page" data-lesson="${ea(lesson.id)}" data-preview="${preview}" data-instance="${ea(instance)}">
      <div class="reading-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      ${preview && changed ? `<div class="draft-banner">${icon('edit','sm')} ${lesson.status==='draft' ? 'Draft lesson. Only you can see this page.' : 'Unpublished changes. Students still see the last published version.'}</div>` : ''}
      <nav class="breadcrumbs" aria-label="Lesson breadcrumb"><button data-action="route" data-route="#/subject/${ea(course.id)}">${e(course.title)}</button>${icon('chevron')}<button data-action="route" data-route="#/subject/${ea(course.id)}">${e(chapter.title)}</button>${icon('chevron')}<span>Lesson ${lesson.order+1}</span></nav>
      <header class="lesson-header"><div class="lesson-header-top"><h1>${e(meta.title || lesson.title)}</h1><div class="lesson-header-actions"><button class="icon-btn bookmark-control ${bookmarked?'active':''}" data-action="bookmark" data-lesson="${ea(lesson.id)}" aria-label="${bookmarked?'Remove bookmark':'Bookmark lesson'}" aria-pressed="${bookmarked}" title="Bookmark lesson">${icon(bookmarked?'bookmarkFilled':'bookmark')}</button><button class="icon-btn" data-action="notes" data-lesson="${ea(lesson.id)}" aria-label="Open my notes" title="My notes">${icon('note')}</button></div></div>
        <div class="lesson-meta"><span>${icon('clock')} ${Math.max(1,parseInt(meta.duration,10)||5)} min read</span><span>Grade ${e(meta.grade || 8)}</span><span class="difficulty">${icon('leaf')} ${e(meta.difficulty || 'Easy')}</span><span class="complete-label" ${completed?'':'hidden'}>${icon('checkCircle')} Completed</span></div>
      </header>
      <div class="reader-layout"><div class="lesson-body" id="${ea(instance)}-body" tabindex="-1">${rendered.html}</div>
        <aside class="lesson-toc" aria-label="On this page"><div class="toc-label">ON THIS PAGE</div><nav class="toc-links">${rendered.headings.map((heading,i)=>`<button class="toc-link ${i===0?'active':''}" data-action="scroll-section" data-section="${ea(heading.id)}">${e(heading.title)}</button>`).join('')}</nav>${completeButton(lesson.id,preview)}<div class="toc-saved">${icon('lock','sm')} ${preview ? 'Student page preview' : 'Your progress stays with you'}</div></aside>
      </div>
      <div class="mobile-reader-actions">${completeButton(lesson.id,preview)}</div>
      <footer class="reader-footer">${previous?`<button class="lesson-nav previous" data-action="route" data-route="#/lesson/${ea(previous.id)}">${icon('arrowLeft')}<span><small>Previous lesson</small><strong>${e(lessonTitle(previous))}</strong></span></button>`:`<button class="lesson-nav previous" data-action="route" data-route="#/subject/${ea(course.id)}">${icon('arrowLeft')}<span><small>Back to subject</small><strong>${e(course.title)}</strong></span></button>`}${next?`<button class="lesson-nav next" data-action="route" data-route="#/lesson/${ea(next.id)}"><span><small>Next lesson</small><strong>${e(lessonTitle(next))}</strong></span>${icon('arrow')}</button>`:`<button class="lesson-nav next" data-action="route" data-route="#/library"><span><small>A new adventure</small><strong>Explore your Library</strong></span>${icon('arrow')}</button>`}</footer>
      ${rendered.headings.length?`<button class="contents-fab" data-action="contents">${icon('list','sm')} Contents</button>`:''}
    </article>`;
  }

  function submitQuiz(form) {
    const quiz = runtime.quizRegistry[form.dataset.quiz];
    const selected = $('input:checked',form);
    if (!quiz || !quiz.valid || quiz.submitted || !selected) return;
    quiz.submitted=true;
    const chosen=Number(selected.value);
    const correct=chosen === quiz.answerIndex;
    $$('input',form).forEach(input=>input.disabled=true);
    $$('.quiz-option',form).forEach((row,index)=>{
      if (index === quiz.answerIndex) { row.classList.add('correct'); row.insertAdjacentHTML('beforeend',`<span class="answer-mark">${icon('checkCircle','sm')}<span class="answer-label">Correct answer</span></span>`); }
      else if (index === chosen) { row.classList.add('incorrect'); row.insertAdjacentHTML('beforeend',`<span class="answer-mark">${icon('close','sm')}<span class="answer-label">Your answer</span></span>`); }
    });
    const submit=$('.quiz-submit',form);
    submit.disabled=true;
    submit.classList.remove('btn-primary');
    submit.innerHTML=`${icon('check','sm')} Answer checked`;
    $('.quiz-live',form).innerHTML=`<div class="quiz-result ${correct?'is-correct':'is-incorrect'}"><strong>${icon(correct?'checkCircle':'info','sm')} ${correct?'That\'s it. Nicely done!':'Not quite. Here\'s how to think about it.'}</strong><p>${inlineHTML(quiz.explanation)}</p>${quiz.preview?'<p style="margin-top:7px;color:var(--muted)">Preview only. No answer or score was saved.</p>':''}</div>`;
    hydrateMath(form);
    if (!quiz.preview) {
      const progress=state.progress[quiz.lessonId] ||= {status:'in-progress',percent:25};
      if (progress.status==='new') progress.status='in-progress';
      const lesson=findLesson(quiz.lessonId).lesson;
      if(progress.quizVersion!==(lesson.version||1)){progress.answers={};progress.quizVersion=lesson.version||1;}
      progress.answers ||= {};
      progress.answers[quiz.index]={choice:chosen,correct,answeredAt:new Date().toISOString()};
      const total=(parseFrontmatter(studentSource(lesson)).content.match(/^```quiz\b/gm)||[]).length;
      progress.quizScore={correct:Object.values(progress.answers).filter(answer=>answer.correct).length,total,answered:Object.keys(progress.answers).length};
      scheduleSave();
    }
  }

  function updateCompletionUI(id, root=document) {
    const complete=progressOf(id).status==='complete';
    $$('.mark-complete',root).filter(button=>button.dataset.lesson===id).forEach(button=>{
      button.classList.toggle('is-complete',complete);
      button.setAttribute('aria-pressed',String(complete));
      button.innerHTML=`${icon(complete?'checkCircle':'check','sm')} ${complete?'Lesson completed':'Mark complete'}`;
    });
    $$('.complete-label',root).forEach(label=>label.hidden=!complete);
  }

  function markComplete(id, automatic=false) {
    const progress=state.progress[id] ||= {status:'new',percent:0,lastOpened:new Date().toISOString()};
    if (progress.status==='complete') { if(!automatic) toast('You have already completed this lesson.'); return; }
    progress.status='complete'; progress.percent=100; progress.completedAt=new Date().toISOString();
    updateCompletionUI(id);
    scheduleSave();
    toast(automatic?'A little wiser. Lesson completed!':'Lesson complete. Keep that curiosity going!');
  }

  function handleLessonAction(event, preview, root) {
    const anchor=event.target.closest('a[href^="#"]');
    if(anchor&&!anchor.getAttribute('href').startsWith('#/')) {
      event.preventDefault();event.stopPropagation();
      const fragment=anchor.getAttribute('href').slice(1);
      const target=$$('.lesson-body h1,.lesson-body h2,.lesson-body h3',root).find(heading=>heading.id===fragment||slugify(heading.textContent)===fragment);
      if(target)target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      else toast('That section could not be found.','info');
      return;
    }
    const control=event.target.closest('[data-action]');
    if (!control) return;
    const action=control.dataset.action;
    const doc=root.ownerDocument || root;
    const lessonId=control.dataset.lesson || $('.reader-page',root)?.dataset.lesson;
    if (action==='scroll-section') {
      event.preventDefault(); event.stopPropagation();
      doc.getElementById(control.dataset.section)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    } else if (action==='contents') {
      event.stopPropagation(); openContents(root);
    } else if (['complete','bookmark','notes'].includes(action)) {
      event.stopPropagation();
      if (preview) { toast('Preview only. Student progress and notes are not changed.','eye'); return; }
      if (action==='complete') markComplete(lessonId);
      if (action==='bookmark') toggleBookmark(lessonId);
      if (action==='notes') openNotes(lessonId);
    } else if (action==='route' && preview) {
      event.preventDefault(); event.stopPropagation(); toast('This is a live preview. Switch to Student to explore.','eye');
    }
  }

  function hydrateLesson(root, preview=false) {
    hydrateMath(root);
    $$('.quiz-block',root).forEach(form=>{
      form.addEventListener('change',()=>{ const quiz=runtime.quizRegistry[form.dataset.quiz]; if(quiz && !quiz.submitted && quiz.valid) $('.quiz-submit',form).disabled=!$('input:checked',form); });
      form.addEventListener('submit',event=>{event.preventDefault();submitQuiz(form);});
    });
    const onClick=event=>handleLessonAction(event,preview,root);
    root.addEventListener('click',onClick);
    const page=$('.reader-page',root);
    if (!page) return ()=>{};
    const doc=page.ownerDocument;
    const win=doc.defaultView;
    if(preview)doc.addEventListener('keydown',handleKeyboard);
    const headings=$$('.lesson-body h2',page);
    const progressBar=$('.reading-progress',page);
    let frameRequest=0;
    const update = (scrolled=false) => {
      const top=Math.max(0,page.getBoundingClientRect().top+win.scrollY-(preview?0:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header'))||68));
      const distance=Math.max(1,doc.documentElement.scrollHeight-win.innerHeight-top);
      const ratio=Math.max(0,Math.min(1,(win.scrollY-top)/distance));
      const percentage=Math.round(ratio*100);
      progressBar.setAttribute('aria-valuenow',String(percentage));
      $('span',progressBar).style.width=percentage+'%';
      let active=headings[0]?.id;
      for (const heading of headings) if(heading.getBoundingClientRect().top < (preview?85:155)) active=heading.id;
      $$('.toc-link',page).forEach(link=>link.classList.toggle('active',link.dataset.section===active));
      if (!preview && scrolled && win.scrollY>10) {
        const progress=state.progress[page.dataset.lesson] ||= {status:'new',percent:0};
        let changed=false;
        if (percentage>Number(progress.percent||0)) {progress.percent=percentage;changed=true;}
        if (percentage>=25 && progress.status==='new') {progress.status='in-progress';changed=true;}
        if (percentage>=99 && distance>100 && progress.status!=='complete') markComplete(page.dataset.lesson,true);
        else if(changed) scheduleSave();
      }
    };
    const onScroll=()=>{if(frameRequest)win.cancelAnimationFrame(frameRequest);frameRequest=win.requestAnimationFrame(()=>update(true));};
    const onResize=()=>update(false);
    win.addEventListener('scroll',onScroll,{passive:true});
    win.addEventListener('resize',onResize);
    update(false);
    return ()=>{root.removeEventListener('click',onClick);win.removeEventListener('scroll',onScroll);win.removeEventListener('resize',onResize);if(preview)doc.removeEventListener('keydown',handleKeyboard);if(frameRequest)win.cancelAnimationFrame(frameRequest);};
  }

  function recordLessonOpen(id) {
    const now=new Date();
    const today=localDate(now);
    const progress=state.progress[id] ||= {status:'new',percent:0,quizScore:null};
    progress.lastOpened=now.toISOString();
    const streak=state.ui.streak;
    if (streak.lastDate!==today) {
      const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
      streak.count=streak.lastDate===localDate(yesterday)?streak.count+1:1;
      streak.lastDate=today;
    }
    state.ui.lastLesson=id;
    scheduleSave();
  }

  function sidebarHTML(view,subjectId) {
    const name=state.ui.name || 'Alex Morgan';
    const initials=name.split(/\s+/).slice(0,2).map(part=>part[0] || '').join('').toUpperCase();
    return `<div class="nav-backdrop" data-action="close-nav"></div><aside class="sidebar" aria-label="Main navigation">
      <button class="brand" data-action="route" data-route="#/library" aria-label="EduNotes Library">${brand()}</button><button class="icon-btn sidebar-close" data-action="close-nav" aria-label="Close navigation">${icon('close')}</button><p class="brand-tagline">A little wiser, every day.</p>
      <nav class="sidebar-nav"><p class="nav-label">YOUR WORKSPACE</p>         <button class="nav-item" onclick="location.href='index.html'">${icon('arrowLeft')} Back to CBT</button>
        <button class="nav-item ${['library','subject','lesson'].includes(view)?'active':''}" data-action="route" data-route="#/library" ${view==='library'?'aria-current="page"':''}>${icon('library')} Library</button>
        <button class="nav-item ${view==='learning'?'active':''}" data-action="route" data-route="#/learning" ${view==='learning'?'aria-current="page"':''}>${icon('learning')} My learning</button>
        <button class="nav-item ${view==='bookmarks'?'active':''}" data-action="route" data-route="#/bookmarks" ${view==='bookmarks'?'aria-current="page"':''}>${icon('bookmark')} Bookmarks${state.bookmarks.length?`<span class="nav-count">${state.bookmarks.length}</span>`:''}</button>
      </nav>
      <nav class="subject-nav" aria-label="Subjects"><p class="nav-label">YOUR SUBJECTS</p>${state.courses.map(course=>`<button class="nav-item subject-${ea(course.subject)} ${subjectId===course.id?'active':''}" data-action="route" data-route="#/subject/${ea(course.id)}">${icon(course.icon || 'book')} ${e(course.title)}</button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="sidebar-thought">${icon('leaf')}Small steps.<br>Lasting possibilities.</div>
        <div class="sidebar-tools"><button class="nav-item" data-action="theme" aria-pressed="${isDark()}">${icon('moon')}<span class="theme-label">${isDark()?'Light appearance':'Dark appearance'}</span><span class="theme-switch" aria-hidden="true"></span></button><button class="nav-item" data-action="shortcuts" title="Keyboard shortcuts (?)">${icon('keyboard')} Keyboard shortcuts</button></div>
        <button class="profile-button" data-action="profile" aria-label="Edit learning profile"><span class="avatar">${e(initials)}</span><span><span class="profile-name">${e(name)}</span><span class="profile-label">Personal learning space</span></span>${icon('down')}</button>
      </div>
    </aside>`;
  }

  function topbarHTML(view,subjectId) {
    const course=state.courses.find(course=>course.id===subjectId);
    const labels={library:'Library',learning:'My learning',bookmarks:'Bookmarks',subject:course?.title || 'Subject',lesson:'Lesson'};
    return `<header class="topbar"><button class="icon-btn mobile-menu" data-action="toggle-nav" aria-label="Open navigation" aria-expanded="false">${icon('menu')}</button><div class="topbar-breadcrumb">${view==='lesson'?`<button class="reader-brand" data-action="route" data-route="#/library" aria-label="Back to the EduNotes Library">${brand()}</button>${course?`<span class="breadcrumb-detail muted"><span class="slash">/</span> ${e(course.title)}</span>`:''}`:`${icon('book')}<span class="slash">/</span><span>${e(labels[view] || 'Library')}</span>`}</div>
      <div class="header-actions"><button class="search-trigger" data-action="search" aria-label="Search lessons"><span class="sr-only">Search</span>${icon('search')}<span>Search anything...</span><kbd>${navigator.platform.toLowerCase().includes('mac')?'Cmd':'Ctrl'} K</kbd></button><span class="streak" title="Consecutive days of learning">${icon('flame')} ${currentStreak()}-day streak</span><div class="role-switch" aria-label="Switch learning role"><button class="active" data-action="student" aria-pressed="true">${icon('book')} Student</button><button data-action="studio" aria-pressed="false">${icon('edit')} Studio</button></div></div>
    </header>`;
  }

  function welcomeIllustration() {
    return `<svg class="welcome-illustration" viewBox="0 0 170 125" fill="none" aria-hidden="true">
      <ellipse cx="88" cy="107" rx="61" ry="6" fill="var(--border)" opacity=".35"/>
      <path d="M24 52 84 69l58-23 4 48-62 21-60-18V52Z" fill="var(--primary-soft)" stroke="currentColor" stroke-width="1.4"/>
      <path d="M84 70v44M28 92l56 17 57-19" stroke="currentColor" stroke-width="1.3"/>
      <g class="floating-page"><path d="M84 65C65 45 44 43 27 45l-5 45c23-2 42 3 62 18 17-17 36-23 59-24l-2-46c-21 2-41 10-57 27Z" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/>
      <path d="M84 65v43M34 57c16 0 28 4 40 13M33 65c16 0 29 5 41 13M32 74c16 0 29 5 42 13M94 68c11-10 23-15 37-17M94 77c11-10 23-15 37-17M95 86c10-9 23-14 37-16" stroke="currentColor" stroke-width="1.1" opacity=".55"/>
      <path d="m112 45 9-3 1 27-5-3-5 5V45Z" fill="#E6B96B" stroke="#C7933C" stroke-width=".8"/></g>
      <path d="M79 31c-2-7 2-15 7-13 7 3-5 15-9 18" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M37 26v10m-5-5h10M145 23v8m-4-4h8" stroke="#C7933C" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M132 10v6m-3-3h6M17 72h-6m3-3v6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>
      <circle cx="54" cy="14" r="2" stroke="currentColor" opacity=".45"/>
    </svg>`;
  }

  function continueCard({lesson,course,chapter}) {
    const progress=progressOf(lesson.id);
    const percentage=Math.round(progress.percent || 0);
    return `<button class="continue-card subject-${ea(course.subject)}" data-action="route" data-route="#/lesson/${ea(lesson.id)}${percentage?'?resume=1':''}" aria-label="${percentage?'Resume':'Start'} ${ea(lessonTitle(lesson))}">
      ${subjectChip(course)}<p class="card-chapter">${e(chapter.title)}</p><h3>${e(lessonTitle(lesson))}</h3>
      <div class="continue-bottom"><span class="continue-progress">${ring(percentage)}<span><strong>${percentage?percentage+'% complete':'A fresh start'}</strong><small>${percentage?Math.max(1,Math.round(durationOf(lesson)*(1-percentage/100)))+' min left':durationOf(lesson)+' min read'}</small></span></span><span class="resume-link">${percentage?'Resume':'Start lesson'} ${icon('arrow')}</span></div>
    </button>`;
  }

  function subjectCard(course) {
    const lessons=publishedLessons().filter(x=>x.course.id===course.id);
    const completed=lessons.filter(x=>progressOf(x.lesson.id).status==='complete').length;
    const percent=lessons.length?Math.round(completed/lessons.length*100):0;
    return `<button class="subject-card subject-${ea(course.subject)}" data-action="route" data-route="#/subject/${ea(course.id)}" aria-label="Explore ${ea(course.title)}">
      <div class="subject-card-top">${icon(course.icon || 'book')}${icon('arrowUpRight','card-arrow')}</div><h3>${e(course.title)}</h3><p>${course.chapters.length} chapters &middot; ${lessons.length} lessons</p>
      <div class="subject-card-progress"><div class="card-progress-label"><span>${completed?completed+' of '+lessons.length+' completed':'Ready when you are'}</span><strong>${percent}%</strong></div><div class="progress-track" aria-hidden="true"><span style="--progress:${percent}%"></span></div></div>
    </button>`;
  }

  const libraryFooter = () => `<footer class="library-footer"><span>Made for curious minds.</span><span>${icon('lock')}<span data-storage-status>${storageUnavailable?'Storage unavailable. Changes stay in this tab only.':'Your progress is saved on this device'}</span></span></footer>`;

  function libraryHTML() {
    const recent=publishedLessons().filter(x=>state.progress[x.lesson.id]?.lastOpened && progressOf(x.lesson.id).status!=='complete').sort((a,b)=>new Date(progressOf(b.lesson.id).lastOpened)-new Date(progressOf(a.lesson.id).lastOpened)).slice(0,3);
    const filtered=state.courses.filter(course=>runtime.homeFilter==='all' || course.id===runtime.homeFilter);
    return `<div class="content">
      <section class="welcome" aria-labelledby="welcome-title"><div><p class="eyebrow">A LITTLE WISER, EVERY DAY</p><h1 id="welcome-title">Welcome back, ${e((state.ui.name || 'Alex').split(' ')[0])}<span style="color:var(--primary)">.</span></h1><p>A fresh page. A new idea. Let's keep learning.</p></div>${welcomeIllustration()}</section>
      <section aria-labelledby="continue-title"><div class="section-heading"><h2 id="continue-title">Continue learning</h2><button class="btn-link" data-action="route" data-route="#/learning">View my learning ${icon('arrow','sm')}</button></div>${recent.length?`<div class="continue-grid">${recent.map(continueCard).join('')}</div>`:`<div class="empty-state compact">${icon('checkCircle')}<h2>You're all caught up.</h2><p>A new idea is waiting for you. Explore a subject below to start your next chapter.</p></div>`}</section>
      <section class="browse-section" aria-labelledby="browse-title"><div class="section-heading"><h2 id="browse-title">Browse by subject</h2><span class="section-count">${state.courses.length} subjects to explore</span></div>
        <div class="subject-filters" role="tablist" aria-label="Filter subjects"><button role="tab" aria-selected="${runtime.homeFilter==='all'}" class="${runtime.homeFilter==='all'?'active':''}" data-action="filter-subject" data-subject="all">All subjects</button>${state.courses.map(course=>`<button role="tab" aria-selected="${runtime.homeFilter===course.id}" class="${runtime.homeFilter===course.id?'active':''}" data-action="filter-subject" data-subject="${ea(course.id)}">${e(course.title)}</button>`).join('')}</div>
        ${filtered.length?`<div class="subject-grid" role="tabpanel">${filtered.map(subjectCard).join('')}</div>`:`<div class="empty-state">${icon('book')}<h2>A new Library starts here.</h2><p>Create a subject in Studio and fill it with your first ideas.</p><button class="btn btn-primary" data-action="new-subject">Create a subject</button></div>`}
      </section>${libraryFooter()}
    </div>`;
  }

  function subjectHTML(id) {
    const course=state.courses.find(item=>item.id===id);
    if (!course) return missingHTML('This subject is not in the Library.');
    const lessons=publishedLessons().filter(x=>x.course.id===id);
    const completed=lessons.filter(x=>progressOf(x.lesson.id).status==='complete').length;
    const first=lessons.find(x=>progressOf(x.lesson.id).status!=='complete') || lessons[0];
    return `<div class="content subject-${ea(course.subject)}"><nav class="breadcrumbs" aria-label="Breadcrumb"><button data-action="route" data-route="#/library">Library</button>${icon('chevron')}<span>${e(course.title)}</span></nav>
      <header class="subject-page-heading"><div class="subject-page-icon">${icon(course.icon || 'book')}</div><div><h1>${e(course.title)}</h1><p>${e(course.description || 'A new world of ideas to explore.')}</p></div>${first?`<button class="btn btn-primary" data-action="route" data-route="#/lesson/${ea(first.lesson.id)}">${completed?'Keep learning':'Start learning'} ${icon('arrow','sm')}</button>`:''}</header>
      <div class="outline-heading"><h2 class="eyebrow">YOUR COURSE OUTLINE</h2><p>${completed} of ${lessons.length} lessons completed</p></div>
      ${[...course.chapters].sort((a,b)=>a.order-b.order).map((chapter,i)=>{
        const chapterLessons=[...chapter.lessons].sort((a,b)=>a.order-b.order).filter(lesson=>lesson.status==='published');
        const open=runtime.chapterOpen[chapter.id] ?? i===0;
        return `<section class="chapter ${open?'is-open':''}" data-chapter="${ea(chapter.id)}"><button class="chapter-toggle" data-action="toggle-chapter" data-chapter="${ea(chapter.id)}" aria-expanded="${open}" aria-controls="chapter-body-${ea(chapter.id)}"><span class="chapter-number">${String(i+1).padStart(2,'0')}</span><strong>${e(chapter.title)}</strong><small>${chapterLessons.length} lessons &middot; ${chapterLessons.reduce((sum,lesson)=>sum+durationOf(lesson),0)} min</small>${icon('down','chapter-chevron')}</button>
          <div class="chapter-body" id="chapter-body-${ea(chapter.id)}" ${open?'':'inert'}><div class="chapter-body-inner">${chapterLessons.length?chapterLessons.map(lesson=>{
            const progress=progressOf(lesson.id);
            return `<button class="lesson-list-row ${progress.status==='in-progress'?'is-progress':''}" data-action="route" data-route="#/lesson/${ea(lesson.id)}">${learningStatus(progress.status)}<span>${e(lessonTitle(lesson))}</span><span class="lesson-duration">${durationOf(lesson)} min</span></button>`;
          }).join(''):'<p class="chapter-empty">Good things are taking shape. Lessons will appear here when they are published.</p>'}</div></div></section>`;
      }).join('') || '<div class="empty-state"><h2>Your next chapter is on its way.</h2><p>Published chapters and lessons will appear here.</p></div>'}${libraryFooter()}
    </div>`;
  }

  function learningListHTML(bookmarks=false) {
    let lessons=publishedLessons().filter(x=>bookmarks?state.bookmarks.includes(x.lesson.id):state.progress[x.lesson.id]?.lastOpened);
    if (!bookmarks && runtime.learningFilter!=='all') lessons=lessons.filter(x=>progressOf(x.lesson.id).status===runtime.learningFilter);
    lessons.sort((a,b)=>new Date(progressOf(b.lesson.id).lastOpened||0)-new Date(progressOf(a.lesson.id).lastOpened||0));
    return `<div class="content"><header class="page-heading"><p class="eyebrow">${bookmarks?'YOUR PERSONAL COLLECTION':'ONE SMALL STEP AT A TIME'}</p><h1>${bookmarks?'Worth coming back to.':'Your learning, in motion.'}</h1><p>${bookmarks?'Keep the lessons you love close. Your bookmarks live right here.':'Every lesson is a step forward. Pick up a thread or celebrate how far you have come.'}</p></header>
      ${bookmarks?'':`<div class="subject-filters" role="tablist" aria-label="Learning status">${[['all','All learning'],['in-progress','In progress'],['complete','Completed']].map(([value,label])=>`<button role="tab" aria-selected="${runtime.learningFilter===value}" class="${runtime.learningFilter===value?'active':''}" data-action="filter-learning" data-filter="${value}">${label}</button>`).join('')}</div>`}
      ${lessons.length?`<div class="learning-list">${lessons.map(({course,chapter,lesson})=>{
        const progress=progressOf(lesson.id);
        const score=progress.quizScore;
        return `<button class="learning-row subject-${ea(course.subject)}" data-action="route" data-route="#/lesson/${ea(lesson.id)}${progress.status==='in-progress'?'?resume=1':''}">${icon(course.icon||'book')}<span>${subjectChip(course)}<h3>${e(lessonTitle(lesson))}</h3><p>${e(chapter.title)} &middot; ${durationOf(lesson)} min read${score?' &middot; Practice: '+score.correct+'/'+score.total:''}</p></span><span class="row-progress">${progress.status==='complete'?learningStatus('complete'):ring(progress.percent||0)}<span>${progress.status==='complete'?'Completed':(progress.percent||0)+'% complete'}</span>${icon('arrow')}</span></button>`;
      }).join('')}</div>`:`<div class="empty-state">${icon(bookmarks?'bookmark':'leaf')}<h2>${bookmarks?'A place for your favorite ideas.':runtime.learningFilter==='complete'?'Your first finish is ahead.':'A fresh chapter awaits.'}</h2><p>${bookmarks?'Tap the bookmark icon in any lesson to save it here.':'Open a lesson in the Library and take your next small step.'}</p><button class="btn btn-primary" data-action="route" data-route="#/library">Explore the Library ${icon('arrow','sm')}</button></div>`}${libraryFooter()}
    </div>`;
  }

  function missingHTML(message) {
    return `<div class="content"><div class="empty-state">${icon('book')}<h2>This page is still taking shape.</h2><p>${e(message)}</p><button class="btn btn-primary" data-action="route" data-route="#/library">Back to the Library ${icon('arrow','sm')}</button></div></div>`;
  }

  const currentStudio = () => findLesson(runtime.activeLesson);

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
      <button class="meta-chip" data-action="edit-meta" data-key="duration" aria-label="Edit reading duration">${icon('clock')} ${e(meta.duration||5)} min</button>
      <button class="meta-chip" data-action="edit-meta" data-key="tags" aria-label="Edit lesson tags">${tags.length?e(tags[0])+(tags.length>1?' +'+(tags.length-1):''):'+ Tags'}</button>
      <button class="meta-chip" data-action="edit-meta" data-key="prerequisites" aria-label="Edit prerequisites" title="Prerequisites">${icon('link')} ${Array.isArray(meta.prerequisites)&&meta.prerequisites.length?meta.prerequisites.length:'+'}</button>`;
  }

  function courseTreeHTML() {
    const selected=currentStudio();
    return state.courses.map(course=>{
      const open=runtime.treeOpen[course.id] ?? selected?.course.id===course.id;
      return `<div class="tree-course subject-${ea(course.subject)}"><button class="tree-course-toggle" data-action="tree-course" data-course="${ea(course.id)}" aria-expanded="${open}">${icon(open?'down':'chevron')}${icon(course.icon||'book')}<span>${e(course.title)}</span></button><div ${open?'':'hidden'}>
        ${[...course.chapters].sort((a,b)=>a.order-b.order).map(chapter=>{
          const chapterOpen=runtime.treeOpen[chapter.id] ?? selected?.chapter.id===chapter.id;
          return `<div class="tree-chapter"><div class="tree-chapter-heading"><button class="tree-chapter-toggle" data-action="tree-chapter" data-chapter="${ea(chapter.id)}" aria-expanded="${chapterOpen}">${icon(chapterOpen?'down':'chevron')}<span>${e(chapter.title)}</span></button><button class="icon-btn" data-action="rename-chapter" data-chapter="${ea(chapter.id)}" aria-label="Rename ${ea(chapter.title)}" title="Rename chapter">${icon('edit','sm')}</button></div>
            <div ${chapterOpen?'':'hidden'}>${[...chapter.lessons].sort((a,b)=>a.order-b.order).map(lesson=>`<div class="tree-lesson ${lesson.id===runtime.activeLesson?'active':''}" data-lesson="${ea(lesson.id)}" data-chapter="${ea(chapter.id)}"><button class="drag-handle" draggable="true" data-action="lesson-menu" data-lesson="${ea(lesson.id)}" aria-label="Reorder ${ea(lessonTitle(lesson,true))}" title="Drag to reorder, or click for options">${icon('grip')}</button><button class="tree-lesson-link" data-action="route" data-route="#/studio/${ea(lesson.id)}" ${lesson.id===runtime.activeLesson?'aria-current="page"':''}><span class="status-dot ${lesson.status==='draft'||lesson.body!==lesson.publishedBody?'draft':''}" aria-label="${lesson.status==='draft'?'Draft':'Published'}"></span><span>${e(lessonTitle(lesson,true))}</span></button></div>`).join('')}<button class="tree-new-lesson" data-action="new-lesson" data-chapter="${ea(chapter.id)}">${icon('plus','sm')} Add lesson</button></div>
          </div>`;
        }).join('')}
        <div class="tree-course-actions"><button data-action="new-chapter" data-course="${ea(course.id)}">${icon('plus','sm')} New chapter</button></div>
      </div></div>`;
    }).join('') || `<div class="empty-state" style="padding:25px 10px"><p>No subjects yet. Every Library starts with one idea.</p><button class="btn" data-action="new-subject">Create subject</button></div>`;
  }

  function renderCourseTree() {
    const tree=$('#course-tree-content');
    if(!tree)return;
    const focused=tree.contains(document.activeElement)?{...document.activeElement.dataset}:null;
    tree.innerHTML=courseTreeHTML();
    if(focused)$$('[data-action]',tree).find(button=>Object.entries(focused).every(([key,value])=>button.dataset[key]===value))?.focus({preventScroll:true});
  }

  function studioHTML(lesson) {
    const found=lesson?findLesson(lesson.id):null;
    const status=studioStatus(lesson);
    const device=state.ui.device||'mobile';
    return `<div class="studio-shell"><header class="studio-topbar"><button class="studio-library" data-action="route" data-route="#/library" aria-label="Back to Library">${icon('arrowLeft','sm')}${brand(true)}<span>Library</span></button><span class="topbar-divider"></span><button class="icon-btn" data-action="toggle-tree" aria-label="Toggle course outline" title="Toggle course outline">${icon('panel')}</button><span class="studio-chapter-label" id="studio-chapter-label">Chapter: <strong>${e(found?.chapter.title || 'Your next idea')}</strong></span>${lesson?`<button class="studio-status ${status.published?'published':''}" id="studio-status" data-action="status-menu"><span class="status-dot"></span><span>${e(status.label)}</span>${icon('down','sm')}</button>`:''}<div class="studio-topbar-actions"><button class="btn open-preview" data-action="open-preview">${icon('eye','sm')} Preview</button><button class="icon-btn studio-theme" data-action="theme" aria-label="Toggle color theme" aria-pressed="${isDark()}">${icon(isDark()?'sun':'moon')}</button><button class="icon-btn" data-action="search" aria-label="Search lessons">${icon('search')}</button><div class="role-switch" aria-label="Switch learning role"><button data-action="student" aria-pressed="false">${icon('book')} Student</button><button class="active" data-action="studio" aria-pressed="true">${icon('edit')} Studio</button></div></div></header>
      <div class="studio-main"><aside class="studio-tree" id="studio-tree" ${runtime.treeHidden?'hidden':''}><div class="tree-heading"><h2 class="eyebrow">COURSE OUTLINE</h2><button class="icon-btn" data-action="new-subject" aria-label="Create a subject" title="Create subject">${icon('plus','sm')}</button></div><div class="tree-scroll" id="course-tree-content">${courseTreeHTML()}</div><div class="tree-bottom"><button class="btn" data-action="import">${icon('upload','sm')} Import a markdown lesson</button></div></aside>
      <div class="studio-workspace" id="studio-workspace" style="--studio-split:${Number(state.ui.studioSplit)||.51}">${lesson?`
        <section class="editor-pane" aria-label="Lesson editor"><div class="editor-heading"><div class="editor-heading-label"><span class="eyebrow">YOUR NEXT GREAT LESSON</span><button class="icon-btn" data-action="export" aria-label="Export lesson as markdown" title="Export .md">${icon('download','sm')}</button></div><label class="sr-only" for="lesson-title-input">Lesson title</label><input class="lesson-title-input" id="lesson-title-input" type="text" value="${ea(lessonTitle(lesson,true))}" placeholder="Give your lesson a title"><div class="metadata-chips" id="metadata-chips">${metadataChips(lesson,found.course)}</div></div>
          <div class="editor-toolbar" role="toolbar" aria-label="Markdown formatting"><button data-format="bold" aria-label="Bold" title="Bold (Ctrl/Cmd B)"><strong>B</strong></button><button data-format="italic" aria-label="Italic" title="Italic (Ctrl/Cmd I)"><em>I</em></button><span class="toolbar-separator"></span><button data-format="h1" aria-label="Heading 1" title="Heading 1">H1</button><button data-format="h2" aria-label="Heading 2" title="Heading 2">H2</button><span class="toolbar-separator"></span><button data-format="link" aria-label="Insert link" title="Link">${icon('link')}</button><button data-format="list" aria-label="Bulleted list" title="List">${icon('list')}</button><button data-format="tasks" aria-label="Task list" title="Task list">${icon('tasks')}</button><button data-format="code" aria-label="Code block" title="Code">${icon('brackets')}</button><span class="toolbar-separator"></span><button data-format="math" aria-label="Math block" title="Math">${icon('sigma')}</button><button data-format="quiz" aria-label="Insert a quiz" title="Quiz">${icon('quiz')}</button><button data-format="callout" aria-label="Insert a callout" title="Callout">${icon('info')}</button><button data-action="block-palette" aria-label="More content blocks" title="Block palette">${icon('plus')}</button></div>
          <label class="sr-only" for="markdown-editor">Raw lesson markdown and frontmatter</label><textarea class="editor-textarea" id="markdown-editor" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-describedby="validation-bar" placeholder="A new idea starts here..."></textarea>
        </section><div class="split-handle" id="split-handle" role="separator" aria-label="Resize editor and preview" aria-orientation="vertical" aria-valuemin="30" aria-valuemax="70" aria-valuenow="${Math.round(state.ui.studioSplit*100)}" tabindex="0"></div>
        <section class="preview-pane" aria-label="Live student page preview"><div class="preview-toolbar"><span class="preview-label"><span class="status-dot"></span> LIVE PREVIEW</span><div class="device-switch" aria-label="Preview device">${[['desktop','desktop','Desktop, 1200 pixels'],['tablet','tablet','Tablet, 768 pixels'],['mobile','mobile','Mobile, 390 pixels']].map(([value,name,label])=>`<button class="icon-btn ${device===value?'active':''}" data-action="preview-device" data-device="${value}" aria-label="${label}" aria-pressed="${device===value}" title="${label}">${icon(name)}</button>`).join('')}<button class="icon-btn preview-close" data-action="close-preview" aria-label="Close preview">${icon('close')}</button></div></div><div class="preview-viewport"><div class="device-frame" id="device-frame" data-device="${device}"><div class="device-chrome"><i></i><i></i><i></i><span>edunotes / your lesson</span></div><iframe id="preview-frame" title="Exact student-facing lesson preview"></iframe></div></div><div class="preview-bottom"><span>Same page. Same experience.</span><span id="preview-width">${device==='desktop'?'1200':device==='tablet'?'768':'390'} px &middot; Actual width</span></div></section>
      `:`<section class="editor-pane" style="flex:1"><div class="empty-state">${icon('edit')}<h2>A fresh page, endless possibilities.</h2><p>Choose a lesson from the outline, or create a chapter to begin.</p><button class="btn btn-primary" data-action="${state.courses.length?'new-chapter':'new-subject'}">${icon('plus','sm')} ${state.courses.length?'Create a chapter':'Create a subject'}</button></div></section>`}</div></div>
      <div class="validation-bar" id="validation-bar" aria-live="polite">${icon('checkCircle')} All checks passed. Your ideas are ready to grow.</div><footer class="studio-footer"><span class="studio-wordcount" id="studio-wordcount">${lesson?wordCount(lesson.body):0} words &middot; ${lesson?Math.floor(blockCount(lesson.body)):0} blocks</span><span class="studio-save-status" id="studio-save-status">${icon('cloud')} Saved locally</span><div class="studio-footer-actions"><button class="btn" data-action="save-draft" ${lesson?'':'disabled'}>Save draft</button><button class="btn btn-primary" data-action="publish" ${lesson?'':'disabled'}>${icon('send','sm')} Publish lesson</button></div></footer>
    </div>`;
  }

  function initializeStudio(lesson) {
    if (!lesson) return;
    const editor=$('#markdown-editor');
    editor.value=lesson.body;
    editor.addEventListener('input',()=>updateStudioFromRaw(editor.value));
    editor.addEventListener('contextmenu',event=>{event.preventDefault();openBlockPalette(null,event.clientX,event.clientY);});
    $('#lesson-title-input').addEventListener('input',event=>{
      const parsed=parseFrontmatter(editor.value);
      parsed.meta.title=event.target.value;
      editor.value=serializeLesson(parsed.meta,parsed.content);
      updateStudioFromRaw(editor.value);
    });
    const frame=$('#preview-frame');
    runtime.previewReady=false;
    frame.addEventListener('load',()=>{runtime.previewReady=true;renderPreview();});
    const fonts=$('link[href*="fonts.googleapis.com/css2"]')?.outerHTML || '';
    const mathStyle=$('link[href*="katex.min.css"]')?.outerHTML || '';
    const appStyles='<link rel="stylesheet" href="css/edunotes.css">';
    frame.srcdoc=`<!DOCTYPE html><html lang="en" data-theme="${isDark()?'dark':'light'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>EduNotes Student Preview</title>${fonts}${mathStyle}${appStyles}</head><body class="preview-document"><main id="preview-root"></main></body></html>`;
    $('#split-handle')?.addEventListener('pointerdown',beginResize);
    $('#split-handle')?.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      setStudioSplit(state.ui.studioSplit+(event.key==='ArrowRight' ? .02 : -.02));
      scheduleSave();
    });
    if(window.innerWidth>=1200)setStudioSplit(state.ui.studioSplit);
    updateValidation();
  }

  function setStudioSplit(value) {
    const container=$('#studio-workspace');
    if (!container) return;
    const width=container.getBoundingClientRect().width;
    const min=Math.max(.3,300/width),max=Math.min(.7,(width-386)/width);
    state.ui.studioSplit=Math.max(min,Math.min(max,value));
    container.style.setProperty('--studio-split',String(state.ui.studioSplit));
    $('#split-handle')?.setAttribute('aria-valuenow',String(Math.round(state.ui.studioSplit*100)));
  }

  function beginResize(event) {
    if (event.button!==0) return;
    event.preventDefault();
    const handle=event.currentTarget;
    handle.classList.add('dragging');
    $('#preview-frame').style.pointerEvents='none';
    document.body.style.cursor='col-resize';
    const move=moveEvent=>{const rect=$('#studio-workspace').getBoundingClientRect();setStudioSplit((moveEvent.clientX-rect.left)/rect.width);};
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

  function renderPreview() {
    const frame=$('#preview-frame');
    const found=currentStudio();
    if (!frame || !found || !runtime.previewReady) return;
    const root=frame.contentDocument?.getElementById('preview-root');
    if (!root) return;
    const scroll=frame.contentWindow.scrollY;
    runtime.previewCleanup?.();
    root.innerHTML=renderLesson(found.lesson,true);
    runtime.previewCleanup=hydrateLesson(root,true);
    frame.contentWindow.scrollTo({top:scroll,behavior:'instant'});
  }

  function refreshStudioChrome() {
    const found=currentStudio();
    if (!found) return;
    const {lesson,course,chapter}=found;
    const titleInput=$('#lesson-title-input');
    if (titleInput && document.activeElement!==titleInput) titleInput.value=lessonTitle(lesson,true);
    const chips=$('#metadata-chips');
    if(chips) chips.innerHTML=metadataChips(lesson,course);
    const label=$('#studio-chapter-label');
    if(label) label.innerHTML=`Chapter: <strong>${e(chapter.title)}</strong>`;
    const status=studioStatus(lesson);
    const button=$('#studio-status');
    if(button) {button.classList.toggle('published',status.published);button.innerHTML=`<span class="status-dot"></span><span>${e(status.label)}</span>${icon('down','sm')}`;}
    const count=$('#studio-wordcount');
    if(count) count.innerHTML=`${wordCount(lesson.body)} words &middot; ${Math.floor(blockCount(lesson.body))} blocks`;
    const row=$$('.tree-lesson').find(row=>row.dataset.lesson===lesson.id);
    if(row) {
      $('.tree-lesson-link span:last-child',row).textContent=lessonTitle(lesson,true);
      $('.status-dot',row).classList.toggle('draft',lesson.status==='draft'||lesson.body!==lesson.publishedBody);
    }
  }

  function moveLessonToSubject(lesson,subject) {
    const found=findLesson(lesson.id);
    const destination=state.courses.find(course=>course.id===subject || course.subject===subject);
    if (!found || !destination || destination.id===found.course.id) return false;
    if (!destination.chapters.length) destination.chapters.push({id:uid('chapter'),title:'Getting started',order:0,lessons:[]});
    found.chapter.lessons=found.chapter.lessons.filter(item=>item.id!==lesson.id);
    found.chapter.lessons.sort((a,b)=>a.order-b.order).forEach((item,index)=>item.order=index);
    const chapter=destination.chapters[0];
    lesson.order=chapter.lessons.length;
    chapter.lessons.push(lesson);
    runtime.treeOpen[destination.id]=true;
    runtime.treeOpen[chapter.id]=true;
    return true;
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
    if (parsed.meta.subject && moveLessonToSubject(lesson,parsed.meta.subject)) renderCourseTree();
    refreshStudioChrome();
    renderPreview();
    updateValidation();
    const status=$('#studio-save-status');
    if(status) status.innerHTML=`${icon('clock')} Saving...`;
    scheduleSave();
  }

  function validateLesson(lesson) {
    const issues=[];
    const {meta,content}=parseFrontmatter(lesson.body);
    if (!String(meta.title || '').trim()) issues.push({level:'error',text:'Add a lesson title in the frontmatter.'});
    if (!content.trim()) issues.push({level:'error',text:'The lesson has no content yet.'});
    if(meta.duration!==undefined&&(!Number.isFinite(Number(meta.duration))||Number(meta.duration)<1))issues.push({level:'error',text:'Reading duration must be a number of minutes greater than zero.'});
    if (meta.subject && !state.courses.some(course=>course.id===meta.subject||course.subject===meta.subject)) issues.push({level:'error',text:'The frontmatter subject does not match an existing subject.'});
    const fences=content.match(/^```[^\n]*$/gm) || [];
    if (fences.length%2!==0) issues.push({level:'error',text:'A fenced block is missing its closing three backticks.'});
    let quizIndex=0;
    for (const match of content.matchAll(/^```quiz[^\n]*\n([\s\S]*?)^```/gm)) {
      quizIndex++;
      const quiz=parseQuiz(match[1]);
      if (!quiz.question) issues.push({level:'error',text:`Quiz ${quizIndex} is missing a question.`});
      if (quiz.options.length<2) issues.push({level:'error',text:`Quiz ${quizIndex} needs at least two options.`});
      if (quiz.answerIndex===null) issues.push({level:'error',text:`Quiz ${quizIndex} is missing a valid answer. Use an option number starting at 1.`});
      if (!/explanation\s*[":]/i.test(match[1])) issues.push({level:'warning',text:`Quiz ${quizIndex} would benefit from an explanation.`});
    }
    const missingAlt=[...content.matchAll(/!\[\s*\]\([^)]*\)/g)].length;
    if(missingAlt) issues.push({level:'warning',text:`${missingAlt===1?'An image has':missingAlt+' images have'} no alt text. Add a short, descriptive label.`});
    if (!/^##\s/m.test(content)) issues.push({level:'warning',text:'Add an H2 heading to help students navigate the lesson.'});
    for(const match of content.matchAll(/^```video[^\n]*\n([\s\S]*?)^```/gm)) {
      if(renderCustomBlock('video',match[1],null).startsWith('<div class="block-error">'))issues.push({level:'error',text:'A video block needs a valid YouTube, Vimeo, or direct video URL.'});
    }
    const latex=[...content.matchAll(/^```math[^\n]*\n([\s\S]*?)^```/gm)].map(match=>match[1]);
    const mathSource=content.replace(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*(?:\n|$)/gm,(_,language,body)=>['quiz','callout','steps'].includes(language.trim().toLowerCase())?body:'').replace(/`[^`\n]*`/g,'');
    for (const match of mathSource.matchAll(/\$\$([\s\S]+?)\$\$|\$([^\n$]+?)\$/g)) latex.push(match[1] || match[2]);
    if (window.katex) {
      for (const source of latex) {
        try { katex.renderToString(source,{throwOnError:true,trust:false,strict:'ignore'}); }
        catch { issues.push({level:'error',text:'A math formula has invalid LaTeX. Check the highlighted formula in the preview.'});break; }
      }
    } else if(latex.length) issues.push({level:'warning',text:'The math renderer is unavailable. Connect to the internet and reload to check formulas.'});
    return issues;
  }

  function updateValidation() {
    const lesson=currentStudio()?.lesson;
    const bar=$('#validation-bar');
    if(!lesson || !bar) return;
    const issues=validateLesson(lesson);
    bar.classList.toggle('has-warnings',issues.length>0);
    const message=issues.length?`${issues.length} ${issues.length===1?'check needs':'checks need'} attention: ${issues[0].text}`:'All checks passed. Your ideas are ready to grow.';
    if(bar.dataset.message===message)return;
    bar.dataset.message=message;
    bar.innerHTML=issues.length?`<button data-action="validation">${icon('warning')} ${e(message)}</button>`:`${icon('checkCircle')} ${e(message)}`;
  }

  function showValidation() {
    const lesson=currentStudio()?.lesson;
    if(!lesson)return;
    const issues=validateLesson(lesson);
    showDialog('A quick lesson check','A few small fixes make a better learning experience.',issues.length?`<ul class="validation-list">${issues.map(issue=>`<li class="${issue.level}">${e(issue.text)}</li>`).join('')}</ul>`:'<p class="muted" style="font-size:12px">All checks passed. Your lesson is ready to publish.</p>','<button class="btn" data-action="close-dialog">Back to writing</button>');
  }

  const blockScaffolds = {
    quiz:() => `\n\n${FENCE}quiz\nquestion: What is the most important idea in this lesson?\noptions:\n  - First option\n  - Second option\n  - Third option\n  - Fourth option\nanswer: 2\nexplanation: Explain why the second option is correct and help the student connect the ideas.\n${FENCE}\n\n`,
    callout:() => `\n\n${FENCE}callout\ntype: tip\ntitle: A worked example\nWalk through the idea one step at a time. You can use **bold text** and inline math like $x + 2 = 5$.\n${FENCE}\n\n`,
    video:() => `\n\n${FENCE}video\nurl: https://www.youtube.com/watch?v=VIDEO_ID\ntitle: Give your video a descriptive title\ncaption: What should students notice while watching?\n${FENCE}\n\n`,
    steps:() => `\n\n${FENCE}steps\n1. **Start here.** Describe the first step.\n2. **Make a connection.** Explain the next part.\n3. **Check your thinking.** Bring everything together.\n${FENCE}\n\n`,
    math:() => `\n\n${FENCE}math\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n${FENCE}\n\n`,
    code:() => `\n\n${FENCE}javascript\nconst curiosity = "A good place to start";\nconsole.log(curiosity);\n${FENCE}\n\n`
  };

  function insertFormatting(type) {
    const editor=$('#markdown-editor');
    if(!editor)return;
    closePopover();
    const start=editor.selectionStart,end=editor.selectionEnd,selected=editor.value.slice(start,end);
    let text='',selectionStart=0,selectionEnd=0;
    const wraps={bold:['**','**','bold text'],italic:['*','*','italic text'],link:['[','](https://example.com)','link text'],h1:['\n# ','\n','Heading'],h2:['\n## ','\n','A new idea'],list:['\n- ','\n','List item'],tasks:['\n- [ ] ','\n','Task to complete']};
    if(wraps[type]) {
      const [before,after,placeholder]=wraps[type];
      const inside=selected||placeholder;
      text=before+inside+after;
      selectionStart=start+before.length; selectionEnd=selectionStart+inside.length;
    } else if(blockScaffolds[type]) {
      text=blockScaffolds[type](); selectionStart=selectionEnd=start+text.length;
    } else return;
    editor.setRangeText(text,start,end,'end');
    editor.focus();
    editor.setSelectionRange(selectionStart,selectionEnd);
    editor.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function openBlockPalette(anchor,x,y) {
    const types=[['quiz','quiz','Practice quiz','4 options'],['callout','bulb','Worked example','Callout'],['steps','steps','Step by step','Numbered'],['math','sigma','Math formula','KaTeX'],['video','video','Video','Embed'],['code','brackets','Code block','Syntax']];
    const popover=openPopover(`<p class="popover-label">ADD A LITTLE CLARITY</p>${types.map(([value,name,title,hint])=>`<button data-format="${value}">${icon(name)} ${title}<small>${hint}</small></button>`).join('')}`,anchor,x,y);
    popover.setAttribute('aria-label','Content block palette');
  }

  function editMetadata(key,anchor) {
    const found=currentStudio();
    if(!found)return;
    const meta=lessonMeta(found.lesson,true);
    const labels={subject:'Subject',grade:'Grade',difficulty:'Difficulty',duration:'Reading time (minutes)',tags:'Tags, separated by commas',prerequisites:'Prerequisite lesson IDs, separated by commas'};
    const value=Array.isArray(meta[key])?meta[key].join(', '):meta[key]||'';
    let field;
    if(key==='subject') field=`<select id="meta-value" name="value">${state.courses.map(course=>`<option value="${ea(course.id)}" ${found.course.id===course.id?'selected':''}>${e(course.title)}</option>`).join('')}</select>`;
    else if(key==='difficulty') field=`<select id="meta-value" name="value">${['Easy','Medium','Challenging'].map(level=>`<option ${value===level?'selected':''}>${level}</option>`).join('')}</select>`;
    else field=`<input id="meta-value" name="value" type="${['grade','duration'].includes(key)?'number':'text'}" ${key==='grade'?'min="1" max="12"':key==='duration'?'min="1" max="240"':''} value="${ea(value)}" ${['grade','duration'].includes(key)?'required':''} placeholder="${key==='tags'?'algebra, equations':key==='prerequisites'?'math-language':''}">`;
    const popover=openPopover(`<form id="meta-form"><label class="field" for="meta-value">${e(labels[key])}${field}</label><button type="submit" class="btn btn-primary">Apply change</button></form>`,anchor);
    if(key==='prerequisites')popover.style.width='300px';
    $('#meta-form',popover).addEventListener('submit',event=>{
      event.preventDefault();
      const parsed=parseFrontmatter(found.lesson.body);
      const newValue=$('#meta-value',popover).value.trim();
      parsed.meta[key]=['tags','prerequisites'].includes(key)?newValue.split(',').map(item=>item.trim()).filter(Boolean):newValue;
      const raw=serializeLesson(parsed.meta,parsed.content);
      $('#markdown-editor').value=raw;
      updateStudioFromRaw(raw);
      closePopover();
      $('#markdown-editor').focus();
    });
    $('#meta-value',popover).focus();
  }

  function openPublishDialog() {
    const found=currentStudio();
    if(!found)return;
    const lesson=found.lesson;
    const issues=validateLesson(lesson);
    const errors=issues.filter(issue=>issue.level==='error');
    const oldWords=lesson.publishedBody?wordCount(lesson.publishedBody):0;
    const added=wordCount(lesson.body)-oldWords;
    const quizzes=(lesson.body.match(/^```quiz\b/gm)||[]).length;
    showDialog('Ready for curious minds?','Publish this version to the Library. Students will see exactly what you see in the preview.',`
      <p class="publish-title">${e(lessonTitle(lesson,true))}</p><p class="muted" style="font-size:11px;margin-top:7px">${e(found.course.title)} &middot; ${e(found.chapter.title)}</p>
      <div class="publish-summary"><div><strong>${added>=0?'+':''}${added}</strong><span>words ${added>=0?'added':'changed'}</span></div><div><strong>${Math.floor(blockCount(lesson.body))}</strong><span>content blocks</span></div><div><strong>${quizzes}</strong><span>practice ${quizzes===1?'quiz':'quizzes'}</span></div></div>
      ${issues.length?`<div class="dialog-note" style="border-color:var(--warning)">${errors.length?'<strong>Fix these checks before publishing.</strong>':'A small accessibility check before you publish.'}<ul class="validation-list">${issues.map(issue=>`<li class="${issue.level}">${e(issue.text)}</li>`).join('')}</ul></div>`:'<div class="dialog-note">All checks passed. Your draft will become version '+((lesson.version||0)+1)+'. You can keep improving it after publishing.</div>'}
    `,`<button class="btn" data-action="save-draft-close">Save draft</button><button class="btn btn-primary" data-action="confirm-publish" ${errors.length?'disabled':''}>${icon('send','sm')} Publish to students</button>`);
  }

  function publishCurrentLesson() {
    const found=currentStudio();
    if(!found)return;
    if(validateLesson(found.lesson).some(issue=>issue.level==='error')) {toast('Please fix the lesson checks before publishing.','warning');return;}
    const lesson=found.lesson;
    lesson.status='published';
    lesson.publishedBody=lesson.body;
    lesson.publishedAt=new Date().toISOString();
    lesson.updatedAt=lesson.publishedAt;
    lesson.version=(lesson.version||0)+1;
    // A published snapshot prevents subsequent autosaved edits leaking to students.
    const saved=persist();
    $$('dialog[open]').forEach(dialog=>dialog.close());
    refreshStudioChrome(); renderCourseTree(); renderPreview();
    toast(saved?'Lesson published. A new idea is waiting in the Library.':'Published in this tab only. Export a copy to keep your work.',saved?'checkCircle':'warning');
  }

  function statusMenu(anchor) {
    const lesson=currentStudio()?.lesson;
    if(!lesson)return;
    openPopover(`<p class="popover-label">LESSON VISIBILITY</p><button data-action="save-draft">${icon('cloud')} Save current draft</button><button data-action="publish">${icon('send')} Publish to students</button>${lesson.status==='published'?`<hr><button data-action="unpublish">${icon('eye')} Unpublish lesson</button>`:''}`,anchor);
  }

  function unpublishLesson() {
    const lesson=currentStudio()?.lesson;
    if(!lesson)return;
    closePopover();
    const dialog=showDialog('Move this lesson back to draft?','It will no longer appear in the student Library. Your content and existing student progress will be kept.','',`<button class="btn" data-action="close-dialog">Keep published</button><button class="btn btn-primary" id="confirm-unpublish">Move to draft</button>`);
    $('#confirm-unpublish',dialog).addEventListener('click',()=>{
      lesson.status='draft';lesson.updatedAt=new Date().toISOString();persist();dialog.close();refreshStudioChrome();renderCourseTree();renderPreview();toast('Lesson moved to draft. It is now private to Studio.');
    });
  }

  function exportLesson(id=runtime.activeLesson) {
    const lesson=findLesson(id)?.lesson;
    if(!lesson){toast('Choose a lesson to export.','info');return;}
    const url=URL.createObjectURL(new Blob([lesson.body],{type:'text/markdown;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=slugify(lessonTitle(lesson,true))+'.md';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    closePopover();toast('Markdown exported. Your ideas, ready to travel.');
  }

  function createLesson(chapterId) {
    const found=findChapter(chapterId);
    if(!found)return;
    const now=new Date().toISOString();
    const meta={title:'Untitled lesson',subject:found.course.id,grade:8,difficulty:'Easy',duration:5,tags:[],prerequisites:[]};
    const lesson={id:uid('lesson'),title:meta.title,order:found.chapter.lessons.length,status:'draft',frontmatter:meta,body:serializeLesson(meta,'## Begin with an idea\n\nWhat would you like your students to discover?\n\n## Make a connection\n\nUse examples, questions, and a little curiosity to bring your lesson to life.'),publishedBody:null,version:0,createdAt:now,updatedAt:now};
    found.chapter.lessons.push(lesson);runtime.treeOpen[found.course.id]=true;runtime.treeOpen[chapterId]=true;persist();navigate('#/studio/'+lesson.id);
    setTimeout(()=>{const input=$('#lesson-title-input');input?.focus();input?.select();},80);
  }

  function chapterDialog(courseId,chapterId=null) {
    const found=chapterId?findChapter(chapterId):null;
    const course=found?.course || state.courses.find(course=>course.id===courseId) || currentStudio()?.course || state.courses[0];
    if(!course){subjectDialog();return;}
    const dialog=showDialog(chapterId?'A new name, the same ideas.':'Start a new chapter.',chapterId?'Give this chapter a clear, descriptive name.':'Group your lessons around one big idea.',`<form id="chapter-form"><label class="field">Subject<select name="course" ${chapterId?'disabled':''}>${state.courses.map(item=>`<option value="${ea(item.id)}" ${item.id===course.id?'selected':''}>${e(item.title)}</option>`).join('')}</select></label><label class="field">Chapter title<input name="title" required maxlength="100" value="${ea(found?.chapter.title || '')}" placeholder="e.g. The world of geometry" autofocus></label><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">${chapterId?'Save name':'Create chapter'}</button></div></form>`);
    $('#chapter-form',dialog).addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget;const title=form.elements.title.value.trim();if(!title)return;
      if(found) found.chapter.title=title;
      else {const selectedCourse=state.courses.find(item=>item.id===form.elements.course.value);const chapter={id:uid('chapter'),title,order:selectedCourse.chapters.length,lessons:[]};selectedCourse.chapters.push(chapter);runtime.treeOpen[selectedCourse.id]=true;runtime.treeOpen[chapter.id]=true;}
      persist();dialog.close();if($('#course-tree-content')){renderCourseTree();refreshStudioChrome();}else navigate('#/studio');toast(chapterId?'Chapter renamed.':'Your new chapter is ready for its first lesson.');
    });
  }

  function subjectDialog() {
    const dialog=showDialog('A whole new world of ideas.','Create a subject, then add chapters and lessons in Studio.',`<form id="subject-form"><label class="field">Subject name<input name="title" required maxlength="60" placeholder="e.g. Art & design" autofocus></label><label class="field">A short description<input name="description" maxlength="120" placeholder="What will your students discover?"></label><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">Create subject</button></div></form>`);
    $('#subject-form',dialog).addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget;const title=form.elements.title.value.trim();if(!title)return;
      let id=slugify(title);if(state.courses.some(course=>course.id===id))id=uid(id);
      state.courses.push({id,subject:id,title,description:form.elements.description.value.trim(),icon:'book',color:'#2563EB',chapters:[]});runtime.treeOpen[id]=true;persist();dialog.close();navigate('#/studio');toast('Subject created. Add a chapter to start your story.');
    });
  }

  function lessonMenu(id,anchor) {
    const found=findLesson(id);if(!found)return;
    const sorted=[...found.chapter.lessons].sort((a,b)=>a.order-b.order);
    const index=sorted.findIndex(lesson=>lesson.id===id);
    openPopover(`<p class="popover-label">LESSON OPTIONS</p><button data-action="move-lesson" data-lesson="${ea(id)}" data-direction="up" ${index===0?'disabled':''}>${icon('up')} Move up</button><button data-action="move-lesson" data-lesson="${ea(id)}" data-direction="down" ${index===sorted.length-1?'disabled':''}>${icon('down')} Move down</button><hr><button data-action="export" data-lesson="${ea(id)}">${icon('download')} Export markdown</button>`,anchor);
  }

  function reorderLesson(id,targetId,direction=null) {
    const found=findLesson(id);if(!found)return;
    const sorted=[...found.chapter.lessons].sort((a,b)=>a.order-b.order);
    const from=sorted.findIndex(lesson=>lesson.id===id);
    let to=direction?from+(direction==='up'?-1:1):sorted.findIndex(lesson=>lesson.id===targetId);
    if(to<0||to>=sorted.length||to===from)return;
    const [item]=sorted.splice(from,1);sorted.splice(to,0,item);sorted.forEach((lesson,index)=>lesson.order=index);found.chapter.lessons=sorted;
    persist();closePopover();renderCourseTree();renderPreview();toast('Lesson order updated.');
  }

  function showDialog(title,description,content='',actions='',options={}) {
    closePopover();
    const dialog=document.createElement('dialog');
    dialog.id=uid('dialog');
    dialog.setAttribute('aria-labelledby',dialog.id+'-title');
    dialog.innerHTML=`<div class="dialog-header"><div><h2 id="${dialog.id}-title">${e(title)}</h2>${description?`<p>${e(description)}</p>`:''}</div><button class="icon-btn" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>${content}${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
    if(options.width)dialog.style.maxWidth=options.width;
    $('#overlay-root').appendChild(dialog);
    dialog.addEventListener('close',()=>dialog.remove());
    dialog.addEventListener('click',event=>{
      if(event.target!==dialog)return;
      const rect=dialog.getBoundingClientRect();
      if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
    });
    dialog.showModal();
    $('[autofocus]',dialog)?.focus();
    return dialog;
  }

  function closePopover() {
    $('#app-popover')?.remove();
  }

  function openPopover(html,anchor,x,y) {
    closePopover();
    const popover=document.createElement('div');
    popover.className='popover';popover.id='app-popover';popover.innerHTML=html;
    popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Options');
    document.body.appendChild(popover);
    const rect=anchor?.getBoundingClientRect();
    const width=popover.offsetWidth,height=popover.offsetHeight;
    popover.style.left=Math.max(12,Math.min(x ?? rect?.left ?? 20,window.innerWidth-width-12))+'px';
    popover.style.top=Math.max(12,Math.min(y ?? (rect?rect.bottom+7:80),window.innerHeight-height-12))+'px';
    popover.style.maxHeight=(window.innerHeight-24)+'px';popover.style.overflowY='auto';
    runtime.popoverAnchor=anchor || $('#markdown-editor');
    return popover;
  }

  function toggleBookmark(id) {
    const index=state.bookmarks.indexOf(id);
    if(index>=0)state.bookmarks.splice(index,1);else state.bookmarks.push(id);
    const saved=index<0;
    $$('.bookmark-control').filter(button=>button.dataset.lesson===id).forEach(button=>{
      button.classList.toggle('active',saved);button.setAttribute('aria-pressed',String(saved));button.setAttribute('aria-label',saved?'Remove bookmark':'Bookmark lesson');button.innerHTML=icon(saved?'bookmarkFilled':'bookmark');
    });
    const nav=$('.sidebar [data-route="#/bookmarks"]');
    if(nav)nav.innerHTML=`${icon('bookmark')} Bookmarks${state.bookmarks.length?`<span class="nav-count">${state.bookmarks.length}</span>`:''}`;
    scheduleSave();toast(saved?'A good idea, saved for later.':'Bookmark removed.');
  }

  function openNotes(id) {
    const found=findLesson(id);if(!found)return;
    closeDrawer();
    runtime.lastFocus=document.activeElement;runtime.notesLesson=id;
    const layer=document.createElement('div');layer.id='notes-layer';
    layer.innerHTML=`<div class="drawer-backdrop" data-action="close-notes"></div><aside class="notes-drawer" role="dialog" aria-modal="true" aria-labelledby="notes-title"><div class="dialog-header"><div><h2 id="notes-title">My notes</h2><p>A little room for your own ideas.</p></div><button class="icon-btn" data-action="close-notes" aria-label="Close notes">${icon('close')}</button></div><p class="notes-lesson">${e(lessonTitle(found.lesson))}</p><label class="sr-only" for="my-notes-text">Your personal notes for this lesson</label><textarea id="my-notes-text" placeholder="An interesting idea, a question to come back to, a connection you made..." spellcheck="true"></textarea><div class="notes-bottom">${icon('cloud','sm')}<span id="notes-save-status">Saved on this device</span></div></aside>`;
    $('#overlay-root').appendChild(layer);
    $('#app').inert=true;
    const textarea=$('#my-notes-text',layer);textarea.value=state.myNotes[id] || '';
    textarea.addEventListener('input',()=>{state.myNotes[id]=textarea.value;$('#notes-save-status').textContent='Saving...';scheduleSave();});
    layer.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDrawer();return;}
      if(event.key==='Tab') {
        const controls=$$('button,textarea',layer);const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    textarea.focus();
  }

  function closeDrawer() {
    const layer=$('#notes-layer');
    if(!layer)return;
    layer.remove();$('#app').inert=false;runtime.notesLesson=null;
    if(runtime.lastFocus?.isConnected)runtime.lastFocus.focus({preventScroll:true});
  }

  function openContents(root) {
    const headings=$$('.lesson-body h2',root);
    const doc=root.ownerDocument || root;
    const dialog=showDialog('On this page','Find your place in the lesson.',`<nav class="toc-links">${headings.map(heading=>`<button class="toc-link" data-toc-target="${ea(heading.id)}">${e(heading.textContent)}</button>`).join('')}</nav>`,'',{width:'380px'});
    $$('[data-toc-target]',dialog).forEach(button=>button.addEventListener('click',()=>{
      dialog.close();doc.getElementById(button.dataset.tocTarget)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    }));
  }

  function plainLessonText(lesson) {
    return parseFrontmatter(studentSource(lesson)).content.replace(/^```[^\n]*$/gm,' ').replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[#*_`$|]/g,'').replace(/\s+/g,' ').trim();
  }

  function highlighted(text,query) {
    if(!query)return e(text);
    const lower=text.toLowerCase(),needle=query.toLowerCase();
    let position=0,result='',match;
    while((match=lower.indexOf(needle,position))!==-1){result+=e(text.slice(position,match))+'<mark>'+e(text.slice(match,match+query.length))+'</mark>';position=match+query.length;}
    return result+e(text.slice(position));
  }

  function searchSnippet(lesson,query) {
    const text=plainLessonText(lesson);
    const match=query?text.toLowerCase().indexOf(query.toLowerCase()):0;
    const start=Math.max(0,match-42);
    return (start?'... ':'')+text.slice(start,start+145)+(text.length>start+145?'...':'');
  }

  function renderSearchResults(query,dialog) {
    const trimmed=query.trim();
    const lower=trimmed.toLowerCase();
    let results=publishedLessons().filter(({lesson,course})=>!trimmed || lessonTitle(lesson).toLowerCase().includes(lower) || plainLessonText(lesson).toLowerCase().includes(lower) || course.title.toLowerCase().includes(lower));
    if(trimmed)results.sort((a,b)=>Number(lessonTitle(b.lesson).toLowerCase().includes(lower))-Number(lessonTitle(a.lesson).toLowerCase().includes(lower)));
    else results.sort((a,b)=>new Date(progressOf(b.lesson.id).lastOpened||0)-new Date(progressOf(a.lesson.id).lastOpened||0));
    const count=results.length;results=results.slice(0,trimmed?18:5);
    runtime.searchIndex=0;
    $('#search-results',dialog).innerHTML=`<p class="search-hint">${trimmed?count+' '+(count===1?'lesson':'lessons')+' found':'PICK UP A THREAD'}</p>${results.length?results.map(({course,lesson},index)=>`<button class="search-result subject-${ea(course.subject)} ${index===0?'selected':''}" id="search-option-${index}" role="option" aria-selected="${index===0}" data-action="search-open" data-lesson="${ea(lesson.id)}">${subjectChip(course)}<h3>${highlighted(lessonTitle(lesson),trimmed)}</h3><p>${highlighted(searchSnippet(lesson,trimmed),trimmed)}</p></button>`).join(''):`<div class="empty-state">${icon('search')}<h2>No lessons found. Yet.</h2><p>Try a different word, a subject name, or something you're curious about.</p></div>`}`;
    const input=$('#search-input',dialog);
    if(results.length)input.setAttribute('aria-activedescendant','search-option-0');else input.removeAttribute('aria-activedescendant');
  }

  function openSearch() {
    closePopover();
    const existing=$('#search-dialog');
    if(existing){$('#search-input',existing).focus();return;}
    const dialog=document.createElement('dialog');dialog.id='search-dialog';dialog.className='search-dialog';dialog.setAttribute('aria-label','Search the lesson Library');
    dialog.innerHTML=`<div class="search-input-row">${icon('search')}<label class="sr-only" for="search-input">Search lesson titles and content</label><input id="search-input" type="search" role="combobox" aria-autocomplete="list" aria-controls="search-results" aria-expanded="true" autocomplete="off" placeholder="What are you curious about?" autofocus><button class="icon-btn" data-action="close-dialog" aria-label="Close search">${icon('close','sm')}</button></div><div id="search-results" class="search-results" role="listbox" aria-label="Matching lessons"></div><div class="search-footer"><span><kbd>${icon('up','sm')}${icon('down','sm')}</kbd> to navigate</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span><span>A world of ideas, one search away.</span></div>`;
    $('#overlay-root').appendChild(dialog);dialog.addEventListener('close',()=>dialog.remove());
    dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientY<rect.top||event.clientY>rect.bottom||event.clientX<rect.left||event.clientX>rect.right)dialog.close();}});
    const input=$('#search-input',dialog);input.addEventListener('input',()=>renderSearchResults(input.value,dialog));
    input.addEventListener('keydown',event=>{
      const results=$$('.search-result',dialog);
      if(['ArrowDown','ArrowUp'].includes(event.key)) {
        event.preventDefault();if(!results.length)return;
        runtime.searchIndex=(runtime.searchIndex+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;
        results.forEach((result,index)=>{result.classList.toggle('selected',index===runtime.searchIndex);result.setAttribute('aria-selected',String(index===runtime.searchIndex));});
        input.setAttribute('aria-activedescendant',results[runtime.searchIndex].id);results[runtime.searchIndex].scrollIntoView({block:'nearest',behavior:'instant'});
      } else if(event.key==='Enter'&&results.length){event.preventDefault();results[runtime.searchIndex].click();}
    });
    renderSearchResults('',dialog);dialog.showModal();input.focus();
  }

  function openProfile() {
    const dialog=showDialog('Make yourself at home.','This is your personal learning space. No account or sign-in needed.',`<form id="profile-form"><label class="field">Your name<input name="name" required maxlength="60" value="${ea(state.ui.name || 'Alex Morgan')}" autofocus></label><div class="dialog-note">Lessons, bookmarks, and notes stay in this browser. Export your authored lessons as markdown to keep a portable copy.</div><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">Save profile</button></div></form>`);
    $('#profile-form',dialog).addEventListener('submit',event=>{event.preventDefault();const name=event.currentTarget.elements.name.value.trim();if(!name)return;state.ui.name=name;persist();dialog.close();renderApp();toast('Your learning space, a little more you.');});
  }

  function showShortcuts() {
    const command=navigator.platform.toLowerCase().includes('mac')?'Cmd':'Ctrl';
    const shortcuts=[['Search the Library',command+' K'],['Save a draft',command+' S'],['Publish lesson',command+' Enter'],['Bold in the editor',command+' B'],['Italic in the editor',command+' I'],['Indent in the editor','Tab'],['Close a dialog or panel','Esc'],['Show these shortcuts','?']];
    showDialog('A few handy shortcuts.','More time for ideas. Less time looking for buttons.',shortcuts.map(([label,keys])=>`<div class="shortcut-row"><span>${label}</span><kbd>${keys}</kbd></div>`).join(''));
  }

  function requestImport() {
    const chapters=state.courses.flatMap(course=>course.chapters.map(chapter=>({course,chapter})));
    if(!chapters.length){toast('Create a chapter before importing a lesson.','info');chapterDialog();return;}
    const current=currentStudio()?.chapter.id;
    const dialog=showDialog('Bring your ideas along.','Import a .md file as a draft. Frontmatter and custom lesson blocks are supported.',`<form id="import-form"><label class="field">Import into chapter<select name="chapter">${state.courses.map(course=>course.chapters.length?`<optgroup label="${ea(course.title)}">${course.chapters.map(chapter=>`<option value="${ea(chapter.id)}" ${chapter.id===current?'selected':''}>${e(chapter.title)}</option>`).join('')}</optgroup>`:'').join('')}</select></label><div class="dialog-note">Your file stays on this device. Imports never replace an existing lesson or publish automatically.</div><div class="dialog-actions"><button type="button" class="btn" data-action="close-dialog">Cancel</button><button type="submit" class="btn btn-primary">${icon('upload','sm')} Choose markdown file</button></div></form>`);
    $('#import-form',dialog).addEventListener('submit',event=>{event.preventDefault();runtime.importChapter=event.currentTarget.elements.chapter.value;dialog.close();$('#import-file').click();});
  }

  async function importFile(event) {
    const file=event.target.files[0];if(!file)return;
    try {
      if(!/\.(md|markdown|txt)$/i.test(file.name))throw new Error('Please choose a .md markdown file.');
      if(file.size>2*1024*1024)throw new Error('Please choose a file smaller than 2 MB.');
      const found=findChapter(runtime.importChapter);if(!found)throw new Error('Choose a chapter before importing.');
      const raw=await file.text();if(!raw.trim())throw new Error('This file is empty. Try another markdown file.');
      const parsed=parseFrontmatter(raw);
      const meta={title:file.name.replace(/\.[^.]+$/,'').replace(/[-_]/g,' '),subject:found.course.id,grade:8,difficulty:'Easy',duration:Math.max(1,Math.ceil(wordCount(raw)/180)),tags:[],prerequisites:[],...parsed.meta};
      meta.subject=found.course.id;
      const now=new Date().toISOString();
      const lesson={id:uid('lesson'),title:meta.title,order:found.chapter.lessons.length,status:'draft',frontmatter:meta,body:serializeLesson(meta,parsed.content),publishedBody:null,version:0,createdAt:now,updatedAt:now};
      found.chapter.lessons.push(lesson);runtime.treeOpen[found.course.id]=true;runtime.treeOpen[found.chapter.id]=true;persist();navigate('#/studio/'+lesson.id);toast('Markdown imported. Your draft is ready to shape.');
    } catch(error){toast(error.message || 'The file could not be imported.','warning');}
    finally{event.target.value='';}
  }

  function changeDevice(device) {
    if(!['desktop','tablet','mobile'].includes(device))return;
    state.ui.device=device;
    if($('#device-frame'))$('#device-frame').dataset.device=device;
    $$('[data-action="preview-device"]').forEach(button=>{button.classList.toggle('active',button.dataset.device===device);button.setAttribute('aria-pressed',String(button.dataset.device===device));});
    if($('#preview-width'))$('#preview-width').innerHTML=(device==='desktop'?'1200':device==='tablet'?'768':'390')+' px &middot; Actual width';
    scheduleSave();
  }

  function setPreviewOpen(open) {
    runtime.previewOpen=open;
    document.body.classList.toggle('preview-open',open);
    if($('.editor-pane'))$('.editor-pane').inert=open;
    if($('#studio-tree'))$('#studio-tree').inert=open;
    if(open){renderPreview();$('.preview-close')?.focus();}
    else if(window.innerWidth<1200)$('.open-preview')?.focus();
  }

  function openMobileNav() {
    const sidebar=$('.sidebar');if(!sidebar)return;
    sidebar.classList.add('is-open');sidebar.setAttribute('role','dialog');sidebar.setAttribute('aria-modal','true');
    $('.nav-backdrop')?.classList.add('is-open');
    if($('.workspace'))$('.workspace').inert=true;
    $('.mobile-menu')?.setAttribute('aria-expanded','true');
    $('.sidebar-close',sidebar)?.focus();
  }

  function closeMobileNav() {
    const sidebar=$('.sidebar');const wasOpen=sidebar?.classList.contains('is-open');
    sidebar?.classList.remove('is-open');sidebar?.removeAttribute('role');sidebar?.removeAttribute('aria-modal');
    $('.nav-backdrop')?.classList.remove('is-open');
    if($('.workspace'))$('.workspace').inert=false;
    $('.mobile-menu')?.setAttribute('aria-expanded','false');
    if(wasOpen&&(window.innerWidth<900||document.body.classList.contains('reader-active')))$('.mobile-menu')?.focus({preventScroll:true});
  }

  function renderApp() {
    runtime.readerCleanup?.();runtime.readerCleanup=null;
    runtime.previewCleanup?.();runtime.previewCleanup=null;
    closePopover();closeDrawer();
    $$('dialog[open]').forEach(dialog=>dialog.close());
    runtime.quizRegistry={};runtime.previewReady=false;runtime.previewOpen=false;
    document.body.classList.remove('studio-active','preview-open','reader-active');
    const route=location.hash && location.hash!=='#main'?location.hash:(state.ui.lastRoute || '#/library');
    const [path,query='']=route.replace(/^#\/?/,'').split('?');
    let [view,id]=path.split('/');
    try{id=id?decodeURIComponent(id):undefined;}catch{id=undefined;}
    if(!['library','subject','lesson','learning','bookmarks','studio'].includes(view))view='library';
    window.scrollTo({top:0,behavior:'instant'});
    if(view==='studio') {
      state.ui.role='studio';document.body.classList.add('studio-active');
      const found=findLesson(id || state.ui.studioLastLesson || state.ui.lastLesson) || allLessons()[0];
      runtime.activeLesson=found?.lesson.id || null;
      if(found){state.ui.studioLastLesson=found.lesson.id;runtime.treeOpen[found.course.id]=true;runtime.treeOpen[found.chapter.id]=true;}
      $('#app').innerHTML=studioHTML(found?.lesson);
      initializeStudio(found?.lesson);
      document.title=(found?lessonTitle(found.lesson,true)+' | ':'')+'EduNotes Studio';
    } else {
      state.ui.role='student';
      const found=view==='lesson'?findLesson(id):null;
      runtime.activeLesson=found?.lesson.id || null;
      const subjectId=view==='subject'?id:found?.course.id;
      let content;
      if(view==='subject')content=subjectHTML(id);
      else if(view==='learning')content=learningListHTML();
      else if(view==='bookmarks')content=learningListHTML(true);
      else if(view==='lesson') {
        if(found?.lesson.status==='published'){document.body.classList.add('reader-active');recordLessonOpen(id);content=renderLesson(found.lesson);}
        else content=missingHTML('This lesson is a private draft or is no longer available. Published lessons are waiting in the Library.');
      } else content=libraryHTML();
      $('#app').innerHTML=`${sidebarHTML(view,subjectId)}<div class="workspace">${topbarHTML(view,subjectId)}<main id="main" tabindex="-1">${content}</main></div>`;
      if(view==='lesson'&&found?.lesson.status==='published') {
        runtime.readerCleanup=hydrateLesson($('#main'));
        if(new URLSearchParams(query).has('resume') && progressOf(id).percent<100) {
          const percent=Number(progressOf(id).percent)||0;
          const restore=()=>requestAnimationFrame(()=>{
            if(runtime.activeLesson!==id||state.ui.role!=='student')return;
            const total=document.documentElement.scrollHeight-window.innerHeight;
            window.scrollTo({top:Math.max(0,total*percent/100),behavior:'instant'});
          });
          if(document.fonts?.ready)document.fonts.ready.then(restore);else restore();
        }
      }
      document.title=(found?lessonTitle(found.lesson)+' | ':view==='bookmarks'?'Bookmarks | ':view==='learning'?'My Learning | ':'')+'EduNotes';
    }
    state.ui.lastRoute='#/'+view+(id?'/'+id:'');
    applyTheme();scheduleSave();
  }

  function handleGlobalClick(event) {
    const format=event.target.closest('[data-format]');
    if(format){event.preventDefault();insertFormatting(format.dataset.format);return;}
    const control=event.target.closest('[data-action]');
    if(!control||control.disabled)return;
    const action=control.dataset.action;
    if(action==='route'){navigate(control.dataset.route);return;}
    if(action==='student') {
      const lesson=state.ui.role==='studio'?currentStudio()?.lesson:null;
      navigate(lesson?.status==='published'?'#/lesson/'+lesson.id:'#/library');
    } else if(action==='studio') {
      const id=(runtime.activeLesson&&findLesson(runtime.activeLesson)?runtime.activeLesson:null) || state.ui.studioLastLesson || state.ui.lastLesson || allLessons()[0]?.lesson.id;
      navigate('#/studio'+(id?'/'+id:''));
    } else if(action==='theme') {
      state.ui.theme=isDark()?'light':'dark';applyTheme();scheduleSave();
    } else if(action==='search')openSearch();
    else if(action==='search-open')navigate('#/lesson/'+control.dataset.lesson);
    else if(action==='shortcuts')showShortcuts();
    else if(action==='profile')openProfile();
    else if(action==='toggle-nav') {
      if($('.sidebar').classList.contains('is-open'))closeMobileNav();else openMobileNav();
    } else if(action==='close-nav')closeMobileNav();
    else if(action==='filter-subject') {
      runtime.homeFilter=control.dataset.subject;$('#main').innerHTML=libraryHTML();$$('[data-action="filter-subject"]').find(button=>button.dataset.subject===runtime.homeFilter)?.focus({preventScroll:true});
    } else if(action==='filter-learning') {
      runtime.learningFilter=control.dataset.filter;$('#main').innerHTML=learningListHTML();$$('[data-action="filter-learning"]').find(button=>button.dataset.filter===runtime.learningFilter)?.focus({preventScroll:true});
    } else if(action==='toggle-chapter') {
      const section=control.closest('.chapter');const open=!section.classList.contains('is-open');section.classList.toggle('is-open',open);control.setAttribute('aria-expanded',String(open));$('.chapter-body',section).inert=!open;runtime.chapterOpen[control.dataset.chapter]=open;
    } else if(action==='bookmark')toggleBookmark(control.dataset.lesson);
    else if(action==='notes')openNotes(control.dataset.lesson);
    else if(action==='close-notes')closeDrawer();
    else if(action==='complete')markComplete(control.dataset.lesson);
    else if(action==='close-dialog')control.closest('dialog')?.close();
    else if(action==='tree-course') {
      const id=control.dataset.course;runtime.treeOpen[id]=control.getAttribute('aria-expanded')!=='true';renderCourseTree();
    } else if(action==='tree-chapter') {
      const id=control.dataset.chapter;runtime.treeOpen[id]=control.getAttribute('aria-expanded')!=='true';renderCourseTree();
    } else if(action==='toggle-tree') {
      const tree=$('#studio-tree');
      if(window.innerWidth<900){tree.hidden=false;tree.classList.toggle('tree-mobile-open');}
      else {runtime.treeHidden=!tree.hidden;tree.hidden=runtime.treeHidden;}
    } else if(action==='open-preview') {
      setPreviewOpen(true);
    } else if(action==='close-preview') {
      setPreviewOpen(false);
    } else if(action==='preview-device')changeDevice(control.dataset.device);
    else if(action==='edit-meta')editMetadata(control.dataset.key,control);
    else if(action==='block-palette')openBlockPalette(control);
    else if(action==='status-menu')statusMenu(control);
    else if(action==='validation')showValidation();
    else if(action==='save-draft'||action==='save-draft-close') {
      closePopover();persist(true);if(action==='save-draft-close')control.closest('dialog')?.close();
    } else if(action==='publish'){closePopover();openPublishDialog();}
    else if(action==='confirm-publish')publishCurrentLesson();
    else if(action==='unpublish')unpublishLesson();
    else if(action==='export')exportLesson(control.dataset.lesson || runtime.activeLesson);
    else if(action==='import')requestImport();
    else if(action==='new-subject')subjectDialog();
    else if(action==='new-chapter')chapterDialog(control.dataset.course);
    else if(action==='rename-chapter')chapterDialog(null,control.dataset.chapter);
    else if(action==='new-lesson')createLesson(control.dataset.chapter);
    else if(action==='lesson-menu')lessonMenu(control.dataset.lesson,control);
    else if(action==='move-lesson')reorderLesson(control.dataset.lesson,null,control.dataset.direction);
  }

  function handleKeyboard(event) {
    const command=event.metaKey||event.ctrlKey;
    const key=event.key.toLowerCase();
    const editor=$('#markdown-editor');
    const editing=event.target.closest('input,textarea,select,[contenteditable="true"]');
    if(command&&key==='k'){event.preventDefault();openSearch();return;}
    if(command&&key==='s'&&state.ui.role==='studio'){event.preventDefault();persist(true);return;}
    if(command&&event.key==='Enter'&&state.ui.role==='studio'&&!$('dialog[open]')){event.preventDefault();openPublishDialog();return;}
    if(command&&event.target===editor&&['b','i'].includes(key)){event.preventDefault();insertFormatting(key==='b'?'bold':'italic');return;}
    if(event.target===editor&&event.key==='Tab') {
      event.preventDefault();const start=editor.selectionStart,end=editor.selectionEnd;
      if(event.shiftKey){const count=editor.value.slice(Math.max(0,start-2),start).match(/ +$/)?.[0].length||0;if(count)editor.setRangeText('',start-count,start,'end');}
      else editor.setRangeText('  ',start,end,'end');
      editor.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if(event.key==='Escape') {
      if($('#app-popover')){closePopover();runtime.popoverAnchor?.focus();return;}
      if($('#notes-layer')){closeDrawer();return;}
      if(runtime.previewOpen)setPreviewOpen(false);
      closeMobileNav();$('#studio-tree')?.classList.remove('tree-mobile-open');
    }
    if(event.key==='Tab'&&$('.sidebar.is-open')&&!$('dialog[open]')) {
      const controls=$$('button', $('.sidebar.is-open')).filter(button=>!button.disabled);
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    if(event.key==='?'&&!editing&&!$('dialog[open]')){event.preventDefault();showShortcuts();}
    const tab=event.target.closest('[role="tab"]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault();const tabs=$$('[role="tab"]',tab.parentElement);const index=tabs.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();
    }
  }

  function initializeEvents() {
    document.addEventListener('click',handleGlobalClick);
    document.addEventListener('keydown',handleKeyboard);
    document.addEventListener('pointerdown',event=>{const popover=$('#app-popover');if(popover&&!popover.contains(event.target))closePopover();});
    $('#import-file').addEventListener('change',importFile);
    $('#skip-link').addEventListener('click',event=>{event.preventDefault();const target=$('.lesson-body')||$('#main')||$('#markdown-editor');target?.focus();target?.scrollIntoView({block:'start'});});
    document.addEventListener('dragstart',event=>{
      const handle=event.target.closest('.drag-handle');if(!handle)return;
      runtime.dragId=handle.dataset.lesson;event.dataTransfer.setData('text/plain',runtime.dragId);event.dataTransfer.effectAllowed='move';closePopover();
    });
    document.addEventListener('dragover',event=>{
      const row=event.target.closest('.tree-lesson');if(!row||!runtime.dragId)return;
      if(findLesson(runtime.dragId)?.chapter.id!==row.dataset.chapter)return;
      event.preventDefault();event.dataTransfer.dropEffect='move';$$('.drop-target').forEach(item=>item.classList.remove('drop-target'));row.classList.add('drop-target');
    });
    document.addEventListener('drop',event=>{
      const row=event.target.closest('.tree-lesson');if(!row||!runtime.dragId)return;
      event.preventDefault();if(findLesson(runtime.dragId)?.chapter.id===row.dataset.chapter)reorderLesson(runtime.dragId,row.dataset.lesson);
      runtime.dragId=null;$$('.drop-target').forEach(item=>item.classList.remove('drop-target'));
    });
    document.addEventListener('dragend',()=>{runtime.dragId=null;$$('.drop-target').forEach(item=>item.classList.remove('drop-target'));});
    window.addEventListener('hashchange',renderApp);
    window.addEventListener('resize',()=>{
      if(window.innerWidth>=900)closeMobileNav();
      if(state.ui.role==='studio'&&window.innerWidth>=1200){if(runtime.previewOpen)setPreviewOpen(false);setStudioSplit(state.ui.studioSplit);}
    });
    window.addEventListener('beforeunload',()=>persist());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(state.ui.theme==='system')applyTheme();});
  }

  window.EduNotes = {
  get state() { return state; },
  mergeBanks: function (banks) {
    if (!Array.isArray(banks) || !banks.length) return 0;
    const byName = new Map(state.courses.map(c => [c.title.toLowerCase(), c]));
    let added = 0;
    for (const bank of banks) {
      if (!bank || !bank.subject) continue;
      const key = String(bank.subject).toLowerCase();
      let course = byName.get(key);
      if (!course) {
        const id = slugify(bank.subject) || uid('course');
        course = {
          id, subject: id, title: bank.subject,
          color: '#2563EB', icon: 'book', description: bank.description || '',
          chapters: []
        };
        state.courses.push(course);
        byName.set(key, course);
      }
      for (const t of bank.topics || []) {
        let chapter = course.chapters.find(ch => ch.title === t.name);
        if (!chapter) {
          chapter = { id: uid('chapter'), title: t.name, order: course.chapters.length, lessons: [] };
          course.chapters.push(chapter);
        }
        for (const lesson of t.lessons || []) {
          const existing = chapter.lessons.find(l => l.title === lesson.title);
          if (existing && existing.body === lesson.body) continue;
          const meta = { title: lesson.title, subject: course.id, grade: 8,
                         difficulty: 'Easy', duration: lesson.duration || 5,
                         tags: [], prerequisites: [] };
          chapter.lessons.push({
            id: lesson.id || uid('lesson'),
            title: lesson.title,
            order: chapter.lessons.length,
            status: 'published',
            frontmatter: meta,
            body: serializeLesson(meta, lesson.body),
            publishedBody: serializeLesson(meta, lesson.body),
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          added++;
        }
      }
    }
    try { persist(); } catch {}
    return added;
  },
  rerender: function () { renderApp(); }
};

function boot() {
    // 1. Initialize events and state
    initializeEvents();
    
    // 2. Read and parse the banks directly!
    if (window.CBT_NOTE_BANKS && window.CBT_NOTE_BANKS.length > 0) {
        console.log("Found " + window.CBT_NOTE_BANKS.length + " note banks. Parsing...");
        
        const parsedBanks = [];
        
        window.CBT_NOTE_BANKS.forEach(raw => {
            // Clean escaped backticks
            let text = raw.replace(/\\`\\`\\`/g, '```');
            
            let subject = 'Untitled';
            const subM = text.match(/Subject:\s*(.*)/i);
            if (subM) subject = subM[1].trim();

            let description = '';
            const descM = text.match(/Description:\s*(.*)/i);
            if (descM) description = descM[1].trim();

            const topics = [];
            const parts = text.split(/Topic:\s*/i);
            
            for (let i = 1; i < parts.length; i++) {
                const chunk = parts[i];
                const firstLineBreak = chunk.indexOf('\n');
                if (firstLineBreak === -1) continue;
                
                const topicName = chunk.substring(0, firstLineBreak).trim();
                const topicContent = chunk.substring(firstLineBreak).trim();
                
                const lessons = [];
                const lessonParts = topicContent.split(/Lesson:\s*/i);
                
                for (let j = 1; j < lessonParts.length; j++) {
                    const lChunk = lessonParts[j];
                    const lFirstLineBreak = lChunk.indexOf('\n');
                    if (lFirstLineBreak === -1) continue;
                    
                    const lessonTitle = lChunk.substring(0, lFirstLineBreak).trim();
                    let lessonBody = lChunk.substring(lFirstLineBreak).trim();
                    
                    // Fix missing newlines in test file
                    lessonBody = lessonBody.replace(/\*\*(.*?)\*\*\*(.*?)\*/g, '**$1**\n\n*$2*');
                    
                    if (lessonTitle && lessonBody) {
                        lessons.push({ title: lessonTitle, body: lessonBody });
                    }
                }
                
                if (topicName && lessons.length > 0) {
                    topics.push({ name: topicName, lessons });
                }
            }

            if (topics.length > 0) {
                parsedBanks.push({ subject, description, topics });
            }
        });

        // 3. Clear the built-in empty state and merge the real data
        if (parsedBanks.length > 0 && window.EduNotes && typeof window.EduNotes.mergeBanks === 'function') {
            state.courses = []; 
            const count = window.EduNotes.mergeBanks(parsedBanks);
            console.log("Successfully loaded " + count + " lessons.");
            persist(); // Save the newly merged data to localStorage
        }
    }

    if (!location.hash || location.hash === '#main') {
        try { history.replaceState(null, '', state.ui.lastRoute || '#/library'); } catch {}
    }
    
    renderApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}
