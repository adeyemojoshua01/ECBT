// ============================================================
// APP CORE
// State, persistence, resume-exam, notifications, landing,
// study materials, candidate login, header, MathJax patcher.
// ============================================================

window.app = {
    data: {
        subjects: {},
        currentSubjectId: null,
        questions: [],
        examDuration: 30,
        currentQuestionIndex: 0,
        userAnswers: {},
        candidateName: '',
        timer: null,
        timeLeft: 0,
        mode: 'landing',
        results: [],
        images: {},
        examMode: null,
        answerRevealed: {},
        lastResults: null,
        refreshLocked: true
    },

    // --------------------------------------------------------
    // INITIALIZATION
    // --------------------------------------------------------
    init: function () {
        this.loadData();
        this.loadResults();
        this.loadImages();
        imageViewer.init();
        this.setupMathJaxPatch();

        if (this.checkForSavedExam()) return;

        this.showLanding();
    },

    loadData: function () {
        const storedSubjects = localStorage.getItem('cbt_subjects');
        if (storedSubjects) {
            this.data.subjects = JSON.parse(storedSubjects);
            Object.values(this.data.subjects).forEach(subj => {
                if (!subj.notes) subj.notes = {};
                if (!subj.topicImages) subj.topicImages = {};
            });
        } else {
            this.data.subjects = {};
        }
    },

    loadImages: function () {
        const stored = localStorage.getItem('cbt_images');
        if (stored) {
            try { this.data.images = JSON.parse(stored); }
            catch (e) { this.data.images = {}; }
        }
    },

    loadResults: function () {
        const stored = localStorage.getItem('cbt_results');
        if (stored) {
            try { this.data.results = JSON.parse(stored); }
            catch (e) { /* leave empty */ }
        }
    },

    saveSubjects: function () { localStorage.setItem('cbt_subjects', JSON.stringify(this.data.subjects)); },
    saveResults:  function () { localStorage.setItem('cbt_results',  JSON.stringify(this.data.results));  },
    saveImages:   function () { localStorage.setItem('cbt_images',   JSON.stringify(this.data.images));   },

    createSubjectInternal: function (name, duration, questions = [], id = null) {
        const newId = id || 'subj_' + Date.now();
        this.data.subjects[newId] = {
            id: newId,
            name: name,
            duration: parseInt(duration) || 30,
            questions: questions,
            topics: [{ id: 'general', name: 'General' }],
            notes: {},
            topicImages: {}
        };
        this.saveSubjects();
        return newId;
    },

    // --------------------------------------------------------
    // EXAM STATE PERSISTENCE (for resume-after-refresh)
    // --------------------------------------------------------
    saveExamState: function () {
        if (this.data.mode !== 'test') return;
        try {
            localStorage.setItem('cbt_exam_state', JSON.stringify({
                questions:        this.data.questions,
                userAnswers:      this.data.userAnswers,
                answerRevealed:   this.data.answerRevealed,
                currentIndex:     this.data.currentQuestionIndex,
                endTime:          this.data.endTime || null,
                examMode:         this.data.examMode,
                candidateName:    this.data.candidateName,
                currentSubjectId: this.data.currentSubjectId,
                examDuration:     this.data.examDuration,
                timeLeft:         this.data.timeLeft
            }));
        } catch (e) { console.warn('saveExamState failed:', e); }
    },

    clearExamState: function () {
        localStorage.removeItem('cbt_exam_state');
    },

    checkForSavedExam: function () {
        const raw = localStorage.getItem('cbt_exam_state');
        if (!raw) return false;

        let state;
        try { state = JSON.parse(raw); }
        catch { this.clearExamState(); return false; }

        if (state.examMode === 'practice' && state.endTime) {
            const remaining = Math.round((state.endTime - Date.now()) / 1000);
            if (remaining <= 0) { this.clearExamState(); return false; }
            state.timeLeft = remaining;
        }

        this._savedExamState = state;
        this.showResumePrompt(state);
        return true;
    },

    showResumePrompt: function (state) {
        this.data.mode = 'resume-prompt';
        this.updateHeader();

        const subjectName = this.data.subjects[state.currentSubjectId]?.name || 'Unknown';
        const answered = Object.keys(state.userAnswers || {}).filter(k =>
            state.userAnswers[k] !== undefined && state.userAnswers[k] !== ''
        ).length;

        document.getElementById('app-container').innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                    <div class="text-center mb-6">
                        <i class="fas fa-clock-rotate-left text-5xl text-blue-600 mb-3"></i>
                        <h2 class="text-2xl font-bold text-gray-800">Unfinished Exam Found</h2>
                        <p class="text-gray-500 mt-1">Would you like to resume?</p>
                    </div>
                    <div class="bg-gray-50 p-4 rounded mb-6 space-y-1 text-sm">
                        <p><span class="text-gray-500">Candidate:</span> <strong>${state.candidateName || '—'}</strong></p>
                        <p><span class="text-gray-500">Subject:</span> <strong>${subjectName}</strong></p>
                        <p><span class="text-gray-500">Mode:</span> <strong>${state.examMode}</strong></p>
                        <p><span class="text-gray-500">Progress:</span> <strong>${answered} / ${state.questions.length} answered</strong></p>
                    </div>
                    <div class="space-y-3">
                        <button onclick="event.preventDefault(); app.resumeSavedExam()"
                                class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg">
                            <i class="fas fa-play mr-2"></i>Resume Exam
                        </button>
                        <button onclick="event.preventDefault(); app.discardSavedExam()"
                                class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg">
                            <i class="fas fa-trash mr-2"></i>Discard & Start Fresh
                        </button>
                    </div>
                </div>
            </div>`;
    },

    resumeSavedExam: function () {
        const state = this._savedExamState;
        if (!state) { this.showLanding(); return; }

        this.data.questions            = state.questions;
        this.data.userAnswers          = state.userAnswers || {};
        this.data.answerRevealed       = state.answerRevealed || {};
        this.data.currentQuestionIndex = state.currentIndex || 0;
        this.data.examMode             = state.examMode;
        this.data.candidateName        = state.candidateName || '';
        this.data.currentSubjectId     = state.currentSubjectId;
        this.data.examDuration         = state.examDuration || 30;
        this.data.mode                 = 'test';
        this.data.answerRevealed       = state.answerRevealed || {};

        if (state.examMode === 'practice' && state.endTime) {
            this.data.timeLeft = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
            if (this.data.timeLeft <= 0) {
                this.clearExamState();
                this.submitTest();
                return;
            }
            this.startTimer();
        } else {
            this.data.timeLeft = 0;
        }

        this._savedExamState = null;
        this.showTestInterface();
    },

    discardSavedExam: function () {
        this.clearExamState();
        this._savedExamState = null;
        this.showLanding();
    },

    // --------------------------------------------------------
    // NOTIFICATIONS
    // --------------------------------------------------------
    showNotification: function (message, type = 'info') {
        const existing = document.querySelector('.cbt-notification');
        if (existing) existing.remove();

        const colors = {
            info:    'bg-blue-100 text-blue-800 border-blue-300',
            success: 'bg-green-100 text-green-800 border-green-300',
            warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            error:   'bg-red-100 text-red-800 border-red-300'
        };

        const notification = document.createElement('div');
        notification.className = `cbt-notification fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg ${colors[type]}`;
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-info-circle"></i>
                <span class="font-medium">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 3000);
    },

    // --------------------------------------------------------
    // LANDING
    // --------------------------------------------------------
    showLanding: function () {
        this.stopTimer();
        this.data.mode = 'landing';
        this.data.examMode = null;
        this.updateHeader();

        const subjectsWithNotes = Object.values(this.data.subjects).filter(subj =>
            (subj.notes && Object.keys(subj.notes).some(topicId => subj.notes[topicId] && subj.notes[topicId].trim() !== '')) ||
            (subj.topicImages && Object.keys(subj.topicImages).some(topicId => subj.topicImages[topicId]?.length > 0))
        );

        document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-4">
                <div class="text-center mb-8">
                    <i class="fas fa-graduation-cap text-6xl text-green-600 mb-4"></i>
                    <h2 class="text-3xl font-bold text-gray-800 mb-2">Welcome to the CBT Portal</h2>
                    <p class="text-gray-600">Select your role to continue</p>
                </div>
                ${subjectsWithNotes.length > 0 ? `
                <div class="w-full max-w-2xl mb-6">
                    <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <i class="fas fa-book-open text-blue-500"></i>
                        Available Study Materials
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${subjectsWithNotes.map(subj => {
                            const noteCount  = subj.notes ? Object.keys(subj.notes).filter(t => subj.notes[t]?.trim()).length : 0;
                            const imageCount = subj.topicImages ? Object.values(subj.topicImages).flat().length : 0;
                            return `
                                <div onclick="event.preventDefault(); app.showSubjectNotes('${subj.id}')" class="note-card cursor-pointer">
                                    <i class="fas fa-book"></i>
                                    <h4 class="font-bold">${subj.name}</h4>
                                    <p class="text-sm opacity-90">${noteCount} topics with notes, ${imageCount} topic images</p>
                                </div>`;
                        }).join('')}
                    </div>
                </div>` : ''}
                <div class="grid grid-cols-1 md:grid-cols-1 gap-6 w-full max-w-md">
                    <button onclick="event.preventDefault(); app.showCandidateOptions()" class="group bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition border text-center">
                        <div class="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
                            <i class="fas fa-user-graduate text-2xl text-blue-600"></i>
                        </div>
                        <h3 class="text-xl font-bold text-gray-800">Candidate</h3>
                        <p class="text-gray-500 mt-2">Take the examination</p>
                    </button>
                </div>
            </div>`;
    },

    // --------------------------------------------------------
    // STUDY MATERIALS
    // --------------------------------------------------------
    showSubjectNotes: function (subjectId) {
        const subj = this.data.subjects[subjectId];
        if (!subj) return;

        const topicsWithMaterials = subj.topics.filter(t =>
            (subj.notes && subj.notes[t.id] && subj.notes[t.id].trim() !== '') ||
            (subj.topicImages && subj.topicImages[t.id] && subj.topicImages[t.id].length > 0)
        );

        if (topicsWithMaterials.length === 0) {
            this.showNotification('No notes or images available for this subject', 'info');
            return;
        }

        this.data.mode = 'notes-browser';
        this.updateHeader();

        document.getElementById('app-container').innerHTML = `
            <div class="max-w-4xl mx-auto h-full flex flex-col">
                <div class="flex items-center gap-2 mb-4">
                    <button onclick="event.preventDefault(); app.showLanding()" class="text-gray-500 hover:text-gray-800">
                        <i class="fas fa-arrow-left text-xl"></i>
                    </button>
                    <h2 class="text-2xl font-bold text-gray-800">${subj.name} - Study Materials</h2>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto pb-4">
                    ${topicsWithMaterials.map(t => {
                        const hasNote   = subj.notes && subj.notes[t.id] && subj.notes[t.id].trim() !== '';
                        const hasImages = subj.topicImages && subj.topicImages[t.id] && subj.topicImages[t.id].length > 0;
                        return `
                            <div class="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                        <i class="fas fa-folder-open text-blue-600"></i>
                                    </div>
                                    <h3 class="font-bold text-lg text-gray-800">${t.name}</h3>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    ${hasNote ? `
                                        <button onclick="event.preventDefault(); app.viewTopicNote('${subjectId}', '${t.id}', '${t.name}')" class="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-bold">
                                            <i class="fas fa-book-open mr-1"></i> Read Notes
                                        </button>` : ''}
                                    ${hasImages ? `
                                        <button onclick="event.preventDefault(); app.viewTopicImages('${subjectId}', '${t.id}')" class="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded text-sm font-bold">
                                            <i class="fas fa-images mr-1"></i> View Images (${subj.topicImages[t.id].length})
                                        </button>` : ''}
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            </div>`;
    },

    viewTopicNote: function (subjectId, topicId, topicName) {
        const subj = this.data.subjects[subjectId];
        if (!subj || !subj.notes || !subj.notes[topicId]) {
            this.showNotification('No notes available for this topic', 'info');
            return;
        }
        document.getElementById('note-viewer-title').textContent = `Notes: ${topicName}`;
        document.getElementById('note-viewer-content').innerHTML = subj.notes[topicId];
        document.getElementById('note-viewer-modal').classList.remove('hidden');
        this.triggerMathJax();
    },

    viewTopicImages: function (subjectId, topicId) {
        const subj = this.data.subjects[subjectId];
        if (!subj || !subj.topicImages || !subj.topicImages[topicId] || subj.topicImages[topicId].length === 0) {
            this.showNotification('No images for this topic', 'info');
            return;
        }
        const images = subj.topicImages[topicId];
        const modal  = document.getElementById('topic-image-modal');
        document.getElementById('topic-image-modal-title').textContent =
            `Images - ${subj.topics.find(t => t.id === topicId)?.name || 'Topic'}`;
        const gallery = document.getElementById('topic-image-gallery');
        gallery.innerHTML = '';
        images.forEach(img => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.onclick = () => {
                const full = document.createElement('div');
                full.className = 'fixed inset-0 bg-black/90 flex items-center justify-center z-[60]';
                full.onclick = () => full.remove();
                const fullImg = document.createElement('img');
                fullImg.src = img.data;
                fullImg.className = 'max-h-[90vh] max-w-[90vw] object-contain';
                full.appendChild(fullImg);
                document.body.appendChild(full);
            };
            const thumb = document.createElement('img');
            thumb.src = img.data;
            thumb.alt = img.filename;
            const filename = document.createElement('div');
            filename.className = 'filename';
            filename.textContent = img.filename;
            item.appendChild(thumb);
            item.appendChild(filename);
            gallery.appendChild(item);
        });
        modal.classList.remove('hidden');
    },

    // --------------------------------------------------------
    // CANDIDATE FLOW (Subject List -> Mode -> Login -> Sub-topics)
    // --------------------------------------------------------
    showCandidateOptions: function () {
        this.data.mode = 'candidate-options';
        this.updateHeader();
        const subjects = Object.values(this.data.subjects);

        if (subjects.length === 0) {
            this.showNotification('No subjects available.', 'error');
            this.showLanding();
            return;
        }

        document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-full py-6 px-4">
                <div class="text-center mb-8">
                    <i class="fas fa-book-open text-6xl text-blue-600 mb-4"></i>
                    <h2 class="text-3xl font-bold text-gray-800 mb-2">Select a Course</h2>
                    <p class="text-gray-600">Choose the Course you want to be examined on</p>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    ${subjects.map(subj => `
                        <button onclick="event.preventDefault(); app.showModeSelection('${subj.id}')" class="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition border text-left flex items-center gap-4">
                            <div class="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center group-hover:bg-blue-200 shrink-0 transition">
                                <i class="fas fa-graduation-cap text-2xl text-blue-600"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-gray-800 line-clamp-2">${subj.name}</h3>
                                <p class="text-sm text-gray-500 mt-1"><i class="fas fa-database text-xs mr-1"></i> ${subj.questions.length} questions available</p>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <button onclick="event.preventDefault(); app.showLanding()" class="mt-8 text-gray-500 hover:text-gray-800 transition">
                    <i class="fas fa-arrow-left mr-1"></i> Back to Home
                </button>
            </div>`;
    },

    showModeSelection: function (subjectId) {
        this.data.currentSubjectId = subjectId;
        const subject = this.data.subjects[subjectId];
        if (!subject) return;

        this.data.mode = 'mode-selection';
        this.updateHeader();

        document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-full py-6 px-4">
                <div class="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md text-center">
                    <div class="flex items-center gap-2 mb-4 text-left">
                        <button onclick="event.preventDefault(); app.showCandidateOptions()" class="text-gray-500 hover:text-gray-700 p-2">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2 class="text-2xl font-bold text-gray-800 flex-grow">Select Exam Mode</h2>
                    </div>

                    <div class="mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <p class="text-xs text-blue-500 uppercase font-bold tracking-wider mb-1">Selected Subject</p>
                        <p class="text-lg font-bold text-blue-900 line-clamp-2">${subject.name}</p>
                    </div>

                    <div class="space-y-4">
                        <button onclick="event.preventDefault(); app.showCandidateLogin('practice', '${subjectId}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3">
                            <i class="fas fa-clock"></i><span>Practice Mode (Timed)</span>
                        </button>
                        <button onclick="event.preventDefault(); app.showCandidateLogin('study', '${subjectId}')" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3">
                            <i class="fas fa-book-open"></i><span>Study Mode (Learn with Explanations)</span>
                        </button>
                    </div>
                    
                    <div class="mt-6 text-sm text-gray-500 text-left space-y-2 bg-gray-50 p-4 rounded-lg">
                        <p><i class="fas fa-info-circle mr-1 text-blue-500"></i> <strong>Practice:</strong> Timed exam, results at the end.</p>
                        <p><i class="fas fa-info-circle mr-1 text-green-500"></i> <strong>Study:</strong> Click your answer to reveal the correct answer & explanation.</p>
                    </div>
                </div>
            </div>`;
    },

    showCandidateLogin: function (mode, subjectId) {
        this.data.examMode = mode;
        this.data.currentSubjectId = subjectId;
        const subject = this.data.subjects[subjectId];

        const customDurationHtml = mode === 'practice' ? `
            <div class="mb-4">
                <label class="block text-gray-700 mb-2 font-medium">
                    <i class="fas fa-hourglass-half mr-1 text-blue-500"></i>
                    Custom Exam Duration (minutes)
                </label>
                <input type="number" id="custom-duration-input" class="w-full border rounded-lg p-3"
                       placeholder="Leave empty to use default (${subject.duration || 30} min)"
                       min="1" max="999" step="1">
                <p class="text-xs text-gray-500 mt-1">Enter any number between 1 and 999 minutes</p>
            </div>` : '';

        document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-full py-6 px-2">
                <div class="bg-white p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-md border-t-4 ${mode === 'practice' ? 'border-blue-600' : 'border-green-600'}">
                    <div class="flex items-center gap-2 mb-4">
                        <button onclick="event.preventDefault(); app.showModeSelection('${subjectId}')" class="text-gray-500 hover:text-gray-700 p-2">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <h2 class="text-2xl font-bold text-center text-gray-800 flex-grow">Candidate Login</h2>
                    </div>
                    
                    <div class="mb-5 text-center">
                        <div class="text-lg font-bold text-gray-800 line-clamp-2">${subject.name}</div>
                        <span class="inline-block mt-2 px-4 py-1 rounded-full text-sm font-bold ${mode === 'practice' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                            <i class="fas ${mode === 'practice' ? 'fa-clock' : 'fa-book-open'} mr-1"></i>
                            ${mode === 'practice' ? 'Practice Mode' : 'Study Mode'}
                        </span>
                    </div>

                    <form id="candidate-login-form">
                        <div class="mb-4">
                            <label class="block text-gray-700 mb-2 font-medium">Full Name</label>
                            <input type="text" id="candidate-name" class="w-full border rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter your name" required>
                        </div>

                        <!-- TOPIC LIST (Dropdown) -->
                        <div class="mb-4">
                            <label class="block text-gray-700 mb-2 font-medium"><i class="fas fa-bookmark mr-1 text-blue-500"></i> Select Topic</label>
                            <select id="exam-topic-select" onchange="app.renderCandidateSubTopics()" class="w-full border rounded-lg p-3">
                                ${subject.topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                            </select>
                        </div>
                        
                        ${customDurationHtml}
                        
                        <!-- SUB-TOPIC LIST (Checkboxes dynamically generated) -->
                        <div id="candidate-topics-container" class="mb-6"></div>
                        
                        <div class="bg-blue-50 p-4 rounded mb-6 text-sm text-blue-800">
                            <p class="font-bold mb-1"><i class="fas fa-info-circle"></i> Instructions:</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li>${mode === 'practice' ? 'You can set a custom time limit above' : 'No time limit - learn at your own pace'}</li>
                                ${mode === 'study' ? '<li class="text-green-700 font-bold">Click on your chosen answer to see correct answer and explanation!</li>' : ''}
                                <li>Don't refresh the browser</li>
                                <li>Reference images and notes are available during exam</li>
                            </ul>
                        </div>
                        <button type="submit" class="w-full ${mode === 'practice' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white font-bold py-3 rounded-lg transition">
                            Start ${mode === 'practice' ? 'Practice' : 'Study'}
                        </button>
                    </form>
                </div>
            </div>`;

        document.getElementById('candidate-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.startTestPrep();
        });
        
        setTimeout(() => this.renderCandidateSubTopics(), 0);
    },

    renderCandidateSubTopics: function () {
        const subj = this.data.subjects[this.data.currentSubjectId];
        const topicSelect = document.getElementById('exam-topic-select');
        if (!subj || !topicSelect) return;
        
        const selectedTopicId = topicSelect.value;
        const container = document.getElementById('candidate-topics-container');
        const topicQuestions = subj.questions.filter(q => q.topicId === selectedTopicId);

        if (topicQuestions.length === 0) {
            container.innerHTML = '<div class="text-sm text-red-500 text-center py-2 bg-red-50 rounded border border-red-200">No questions available for this topic.</div>';
            return;
        }

        // 🌟 NEW LOGIC: Group by actual SubTopic names (e.g., "First Law & Energy")
        const subTopicMap = {};
        topicQuestions.forEach(q => {
            const stName = q.subTopic || 'General';
            if (!subTopicMap[stName]) {
                subTopicMap[stName] = [];
            }
            subTopicMap[stName].push(q.id);
        });

        let topicsHtml = `
            <p class="mb-2 text-sm font-bold text-gray-700"><i class="fas fa-layer-group mr-1"></i> Select Sub-topics & Quantity</p>
            <div class="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto border p-3 rounded bg-gray-50">`;

        // Render a checkbox for each real SubTopic
        let stIndex = 0;
        for (const [stName, qIds] of Object.entries(subTopicMap)) {
            const qCount = qIds.length;
            const uniqueId = `sub_${stIndex++}`;
            
            topicsHtml += `
                <div class="flex flex-col gap-2 p-3 border rounded-lg bg-white hover:border-blue-300 transition shadow-sm">
                    <div class="flex items-center gap-2 flex-wrap">
                        <input type="checkbox" name="exam-topic" value="${uniqueId}" data-qids='${JSON.stringify(qIds)}' class="topic-checkbox rounded text-blue-600 w-5 h-5 cursor-pointer">
                        <span class="text-sm font-bold text-gray-800 flex-grow cursor-pointer" onclick="this.previousElementSibling.click()">${stName}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm ml-7">
                        <span class="text-gray-500 text-xs"><i class="fas fa-database"></i> Available: <strong class="text-gray-700">${qCount}</strong></span>
                        <div class="flex items-center gap-2 ml-auto">
                            <label class="text-gray-600 text-xs">Take:</label>
                            <input type="number" class="topic-quantity w-16 border rounded px-2 py-1 text-center text-sm font-bold focus:border-blue-500"
                                   data-sub-topic-id="${uniqueId}" min="0" max="${qCount}"
                                   value="${qCount}" step="1">
                        </div>
                    </div>
                </div>`;
        }
        topicsHtml += `</div>`;
        container.innerHTML = topicsHtml;

        // Setup checkbox/quantity logic
        document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
            const uniqueId = checkbox.value;
            const qtyInput = document.querySelector(`.topic-quantity[data-sub-topic-id="${uniqueId}"]`);
            if (!qtyInput) return;
            
            const updateQtyState = () => {
                if (checkbox.checked) {
                    qtyInput.disabled = false;
                    let currentVal = parseInt(qtyInput.value);
                    const maxVal = parseInt(qtyInput.max);
                    if (isNaN(currentVal) || currentVal < 1) qtyInput.value = 1;
                    if (currentVal > maxVal) qtyInput.value = maxVal;
                } else {
                    qtyInput.disabled = true;
                    qtyInput.value = 0;
                }
            };
            
            checkbox.addEventListener('change', updateQtyState);
            qtyInput.addEventListener('input', function () {
                let val = parseInt(this.value);
                const maxVal = parseInt(this.max);
                if (isNaN(val)) val = 1;
                if (val < 0) val = 0;
                if (val > maxVal) val = maxVal;
                this.value = val;
                if (val === 0 && checkbox.checked) {
                    checkbox.checked = false;
                    this.disabled = true;
                } else if (val > 0 && !checkbox.checked) {
                    checkbox.checked = true;
                    this.disabled = false;
                }
            });
            updateQtyState();
        });
    },

    startTestPrep: function () {
        const nameInput = document.getElementById('candidate-name');
        if (nameInput) this.data.candidateName = nameInput.value;
        
        const subjectId = this.data.currentSubjectId;
        if (!subjectId) { this.showNotification('No subject selected.', 'error'); return; }
        const subject = this.data.subjects[subjectId];

        let customDurationMinutes = null;
        if (this.data.examMode === 'practice') {
            const customDurationInput = document.getElementById('custom-duration-input');
            if (customDurationInput && customDurationInput.value) {
                const parsed = parseInt(customDurationInput.value, 10);
                if (!isNaN(parsed) && parsed > 0 && parsed <= 999) {
                    customDurationMinutes = parsed;
                }
            }
        }

        let questionsToUse = [];
        let hasSelection = false;
        
        // Read the checked Sub-topics
        document.querySelectorAll('input[name="exam-topic"]:checked').forEach(cb => {
            hasSelection = true;
            const qIds = JSON.parse(cb.dataset.qids);
            const subTopicId = cb.value;
            const qtyInput = document.querySelector(`.topic-quantity[data-sub-topic-id="${subTopicId}"]`);
            let qty = qtyInput ? parseInt(qtyInput.value) : 0;
            if (isNaN(qty) || qty < 0) qty = 0;
            
            // Get questions for this sub-topic, shuffle, and slice
            const subTopicQuestions = subject.questions.filter(q => qIds.includes(q.id));
            const shuffled = [...subTopicQuestions];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            questionsToUse.push(...shuffled.slice(0, qty));
        });

        // If they didn't check any sub-topics, default to the whole subject
        if (!hasSelection) {
            questionsToUse = [...subject.questions];
        }

        if (questionsToUse.length === 0) {
            this.showNotification("No questions available. Please select at least one sub-topic.", "error");
            return;
        }

        // Shuffle the final combined array
        for (let i = questionsToUse.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [questionsToUse[i], questionsToUse[j]] = [questionsToUse[j], questionsToUse[i]];
        }

        this.data.questions = questionsToUse;
        this.data.examDuration = (this.data.examMode === 'practice')
            ? (customDurationMinutes !== null ? customDurationMinutes : subject.duration)
            : this.data.examDuration;

        this.data.currentQuestionIndex = 0;
        this.data.userAnswers = {};
        this.data.answerRevealed = {};
        this.clearExamState();
        this.data.endTime = null;

        if (this.data.examMode === 'practice') {
            this.data.timeLeft = this.data.examDuration * 60;
            this.startTimer();
        } else {
            this.data.timeLeft = 0;
        }

        this.data.refreshLocked = true;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        this.showTestInterface();
    },

    // --------------------------------------------------------
    // IMAGE MODAL + HEADER + MATHJAX
    // --------------------------------------------------------
    showImageModal: function () {
        const subjectId = this.data.currentSubjectId;
        const images = this.data.images[subjectId] || [];
        if (images.length > 0) {
            imageViewer.open(images, `Reference Images - ${this.data.subjects[subjectId]?.name || 'Subject'}`);
        } else {
            const modal = document.getElementById('image-modal');
            document.getElementById('image-viewer-container').classList.add('hidden');
            document.getElementById('no-images-message').classList.remove('hidden');
            modal.classList.remove('hidden');
        }
    },

    updateHeader: function () {
        const headerActions = document.getElementById('header-actions');

        if (this.data.mode === 'test') {
            const subjName  = this.data.subjects[this.data.currentSubjectId]?.name || '';
            const hasImages = this.data.images?.[this.data.currentSubjectId]?.length > 0;

            headerActions.innerHTML = `
                <div class="flex items-center gap-2">
                    ${hasImages ? `
                        <button onclick="event.preventDefault(); app.showImageModal()" class="text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded flex items-center gap-2">
                            <i class="fas fa-image"></i>
                            <span class="hidden sm:inline">Images</span>
                        </button>` : ''}
                    <div class="hidden md:block text-right">
                        <div class="text-xs text-green-200 uppercase font-bold">${subjName}</div>
                        <div class="font-bold">${this.data.candidateName}</div>
                    </div>
                    ${this.data.examMode === 'practice'
                        ? `<div class="bg-white text-green-800 px-4 py-1 rounded font-mono font-bold text-lg shadow" id="timer-display">00:00</div>`
                        : `<div class="bg-white text-green-800 px-4 py-1 rounded font-mono font-bold text-lg shadow"><i class="fas fa-book-open text-sm mr-1"></i>Study</div>`}
                    <button onclick="event.preventDefault(); app.toggleMobileGrid()" class="md:hidden bg-green-800 hover:bg-green-900 text-white px-3 py-1 rounded">
                        <i class="fas fa-th"></i>
                    </button>
                </div>`;

            if (this.data.examMode === 'practice') this.updateTimerDisplay();
        } else {
            headerActions.innerHTML = `
                <button onclick="event.preventDefault(); app.showLanding()" class="text-sm bg-green-800 hover:bg-green-900 px-3 py-1 rounded flex items-center gap-2">
                    <i class="fas fa-home"></i>
                    <span class="hidden sm:inline">Home</span>
                </button>`;
        }
    },

    setupMathJaxPatch: function () {
        const methods = ['renderQuestion', 'showResult', 'showFullReview', 'viewTopicNote',
                         'showSubjectDashboard', 'showLanding', 'showTestInterface'];
        methods.forEach(methodName => {
            if (this[methodName]) {
                const original = this[methodName];
                this[methodName] = function () {
                    const result = original.apply(this, arguments);
                    setTimeout(() => this.triggerMathJax(), 200);
                    return result;
                };
            }
        });
    },

    triggerMathJax: function () {
        if (window.MathJax && MathJax.typesetPromise) {
            const container = document.getElementById('app-container');
            if (container) {
                MathJax.typesetPromise([container]).catch(err => {
                    console.warn('MathJax typeset error:', err);
                });
            }
        }
    }
};
