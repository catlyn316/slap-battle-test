const QUESTION_COUNT = 25;
const TIMER_SECONDS = 30;

const screens = {
  start: document.querySelector("#startScreen"),
  quiz: document.querySelector("#quizScreen"),
  pass: document.querySelector("#passScreen"),
  fail: document.querySelector("#failScreen"),
};

const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const questionCounter = document.querySelector("#questionCounter");
const questionText = document.querySelector("#questionText");
const optionsContainer = document.querySelector("#options");
const timerCount = document.querySelector("#timerCount");
const timerArc = document.querySelector("#timerArc");
const timerDisplay = document.querySelector("#timerDisplay");

let examQuestions = [];
let currentIndex = 0;
let mistakeCount = 0;
let timerInterval = null;
let secondsLeft = TIMER_SECONDS;

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

function shuffle(items) {
  const list = [...items];

  for (let index = list.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
  }

  return list;
}

function parseQuestions(rawText) {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  const blocks = normalized
    .split(/\n(?=\d+[.:：])/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const withoutNumber = block.replace(/^\d+[.:：]\s*/, "").trim();
    const optionStart = withoutNumber.search(/(?:^|\s|\n)a\s*[.:：]/i);
    const title = withoutNumber.slice(0, optionStart).trim();
    const optionText = withoutNumber.slice(optionStart).replace(/\n/g, " ");
    const markerPattern = /([a-d])\s*[.:：]\s*/gi;
    const markers = [...optionText.matchAll(markerPattern)];

    const options = markers.map((marker, index) => {
      const nextMarker = markers[index + 1];
      const start = marker.index + marker[0].length;
      const end = nextMarker ? nextMarker.index : optionText.length;
      const rawOption = optionText.slice(start, end).trim();
      const isCorrect = rawOption.includes("✅");

      return {
        letter: marker[1].toLowerCase(),
        text: rawOption.replaceAll("✅", "").trim(),
        isCorrect,
      };
    });

    return {
      question: title,
      options,
    };
  }).filter((item) => item.question && item.options.length >= 2);
}

// ── Timer helpers ──────────────────────────────────────────────
function updateTimerUI(seconds) {
  timerCount.textContent = seconds;

  // SVG arc: circumference = 2π × r ≈ 100 (we set it up that way)
  const progress = seconds / TIMER_SECONDS; // 1 → 0
  timerArc.style.strokeDashoffset = 100 - progress * 100;

  // Colour shifts: green → gold → red
  if (seconds > 15) {
    timerArc.style.stroke = "#70f0ff";
    timerDisplay.classList.remove("timer-warning", "timer-danger");
  } else if (seconds > 8) {
    timerArc.style.stroke = "#ffd166";
    timerDisplay.classList.add("timer-warning");
    timerDisplay.classList.remove("timer-danger");
  } else {
    timerArc.style.stroke = "#ff5a7d";
    timerDisplay.classList.remove("timer-warning");
    timerDisplay.classList.add("timer-danger");
  }
}

function startTimer() {
  clearInterval(timerInterval);
  secondsLeft = TIMER_SECONDS;
  updateTimerUI(secondsLeft);

  timerInterval = setInterval(() => {
    secondsLeft -= 1;
    updateTimerUI(secondsLeft);

    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timeUp();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function timeUp() {
  // Disable all option buttons to prevent further clicks
  optionsContainer.querySelectorAll(".option-button").forEach((btn) => {
    btn.disabled = true;
  });

  // Count as a mistake and immediately finish (fail)
  mistakeCount += 1;
  setTimeout(() => {
    showScreen("fail");
    setTimeout(exitPage, 1700);
  }, 420);
}

// ── Core quiz logic ────────────────────────────────────────────
function startExam() {
  const source = typeof window.QUESTION_SOURCE === "string"
    ? window.QUESTION_SOURCE
    : window.QUESTION_SOURCE?.value || "";
  const allQuestions = parseQuestions(source);

  examQuestions = shuffle(allQuestions).slice(0, QUESTION_COUNT).map((question) => ({
    ...question,
    options: shuffle(question.options),
  }));

  currentIndex = 0;
  mistakeCount = 0;
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const currentQuestion = examQuestions[currentIndex];
  questionCounter.textContent = `第 ${currentIndex + 1} / ${QUESTION_COUNT} 題`;
  questionText.textContent = currentQuestion.question;
  optionsContainer.innerHTML = "";

  currentQuestion.options.forEach((option, index) => {
    const button = document.createElement("button");
    const visibleLetter = String.fromCharCode(65 + index);
    button.className = "option-button";
    button.type = "button";
    button.innerHTML = `<span class="option-letter">${visibleLetter}</span>${option.text}`;
    button.addEventListener("click", () => chooseOption(option));
    optionsContainer.append(button);
  });

  startTimer();
}

function chooseOption(option) {
  stopTimer();

  if (!option.isCorrect) {
    mistakeCount += 1;
  }

  currentIndex += 1;

  if (currentIndex < examQuestions.length) {
    renderQuestion();
    return;
  }

  finishExam();
}

function finishExam() {
  stopTimer();

  if (mistakeCount === 0) {
    showScreen("pass");
    return;
  }

  showScreen("fail");
  setTimeout(exitPage, 1700);
}

function exitPage() {
  window.open("", "_self");
  window.close();

  setTimeout(() => {
    window.location.replace("about:blank");
  }, 500);
}

startButton.addEventListener("click", startExam);
restartButton.addEventListener("click", startExam);
