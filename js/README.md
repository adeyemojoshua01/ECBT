# `/js` — Application JavaScript

Eleven files, loaded in **strict order** in `index.html`.

Every file uses `defer`, which guarantees execution in document order after HTML parsing — but you **still** must list them in the correct order in `index.html`, because later files depend on globals defined by earlier files.

**Do not reorder the `<script src>` tags in `index.html`.**

## File-by-file description

### 1. `image-viewer.js` (loaded first)

Defines two globals used everywhere else:

**`window.compressImage(file, maxW, maxH, quality)`**

Promise-based image compressor. Takes a `File` (from an `<input type="file">`), draws it to a canvas at reduced size, returns a new `File`. Used by `app-ai.js` before sending images to Groq so uploads stay under the body size limit.

**`window.imageViewer` (object)**

The reference-image modal controller. Has:

| Method | Purpose |
|---|---|
| `.open(imagesArray, title)` | show the modal |
| `.close()` | hide it |
| `.renderGallery()` | build thumbnails |
| `.viewFullSize(dataUrl)` | click-through to full size |
| `.zoomIn()` / `.zoomOut()` | zoom in the gallery |
| `.downloadAll()` | download every image |

**Depends on:** nothing.  
**Used by:** `app-core.js` (init), `app-exam.js` (view images button).

### 2. `app-core.js` (loaded second)

Creates `window.app` — the single global object every other JS file extends. This file is the **foundation**.

**Defines on `app`:**

- `data: { ... }` — all mutable state (`subjects`, `currentSubjectId`, `questions`, `examDuration`, `currentQuestionIndex`, `userAnswers`, `candidateName`, `timer`, `timeLeft`, `mode`, `results`, `images`, `examMode`, `answerRevealed`, `lastResults`, `refreshLocked`)
- `init()` — boot (called by `init.js`)
- `loadData()` / `loadImages()` / `loadResults()` — read from `localStorage` on startup
- `saveSubjects()` / `saveResults()` / `saveImages()` — write to `localStorage`
- `createSubjectInternal()` — helper for building subjects
- `saveExamState()` / `clearExamState()` / `checkForSavedExam()` — persist in-progress exam so refresh resumes
- `resumeSavedExam()` / `discardSavedExam()` — resume prompt handlers
- `showNotification(msg, type)` — toast
- `showLanding()` — the landing page
- `showSubjectNotes(id)` — study-materials list
- `viewTopicNote(id, topicId, name)` — show notes modal
- `viewTopicImages(id, topicId)` — show images modal
- `showCandidateOptions()` — "practice vs study" screen
- `showCandidateLogin(mode)` — name/subject/topics form
- `renderCandidateTopics()` — topic picker with quantities
- `startTestPrep()` — build the exam question set
- `showImageModal()` — reference-images modal
- `updateHeader()` — redraw header actions
- `setupMathJaxPatch()` — schedule `typesetPromise`
- `triggerMathJax()` — run `typesetPromise` now

**Depends on:** `imageViewer` (from `image-viewer.js`).  
**Extended by:** `app-exam.js`, `app-ai.js`, `app-results.js`.  
**Wrapped by:** `navigation.js`, `explanation-viewer.js`.

### 3. `app-exam.js` (loaded third)

`Object.assign`'s exam-related methods onto the **existing** `window.app`. Does not re-declare `app`.

**Adds:**

- `startTimer()` / `stopTimer()` / `updateTimerDisplay()` — the countdown timer (poll 250ms; uses `endTime` timestamp so refresh-resume stays accurate)
- `showTestInterface()` — enter the exam screen
- `toggleMobileGrid()` — mobile navigator modal
- `renderQuestion()` — **the big one** — renders the whole question pane. Handles all three question types (objective, fill, theory), study-mode vs practice-mode differences, topic notes/images buttons, navigator grid, explanation box injection point.
- `checkAnswer(qId, value)` — string-compare helper
- `handleStudyAnswerClick()` — study-mode: reveal answer
- `selectAnswer()` — practice-mode: just record
- `toggleTheoryTab()` — text vs image tab in theory
- `nextQuestion()` / `prevQuestion()` / `jumpToQuestion()`
- `submitTestConfirm()` — "are you sure?" then calls `submitTest()` (in `app-ai.js`)

**Depends on:** `app` (must exist — so must load after `app-core.js`).  
**Extended by:** nothing (but wrapped by `explanation-viewer.js`).  
**Calls into:** `submitTest()` — defined in `app-ai.js`.

### 4. `app-ai.js` (loaded fourth)

`Object.assign`'s AI-related methods onto `app`.

**Adds:**

- `submitTheoryText(qId)` — practice mode: save text. Study mode: POST text to `/api/ai-brain`, show score.
- `submitTheoryImage(qId)` — compress image, POST to `/api/ai-brain` with `isImage`, show score + transcription.
- `submitTest()` — the **full** submit flow:
  1. stop timer
  2. for every theory answer not yet graded: POST to `/api/ai-brain`
  3. compute final score
  4. build `lastResults`
  5. push to `results` + save
  6. call `showSimplifiedResult`

> **Note:** `submitTest()` wraps its own `fetch` calls in `try/catch`. If grading fails for one theory, it scores that question 0 and continues rather than crashing the whole exam.

