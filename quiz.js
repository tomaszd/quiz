const questions = [
    {
        question: "Jaka jest stolica Polski?",
        answers: ["Kraków", "Warszawa", "Gdańsk", "Wrocław"],
        correct: 1
    },
    {
        question: "Ile wynosi 7 × 8?",
        answers: ["54", "56", "58", "64"],
        correct: 1
    },
    {
        question: "Który planet jest największy w Układzie Słonecznym?",
        answers: ["Saturn", "Uran", "Jowisz", "Neptun"],
        correct: 2
    },
    {
        question: "W którym roku wybuchła II wojna światowa?",
        answers: ["1935", "1937", "1939", "1941"],
        correct: 2
    },
    {
        question: "Jaki jest symbol chemiczny złota?",
        answers: ["Go", "Gl", "Ag", "Au"],
        correct: 3
    }
];

let current = 0;
let score = 0;
let answered = false;

function loadQuestion() {
    answered = false;
    const q = questions[current];
    document.getElementById("question-counter").textContent =
        `Pytanie ${current + 1} z ${questions.length}`;
    document.getElementById("question").textContent = q.question;
    document.getElementById("next-btn").style.display = "none";

    const answersDiv = document.getElementById("answers");
    answersDiv.innerHTML = "";

    q.answers.forEach((answer, index) => {
        const btn = document.createElement("button");
        btn.className = "answer-btn";
        btn.textContent = answer;
        btn.onclick = () => selectAnswer(index, btn);
        answersDiv.appendChild(btn);
    });
}

function selectAnswer(index, btn) {
    if (answered) return;
    answered = true;

    const correct = questions[current].correct;
    const allBtns = document.querySelectorAll(".answer-btn");

    allBtns.forEach(b => b.style.pointerEvents = "none");

    if (index === correct) {
        btn.classList.add("correct");
        score++;
    } else {
        btn.classList.add("wrong");
        allBtns[correct].classList.add("correct");
    }

    document.getElementById("next-btn").style.display = "inline-block";
}

function nextQuestion() {
    current++;
    if (current < questions.length) {
        loadQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    document.getElementById("quiz-box").style.display = "none";
    document.getElementById("result-box").style.display = "block";

    const percent = Math.round((score / questions.length) * 100);
    let emoji = percent >= 80 ? "🏆" : percent >= 50 ? "👍" : "😅";

    document.getElementById("score-text").textContent =
        `${emoji} Zdobyłeś ${score} z ${questions.length} punktów (${percent}%)`;
}

function restartQuiz() {
    current = 0;
    score = 0;
    document.getElementById("quiz-box").style.display = "block";
    document.getElementById("result-box").style.display = "none";
    loadQuestion();
}

loadQuestion();
