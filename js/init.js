// ============================================================
// INIT — application bootstrap
// ============================================================
// Must be the LAST <script> on the page:
//   • app-core.js creates window.app
//   • app-exam.js / app-ai.js / app-results.js extend it
//   • question-banks/question-loader.js fills app.data.subjects
//   • explanation-viewer.js / navigation.js / verse-popup.js
//     / math-formatter.js wrap the relevant methods
//   • this file triggers app.init() once the DOM is ready.
// ============================================================

(function () {
    'use strict';

    // --------------------------------------------------------
    // 1. Boot the app when the DOM is ready
    // --------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof app === 'undefined' || typeof app.init !== 'function') {
            console.error('init.js: window.app missing or app.init() undefined — check script load order in index.html');
            return;
        }
        app.init();
    });

    // --------------------------------------------------------
    // 2. Exam-in-progress guard: warn on tab close / reload
    //    (moved verbatim from the inline <script> before </body>
    //    of the original index.html)
    // --------------------------------------------------------
    window.addEventListener('beforeunload', (e) => {
        if (window.app && app.data && app.data.mode === 'test') {
            e.preventDefault();
            e.returnValue = '';   // Chrome requires this; blank string is fine
            return '';
        }
    });
})();
