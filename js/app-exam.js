// ============================================================
// APP EXAM
// Timer, test interface, renderQuestion, answer handling.
// ============================================================

Object.assign(window.app, {
    startTimer: function () {
        if (this.data.timer) clearInterval(this.data.timer);
        if (!this.data.endTime) this.data.endTime = Date.now() + this.data.timeLeft * 1000;
        this.data.timer = setInterval(() => {
            const remaining = Math.max(0, Math.round((this.data.endTime - Date.now()) / 1000));
            if (remaining === this.data.timeLeft) return;
            this.data.timeLeft = remaining;
            this.updateTimerDisplay();
            this.saveExamState();
            if (remaining <= 0) { clearInterval(this.data.timer); this.data.timer = null; this.submitTest(); }
        }, 250);
    },
    stopTimer: function () { if (this.data.timer) clearInterval(this.data.timer); this.data.timer = null; this.data.endTime = null; },
    updateTimerDisplay: function () {
        const el = document.getElementById('timer-display');
        if (el) {
            const m = Math.floor(this.data.timeLeft / 60), s = this.data.timeLeft % 60;
            el.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            if (this.data.timeLeft < 60) el.classList.add('text-red-500', 'animate-pulse');
        }
    },
    showTestInterface: function () { this.data.mode = 'test'; this.updateHeader(); this.renderQuestion(); },
    toggleMobileGrid: function () {
        const modal = document.getElementById('mobile-grid-modal');
        let html = '<div class="flex flex-wrap gap-2 justify-center">';
        this.data.questions.forEach((_q, idx) => {
            const isAnswered = this.data.userAnswers[_q.id] !== undefined && this.data.userAnswers[_q.id] !== '';
            const isActive = idx === this.data.currentQuestionIndex;
            let cls = "w-10 h-10 flex items-center justify-center text-sm font-bold rounded border cursor-pointer ";
            if (isActive) cls += "bg-blue-600 text-white border-blue-600";
            else if (isAnswered) cls += "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
            else cls += "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200";
            html += `<div onclick="event.preventDefault(); app.jumpToQuestion(${idx}); document.getElementById('mobile-grid-modal').classList.add('hidden')" class="${cls}">${idx + 1}</div>`;
        });
        html += '</div>';
        document.getElementById('mobile-grid-container').innerHTML = html;
        modal.classList.remove('hidden');
    },

    renderQuestion: function () {
        const q = this.data.questions[this.data.currentQuestionIndex];
        const total = this.data.questions.length;
        const userAnswer = this.data.userAnswers[q.id];
        const isStudyMode = this.data.examMode === 'study';

        let isCorrect = false, showExplanation = false;
        if (isStudyMode && this.data.answerRevealed[q.id]) {
            if (typeof this.data.answerRevealed[q.id] === 'object') isCorrect = this.data.answerRevealed[q.id].isCorrect;
            else isCorrect = this.checkAnswer(q.id, userAnswer);
            showExplanation = true;
        }

        let gridHtml = '';
        this.data.questions.forEach((_q, idx) => {
            const isAnswered = this.data.userAnswers[_q.id] !== undefined && this.data.userAnswers[_q.id] !== '';
            const isActive = idx === this.data.currentQuestionIndex;
            let cls = "w-8 h-8 flex items-center justify-center text-xs font-bold rounded border cursor-pointer ";
            if (isActive) cls += "bg-blue-600 text-white border-blue-600";
            else if (isAnswered) cls += "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
            else cls += "bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200";
            gridHtml += `<div onclick="event.preventDefault(); app.jumpToQuestion(${idx})" class="${cls}">${idx + 1}</div>`;
        });

        const subject = this.data.subjects[this.data.currentSubjectId];
        const hasTopicNotes = subject && subject.notes && subject.notes[q.topicId] && subject.notes[q.topicId].trim() !== '';
        const hasTopicImages = subject && subject.topicImages && subject.topicImages[q.topicId] && subject.topicImages[q.topicId].length > 0;

        let answerArea = '';
        if (q.type === 'theory') {
            const alreadyGraded = this.data.answerRevealed[q.id];
            let theoryFeedback = '';
            if (alreadyGraded && typeof alreadyGraded === 'object' && alreadyGraded.score !== undefined) {
                theoryFeedback = `
                    <div class="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                        <p class="font-bold text-green-800">Marks Awarded: ${alreadyGraded.score} / ${q.maxMarks}</p>
                        <div class="mt-3 pt-3 border-t border-green-200">
                            <p class="text-xs text-green-600 font-bold mb-1">Your Submitted Answer:</p>
                            ${(userAnswer && String(userAnswer).startsWith('data:image')) 
                                ? `<img src="${userAnswer}" class="max-h-60 rounded border mb-3 object-contain shadow-sm" alt="Uploaded Answer">`
                                : `<p class="text-sm text-gray-700 bg-white p-2 rounded mb-3 whitespace-pre-wrap break-words">${userAnswer || 'No text provided.'}</p>`
                            }
                        </div>
                        <div class="p-3 bg-white rounded border border-green-200">
                            <p class="text-xs text-green-600 font-bold mb-1">Explanation / Model Answer:</p>
                            <p class="text-sm text-gray-800 whitespace-pre-wrap break-words">${alreadyGraded.explanation}</p>
                        </div>
                    </div>`;
            }

            answerArea = `
                <div class="max-w-2xl">
                    <div class="flex gap-2 mb-4" id="theory-tabs-${q.id}">
                        <button type="button" onclick="app.toggleTheoryTab('${q.id}', 'text')" class="flex-1 py-2 rounded-lg font-bold border-2 ${(!userAnswer || !String(userAnswer).startsWith('data:image')) && !alreadyGraded ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}" id="tab-text-${q.id}"><i class="fas fa-keyboard mr-1"></i> Type Answer</button>
                        <button type="button" onclick="app.toggleTheoryTab('${q.id}', 'image')" class="flex-1 py-2 rounded-lg font-bold border-2 ${(userAnswer && String(userAnswer).startsWith('data:image')) || alreadyGraded ? 'bg-green-50 border-green-500 text-green-700' : 'bg-gray-50 border-gray-300 text-gray-500'}" id="tab-image-${q.id}"><i class="fas fa-camera mr-1"></i> Upload Photo</button>
                    </div>
                    <div id="theory-text-container-${q.id}" class="${(userAnswer && String(userAnswer).startsWith('data:image')) || alreadyGraded ? 'hidden' : ''}">
                        <textarea id="theory-text-input-${q.id}" rows="5" class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 text-lg" placeholder="Type your theory answer here..." ${alreadyGraded ? 'disabled' : ''}>${(!userAnswer || !String(userAnswer).startsWith('data:image')) ? (userAnswer || '') : ''}</textarea>
                        <button onclick="app.submitTheoryText('${q.id}')" id="submit-text-btn-${q.id}" class="mt-2 w-full ${this.data.examMode === 'practice' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-3 rounded-lg font-bold transition"><i class="fas ${this.data.examMode === 'practice' ? 'fa-save' : 'fa-magic'} mr-2"></i>${this.data.examMode === 'practice' ? 'Save Answer' : 'Submit for AI Grading'}</button>
                    </div>
                    <div id="theory-image-container-${q.id}" class="${(userAnswer && String(userAnswer).startsWith('data:image')) || alreadyGraded ? '' : 'hidden'}">
                           <input type="file" id="theory-image-input-${q.id}" accept="image/*" capture="environment" class="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 mb-2" ${alreadyGraded ? 'disabled' : ''}>
                            <div id="image-preview-container-${q.id}" class="mt-2 ${(userAnswer && String(userAnswer).startsWith('data:image')) ? '' : 'hidden'}">
                            <img id="theory-image-preview-${q.id}" src="${(userAnswer && String(userAnswer).startsWith('data:image')) ? userAnswer : ''}" class="max-h-60 rounded-lg border shadow-md mb-2 w-full object-contain" />
                            <button onclick="app.submitTheoryImage('${q.id}')" id="submit-image-btn-${q.id}" class="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold transition"><i class="fas fa-magic mr-2"></i>${this.data.examMode === 'practice' ? 'Save Image' : 'Submit for AI Grading'}</button>
                        </div>
                    </div>
                    ${theoryFeedback}
                </div>`;

            setTimeout(() => {
                const input = document.getElementById(`theory-image-input-${q.id}`);
                if (input) {
                    input.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                document.getElementById(`theory-image-preview-${q.id}`).src = event.target.result;
                                document.getElementById(`image-preview-container-${q.id}`).classList.remove('hidden');
                                const btn = document.getElementById(`submit-image-btn-${q.id}`);
                                if (btn) btn.innerHTML = `<i class="fas fa-magic mr-2"></i>${app.data.examMode === 'practice' ? 'Save Image' : 'Submit for AI Grading'}`;
                            };
                            reader.readAsDataURL(file);
                        }
                    });
                }
            }, 100);
        } else if (q.type === 'objective') {
            if (isStudyMode) {
                if (showExplanation) {
                    answerArea = `<div class="space-y-3 max-w-2xl">${['A', 'B', 'C', 'D'].map(opt => {
                        let optionClass = "block p-4 border-2 rounded-lg flex items-center gap-3 relative";
                        let isSelected = userAnswer === opt, isCorrectOpt = q.correct === opt;
                        if (isCorrectOpt) optionClass += " correct-option-highlight";
                        else if (isSelected) optionClass += " wrong-answer-selected";
                        else optionClass += " border-gray-200 bg-gray-50";
                        let badge = isCorrectOpt ? '<span class="correct-badge"><i class="fas fa-check-circle mr-1"></i>Correct Answer</span>' : '';
                        return `<div class="${optionClass}"><span class="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-sm border ${isCorrectOpt ? 'border-white' : 'border-gray-300'}">${opt}</span><span class="flex-grow whitespace-pre-wrap break-words min-w-0">${q.options?.[opt] || ''}</span>${badge}</div>`;
                    }).join('')}</div>`;
                } else {
                    answerArea = `<div class="space-y-3 max-w-2xl"><p class="text-sm text-gray-500 mb-2"><i class="fas fa-hand-pointer mr-1"></i> Click on your answer to reveal correct answer and explanation:</p>${['A', 'B', 'C', 'D'].map(opt => {
                        let isSelected = userAnswer === opt;
                        let selectedClass = isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50';
                        return `<div onclick="event.preventDefault(); app.handleStudyAnswerClick('${q.id}', '${opt}')" class="block p-4 border-2 rounded-lg flex items-center gap-3 relative cursor-pointer study-option ${selectedClass}"><span class="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-sm border border-gray-300">${opt}</span><span class="flex-grow whitespace-pre-wrap break-words min-w-0">${q.options?.[opt] || ''}</span>${isSelected ? '<span class="text-blue-600 text-xs font-bold ml-2"><i class="fas fa-check-circle"></i> Selected</span>' : ''}</div>`;
                    }).join('')}</div>`;
                }
            } else {
                answerArea = `<div class="space-y-3 max-w-2xl">${['A', 'B', 'C', 'D'].map(opt => `<div class="relative"><input type="radio" name="option" id="opt-${opt}" class="cbt-radio hidden" value="${opt}" ${userAnswer === opt ? 'checked' : ''} onchange="app.selectAnswer('${q.id}', '${opt}')"><label for="opt-${opt}" class="block p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 flex items-center gap-3"><span class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm">${opt}</span><span class="text-gray-700 whitespace-pre-wrap break-words">${q.options?.[opt] || ''}</span></label></div>`).join('')}</div>`;
            }
        } else {
            if (isStudyMode) {
                const answerRevealed = this.data.answerRevealed[q.id];
                let fillAnswerDisplay = '';
                if (answerRevealed) {
                    if (isCorrect) fillAnswerDisplay = `<div class="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg"><p class="font-bold text-green-800"><i class="fas fa-check-circle mr-2"></i>Correct! Your answer: "${userAnswer}"</p><p class="mt-2 text-sm text-green-700">✓ The correct answer is "${q.correct}"</p></div>`;
                    else fillAnswerDisplay = `<div class="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg"><p class="font-bold text-red-800"><i class="fas fa-times-circle mr-2"></i>Incorrect. Your answer: "${userAnswer}"</p><p class="mt-3 fill-correct-highlight" onclick="event.preventDefault(); app.showNotification('✓ Correct answer is: ${q.correct}', 'success')">✓ Click to see correct answer: "${q.correct}"</p></div>`;
                }
                answerArea = `<div class="max-w-2xl"><label class="block text-gray-600 mb-2 font-bold">Your Answer:</label><div class="flex gap-2"><input type="text" id="fill-answer-${q.id}" class="flex-grow p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 text-lg" value="${userAnswer || ''}" placeholder="Type your answer..." ${answerRevealed ? 'disabled' : ''}>${!answerRevealed ? `<button onclick="event.preventDefault(); app.handleStudyAnswerClick('${q.id}', null, true)" class="insert-answer-btn bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold"><i class="fas fa-check mr-2"></i>Check Answer</button>` : `<button class="bg-gray-400 text-white px-6 py-4 rounded-lg font-bold cursor-not-allowed" disabled><i class="fas fa-check-circle mr-2"></i>Answered</button>`}</div>${fillAnswerDisplay}${!answerRevealed ? '<p class="text-sm text-gray-500 mt-2"><i class="fas fa-info-circle mr-1"></i>Click the button to check your answer</p>' : ''}</div>`;
            } else {
                answerArea = `<div class="max-w-2xl"><label class="block text-gray-600 mb-2 font-bold">Your Answer:</label><input type="text" class="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 text-lg" value="${userAnswer || ''}" oninput="app.selectAnswer('${q.id}', this.value)" placeholder="Type your answer..."></div>`;
            }
        }

        let explanationArea = '';
        if (isStudyMode && showExplanation) {
            if (q.explanation) {
                explanationArea = `<div class="mt-6 explanation-box"><div class="flex items-center gap-2 mb-2"><i class="fas ${isCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} text-xl"></i><span class="font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}">${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</span></div><div class="bg-white p-4 rounded-lg border-l-4 border-blue-500"><p class="font-bold text-gray-700 mb-2">📚 Explanation:</p><p class="text-gray-700 whitespace-pre-wrap break-words">${q.explanation}</p></div>${!isCorrect && q.type === 'objective' ? `<div class="mt-3 p-3 bg-green-50 rounded-lg"><p class="font-bold text-green-800">Correct answer: ${q.correct}: ${q.options?.[q.correct] || ''}</p></div>` : ''}</div>`;
            } else {
                explanationArea = `<div class="mt-6 explanation-box"><div class="flex items-center gap-2 mb-2"><i class="fas ${isCorrect ? 'fa-check-circle text-green-600' : 'fa-times-circle text-red-600'} text-xl"></i><span class="font-bold text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'}">${isCorrect ? '✓ Correct!' : '✗ Incorrect'}</span></div><div class="bg-white p-4 rounded-lg"><p class="font-bold text-gray-700 mb-2">Correct answer:</p><p class="text-green-700 font-bold text-lg">${q.correct}</p>${q.type === 'objective' && q.options?.[q.correct] ? `<p class="text-gray-600 mt-1 whitespace-pre-wrap break-words">${q.options[q.correct]}</p>` : ''}</div></div>`;
            }
        }

        const hasImages = this.data.images?.[this.data.currentSubjectId]?.length > 0;
        const imageButtonHtml = hasImages ? `<div class="mb-4"><button onclick="event.preventDefault(); app.showImageModal()" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><i class="fas fa-image"></i><span>View Reference Images</span></button></div>` : '';
        const notesButtonHtml = hasTopicNotes ? `<div class="mb-4"><button onclick="event.preventDefault(); app.viewTopicNote('${this.data.currentSubjectId}', '${q.topicId}', '${subject.topics.find(t => t.id === q.topicId)?.name || 'Topic'}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><i class="fas fa-book-open"></i><span>View Topic Notes</span></button></div>` : '';
        const topicImagesButtonHtml = hasTopicImages ? `<div class="mb-4"><button onclick="event.preventDefault(); app.viewTopicImages('${this.data.currentSubjectId}', '${q.topicId}')" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><i class="fas fa-images"></i><span>View Topic Images (${subject.topicImages[q.topicId].length})</span></button></div>` : '';
        const isLastQuestion = this.data.currentQuestionIndex === total - 1;

        document.getElementById('app-container').innerHTML = `
            <div class="flex flex-col md:flex-row h-full w-full gap-4">
                <div class="flex-grow flex flex-col bg-white rounded-lg shadow-md overflow-hidden min-w-0 w-full">
                    <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <span class="font-bold text-gray-700">Question ${this.data.currentQuestionIndex + 1} of ${total}</span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs uppercase font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">${q.type === 'objective' ? 'MCQ' : (q.type === 'theory' ? 'Theory' : 'Fill in Gap')}</span>
                            <span class="text-xs px-2 py-1 rounded ${this.data.examMode === 'practice' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}"><i class="fas ${this.data.examMode === 'practice' ? 'fa-clock' : 'fa-book-open'} mr-1"></i>${this.data.examMode}</span>
                        </div>
                    </div>
                    <div class="p-6 flex-grow overflow-y-auto">
                        <div class="flex gap-2 mb-4 flex-wrap">${imageButtonHtml}${notesButtonHtml}${topicImagesButtonHtml}</div>
                        
                        <div class="text-xl text-gray-800 font-medium mb-8 leading-relaxed whitespace-pre-wrap break-words">${q.text}</div>
                        ${answerArea}
                        ${explanationArea}
                    </div>
                    <div class="p-4 border-t bg-gray-50">
                        <div class="nav-buttons">
                            <button onclick="event.preventDefault(); app.prevQuestion()" ${this.data.currentQuestionIndex === 0 ? 'disabled class="opacity-50 cursor-not-allowed px-6 py-2 bg-gray-300 text-gray-600 rounded font-bold"' : 'class="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold"'}>Previous</button>
                            ${isLastQuestion ? `<button onclick="event.preventDefault(); app.submitTestConfirm()" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold">Submit</button>` : `<button onclick="event.preventDefault(); app.nextQuestion()" class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold">Next</button>`}
                        </div>
                    </div>
                </div>
                <div class="w-64 bg-white rounded-lg shadow-md flex-col hidden md:flex">
                    <div class="p-4 border-b bg-gray-50 font-bold text-center text-gray-700">Navigator</div>
                    <div class="p-4 flex-grow overflow-y-auto"><div class="flex flex-wrap gap-2 question-grid justify-center">${gridHtml}</div></div>
                    <div class="p-4 border-t bg-gray-50 text-xs text-center text-gray-500">
                        <div class="flex items-center justify-center gap-2 mb-1"><span class="w-3 h-3 bg-blue-600 rounded"></span>Current<span class="w-3 h-3 bg-green-100 border border-green-300 rounded"></span>Answered</div>
                        ${hasImages ? `<button onclick="event.preventDefault(); app.showImageModal()" class="mt-2 bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded text-xs font-bold w-full"><i class="fas fa-image mr-1"></i>View Images</button>` : ''}
                        ${hasTopicNotes ? `<button onclick="event.preventDefault(); app.viewTopicNote('${this.data.currentSubjectId}', '${q.topicId}', '${subject.topics.find(t => t.id === q.topicId)?.name || 'Topic'}')" class="mt-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-xs font-bold w-full"><i class="fas fa-book-open mr-1"></i>View Notes</button>` : ''}
                    </div>
                </div>
            </div>`;
        this.triggerMathJax();
    },

    checkAnswer: function (qId, selectedValue) {
        const q = this.data.questions.find(q => String(q.id) === String(qId));
        if (!q) return false;
        if (q.type === 'objective') return selectedValue && selectedValue.toUpperCase() === q.correct.toUpperCase();
        return selectedValue && selectedValue.toLowerCase().trim() === q.correct.toLowerCase().trim();
    },

    handleStudyAnswerClick: async function (qId, selectedValue, isFill = false) {
        if (isFill) { const input = document.getElementById(`fill-answer-${qId}`); if (input) selectedValue = input.value; }
        if (selectedValue === undefined || selectedValue === '') return;
        const q = this.data.questions.find(q => String(q.id) === String(qId)); if (!q) return;
        this.data.userAnswers[String(q.id)] = selectedValue;
        if (q.type === 'fill') {
            const isCorrect = selectedValue.toLowerCase().trim() === q.correct.toLowerCase().trim();
            this.data.answerRevealed[String(q.id)] = { isCorrect: isCorrect, score: isCorrect ? 100 : 0, explanation: q.explanation };
            this.saveExamState(); this.renderQuestion();
        } else {
            const isCorrect = selectedValue.toUpperCase() === q.correct.toUpperCase();
            this.data.answerRevealed[String(q.id)] = { isCorrect: isCorrect, score: isCorrect ? 100 : 0, explanation: q.explanation };
            this.saveExamState(); this.renderQuestion();
        }
    },

    selectAnswer: function (qId, value) { this.data.userAnswers[qId] = value; this.saveExamState(); },
    toggleTheoryTab: function (qId, tabName) {
        const textTabBtn = document.getElementById(`tab-text-${qId}`), imgTabBtn = document.getElementById(`tab-image-${qId}`);
        const textContainer = document.getElementById(`theory-text-container-${qId}`), imgContainer = document.getElementById(`theory-image-container-${qId}`);
        if (tabName === 'text') {
            textTabBtn.className = "flex-1 py-2 rounded-lg font-bold border-2 bg-green-50 border-green-500 text-green-700";
            imgTabBtn.className = "flex-1 py-2 rounded-lg font-bold border-2 bg-gray-50 border-gray-300 text-gray-500";
            textContainer.classList.remove('hidden'); imgContainer.classList.add('hidden');
        } else {
            imgTabBtn.className = "flex-1 py-2 rounded-lg font-bold border-2 bg-green-50 border-green-500 text-green-700";
            textTabBtn.className = "flex-1 py-2 rounded-lg font-bold border-2 bg-gray-50 border-gray-300 text-gray-500";
            imgContainer.classList.remove('hidden'); textContainer.classList.add('hidden');
        }
    },
    nextQuestion: function () { if (this.data.currentQuestionIndex < this.data.questions.length - 1) { this.data.currentQuestionIndex++; this.saveExamState(); this.renderQuestion(); } },
    prevQuestion: function () { if (this.data.currentQuestionIndex > 0) { this.data.currentQuestionIndex--; this.saveExamState(); this.renderQuestion(); } },
    jumpToQuestion: function (index) { this.data.currentQuestionIndex = index; this.saveExamState(); this.renderQuestion(); },
    submitTestConfirm: async function () {
        const submitBtn = event.target;
        if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting...'; submitBtn.disabled = true; }
        if (confirm("Submit? You cannot return once submitted.")) { this.submitTest(); }
        else { if (submitBtn) { submitBtn.innerHTML = 'Submit'; submitBtn.disabled = false; } }
    }
});
