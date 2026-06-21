// =============================================================
// LingoLeap — app logic
// =============================================================

const STORAGE_KEY = "lingoleap-progress";

const DECK_META = {
  vocabulary: { icon: "🗂️", label: "Vocabulary" },
  phrases:    { icon: "💬", label: "Phrases" },
  grammar:    { icon: "📐", label: "Grammar" },
  mixed:      { icon: "🔀", label: "Mixed review" },
};

let state = {
  currentLang: null,
  currentDeck: null,
  cardIndex: 0,
  quiz: null, // { deckType, questions, index, score }
};

// ---------------------------------------------------------
// Persistence
// ---------------------------------------------------------
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("none");
    return JSON.parse(raw);
  } catch (e) {
    return { streak: 0, lastActiveDate: null, mastered: {}, quizzesTaken: 0, selectedLang: null };
  }
}
function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}
let progress = loadProgress();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function updateStreakOnOpen() {
  const today = todayStr();
  if (progress.lastActiveDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  progress.streak = progress.lastActiveDate === yesterday ? progress.streak + 1 : 1;
  progress.lastActiveDate = today;
  saveProgress(progress);
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getRawCards(langKey, deckType) {
  const lang = LANGUAGES[langKey];
  if (deckType === "mixed") return [...lang.vocabulary, ...lang.phrases];
  return lang[deckType];
}
function normalizeCard(deckType, card) {
  if (deckType === "grammar") {
    return {
      term: card.title,
      translation: card.explanation,
      pron: `"${card.example}" — ${card.exampleTranslation}`,
      isGrammar: true,
    };
  }
  return { term: card.term, translation: card.translation, pron: card.pron, isGrammar: false };
}

// ---------------------------------------------------------
// Stamp overlay (signature element)
// ---------------------------------------------------------
function showStampOverlay(main, sub, duration = 1100) {
  const overlay = document.getElementById("stamp-overlay");
  const stampEl = document.getElementById("stamp");
  document.getElementById("stamp-text-main").textContent = main;
  document.getElementById("stamp-text-sub").textContent = sub;
  overlay.classList.remove("hidden");
  stampEl.style.animation = "none";
  void stampEl.offsetWidth; // restart animation
  stampEl.style.animation = "";
  setTimeout(() => overlay.classList.add("hidden"), duration);
}
function buildStampSVG(main, sub) {
  return `
    <svg viewBox="0 0 160 160" class="stamp-svg">
      <circle cx="80" cy="80" r="70" class="stamp-ring" />
      <circle cx="80" cy="80" r="58" class="stamp-ring-inner" />
      <text x="80" y="72" text-anchor="middle" class="stamp-text-main">${main}</text>
      <text x="80" y="94" text-anchor="middle" class="stamp-text-sub">${sub}</text>
    </svg>`;
}

// ---------------------------------------------------------
// Onboarding + language switching
// ---------------------------------------------------------
function langCardHTML(langKey) {
  const lang = LANGUAGES[langKey];
  const total = lang.vocabulary.length + lang.phrases.length + lang.grammar.length;
  return `<button class="lang-card" data-lang="${langKey}">
    <span class="flag">${lang.flag}</span>
    <span class="lang-name">${lang.name}</span>
    <span class="lang-count">${total} cards</span>
  </button>`;
}
function buildLangGrid(containerId, onSelect) {
  const el = document.getElementById(containerId);
  el.innerHTML = Object.keys(LANGUAGES).map(langCardHTML).join("");
  el.querySelectorAll(".lang-card").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.lang));
  });
}

function selectLanguage(langKey) {
  state.currentLang = langKey;
  progress.selectedLang = langKey;
  saveProgress(progress);

  const lang = LANGUAGES[langKey];
  document.getElementById("lang-switch-flag").textContent = lang.flag;
  document.getElementById("lang-switch-name").textContent = lang.name;
  document.getElementById("streak-count").textContent = progress.streak;

  document.getElementById("onboarding").classList.remove("active");
  document.getElementById("main-app").classList.add("active");

  closeLangModal();
  goToTab("learn-container");
}

