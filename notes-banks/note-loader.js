// ============================================================
// NOTE LOADER (Regex-Based for robust parsing)
// ============================================================

(function () {
    'use strict';

    const MAX_WAIT_ATTEMPTS = 100;
    let attempts = 0;

    function parseBank(raw) {
        if (typeof raw !== 'string') return null;
        
        // Split the bank into blocks based on the structure
        let subject = null;
        let description = '';
        const topics = [];

        // Extract Subject
        const subjectMatch = raw.match(/Subject:\s*(.*)/i);
        if (subjectMatch) subject = subjectMatch[1].trim();

        // Extract Description
        const descMatch = raw.match(/Description:\s*(.*)/i);
        if (descMatch) description = descMatch[1].trim();

        // Split the text into chunks by "Topic:"
        const topicChunks = raw.split(/\nTopic:\s*/i).slice(1);
        
        for (const chunk of topicChunks) {
            // The topic name is the first line of the chunk
            const lines = chunk.split('\n');
            const topicName = lines[0].trim();
            const topicContent = lines.slice(1).join('\n');
            
            const lessons = [];
            // Split by "Lesson:" (with or without a heading)
            const lessonChunks = topicContent.split(/\nLesson:\s*/i).slice(1);
            
            for (const lChunk of lessonChunks) {
                const lLines = lChunk.split('\n');
                const lessonTitle = lLines[0].trim();
                const lessonBody = lLines.slice(1).join('\n').trim();
                
                if (lessonTitle && lessonBody) {
                    lessons.push({ title: lessonTitle, body: lessonBody });
                }
            }
            
            if (topicName && lessons.length > 0) {
                topics.push({ name: topicName, lessons });
            }
        }

        if (!subject || topics.length === 0) return null;
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
