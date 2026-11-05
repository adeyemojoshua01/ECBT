// ============================================================
// APP RESULTS
// Post-exam score view, full review screen, verse popup.
// Depends on: window.app (from app-core.js)
// ============================================================

// ------------------------------------------------------------
// Defensive: ensure the verse-popup slide-up keyframes exist.
// If your base style.css already defines @keyframes slideUpVerse,
// this simply overrides with an identical translateX(-50%)-safe
// version (the popup is centered via translateX(-50%), so the
// keyframes MUST preserve that or the popup will jump sideways).
// ------------------------------------------------------------
(function injectVerseAnimation() {
    if (document.getElementById('verse-popup-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'verse-popup-keyframes';
    style.textContent = `
        @keyframes slideUpVerse {
            from { opacity: 0; transform: translateX(-50%) translateY(40px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
})();

Object.assign(window.app, {

    // --------------------------------------------------------
    // SCORE-ONLY VIEW
    // --------------------------------------------------------
    showSimplifiedResult: function (score, total, percentage) {
        this.data.mode = 'result';
        this.updateHeader();

        const subjectName = this.data.subjects[this.data.currentSubjectId]?.name || 'General';

        document.getElementById('app-container').innerHTML = `
            <div class="max-w-2xl mx-auto h-full flex flex-col justify-center">
                <div class="bg-white p-8 rounded-xl shadow-lg border-t-4 ${percentage >= 50 ? 'border-green-600' : 'border-red-600'}">
                    <div class="text-center mb-6">
                        <div class="w-24 h-24 rounded-full mx-auto flex items-center justify-center ${percentage >= 50 ? 'bg-green-100' : 'bg-red-100'} mb-4">
                            <i class="fas ${percentage >= 50 ? 'fa-trophy text-green-600' : 'fa-sad-tear text-red-600'} text-4xl"></i>
                        </div>
                        <h2 class="text-3xl font-bold ${percentage >= 50 ? 'text-green-700' : 'text-red-700'}">
                            ${percentage >= 50 ? 'Congratulations!' : 'Keep Trying!'}
                        </h2>
                        <p class="text-gray-600">${this.data.candidateName} - ${subjectName}</p>
                        <p class="text-sm text-gray-500 mt-1">
                            <span class="inline-block px-2 py-1 rounded ${this.data.examMode === 'practice' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                <i class="fas ${this.data.examMode === 'practice' ? 'fa-clock' : 'fa-book-open'} mr-1"></i>
                                ${this.data.examMode} mode
                            </span>
                        </p>
                    </div>

                    <div class="text-center mb-6">
                        <div class="text-8xl font-bold ${percentage >= 50 ? 'text-green-600' : 'text-red-600'} mb-2">
                            ${percentage}%
                        </div>
                        <div class="text-xl text-gray-500">
                            ${score} out of ${total} correct
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-center mb-6">
                        <div class="bg-green-50 p-4 rounded-lg">
                            <div class="text-3xl font-bold text-green-600">${score}</div>
                            <div class="text-sm text-gray-500">Correct</div>
                        </div>
                        <div class="bg-red-50 p-4 rounded-lg">
                            <div class="text-3xl font-bold text-red-600">${total - score}</div>
                            <div class="text-sm text-gray-500">Incorrect</div>
                        </div>
                    </div>

                    <div class="text-center mb-6">
                        <button onclick="event.preventDefault(); app.showFullReview()"
                                class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-lg transition">
                            <i class="fas fa-eye mr-2"></i>
                            Preview Corrections & Answers
                        </button>
                        <p class="text-xs text-gray-500 mt-2">
                            Click to see correct answers and explanations
                        </p>
                    </div>

                    <div class="text-center mt-6">
                        <button onclick="event.preventDefault(); app.showLanding()"
                                class="bg-gray-800 text-white px-8 py-3 rounded-lg hover:bg-gray-900 font-bold">
                            Return Home
                        </button>
                    </div>
                </div>
            </div>`;
        setTimeout(() => this.showVersePopup(), 600);
    },

    // --------------------------------------------------------
    // FULL ANSWER REVIEW
    // --------------------------------------------------------
    showFullReview: function () {
        if (!this.data.lastResults) {
            this.showNotification('No results to review', 'error');
            return;
        }

        this.data.mode = 'review';
        this.updateHeader();

        const { name, subjectName, score, total, percentage, details } = this.data.lastResults;

        const reviewHtml = details.map((d, i) => {
            let optionsHtml = '';
            if (d.questionType === 'objective' && d.options) {
                optionsHtml = `
                    <div class="mt-3 grid grid-cols-2 gap-2">
                        ${['A', 'B', 'C', 'D'].map(opt => `
                            <div class="p-2 rounded border ${d.correctAnswer === opt ? 'bg-green-100 border-green-300' : 'bg-gray-50'} ${d.userAnswer === opt && !d.isCorrect ? 'bg-red-100 border-red-300' : ''}">
                                <span class="font-bold mr-2">${opt}:</span>
                                <span class="whitespace-pre-wrap break-words">${d.options[opt] || ''}</span>
                            </div>
                        `).join('')}
                    </div>`;
            }

            return `
                <div class="bg-white p-6 rounded-lg shadow border mb-6 ${d.isCorrect ? 'border-green-200' : 'border-red-200'}">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${d.isCorrect ? 'bg-green-500' : 'bg-red-500'}">
                            <i class="fas ${d.isCorrect ? 'fa-check' : 'fa-times'}"></i>
                        </div>
                        <div class="flex-grow">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="text-lg font-bold text-gray-800">Question ${i + 1}</h3>
                                <span class="px-2 py-1 text-xs font-bold rounded ${d.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                    ${d.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                            </div>
                            <p class="text-gray-700 mb-4 bg-gray-50 p-4 rounded whitespace-pre-wrap break-words">${d.question}</p>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div class="${!d.isCorrect ? 'bg-red-50 p-3 rounded border border-red-200' : ''}">
                                    <div class="text-sm text-gray-500 mb-1">Your Answer:</div>
                                    ${(d.userAnswer && String(d.userAnswer).startsWith('data:image'))
                                        ? `<img src="${d.userAnswer}" class="max-h-60 rounded border mt-2 object-contain shadow-sm" alt="Uploaded Answer">`
                                        : `<div class="font-bold whitespace-pre-wrap break-words ${d.isCorrect ? 'text-green-700' : 'text-red-700'}">${d.userAnswer || 'Not Answered'}</div>`
                                    }
                                </div>
                                ${(!d.isCorrect || d.questionType === 'theory') ? `
                                    <div class="bg-green-50 p-3 rounded border border-green-200">
                                        <div class="text-sm text-gray-500 mb-1">${d.questionType === 'theory' ? 'AI Result' : 'Correct Answer'}:</div>
                                        <div class="font-bold text-green-700 whitespace-pre-wrap break-words">${d.correctAnswer}</div>
                                    </div>
                                ` : ''}
                            </div>

                            ${optionsHtml}

                            ${d.explanation ? `
                                <div class="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                                    <div class="text-sm text-blue-600 font-bold mb-1">${d.questionType === 'theory' ? 'Model Answer / Explanation:' : 'Explanation:'}</div>
                                    <p class="text-sm text-gray-700 whitespace-pre-wrap break-words">${d.explanation}</p>
                                </div>
                            ` : ''}

                        </div>
                    </div>
                </div>`;
        }).join('');

        document.getElementById('app-container').innerHTML = `
            <div class="max-w-4xl mx-auto h-full flex flex-col">
                <div class="bg-white p-6 rounded-lg shadow mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">Answer Review</h2>
                            <p class="text-gray-600">${name} - ${subjectName}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-3xl font-bold ${percentage >= 50 ? 'text-green-600' : 'text-red-600'}">${percentage}%</div>
                            <div class="text-sm text-gray-500">${score}/${total} Correct</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-4 gap-2 mb-6">
                        <div class="text-center p-3 rounded bg-green-100 border border-green-300">
                            <div class="text-xl font-bold text-green-700">${score}</div>
                            <div class="text-xs text-green-800">Correct</div>
                        </div>
                        <div class="text-center p-3 rounded bg-red-100 border border-red-300">
                            <div class="text-xl font-bold text-red-700">${total - score}</div>
                            <div class="text-xs text-red-800">Incorrect</div>
                        </div>
                        <div class="text-center p-3 rounded bg-blue-100 border border-blue-300">
                            <div class="text-xl font-bold text-blue-700">${percentage}%</div>
                            <div class="text-xs text-blue-800">Accuracy</div>
                        </div>
                        <div class="text-center p-3 rounded bg-purple-100 border border-purple-300">
                            <div class="text-xl font-bold text-purple-700">${total}</div>
                            <div class="text-xs text-purple-800">Total</div>
                        </div>
                    </div>
                </div>

                <div class="flex-grow overflow-y-auto pb-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Detailed Review</h3>
                    ${reviewHtml}
                </div>

                <div class="flex justify-between pt-4 border-t">
                    <button onclick="event.preventDefault(); app.showLanding()" class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold">
                        <i class="fas fa-home mr-2"></i>Home
                    </button>
                    <button onclick="event.preventDefault(); app.showSimplifiedResult(${score}, ${total}, ${percentage})" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Score
                    </button>
                </div>
            </div>`;
    },

    // --------------------------------------------------------
    // VERSE POPUP (base version — Midnight Scholar colour patch
    // lives in js/verse-popup.js and wraps this function)
    // --------------------------------------------------------
    showVersePopup: function () {
        const results = this.data.results;
        if (!results || results.length === 0) return;

        const lastResult = results[results.length - 1];
        const percentage = lastResult.percentage;

        if (percentage === undefined) return;

        const VERSES_GOOD = [
            "🌟 'Well done, good and faithful servant! You have been faithful over a little; I will set you over much.' — Matthew 25:21",
            "🏆 'I can do all things through Christ who strengthens me.' — Philippians 4:13",
            "📖 'Commit your work to the Lord, and your plans will be established.' — Proverbs 16:3",
            "✨ 'For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.' — Jeremiah 29:11"
        ];

        const VERSES_TRY_AGAIN = [
            "💪 'Do not be discouraged, for the Lord your God is with you wherever you go.' — Joshua 1:9",
            "🌅 'For though the righteous fall seven times, they rise again.' — Proverbs 24:16",
            "🙏 'But those who hope in the Lord will renew their strength.' — Isaiah 40:31",
            "❤️ 'My grace is sufficient for you, for my power is made perfect in weakness.' — 2 Corinthians 12:9"
        ];

        const isGood = percentage >= 50;
        const verses = isGood ? VERSES_GOOD : VERSES_TRY_AGAIN;
        const randomVerse = verses[Math.floor(Math.random() * verses.length)];

        const title = isGood ? '🎉 Congratulations! 🎉' : '💪 Keep Going! 💪';
        const icon = isGood ? '🎓✨' : '🌱💪';
        const bgColor = isGood ? '#1e3c2c' : '#2d2b1f';
        const accentColor = isGood ? '#ffd700' : '#ffaa66';

        const popup = document.createElement('div');
        popup.id = 'verse-popup';
        popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 500px;
            z-index: 999999;
            pointer-events: none;
            animation: slideUpVerse 0.4s ease-out;
        `;

        popup.innerHTML = `
            <div style="
                pointer-events: auto;
                background: linear-gradient(135deg, ${bgColor}, ${isGood ? '#2a6b3c' : '#6b4c14'});
                max-width: 500px;
                width: 90%;
                border-radius: 24px;
                padding: 30px 25px;
                text-align: center;
                box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                border: 2px solid ${accentColor};
                animation: slideUpVerse 0.4s ease-out;
                color: white;
            ">
                <div style="font-size: 60px; margin-bottom: 10px;">${icon}</div>
                <h2 style="font-size: 28px; margin: 0 0 15px; color: ${accentColor};">${title}</h2>
                <div style="
                    background: rgba(255,255,255,0.12);
                    border-radius: 16px;
                    padding: 20px;
                    margin: 20px 0;
                    font-size: 18px;
                    line-height: 1.6;
                    font-style: italic;
                    border-left: 4px solid ${accentColor};
                ">
                    ${randomVerse}
                </div>
                <button onclick="this.closest('#verse-popup').remove()" style="
                    background: ${accentColor};
                    color: ${isGood ? '#1e3c2c' : '#2d2b1f'};
                    border: none;
                    padding: 12px 28px;
                    border-radius: 40px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Continue
                </button>
            </div>
        `;

        document.body.appendChild(popup);

        setTimeout(() => {
            if (popup && popup.parentNode) popup.remove();
        }, 6000);
    }
});