function openLangModal() {
  buildLangGrid("modal-lang-grid", (langKey) => selectLanguage(langKey));
  document.getElementById("lang-modal").classList.remove("hidden");
}
function closeLangModal() {
  document.getElementById("lang-modal").classList.add("hidden");
}

// ---------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------
function goToTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === tabId));

  if (tabId === "learn-container") {
    showSubView("learn-container", "deck-select-view");
    renderDeckList();
  } else if (tabId === "quiz-container") {
    showSubView("quiz-container", "quiz-select-view");
    renderQuizDeckList();
  } else if (tabId === "progress-container") {
    renderProgressTab();
  }
}
function showSubView(panelId, subViewId) {
  const panel = document.getElementById(panelId);
  panel.querySelectorAll(".sub-view").forEach((v) => v.classList.toggle("active", v.id === subViewId));
}

// ---------------------------------------------------------
// Learn tab — deck list
// ---------------------------------------------------------
function renderDeckList() {
  const langKey = state.currentLang;
  const container = document.getElementById("deck-list");
  container.innerHTML = ["vocabulary", "phrases", "grammar"].map((deckType) => {
    const cards = getRawCards(langKey, deckType);
    const masteredCount = cards.filter((c) => progress.mastered[c.id]).length;
    const pct = Math.round((masteredCount / cards.length) * 100);
    const meta = DECK_META[deckType];
    return `<button class="deck-card" data-deck="${deckType}">
      <span class="deck-icon">${meta.icon}</span>
      <span class="deck-info">
        <span class="deck-name">${meta.label}</span>
        <span class="deck-meta">${cards.length} cards · ${masteredCount} mastered</span>
        <span class="deck-progress-track"><span class="deck-progress-fill" style="width:${pct}%"></span></span>
      </span>
    </button>`;
  }).join("");
  container.querySelectorAll(".deck-card").forEach((btn) => {
    btn.addEventListener("click", () => openDeck(btn.dataset.deck));
  });
}

function openDeck(deckType) {
  state.currentDeck = deckType;
  state.cardIndex = 0;
  showSubView("learn-container", "flashcard-view");
  renderFlashcard();
}

function renderFlashcard() {
  const langKey = state.currentLang;
  const deckType = state.currentDeck;
  const cards = getRawCards(langKey, deckType);
  const raw = cards[state.cardIndex];
  const card = normalizeCard(deckType, raw);

  document.getElementById("flashcard").classList.remove("flipped");
  document.getElementById("card-front-label").textContent = card.isGrammar ? "Grammar tip" : "Term";
  document.getElementById("card-term").textContent = card.term;
  document.getElementById("card-back-label").textContent = card.isGrammar ? "Explanation" : "Means";
  document.getElementById("card-translation").textContent = card.translation;
  document.getElementById("card-pron").textContent = card.pron;

  document.getElementById("card-index").textContent = state.cardIndex + 1;
  document.getElementById("card-total").textContent = cards.length;

  document.getElementById("card-prev").disabled = state.cardIndex === 0;
  document.getElementById("card-next").disabled = state.cardIndex === cards.length - 1;

  const isMastered = !!progress.mastered[raw.id];
  document.getElementById("card-know").style.outline = isMastered ? `2px solid var(--sage)` : "none";
}

function markCard(known) {
  const langKey = state.currentLang;
  const deckType = state.currentDeck;
  const cards = getRawCards(langKey, deckType);
  const raw = cards[state.cardIndex];
  const wasMastered = !!progress.mastered[raw.id];

  if (known) progress.mastered[raw.id] = true;
  else delete progress.mastered[raw.id];
  saveProgress(progress);

  const isLast = state.cardIndex === cards.length - 1;

  if (known && !wasMastered) {
    showStampOverlay(isLast ? "DECK DONE!" : "GOT IT!", LANGUAGES[langKey].name.toUpperCase());
  }

  setTimeout(() => {
    if (!isLast) {
      state.cardIndex++;
      renderFlashcard();
    } else {
      showSubView("learn-container", "deck-select-view");
      renderDeckList();
    }
  }, known && !wasMastered ? 650 : 150);
}

