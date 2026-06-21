# LingoLeap 🧳

A mobile-style language learning web app built for the **CodeAlpha App Development Internship** (Task 4: Language Learning App).

**Live demo:** _add your GitHub Pages link here after deploying_

## What it does

LingoLeap helps you learn new words, phrases, and grammar in four languages — Spanish, French, Japanese, and German — through flashcards and quizzes, themed like a travel passport.

- **Pick a language** from the welcome screen, switch any time from the top bar.
- **Learn tab** — flip through flashcard decks for Vocabulary, Phrases, and Grammar. Each card shows the term, its meaning, and pronunciation. Mark a card "I know it ✓" or "Still learning" to track mastery.
- **Quiz tab** — ten multiple-choice questions pulled from Vocabulary, Phrases, or a Mixed deck, with instant right/wrong feedback.
- **Progress tab** — daily streak, total cards mastered, quizzes taken, and a mastery bar per language.
- A passport-style **stamp animation** celebrates finishing a deck or a quiz.
- All progress is saved locally in the browser (`localStorage`), so it's still there next time you open the app.

## Tech stack

- HTML5, CSS3, vanilla JavaScript (no frameworks, no build step)
- `localStorage` for persistence
- Google Fonts: Fraunces, Work Sans, Space Mono

## Project structure

```
lingo-leap/
├── index.html      # App markup (onboarding, learn, quiz, progress screens)
├── style.css        # Design system + mobile app frame
├── script.js         # App logic: state, rendering, quiz engine, persistence
├── data.js            # Vocabulary, phrases, and grammar content for all 4 languages
└── README.md
```

## Run it locally

No build tools needed — just open `index.html` in a browser, or serve the folder:

```bash
# from inside the lingo-leap folder
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a new repo named `CodeAlpha_LanguageLearningApp`.
2. Upload `index.html`, `style.css`, `script.js`, and `data.js` to the repo root.
3. Go to **Settings → Pages**, set the source branch to `main` and folder to `/ (root)`.
4. Your live demo will be at `https://<your-username>.github.io/CodeAlpha_LanguageLearningApp/`.
5. Paste that link at the top of this README and in your submission form.

## Possible extensions

- Add more languages or expand each deck beyond 10–18 cards.
- Add audio pronunciation using the Web Speech API.
- Sync progress to a backend (e.g. Firebase) instead of `localStorage` so it follows you across devices.

---
Built by Prabha as part of the CodeAlpha App Development Internship.
