// ============================================================
// QUESTION LOADER
// ============================================================

(function () {
    const MAX_WAIT_ATTEMPTS = 50;
    let attempts = 0;

    function tryImport() {
        attempts++;
        if (attempts > MAX_WAIT_ATTEMPTS) return;

        const appReady   = typeof app !== 'undefined' && app.data;
        const banksReady = window.CBT_SUBJECT_BANKS && window.CBT_SUBJECT_BANKS.length > 0;

        if (!appReady || !banksReady) {
            setTimeout(tryImport, 100);
            return;
        }

        doImport();
    }

    function parseQuestions(text) {
        const lines = text.split('\n');
        const subjects = {};

        let currentSubject = null;
        let currentTopic = null;
        let currentSubTopic = null;
        let currentQuestion = null;
        let explanationLines = [];
        let readingExplanation = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line === '' || line.startsWith('===')) continue;

            if (line.match(/^Subject:/i)) {
                if (currentQuestion) finalizeQuestion();
                const subjectName = line.substring(8).trim();
                if (subjectName) {
                    const newId = 'subj_' + Date.now() + '_' + Math.random();
                    currentSubject = { id: newId, name: subjectName, duration: 30, questions: [], topics: [], notes: {}, topicImages: {} };
                    subjects[newId] = currentSubject;
                }
                continue;
            }

            if (!currentSubject) continue;

            if (line.match(/^Topic:/i)) {
                if (currentQuestion) finalizeQuestion();
                const topicName = line.substring(6).trim();
                if (topicName) {
                    let existingTopic = currentSubject.topics.find(t => t.name === topicName);
                    if (!existingTopic) { existingTopic = { id: 'topic_' + Date.now() + '_' + Math.random(), name: topicName }; currentSubject.topics.push(existingTopic); }
                    currentTopic = existingTopic;
                }
                currentSubTopic = null;
                continue;
            }

            const subTopicMatch = line.match(/^SubTopic:\s*(.*)$/i);
            if (subTopicMatch) {
                if (currentQuestion) finalizeQuestion();
                currentSubTopic = subTopicMatch[1].trim();
                continue;
            }

            if (line.match(/^Type:/i)) {
                if (currentQuestion) finalizeQuestion();
                const type = line.substring(5).trim().toLowerCase();
                currentQuestion = {
                    id: Date.now() + Math.random(),
                    text: '',
                    type: type === 'mcq' ? 'objective' : (type === 'theory' ? 'theory' : 'fill'),
                    correct: '',
                    explanation: '',
                    options: type === 'mcq' ? {} : null,
                    topicId: currentTopic ? currentTopic.id : 'general',
                    subTopic: currentSubTopic || 'General',
                    maxMarks: 10
                };
                explanationLines = [];
                readingExplanation = false;
                continue;
            }

            const marksMatch = line.match(/^Marks:\s*(\d+)$/i);
            if (marksMatch && currentQuestion.type === 'theory') {
                currentQuestion.maxMarks = parseInt(marksMatch[1]);
                continue;
            }

            if (!currentQuestion) continue;

            const qMatch = line.match(/^Q\d+:\s*(.*)$/i);
            if (qMatch) { currentQuestion.text = qMatch[1].trim(); continue; }

            let optMatch = line.match(/^Option:\s*([A-D]):\s*(.*)$/i);
            if (!optMatch && currentQuestion.type === 'objective') optMatch = line.match(/^([A-D]):\s*(.*)$/i);
            if (optMatch && currentQuestion.type === 'objective') {
                currentQuestion.options[optMatch[1].toUpperCase()] = optMatch[2].trim();
                continue;
            }

            const ansMatch = line.match(/^Answer:\s*(.*)$/i);
            if (ansMatch) { currentQuestion.correct = ansMatch[1].trim(); readingExplanation = false; continue; }

            const expMatch = line.match(/^Explanation:\s*(.*)$/i);
            if (expMatch) {
                readingExplanation = true;
                if (expMatch[1].trim()) explanationLines.push(expMatch[1].trim());
                continue;
            }

            if (readingExplanation && line) explanationLines.push(line);
        }

        function finalizeQuestion() {
            if (currentQuestion && currentQuestion.text) {
                if (explanationLines.length > 0) currentQuestion.explanation = explanationLines.join(' ');

                if (currentQuestion.type === 'objective') {
                    if (Object.keys(currentQuestion.options).length >= 2 && currentQuestion.correct) currentSubject.questions.push({ ...currentQuestion });
                } else if (currentQuestion.type === 'fill') {
                    if (currentQuestion.correct) currentSubject.questions.push({ ...currentQuestion });
                } else if (currentQuestion.type === 'theory') {
                    currentSubject.questions.push({ ...currentQuestion });
                }
            }
            currentQuestion = null; explanationLines = []; readingExplanation = false;
        }

        finalizeQuestion();

        for (let id in subjects) {
            if (subjects[id].topics.length === 0) subjects[id].topics.push({ id: 'general', name: 'General' });
        }
        return subjects;
    }

    function doImport() {
        const combinedText = window.CBT_SUBJECT_BANKS.join('\n');
        const newSubjects = parseQuestions(combinedText);
        let totalQuestions = 0;

        const saved = localStorage.getItem('cbt_subjects');
        if (saved) {
            try {
                const oldSubjects = JSON.parse(saved);
                for (let id in newSubjects) {
                    const oldMatch = Object.values(oldSubjects).find(s => s.name === newSubjects[id].name);
                    if (oldMatch) {
                        if (oldMatch.notes) newSubjects[id].notes = oldMatch.notes;
                        if (oldMatch.topicImages) newSubjects[id].topicImages = oldMatch.topicImages;
                    }
                }
            } catch (e) {}
        }

        app.data.subjects = newSubjects;
        
        for (let id in newSubjects) totalQuestions += newSubjects[id].questions.length;

        try {
            app.saveSubjects();
            console.log(`✅ question-loader.js: loaded ${totalQuestions} questions.`);
        } catch (e) {
            console.error('Import failed:', e);
            return;
        }

        const container = document.getElementById('app-container');
        if (app.data.mode === 'landing' && container && container.innerHTML.trim().length > 0) {
            app.showLanding();
        }
    }

    tryImport();
})();
