// ============================================================
// FIREBASE CONFIG  (PLACEHOLDER — PROJECT 2)
// ============================================================
//
// This file exists so the target project structure is complete.
// It is INTENTIONALLY EMPTY. Do not add Firebase SDK code here
// until Project 2 begins.
//
// ------------------------------------------------------------
// PLANNED CONTRACT (do not implement yet):
// ------------------------------------------------------------
//
//   window.firebaseAuth  — Firebase Auth instance
//                          (email/password provider)
//   window.firebaseDb    — Firestore instance
//
//   Pluggable points already in the codebase that will be
//   swapped in Project 2:
//
//   • app.data.results   — currently pushed to localStorage
//                          via app.saveResults()  (app-core.js)
//                          → becomes a Firestore write under
//                            users/{uid}/results/{resultId}
//
//   • app.data.candidateName — currently typed into the login
//                          form in app.showCandidateLogin()
//                          → becomes auth.currentUser.email
//
//   • app.loadResults()  — currently reads localStorage
//                          → becomes a Firestore query filtered
//                            by users/{uid}
//
//   • CANDIDATE LOGIN UI — app.showCandidateLogin() renders
//                          a name text input
//                          → becomes email + password + signup
//                            toggle + "sign in with Google"
//
// ------------------------------------------------------------
// FIRESTORE SHAPE (planned):
// ------------------------------------------------------------
//
//   /users/{uid}                      // one doc per student
//     ├── email:       string
//     ├── displayName: string
//     ├── createdAt:   Timestamp
//     └── /results/{autoId}           // subcollection
//           ├── subjectName: string
//           ├── score:       number
//           ├── total:       number
//           ├── percentage:  number
//           ├── examMode:    'practice' | 'study'
//           ├── date:        Timestamp
//           └── details:     array (same shape as app.data.lastResults.details)
//
// ------------------------------------------------------------
// SECURITY RULES SKETCH (planned, do not apply yet):
// ------------------------------------------------------------
//
//   match /users/{uid} {
//     allow read, write: if request.auth != null
//                        && request.auth.uid == uid;
//     match /results/{resultId} {
//       allow read, write: if request.auth != null
//                          && request.auth.uid == uid;
//     }
//   }
//
// ============================================================
// (intentionally no code below this line)
// ============================================================
