// ============================================================
//  STATE
// ============================================================
const state = {
    category:       null,   // 'all' | 'history' | ...
    count:          null,   // 5 | 10 | 20
    questions:      [],     // selected question objects
    currentIdx:     0,
    score:          0,
    wrongAnswers:   [],     // { q, a, c, yourAnswer }
    answered:       false,

    // Review mode
    reviewList:     [],
    reviewIdx:      0,
    reviewScore:    0,
    reviewAnswered: false,

    // For results saving
    lastResult:     null,
};

// ============================================================
//  SCREEN MANAGEMENT
// ============================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
}

// ============================================================
//  HOME – category & count selection
// ============================================================
function selectCategory(btn, cat) {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.category = cat;
    updateStartBtn();
}

function selectCount(btn, n) {
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.count = n;
    updateStartBtn();
}

function updateStartBtn() {
    const btn = document.getElementById('start-btn');
    if (state.category && state.count) {
        btn.classList.remove('disabled');
        btn.disabled = false;
    } else {
        btn.classList.add('disabled');
        btn.disabled = true;
    }
}

// ============================================================
//  QUESTION HELPERS
// ============================================================
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getPool(category) {
    if (category === 'all') {
        return Object.values(QUESTIONS).flat();
    }
    return QUESTIONS[category] || [];
}

function pickQuestions(category, count) {
    const pool = getPool(category);
    return shuffle(pool).slice(0, Math.min(count, pool.length));
}

// ============================================================
//  START QUIZ
// ============================================================
function startQuiz() {
    if (!state.category || !state.count) return;

    state.questions    = pickQuestions(state.category, state.count);
    state.currentIdx   = 0;
    state.score        = 0;
    state.wrongAnswers = [];
    state.answered     = false;

    showScreen('screen-quiz');
    loadQuestion();
}

// ============================================================
//  QUIZ – load question
// ============================================================
function loadQuestion() {
    state.answered = false;
    const q = state.questions[state.currentIdx];
    const total = state.questions.length;
    const idx   = state.currentIdx;

    // Topbar
    document.getElementById('quiz-cat-label').textContent = CATEGORY_NAMES[state.category];
    document.getElementById('quiz-counter').textContent   = `${idx + 1} / ${total}`;

    // Progress
    document.getElementById('quiz-progress').style.width = `${(idx / total) * 100}%`;

    // Question
    document.getElementById('quiz-question').textContent = q.q;

    // Answers
    const container = document.getElementById('quiz-answers');
    container.innerHTML = '';
    q.a.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.className   = 'answer-btn';
        btn.textContent = text;
        btn.onclick     = () => handleAnswer(i, btn, q);
        container.appendChild(btn);
    });

    document.getElementById('quiz-next-btn').style.display = 'none';
}

// ============================================================
//  QUIZ – handle answer
// ============================================================
function handleAnswer(chosenIdx, chosenBtn, q) {
    if (state.answered) return;
    state.answered = true;

    const allBtns = document.querySelectorAll('#quiz-answers .answer-btn');
    allBtns.forEach(b => { b.disabled = true; });

    if (chosenIdx === q.c) {
        chosenBtn.classList.add('correct');
        state.score++;
    } else {
        chosenBtn.classList.add('wrong');
        allBtns[q.c].classList.add('correct');
        state.wrongAnswers.push({ ...q, yourAnswer: q.a[chosenIdx] });
    }

    document.getElementById('quiz-next-btn').style.display = 'inline-block';
}

// ============================================================
//  QUIZ – next question
// ============================================================
function nextQuestion() {
    state.currentIdx++;
    if (state.currentIdx < state.questions.length) {
        loadQuestion();
    } else {
        // Quiz finished — full progress bar
        document.getElementById('quiz-progress').style.width = '100%';
        endQuiz();
    }
}

// ============================================================
//  END QUIZ → review or results
// ============================================================
function endQuiz() {
    if (state.wrongAnswers.length > 0) {
        startReview();
    } else {
        showResults();
    }
}

// ============================================================
//  REVIEW – start
// ============================================================
function startReview() {
    state.reviewList     = shuffle([...state.wrongAnswers]);
    state.reviewIdx      = 0;
    state.reviewScore    = 0;
    state.reviewAnswered = false;

    showScreen('screen-review');
    loadReviewQuestion();
}

// ============================================================
//  REVIEW – load question
// ============================================================
function loadReviewQuestion() {
    state.reviewAnswered = false;
    const q     = state.reviewList[state.reviewIdx];
    const total = state.reviewList.length;
    const idx   = state.reviewIdx;

    document.getElementById('review-counter').textContent = `${idx + 1} / ${total}`;
    document.getElementById('review-progress').style.width = `${(idx / total) * 100}%`;
    document.getElementById('review-question').textContent = q.q;

    const container = document.getElementById('review-answers');
    container.innerHTML = '';
    q.a.forEach((text, i) => {
        const btn = document.createElement('button');
        btn.className   = 'answer-btn';
        btn.textContent = text;
        btn.onclick     = () => handleReviewAnswer(i, btn, q);
        container.appendChild(btn);
    });

    document.getElementById('review-next-btn').style.display = 'none';
}

// ============================================================
//  REVIEW – handle answer
// ============================================================
function handleReviewAnswer(chosenIdx, chosenBtn, q) {
    if (state.reviewAnswered) return;
    state.reviewAnswered = true;

    const allBtns = document.querySelectorAll('#review-answers .answer-btn');
    allBtns.forEach(b => { b.disabled = true; });

    if (chosenIdx === q.c) {
        chosenBtn.classList.add('correct');
        state.reviewScore++;
    } else {
        chosenBtn.classList.add('wrong');
        allBtns[q.c].classList.add('correct');
    }

    document.getElementById('review-next-btn').style.display = 'inline-block';
}

