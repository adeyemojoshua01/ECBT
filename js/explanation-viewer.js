// ============================================================
// EXPLANATION VIEWER
// Full-screen explanation modal + blinking "View in full screen"
// button injection into .explanation-box containers.
// Depends on: window.app (from app-core.js)
// MUST load AFTER app-exam.js and app-results.js (wraps their methods)
// ============================================================

(function () {
    'use strict';

    // --------------------------------------------------------
    // Inject CSS for the full-screen viewer
    // --------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = `
        .blink-btn {
            animation: blink-pulse 1.5s infinite ease-in-out;
            background: #3b82f6 !important;
            color: white !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 8px 14px !important;
            font-size: 13px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            margin-top: 12px !important;
            margin-bottom: 4px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3) !important;
            transition: transform 0.2s, background 0.2s !important;
        }
        .blink-btn:hover {
            transform: scale(1.05) !important;
            animation: none !important;
            background: #2563eb !important;
            box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4) !important;
        }
        @keyframes blink-pulse {
            0%, 100% { opacity: 1; background: #3b82f6; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
            50%      { opacity: 0.6; background: #2563eb; box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        }

        #fullscreen-explain-modal {
            position: fixed; inset: 0; z-index: 9999999; background: rgba(0, 0, 0, 0.85);
            display: none; align-items: center; justify-content: center; padding: 20px;
            backdrop-filter: blur(4px);
        }
        #fullscreen-explain-modal.open { display: flex; }

        #fullscreen-explain-modal .modal-content {
            background: white;
            max-width: 95vw !important;
            max-height: 95vh !important;
            width: 100%;
            padding: 25px !important;
            border-radius: 16px;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            animation: scaleUp 0.3s ease-out;
            color: #1e293b;
        }
        @keyframes scaleUp { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        #fullscreen-explain-modal .close-btn,
        #fullscreen-explain-modal .theme-toggle-btn {
            position: absolute; top: 12px; background: #f3f4f6;
            border: none; border-radius: 50%; width: 36px; height: 36px;
            font-size: 18px; cursor: pointer; transition: 0.2s; color: #374151;
            display: flex; align-items: center; justify-content: center;
        }
        #fullscreen-explain-modal .close-btn       { right: 16px; }
        #fullscreen-explain-modal .theme-toggle-btn { right: 58px; }
        #fullscreen-explain-modal .close-btn:hover,
        #fullscreen-explain-modal .theme-toggle-btn:hover { background: #e5e7eb; transform: scale(1.1); }

        #fullscreen-explain-modal h2 {
            font-size: 24px; font-weight: bold;
            margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px;
            padding-right: 70px;
        }
        #fullscreen-explain-body {
            white-space: pre-wrap !important; line-height: 1.8 !important;
            font-size: 16px !important;
        }

        #fullscreen-explain-modal .theme-white {
            background: #ffffff !important; color: #1e293b !important;
        }
        #fullscreen-explain-modal .theme-white h2 { border-bottom-color: #3b82f6 !important; }

        #fullscreen-explain-modal .theme-dark {
            background: #1a1a1a !important; color: #ffffff !important;
        }
        #fullscreen-explain-modal .theme-dark h2 { border-bottom-color: #818cf8 !important; }
        #fullscreen-explain-modal .theme-dark .close-btn,
        #fullscreen-explain-modal .theme-dark .theme-toggle-btn { background: #3b3b3b !important; color: #ffffff !important; }
        #fullscreen-explain-modal .theme-dark .close-btn:hover,
        #fullscreen-explain-modal .theme-dark .theme-toggle-btn:hover { background: #555 !important; }
        #fullscreen-explain-modal .theme-dark mjx-container,
        #fullscreen-explain-modal .theme-dark mjx-container * { color: #ffffff !important; }

        #fullscreen-explain-modal .theme-sepia {
            background: #f5f0e6 !important; color: #3e2e1e !important;
        }
        #fullscreen-explain-modal .theme-sepia h2 { border-bottom-color: #d97706 !important; }
        #fullscreen-explain-modal .theme-sepia .close-btn,
        #fullscreen-explain-modal .theme-sepia .theme-toggle-btn { background: #e5dcd2 !important; color: #4a3b2c !important; }
        #fullscreen-explain-modal .theme-sepia .close-btn:hover,
        #fullscreen-explain-modal .theme-sepia .theme-toggle-btn:hover { background: #d4c9bb !important; }
    `;
    document.head.appendChild(style);

    // --------------------------------------------------------
    // Open full-screen explanation
    // --------------------------------------------------------
    window.openFullScreenExplanation = function (btnElement) {
        const container = btnElement.closest('.explanation-box, .bg-blue-50, .bg-white.p-4.rounded-lg.border-l-4');
        if (!container) return;

        const clone = container.cloneNode(true);
        const btnInClone = clone.querySelector('.fullscreen-explain-btn');
        if (btnInClone) btnInClone.remove();

        const modalContent = document.querySelector('#fullscreen-explain-modal .modal-content');
        modalContent.className = 'modal-content theme-white';

        document.getElementById('fullscreen-explain-body').innerHTML = clone.innerHTML;
        document.getElementById('fullscreen-explain-modal').classList.add('open');

        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise([document.getElementById('fullscreen-explain-body')]).catch(() => {});
        }
    };

    // --------------------------------------------------------
    // Theme toggle (cycles white → dark → sepia → white)
    // --------------------------------------------------------
    window.toggleExplanationTheme = function (btnElement) {
        const modalContent = btnElement.closest('.modal-content');
        if (!modalContent) return;

        const themes = ['theme-white', 'theme-dark', 'theme-sepia'];
        const currentIndex = themes.findIndex(t => modalContent.classList.contains(t));
        const nextIndex = (currentIndex + 1) % themes.length;
        themes.forEach(t => modalContent.classList.remove(t));
        modalContent.classList.add(themes[nextIndex]);
    };

    // --------------------------------------------------------
    // Inject blinking buttons into explanation boxes
    // --------------------------------------------------------
    function injectBlinkButtons() {
        document.querySelectorAll('.explanation-box').forEach(container => {
            if (container.querySelector('.fullscreen-explain-btn')) return;

            let target = container.querySelector('.bg-white.p-4.rounded-lg.border-l-4.border-blue-500');
            if (!target) target = container.querySelector('.bg-blue-50');
            if (!target) target = container;

            if (target.querySelector('.fullscreen-explain-btn')) return;
            if (target.textContent.trim().length < 5) return;

            const btn = document.createElement('button');
            btn.className = 'fullscreen-explain-btn blink-btn';
            btn.innerHTML = '<i class="fas fa-expand"></i> View in full screen';
            btn.onclick = function (e) {
                e.preventDefault();
                window.openFullScreenExplanation(this);
            };
            target.appendChild(btn);
        });

        // Defensive: strip buttons that accidentally landed inside green boxes
        document.querySelectorAll('.bg-green-50 .fullscreen-explain-btn').forEach(btn => btn.remove());
    }

    // --------------------------------------------------------
    // Patch render methods so buttons are re-injected after render.
    // NOTE: 'showResult' is in the original list but does not exist
    // on `app` — the typeof guard below silently skips it (preserved
    // for exact behavioural parity with the inline version).
    // --------------------------------------------------------
    const methodsToPatch = ['renderQuestion', 'showResult', 'showFullReview'];
    methodsToPatch.forEach(methodName => {
        if (!window.app) return;
        const original = app[methodName];
        if (typeof original === 'function') {
            app[methodName] = function () {
                const result = original.apply(this, arguments);
                setTimeout(injectBlinkButtons, 400);
                return result;
            };
        }
    });

    // First-run injection (harmless no-op if container empty)
    setTimeout(injectBlinkButtons, 500);
})();
