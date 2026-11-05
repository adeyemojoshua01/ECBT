// ============================================================
// VERSE POPUP — Midnight Scholar colour patch
// Wraps app.showVersePopup() to override the colour palette of
// the popup card/title/button after the original renders it.
// Depends on: window.app with showVersePopup (from app-results.js)
// MUST load AFTER app-results.js
// ============================================================

(function () {
    'use strict';

    // Fix the Verse Popup colours dynamically
    function applyVerseTheme() {
        if (!window.app || !app.showVersePopup) return;

        const orig = app.showVersePopup;

        app.showVersePopup = function () {
            // Remove any existing popups to avoid duplicates
            const old = document.getElementById('verse-popup');
            if (old) old.remove();

            // Call the original function to generate the popup
            const r = orig.apply(this, arguments);

            // Style it to match Midnight Scholar
            const popup = document.getElementById('verse-popup');
            if (popup) {
                const card = popup.firstElementChild;
                const results = this.data.results;
                const pct = results && results.length ? results[results.length - 1].percentage : 0;
                const good = pct >= 50;

                // Apply new Midnight Scholar colours
                card.style.background = good
                    ? 'linear-gradient(135deg, #1E293B, #4F46E5)'
                    : 'linear-gradient(135deg, #0F172A, #3730A3)';
                card.style.borderColor = '#F59E0B'; // Amber border

                const h2 = card.querySelector('h2');
                if (h2) h2.style.color = '#F59E0B'; // Amber title

                const btn = card.querySelector('button');
                if (btn) {
                    btn.style.background = '#F59E0B';
                    btn.style.color = '#0F172A';
                }
            }
            return r;
        };
    }

    // Wait for the app object to be ready, then apply the patch
    const checkApp = setInterval(() => {
        if (window.app && typeof app.showVersePopup === 'function') {
            clearInterval(checkApp);
            applyVerseTheme();
        }
    }, 100);
})();
