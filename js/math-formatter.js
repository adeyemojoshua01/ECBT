// ============================================================
// DYNAMIC MATHJAX FORMATTER FOR AI THEORY GRADING
// Wraps app.submitTest() to hijack window.fetch, and when the
// response is from /api/ai-brain with body.isImage === true,
// wraps detected math in \(...\) so MathJax renders it.
// Depends on: window.app with submitTest (from app-ai.js)
// MUST load AFTER app-ai.js, and be the LAST patcher of submitTest.
// ============================================================

(function () {
    'use strict';

    // Wait for the app to be fully loaded
    const checkApp = setInterval(() => {
        if (window.app && app.submitTest) {
            clearInterval(checkApp);

            const originalSubmitTest = app.submitTest;

            app.submitTest = async function () {
                const originalFetch = window.fetch;

                // Intercept the network request to /api/ai-brain
                window.fetch = async function (url, options) {
                    const response = await originalFetch.apply(this, arguments);

                    if (url.includes('/api/ai-brain') && options && options.body) {
                        try {
                            const body = JSON.parse(options.body);
                            // Only process if it's an image upload (MathJax is most needed here)
                            if (body.isImage) {
                                const clonedResponse = response.clone();
                                const data = await clonedResponse.json();

                                // If the AI returned a transcription or reason, format it for MathJax
                                if (data.transcription) {
                                    data.transcription = wrapMathForMathJax(data.transcription);
                                }
                                if (data.reason) {
                                    data.reason = wrapMathForMathJax(data.reason);
                                }

                                // Return the modified data as a new response
                                return new Response(JSON.stringify(data), {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: response.headers
                                });
                            }
                        } catch (e) {
                            console.warn("Math formatting interceptor bypassed:", e);
                        }
                    }
                    return response;
                };

                // Run the original submitTest
                try {
                    await originalSubmitTest.apply(this, arguments);
                } finally {
                    // Always restore the original fetch to prevent memory leaks
                    window.fetch = originalFetch;
                }
            };
        }
    }, 100);

    // The magic function that finds math and wraps it in \( \)
    function wrapMathForMathJax(text) {
        if (!text) return text;

        // 1. Temporarily replace existing LaTeX blocks so we don't double-wrap them
        let tempText = text.replace(/(\\\(.*?\\\)|\\\[.*?\\\])/g, '___MATH_BLOCK___');

        // 2. Add delimiters around common math patterns
        // (Greek letters, superscripts, subscripts, fractions, roots)
        tempText = tempText.replace(/([α-ωΑ-ΩπΔθ]|[\^_][a-zA-Z0-9]|\\frac\{.*?\}\{.*?\}|\\sqrt\{.*?\}|\b[a-zA-Z]\s*=\s*[^.,;\n]+)/g, '\\($1\\)');

        // 3. Restore the original LaTeX blocks
        tempText = tempText.replace(/___MATH_BLOCK___/g, (match) => {
            // Find the original block from the original text using regex
            const originalMatches = text.match(/(\\\(.*?\\\)|\\\[.*?\\\])/g);
            if (originalMatches && originalMatches.length > 0) {
                return originalMatches.shift();
            }
            return match;
        });

        // 4. Clean up any accidental double-wrapping (e.g., \(\(x\)\))
        tempText = tempText.replace(/\\\(\\\((.*?)\\\)\\\)/g, '\\($1\\)');

        return tempText;
    }
})();
