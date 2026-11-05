// ============================================================
// NOTE LOADER
// Reads window.CBT_NOTE_BANKS (pushed by notes-banks/*.js),
// parses each markdown bank into { subject, topics: [{ name, lessons }] },
// and hands them to window.EduNotes.mergeBanks().
// Depends on: window.EduNotes (from js/edunotes.js)
// ============================================================

(function () {
    'use strict';

    const MAX_WAIT_ATTEMPTS = 100;
    let attempts = 0;

    function parseBank(raw) {
        if (typeof raw !== 'string') return null;
        const lines = raw.split('\n');
        let subject = null;
        let description = '';
        const topics = [];
        let currentTopic = null;
        let lessonLines = [];
        let inLesson = false;

        function flushLesson() {
            if (!inLesson) return;
            const body = lessonLines.join('\n').trim();
            if (body && currentTopic) {
                const firstLine = body.split('\n').find(l => l.trim() && !l.trim().startsWith('---'));
                const headingMatch = body.match(/^#\s+(.+)$/m);
                const title = headingMatch ? headingMatch[1].trim()
                            : (firstLine ? firstLine.replace(/^#+\s*/, '').slice(0, 80) : 'Untitled lesson');
                currentTopic.lessons.push({ title, body });
            }
            lessonLines = [];
            inLesson = false;
        }

        function flushTopic() {
            flushLesson();
            if (currentTopic && currentTopic.lessons.length) topics.push(currentTopic);
            currentTopic = null;
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            const subjectMatch = line.match(/^Subject:\s*(.*)$/i);
            if (subjectMatch) {
                flushTopic();
                subject = subjectMatch[1].trim();
                continue;
            }
            const descMatch = line.match(/^Description:\s*(.*)$/i);
            if (descMatch) { description = descMatch[1].trim(); continue; }

            const topicMatch = line.match(/^Topic:\s*(.*)$/i);
            if (topicMatch) {
                flushTopic();
                currentTopic = { name: topicMatch[1].trim(), lessons: [] };
                continue;
            }

            const lessonMatch = line.match(/^Lesson:\s*(.*)$/i);
            if (lessonMatch) {
                flushLesson();
                inLesson = true;
                lessonLines = ['# ' + lessonMatch[1].trim()];
                continue;
            }

            if (inLesson) lessonLines.push(line);
        }
        flushTopic();

        if (!subject || !topics.length) return null;
        return { subject, description, topics };
    }

    function tryImport() {
        attempts++;
        if (attempts > MAX_WAIT_ATTEMPTS) {
            console.warn('note-loader: EduNotes did not become ready in time.');
            return;
        }
        const ready = window.EduNotes && typeof window.EduNotes.mergeBanks === 'function';
        const banks = window.CBT_NOTE_BANKS;
        if (!ready || !Array.isArray(banks)) {
            setTimeout(tryImport, 100);
            return;
        }
        if (!banks.length) return;

        const parsed = [];
        for (const raw of banks) {
            const bank = parseBank(raw);
            if (bank) parsed.push(bank);
        }
        if (!parsed.length) {
            console.warn('note-loader: no valid note banks parsed.');
            return;
        }
        try {
            const n = window.EduNotes.mergeBanks(parsed);
            console.log('note-loader: merged ' + n + ' lesson(s) from ' + parsed.length + ' bank(s).');
            if (n > 0) window.EduNotes.rerender();
        } catch (e) {
            console.error('note-loader: merge failed', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryImport, { once: true });
    } else {
        tryImport();
    }
})();
