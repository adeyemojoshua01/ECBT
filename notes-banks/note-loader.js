// ============================================================
// NOTE LOADER (Bulletproof version)
// ============================================================

(function () {
    'use strict';

    function parseBank(raw) {
        if (typeof raw !== 'string') return null;
        
        // 1. Clean up the escaped backticks from the builder
        let text = raw.replace(/\\`\\`\\`/g, '```');

        // 2. Extract Subject and Description using Regex on the whole text
        let subject = 'Untitled';
        const subM = text.match(/Subject:\s*(.*)/i);
        if (subM) subject = subM[1].trim();

        let description = '';
        const descM = text.match(/Description:\s*(.*)/i);
        if (descM) description = descM[1].trim();

        // 3. Split into Topics
        const topics = [];
        const parts = text.split(/Topic:\s*/i);
        
        for (let i = 1; i < parts.length; i++) {
            const chunk = parts[i];
            const firstLineBreak = chunk.indexOf('\n');
            if (firstLineBreak === -1) continue;
            
            const topicName = chunk.substring(0, firstLineBreak).trim();
            const topicContent = chunk.substring(firstLineBreak).trim();
            
            // 4. Split into Lessons
            const lessons = [];
            const lessonParts = topicContent.split(/Lesson:\s*/i);
            
            for (let j = 1; j < lessonParts.length; j++) {
                const lChunk = lessonParts[j];
                const lFirstLineBreak = lChunk.indexOf('\n');
                if (lFirstLineBreak === -1) continue;
                
                const lessonTitle = lChunk.substring(0, lFirstLineBreak).trim();
                let lessonBody = lChunk.substring(lFirstLineBreak).trim();
                
                // Quick fix for the missing newline bug in your test lesson
                lessonBody = lessonBody.replace(/\*\*(.*?)\*\*\*(.*?)\*/g, '**$1**\n\n*$2*');
                
                if (lessonTitle && lessonBody) {
                    lessons.push({ title: lessonTitle, body: lessonBody });
                }
            }
            
            if (topicName && lessons.length > 0) {
                topics.push({ name: topicName, lessons });
            }
        }

        if (topics.length === 0) return null;
        return { subject, description, topics };
    }

    // Wait for EduNotes to fully boot up
    let attempts = 0;
    function tryImport() {
        attempts++;
        if (attempts > 100) return; // Stop after 10 seconds

        // We need the state and the mergeBanks function
        if (!window.EduNotes || !window.EduNotes.state || typeof window.EduNotes.mergeBanks !== 'function') {
            setTimeout(tryImport, 100);
            return;
        }

        const banks = window.CBT_NOTE_BANKS || [];
        if (banks.length === 0) {
            console.warn('note-loader: No note banks found in window.CBT_NOTE_BANKS');
            return;
        }

        const parsedBanks = [];
        banks.forEach(raw => {
            const parsed = parseBank(raw);
            if (parsed) parsedBanks.push(parsed);
        });

        if (parsedBanks.length > 0) {
            // Force clear the state before merging, just in case there's leftover localStorage junk
            window.EduNotes.state.courses = [];
            window.EduNotes.state.progress = {};
            
            const count = window.EduNotes.mergeBanks(parsedBanks);
            console.log('note-loader: Successfully merged ' + count + ' lessons from ' + parsedBanks.length + ' banks.');
            
            // Force a re-render so they show up immediately
            window.EduNotes.rerender();
        }
    }

    // Start trying immediately
    tryInit();

    function tryInit() {
        if (window.EduNotes) {
            tryImport();
        } else {
            setTimeout(tryInit, 100);
        }
    }
})();