**Depends on:** `app` (must exist), `compressImage` (from `image-viewer.js`).  
**Calls into:** `showSimplifiedResult()` — defined in `app-results.js`.

### 5. `app-results.js` (loaded fifth)

`Object.assign`'s post-exam views onto `app`.

**Adds:**

- `showSimplifiedResult(score, total, pct)` — score-only screen with "Preview Corrections" button. Shows the verse popup 600ms after rendering.
- `showFullReview()` — full answer-by-answer review with correct answers, user answers, and AI explanations. Includes image-answer rendering.
- `showVersePopup()` — the encouragement verse popup (base version — `verse-popup.js` restyles it).

Also injects the `@keyframes slideUpVerse` rule into the `<head>` so the popup animates correctly even if `style.css` doesn't define that keyframe.

**Depends on:** `app` (must exist).  
**Wrapped by:** `verse-popup.js` (wraps `showVersePopup`), `navigation.js` (wraps `showSimplifiedResult` and `showFullReview`).

### 6. `explanation-viewer.js` (loaded sixth)

A self-running IIFE that:

- Injects the full-screen-explanation CSS into `<head>` (so it's self-contained — you don't need it in `style.css`)
- Defines `window.openFullScreenExplanation(btn)`
- Defines `window.toggleExplanationTheme(btn)`
- Defines `injectBlinkButtons()` — scans `.explanation-box` and appends a `.blink-btn`
- **Wraps** `app.renderQuestion` and `app.showFullReview` so the buttons are re-injected 400ms after each render
- Also wraps `app.showResult` — but that method doesn't exist, so the `typeof` guard silently skips it. (Preserved from the original for behavioural parity.)

**Depends on:** `app` must exist with `renderQuestion` and `showFullReview` already assigned — so must load **after** `app-exam.js` and `app-results.js`.

### 7. `navigation.js` (loaded seventh)

A self-running IIFE that installs a back-button/history manager. Wraps seven `app` methods so each screen change pushes or replaces a history entry:

| Method | Action |
|---|---|
| `showLanding` | replace |
| `showCandidateOptions` | push |
| `showCandidateLogin` | push |
| `showSubjectNotes` | push |
| `showSimplifiedResult` | replace (so back skips exam) |
| `showFullReview` | push |
| `showTestInterface` | push |

The `popstate` listener **traps back-button during an active exam**: pops a confirm, and if the user confirms, discards state. Otherwise re-pushes the exam entry to keep them inside.

Exposes `window.nav` for debugging.

**Depends on:** `app` must exist with **all** the methods being wrapped. Must load **after** `app-core`, `app-exam`, `app-results`.

### 8. `verse-popup.js` (loaded eighth)

Wraps `app.showVersePopup` to restyle the popup with the **Midnight Scholar** palette (indigo for good scores, deeper indigo for low scores, amber border). Runs **after** the original so it can mutate the popup's inline styles.

**Depends on:** `app` must have `showVersePopup` (from `app-results.js`).

### 9. `math-formatter.js` (loaded ninth)

Wraps `app.submitTest` to hijack `window.fetch`:

- For requests to `/api/ai-brain` with `body.isImage === true`, it clones the response, formats `data.transcription` and `data.reason` with `wrapMathForMathJax()`, and returns a **new** `Response` with the wrapped text.
- Restores `window.fetch` in a `finally` block so no leak.

Only fires on image uploads (`body.isImage`). Text-only AI responses are **not** formatted — same as original behaviour.

> **If MathJax garbles transcription text** (e.g. shows literal `\(_M\)` fragments from the `___MATH_BLOCK___` sentinel being misformatted), the fix is inside `wrapMathForMathJax()` — change the sentinel from `___MATH_BLOCK___` to something with no underscore-letter sequences, like `@@MATHBLOCK@@`.

**Depends on:** `app` must have `submitTest` (from `app-ai.js`). Must load **last** among `submitTest` patchers — currently it is, since it wraps after `verse-popup` and `navigation`.

### 10. `firebase-config.js` (loaded — but inert)

Intentionally empty — pure comment block. Does **not** run any code. Exists only so the Project 2 file layout is complete. See the comment header inside for the planned Firestore shape.

When you add Firebase, replace the comment body with real `initializeApp` + `getAuth` + `getFirestore` calls, and add `<script src="js/firebase-config.js">` to `index.html`.

### 11. `init.js` (loaded last)

Does exactly two things:

1. Registers a `DOMContentLoaded` handler that calls `app.init()`
2. Registers a `beforeunload` handler that warns the user if they try to close the tab during an active exam

That's it. If you ever need a new app-wide startup routine, add it here — not inside `app-core.js`.

## Global objects exposed

| Global | Purpose |
|---|---|
| `window.app` | the main application object |
| `window.imageViewer` | reference-image modal controller |
| `window.compressImage` | image compressor helper |
| `window.nav` | back-button manager (debugging) |
| `window.openFullScreenExplanation` | modal opener |
| `window.toggleExplanationTheme` | modal theme cycler |
| `window.CBT_SUBJECT_BANKS` | array of question text (filled by `*-bank.js` files) |