// ---------------------------------------------------------
// Quiz tab
// ---------------------------------------------------------
function renderQuizDeckList() {
  const langKey = state.currentLang;
  const container = document.getElementById("quiz-deck-list");
  document.getElementById("quiz-deck-list").parentElement; // no-op, keeps structure clear
  container.innerHTML = ["vocabulary", "phrases", "mixed"].map((deckType) => {
    const cards = getRawCards(langKey, deckType);
    const meta = DECK_META[deckType];
    const qCount = Math.min(10, cards.length);
    return `<button class="deck-card" data-deck="${deckType}">
      <span class="deck-icon">${meta.icon}</span>
      <span class="deck-info">
        <span class="deck-name">${meta.label}</span>
        <span class="deck-meta">${qCount} questions</span>
      </span>
    </button>`;
  }).join("");
  container.querySelectorAll(".deck-card").forEach((btn) => {
    btn.addEventListener("click", () => startQuiz(btn.dataset.deck));
  });
}

function startQuiz(deckType) {
  const langKey = state.currentLang;
  const pool = getRawCards(langKey, deckType);
  const picked = shuffle(pool).slice(0, Math.min(10, pool.length));

  const questions = picked.map((correctCard) => {
    const askForTranslation = Math.random() < 0.5;
    const distractorPool = pool.filter((c) => c.id !== correctCard.id);
    const distractors = shuffle(distractorPool).slice(0, 3);
    const optionCards = shuffle([correctCard, ...distractors]);

    return {
      prompt: askForTranslation
        ? `What does "${correctCard.term}" mean?`
        : `How do you say "${correctCard.translation}" in ${LANGUAGES[langKey].name}?`,
      options: optionCards.map((c) => (askForTranslation ? c.translation : c.term)),
      correctAnswer: askForTranslation ? correctCard.translation : correctCard.term,
    };
  });

  state.quiz = { deckType, questions, index: 0, score: 0 };
  showSubView("quiz-container", "quiz-active-view");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = state.quiz;
  const question = q.questions[q.index];

  document.getElementById("quiz-progress-fill").style.width = `${(q.index / q.questions.length) * 100}%`;
  document.getElementById("quiz-index").textContent = q.index + 1;
  document.getElementById("quiz-total").textContent = q.questions.length;
  document.getElementById("quiz-question").textContent = question.prompt;

  const optionsEl = document.getElementById("quiz-options");
  optionsEl.innerHTML = question.options.map((opt) => `<button class="quiz-option">${opt}</button>`).join("");
  optionsEl.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.addEventListener("click", () => selectAnswer(btn, question.correctAnswer));
  });
}

