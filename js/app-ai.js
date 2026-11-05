// ============================================================
// APP AI
// ============================================================

Object.assign(window.app, {
    submitTheoryText: async function (qId) {
        const textarea = document.getElementById(`theory-text-input-${qId}`);
        const answerText = textarea.value.trim();
        if (!answerText) { this.showNotification("Please type an answer before saving.", "warning"); return; }

        const q = this.data.questions.find(q => String(q.id) === String(qId)); if (!q) return;
        this.data.userAnswers[String(q.id)] = answerText;

        if (this.data.examMode === 'practice') {
            this.saveExamState(); this.showNotification("Answer saved. You can edit and save again.", "success");
            const btn = document.getElementById(`submit-text-btn-${qId}`);
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Answer Saved!';
            setTimeout(() => { btn.innerHTML = `<i class="fas fa-save mr-2"></i>Save Answer`; }, 2000);
            return;
        }

        const btn = document.getElementById(`submit-text-btn-${qId}`);
        btn.innerHTML = '<i class="fas fa-brain fa-spin mr-2"></i>AI is grading...'; btn.disabled = true;
        this.showNotification("AI is analyzing your answer...", "info");

        try {
            const response = await fetch('/api/ai-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentAnswer: answerText,
                    referenceAnswer: q.explanation || q.correct || "General knowledge",
                    maxMarks: q.maxMarks || 10
                })
            });

            const result = await response.json();
            if (!response.ok || result.score === undefined) throw new Error(result.error || "AI failed to return a score.");

            this.data.answerRevealed[String(q.id)] = {
                isCorrect: result.score >= ((q.maxMarks || 10) * 0.4),
                score: result.score,
                explanation: `Model Answer:\n\n"${q.explanation}"\n\nAI Feedback: ${result.reason}`
            };

            this.saveExamState(); this.renderQuestion();
            this.showNotification(`Graded: ${result.score}/${q.maxMarks}`, 'success');

        } catch (error) {
            console.error(error); this.showNotification("AI Error: " + error.message, "error");
            btn.innerHTML = '<i class="fas fa-magic mr-2"></i>Submit for AI Grading'; btn.disabled = false;
        }
    },

    submitTheoryImage: async function (qId) {
        const fileInput = document.getElementById(`theory-image-input-${qId}`);
        const file = fileInput.files[0];
        if (!file) return;
        const q = this.data.questions.find(q => String(q.id) === String(qId)); if (!q) return;

        const requestTimestamp = Date.now();
        this._lastImageRequest = this._lastImageRequest || {};
        this._lastImageRequest[qId] = requestTimestamp;

        const btn = document.getElementById(`submit-image-btn-${qId}`);
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing Image...'; btn.disabled = true;

        let imageBase64 = null;
        try {
            const compressedFile = await compressImage(file, 1000, 1000, 0.7);
            if (this._lastImageRequest[qId] !== requestTimestamp) return;
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(compressedFile);
            });
            if (this._lastImageRequest[qId] !== requestTimestamp) return;
        } catch (err) {
            this.showNotification("Error processing image file.", "error");
            btn.innerHTML = `<i class="fas fa-magic mr-2"></i>${this.data.examMode === 'practice' ? 'Save Image' : 'Submit for AI Grading'}`; btn.disabled = false; return;
        }

        if (this.data.examMode === 'practice') {
            this.data.userAnswers[String(q.id)] = imageBase64;
            this.saveExamState();
            this.showNotification("Image saved. You can change it and save again.", "success");
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Image Saved!'; btn.disabled = false;
            setTimeout(() => {
                const currentBtn = document.getElementById(`submit-image-btn-${qId}`);
                if (currentBtn && this._lastImageRequest[qId] === requestTimestamp) currentBtn.innerHTML = `<i class="fas fa-save mr-2"></i>Save Image`;
            }, 2000);
            return;
        }

        this.showNotification("AI is reading the handwriting from your image...", "info");
        try {
            const response = await fetch('/api/ai-brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageBase64: imageBase64,
                    referenceAnswer: q.explanation || q.correct || "General knowledge",
                    maxMarks: q.maxMarks || 10,
                    isImage: true
                })
            });

            const textResponse = await response.text();
            let result;
            try { result = JSON.parse(textResponse); } catch (e) { throw new Error("Server error. The image might still be too large, or the AI is down."); }
            if (!response.ok || result.score === undefined) throw new Error(result.error || "AI failed to grade.");

            this.data.userAnswers[String(q.id)] = imageBase64;
            this.data.answerRevealed[String(q.id)] = {
                isCorrect: result.score >= ((q.maxMarks || 10) * 0.4),
                score: result.score,
                explanation: `Model Answer:\n\n"${q.explanation}"\n\nAI Feedback: ${result.reason}\n\nAI Transcription: "${result.transcription || 'N/A'}"`
            };

            this.saveExamState(); this.renderQuestion();
            this.showNotification(`Graded: ${result.score}/${q.maxMarks}`, 'success');
        } catch (error) {
            console.error(error); this.showNotification("Error: " + error.message, "error");
            btn.innerHTML = '<i class="fas fa-magic mr-2"></i>Submit for AI Grading'; btn.disabled = false;
        }
    },

    submitTest: async function () {
        this.stopTimer(); this.clearExamState();

        const ungradedTheory = this.data.questions.filter(q => q.type === 'theory' && !this.data.answerRevealed[String(q.id)] && (this.data.userAnswers[String(q.id)] || this.data.userAnswers[q.id]));
        if (ungradedTheory.length > 0) {
            this.showNotification("Grading theory answers...", "info");
            for (const q of ungradedTheory) {
                const userAns = this.data.userAnswers[String(q.id)] || this.data.userAnswers[q.id] || "";
                const isImage = String(userAns).startsWith('data:image');
                try {
                    const bodyPayload = {
                        referenceAnswer: q.explanation || q.correct || "General knowledge",
                        maxMarks: q.maxMarks || 10
                    };
                    if (isImage) { bodyPayload.imageBase64 = userAns; bodyPayload.isImage = true; }
                    else { bodyPayload.studentAnswer = userAns; }

                    const response = await fetch('/api/ai-brain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) });
                    const result = await response.json();
                    if (!response.ok || result.score === undefined || result.error) throw new Error(result.error || "AI failed to return a score.");

                    this.data.answerRevealed[String(q.id)] = {
                        isCorrect: result.score >= ((q.maxMarks || 10) * 0.4),
                        score: result.score,
                        explanation: `Model Answer:\n\n"${q.explanation}"\n\nAI Feedback: ${result.reason}`
                    };
                } catch (err) {
                    console.error("Failed to grade theory:", err);
                    this.data.answerRevealed[String(q.id)] = { isCorrect: false, score: 0, explanation: "Could not grade this answer automatically. Error: " + err.message };
                }
            }
        }

        let score = 0; const details = [];
        this.data.questions.forEach(q => {
            const userAns = this.data.userAnswers[String(q.id)] || this.data.userAnswers[q.id];
            let isCorrect = false;
            const revealed = this.data.answerRevealed[String(q.id)] || this.data.answerRevealed[q.id];
            const maxMarks = q.maxMarks || 10;

            if (q.type === 'theory') {
                if (revealed && typeof revealed === 'object' && revealed.score !== undefined) { isCorrect = revealed.score >= (maxMarks / 2); }
            } else if (userAns !== undefined && userAns !== '') {
                if (q.type === 'objective') isCorrect = userAns.toUpperCase() === q.correct.toUpperCase();
                else isCorrect = userAns.toLowerCase().trim() === q.correct.toLowerCase().trim();
            }

            if (isCorrect) score++;

            details.push({
                question: q.text, userAnswer: userAns || 'Not Answered',
                correctAnswer: q.type === 'theory' ? `AI Grade: ${revealed && revealed.score !== undefined ? revealed.score : 0}/${maxMarks}` : q.correct,
                isCorrect, questionType: q.type, options: q.options,
                explanation: (q.type === 'theory' && revealed) ? revealed.explanation : q.explanation
            });
        });

        const total = this.data.questions.length;
        const percentage = Math.round((score / total) * 100);
        const subjectName = this.data.subjects[this.data.currentSubjectId]?.name || 'General';

        this.data.lastResults = {
            name: this.data.candidateName, subjectName, score, total, percentage,
            date: new Date().toISOString(), details, examMode: this.data.examMode
        };

        this.data.results.push(this.data.lastResults); this.saveResults();
        this.showSimplifiedResult(score, total, percentage);
    }
});