// ============================================================
//  REVIEW – next
// ============================================================
function nextReview() {
    state.reviewIdx++;
    if (state.reviewIdx < state.reviewList.length) {
        document.getElementById('review-progress').style.width =
            `${(state.reviewIdx / state.reviewList.length) * 100}%`;
        loadReviewQuestion();
    } else {
        document.getElementById('review-progress').style.width = '100%';
        showResults();
    }
}

// ============================================================
//  RESULTS
// ============================================================
function showResults() {
    showScreen('screen-results');

    const total   = state.questions.length;
    const score   = state.score;
    const pct     = Math.round((score / total) * 100);
    const hasWrong = state.wrongAnswers.length > 0;

    // Emoji
    let emoji = '😅';
    if (pct >= 90) emoji = '🏆';
    else if (pct >= 70) emoji = '🎉';
    else if (pct >= 50) emoji = '👍';
    document.getElementById('results-emoji').textContent = emoji;

    // Main score card
    document.getElementById('result-score-big').textContent  = `${score}/${total}`;
    document.getElementById('result-score-label').textContent = `${pct}% poprawnych odpowiedzi`;

    // Review score card
    const reviewCard = document.getElementById('result-review-card');
    if (hasWrong) {
        reviewCard.style.display = 'block';
        const rTotal = state.wrongAnswers.length;
        const rScore = state.reviewScore;
        const rPct   = Math.round((rScore / rTotal) * 100);
        document.getElementById('result-review-big').textContent   = `${rScore}/${rTotal}`;
        document.getElementById('result-review-label').textContent = `${rPct}% poprawionych`;
    } else {
        reviewCard.style.display = 'none';
    }

    // Wrong summary list
    const wrongSummary = document.getElementById('wrong-summary');
    const wrongList    = document.getElementById('wrong-list');
    wrongList.innerHTML = '';
    if (state.wrongAnswers.length > 0) {
        wrongSummary.style.display = 'block';
        state.wrongAnswers.forEach(w => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${w.q}</strong><br>Twoja odp: ${w.yourAnswer} → Prawidłowa: ${w.a[w.c]}`;
            wrongList.appendChild(li);
        });
    } else {
        wrongSummary.style.display = 'none';
    }

    // Save button
    document.getElementById('save-btn').disabled = false;
    document.getElementById('save-msg').style.display = 'none';

    // Store last result object
    state.lastResult = {
        id:           Date.now(),
        date:         new Date().toLocaleDateString('pl-PL'),
        category:     CATEGORY_NAMES[state.category],
        count:        total,
        score,
        pct,
        wrongCount:   state.wrongAnswers.length,
        reviewScore:  state.reviewScore,
        reviewTotal:  state.wrongAnswers.length,
    };
}

// ============================================================
//  SAVE RESULT
// ============================================================
function saveResult() {
    if (!state.lastResult) return;

    const history = loadHistory();
    history.unshift(state.lastResult);
    // Keep last 50 results
    localStorage.setItem('quizHistory', JSON.stringify(history.slice(0, 50)));

    document.getElementById('save-btn').disabled = true;
    const msg = document.getElementById('save-msg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
}

// ============================================================
//  HISTORY
// ============================================================
function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem('quizHistory')) || [];
    } catch {
        return [];
    }
}

function showHistory() {
    const history = loadHistory();
    const content = document.getElementById('history-content');

    if (history.length === 0) {
        content.innerHTML = '<p class="history-empty">Brak zapisanych wyników.<br>Zagraj i zapisz swój wynik!</p>';
    } else {
        let html = `<table class="history-table">
            <thead><tr>
                <th>Data</th>
                <th>Kategoria</th>
                <th>Pytania</th>
                <th>Wynik</th>
                <th>%</th>
                <th>Powtórka</th>
            </tr></thead><tbody>`;

        history.forEach(r => {
            const pctClass = r.pct >= 70 ? 'pct-high' : r.pct >= 50 ? 'pct-mid' : 'pct-low';
            const review = r.reviewTotal > 0
                ? `${r.reviewScore}/${r.reviewTotal}`
                : '—';
            html += `<tr>
                <td>${r.date}</td>
                <td>${r.category}</td>
                <td>${r.count}</td>
                <td class="score-cell">${r.score}/${r.count}</td>
                <td class="${pctClass}">${r.pct}%</td>
                <td>${review}</td>
            </tr>`;
        });

        html += '</tbody></table>';
        content.innerHTML = html;
    }

    document.getElementById('modal-history').style.display = 'flex';
}

function closeHistory() {
    document.getElementById('modal-history').style.display = 'none';
}

function confirmClearHistory() {
    document.getElementById('modal-confirm').style.display = 'flex';
}

function closeConfirm() {
    document.getElementById('modal-confirm').style.display = 'none';
}

function clearHistory() {
    localStorage.removeItem('quizHistory');
    closeConfirm();
    closeHistory();
    // If already open, refresh
    showHistory();
}

// ============================================================
//  NAVIGATION
// ============================================================
function goHome() {
    showScreen('screen-home');
}

function restartSame() {
    startQuiz();
}

// ============================================================
//  CLOSE MODALS ON OUTSIDE CLICK
// ============================================================
document.getElementById('modal-history').addEventListener('click', function(e) {
    if (e.target === this) closeHistory();
});
document.getElementById('modal-confirm').addEventListener('click', function(e) {
    if (e.target === this) closeConfirm();
});

// ============================================================
//  INIT — start button disabled by default
// ============================================================
document.getElementById('start-btn').disabled = true;
document.getElementById('start-btn').classList.add('disabled');