function selectAnswer(btn, correctAnswer) {
  const q = state.quiz;
  const allOptions = document.querySelectorAll("#quiz-options .quiz-option");
  allOptions.forEach((o) => (o.disabled = true));

  const chosen = btn.textContent;
  const isCorrect = chosen === correctAnswer;
  if (isCorrect) q.score++;

  allOptions.forEach((o) => {
    if (o.textContent === correctAnswer) o.classList.add("correct");
    else if (o === btn) o.classList.add("incorrect");
  });

  setTimeout(() => {
    if (q.index < q.questions.length - 1) {
      q.index++;
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }, 850);
}

function finishQuiz() {
  const q = state.quiz;
  progress.quizzesTaken++;
  saveProgress(progress);

  const pct = Math.round((q.score / q.questions.length) * 100);
  let main = "KEEP GOING";
  let detail = "Repetition is how it sticks — run this deck again soon.";
  if (pct >= 80) { main = "EXCELLENT"; detail = "That's fluent-level recall. Try a harder deck next."; }
  else if (pct >= 50) { main = "GOOD JOB"; detail = "Solid effort — a couple more passes and it'll stick."; }

  document.getElementById("quiz-score-text").textContent = `${q.score} / ${q.questions.length} correct`;
  document.getElementById("quiz-score-detail").textContent = detail;
  document.getElementById("result-stamp-spot").innerHTML = `<div class="stamp">${buildStampSVG(main, LANGUAGES[state.currentLang].name.toUpperCase())}</div>`;

  showSubView("quiz-container", "quiz-result-view");
}

// ---------------------------------------------------------
// Progress tab
// ---------------------------------------------------------
function renderProgressTab() {
  document.getElementById("stat-streak").textContent = progress.streak;
  document.getElementById("stat-mastered").textContent = Object.keys(progress.mastered).length;
  document.getElementById("stat-quizzes").textContent = progress.quizzesTaken;

  const container = document.getElementById("progress-by-lang");
  container.innerHTML = Object.keys(LANGUAGES).map((langKey) => {
    const lang = LANGUAGES[langKey];
    const allCards = [...lang.vocabulary, ...lang.phrases, ...lang.grammar];
    const masteredCount = allCards.filter((c) => progress.mastered[c.id]).length;
    const pct = Math.round((masteredCount / allCards.length) * 100);
    return `<div class="progress-lang-row">
      <div class="progress-lang-top">
        <span>${lang.flag} ${lang.name}</span>
        <span class="pct">${masteredCount}/${allCards.length}</span>
      </div>
      <div class="progress-lang-track">
        <div class="progress-lang-fill" style="width:${pct}%; background:${lang.color}"></div>
      </div>
    </div>`;
  }).join("");
}

// ---------------------------------------------------------
// Event wiring
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  updateStreakOnOpen();
  buildLangGrid("onboarding-lang-grid", (langKey) => selectLanguage(langKey));

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => goToTab(btn.dataset.tab));
  });

  document.getElementById("lang-switch-btn").addEventListener("click", openLangModal);
  document.getElementById("modal-close").addEventListener("click", closeLangModal);
  document.getElementById("lang-modal").addEventListener("click", (e) => {
    if (e.target.id === "lang-modal") closeLangModal();
  });

  document.getElementById("flashcard").addEventListener("click", () => {
    document.getElementById("flashcard").classList.toggle("flipped");
  });
  document.getElementById("card-know").addEventListener("click", (e) => { e.stopPropagation(); markCard(true); });
  document.getElementById("card-still").addEventListener("click", (e) => { e.stopPropagation(); markCard(false); });
  document.getElementById("card-prev").addEventListener("click", (e) => {
    e.stopPropagation();
    if (state.cardIndex > 0) { state.cardIndex--; renderFlashcard(); }
  });
  document.getElementById("card-next").addEventListener("click", (e) => {
    e.stopPropagation();
    const total = getRawCards(state.currentLang, state.currentDeck).length;
    if (state.cardIndex < total - 1) { state.cardIndex++; renderFlashcard(); }
  });
  document.querySelectorAll(".back-btn[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showSubView("learn-container", btn.dataset.back);
      renderDeckList();
    });
  });

  document.getElementById("quiz-quit-btn").addEventListener("click", () => {
    showSubView("quiz-container", "quiz-select-view");
    renderQuizDeckList();
  });
  document.getElementById("quiz-retry").addEventListener("click", () => startQuiz(state.quiz.deckType));
  document.getElementById("quiz-done").addEventListener("click", () => {
    showSubView("quiz-container", "quiz-select-view");
    renderQuizDeckList();
  });

  document.getElementById("reset-progress-btn").addEventListener("click", () => {
    if (!confirm("Reset your streak, mastered cards, and quiz history? This can't be undone.")) return;
    progress = { streak: 0, lastActiveDate: todayStr(), mastered: {}, quizzesTaken: 0, selectedLang: progress.selectedLang };
    saveProgress(progress);
    document.getElementById("streak-count").textContent = progress.streak;
    renderProgressTab();
  });

  // Resume straight into the app if a language was already chosen
  if (progress.selectedLang && LANGUAGES[progress.selectedLang]) {
    selectLanguage(progress.selectedLang);
  }
});
