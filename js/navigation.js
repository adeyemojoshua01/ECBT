// ============================================================
// BACK-BUTTON / HISTORY NAVIGATION MANAGER
// Wraps the navigation-relevant app.* methods so popstate can
// restore screens, and traps back-button during an active exam.
// Depends on: window.app with all core/exam/results methods loaded
// MUST load AFTER app-core.js, app-exam.js, app-results.js
// ============================================================

(function () {
    'use strict';

    function boot() {
        if (typeof app === 'undefined' || !app || typeof app.showLanding !== 'function') {
            setTimeout(boot, 100);
            return;
        }

        // ========================================================
        // NAV MANAGER
        // ========================================================
        const nav = {
            stack: ['landing'],
            _suppress: false,
            _booted: false,

            push: function (screenKey, state, renderFn) {
                if (this._booted && this.stack[this.stack.length - 1] === screenKey) {
                    renderFn();
                    return;
                }
                this.stack.push(screenKey);
                history.pushState(Object.assign({ screen: screenKey }, state || {}), '', '#' + screenKey);
                renderFn();
            },

            replace: function (screenKey, state, renderFn) {
                if (this.stack.length === 0) this.stack.push(screenKey);
                else this.stack[this.stack.length - 1] = screenKey;
                history.replaceState(Object.assign({ screen: screenKey }, state || {}), '', '#' + screenKey);
                renderFn();
            },

            handlePop: function (state) {
                const screen = (state && state.screen) || 'landing';
                this._suppress = true;
                try {
                    switch (screen) {
                        case 'landing':
                            app.showLanding();
                            break;
                        case 'candidate-options':
                            app.showCandidateOptions();
                            break;
                        case 'mode-selection':
                            if (state.subjectId) app.showModeSelection(state.subjectId);
                            else app.showCandidateOptions();
                            break;
                        case 'login-practice':
                            if (state.subjectId) app.showCandidateLogin('practice', state.subjectId);
                            else app.showCandidateOptions();
                            break;
                        case 'login-study':
                            if (state.subjectId) app.showCandidateLogin('study', state.subjectId);
                            else app.showCandidateOptions();
                            break;
                        case 'notes-browser':
                            if (state.subjectId) app.showSubjectNotes(state.subjectId);
                            else app.showLanding();
                            break;
                        case 'result':
                            if (app.data.lastResults) {
                                const r = app.data.lastResults;
                                app.showSimplifiedResult(r.score, r.total, r.percentage);
                            } else {
                                app.showLanding();
                            }
                            break;
                        case 'review':
                            if (app.data.lastResults) app.showFullReview();
                            else app.showLanding();
                            break;
                        case 'test':
                            if (app.data.mode === 'test') {
                                history.pushState({ screen: 'test' }, '', '#test');
                                app.showNotification(
                                    'You are in an exam. Use the Submit button to finish.',
                                    'warning'
                                );
                            } else {
                                app.showLanding();
                            }
                            break;
                        default:
                            app.showLanding();
                    }
                } finally {
                    setTimeout(() => { nav._suppress = false; }, 0);
                }
            }
        };

        // ========================================================
        // WRAP EXISTING app.* FUNCTIONS
        // ========================================================

        // -------- showLanding --------
        const _origShowLanding = app.showLanding.bind(app);
        app.showLanding = function () {
            if (nav._suppress) return _origShowLanding();
            nav.replace('landing', {}, _origShowLanding);
        };

        // -------- showCandidateOptions --------
        const _origShowCandidateOptions = app.showCandidateOptions.bind(app);
        app.showCandidateOptions = function () {
            if (nav._suppress) return _origShowCandidateOptions();
            nav.push('candidate-options', {}, _origShowCandidateOptions);
        };

        // -------- showModeSelection --------
        const _origShowModeSelection = app.showModeSelection.bind(app);
        app.showModeSelection = function (subjectId) {
            if (nav._suppress) return _origShowModeSelection(subjectId);
            nav.push('mode-selection', { subjectId: subjectId }, () => _origShowModeSelection(subjectId));
        };

        // -------- showCandidateLogin --------
        const _origShowCandidateLogin = app.showCandidateLogin.bind(app);
        app.showCandidateLogin = function (mode, subjectId) {
            if (nav._suppress) return _origShowCandidateLogin(mode, subjectId);
            nav.push('login-' + mode, { mode: mode, subjectId: subjectId }, () => _origShowCandidateLogin(mode, subjectId));
        };

        // -------- showSubjectNotes --------
        const _origShowSubjectNotes = app.showSubjectNotes.bind(app);
        app.showSubjectNotes = function (subjectId) {
            if (nav._suppress) return _origShowSubjectNotes(subjectId);
            nav.push('notes-browser', { subjectId: subjectId }, () => _origShowSubjectNotes(subjectId));
        };

        // -------- showSimplifiedResult --------
        const _origShowSimplifiedResult = app.showSimplifiedResult.bind(app);
        app.showSimplifiedResult = function (score, total, percentage) {
            if (nav._suppress) return _origShowSimplifiedResult(score, total, percentage);
            nav.replace('result', { score: score }, () => _origShowSimplifiedResult(score, total, percentage));
        };

        // -------- showFullReview --------
        const _origShowFullReview = app.showFullReview.bind(app);
        app.showFullReview = function () {
            if (nav._suppress) return _origShowFullReview();
            nav.push('review', {}, _origShowFullReview);
        };

        // -------- showTestInterface --------
        const _origShowTestInterface = app.showTestInterface.bind(app);
        app.showTestInterface = function () {
            if (nav._suppress) return _origShowTestInterface();
            nav.push('test', {}, _origShowTestInterface);
        };

        // ========================================================
        // POPSTATE LISTENER
        // ========================================================
        window.addEventListener('popstate', function (e) {
            if (app.data.mode === 'test') {
                history.pushState({ screen: 'test' }, '', '#test');
                if (confirm('Leave the exam? Your answers will be lost.')) {
                    app.data.mode = 'landing';
                    app.data.questions = [];
                    app.data.userAnswers = {};
                    app.data.answerRevealed = {};
                    if (app.data.timer) clearInterval(app.data.timer);
                    nav.stack = ['landing'];
                    history.replaceState({ screen: 'landing' }, '', '#landing');
                    nav._suppress = true;
                    app.showLanding();
                    setTimeout(() => { nav._suppress = false; }, 0);
                }
                return;
            }

            const targetScreen = (e.state && e.state.screen) || 'landing';
            const idx = nav.stack.indexOf(targetScreen);
            if (idx >= 0) nav.stack = nav.stack.slice(0, idx + 1);
            else          nav.stack = [targetScreen];
            nav.handlePop(e.state);
        });

        history.replaceState({ screen: 'landing' }, '', '#landing');
        nav.stack = ['landing'];
        nav._booted = true;

        nav._suppress = true;
        _origShowLanding();
        setTimeout(() => { nav._suppress = false; }, 0);

        window.nav = nav;
    }

    boot();
})();
