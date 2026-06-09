import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const QUIZ_LENGTH = 20;
const bank = window.QUESTION_BANK || [];
const config = window.FIREBASE_CONFIG || {};
const configured = config.apiKey && !String(config.apiKey).startsWith("PEGA_AQUI") && config.databaseURL && !String(config.databaseURL).includes("TU-PROYECTO");
let db = null;

if (configured) {
  try {
    const app = initializeApp(config);
    db = getDatabase(app);
    setStatus("Ranking en línea activo con Firebase Realtime Database.", "ok");
  } catch (error) {
    console.error(error);
    setStatus("No se pudo iniciar Firebase. El juego funcionará en modo demo local.", "danger");
  }
} else {
  setStatus("Modo demo local: configura firebase-config.js para activar ranking compartido entre estudiantes.", "danger");
}

const $ = (id) => document.getElementById(id);
$("bankSize").textContent = bank.length;

let state = {
  player: null,
  course: null,
  questions: [],
  index: 0,
  answers: {},
  lastResult: null
};

$("startBtn").addEventListener("click", startQuiz);
$("prevBtn").addEventListener("click", () => move(-1));
$("nextBtn").addEventListener("click", () => move(1));
$("finishBtn").addEventListener("click", finishQuiz);
$("newAttemptBtn").addEventListener("click", () => location.reload());
$("reviewBtn").addEventListener("click", () => $("reviewList").classList.toggle("hidden"));
$("refreshBtn").addEventListener("click", loadLeaderboard);

loadLeaderboard();

function setStatus(message, kind="") {
  const node = $("firebaseStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `notice ${kind}`;
}

function startQuiz(){
  const name = $("playerName").value.trim();
  const course = $("playerCourse").value.trim() || "Sin curso";
  if(name.length < 2){
    alert("Escribe el nombre del estudiante.");
    return;
  }
  state.player = sanitize(name);
  state.course = sanitize(course);
  state.questions = shuffle([...bank]).slice(0, QUIZ_LENGTH);
  state.index = 0;
  state.answers = {};
  $("startPanel").classList.add("hidden");
  $("quizPanel").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion(){
  const q = state.questions[state.index];
  $("questionCounter").textContent = state.index + 1;
  $("progress").value = state.index + 1;
  $("answeredCount").textContent = Object.keys(state.answers).length;
  $("questionMeta").textContent = `${q.id} · ${q.category} · Página ${q.page}`;
  $("questionText").textContent = q.question;
  $("pageImage").src = q.pageImage;
  $("pageImage").alt = `Página ${q.page} del cuadernillo ${q.year}`;
  const options = $("options");
  options.innerHTML = "";
  for (const letter of ["A","B","C","D"]) {
    const btn = document.createElement("button");
    btn.className = "option" + (state.answers[q.id] === letter ? " selected" : "");
    btn.innerHTML = `<span class="letter">${letter}</span><span>${escapeHtml(q.options[letter])}</span>`;
    btn.addEventListener("click", () => {
      state.answers[q.id] = letter;
      renderQuestion();
    });
    options.appendChild(btn);
  }
  $("prevBtn").disabled = state.index === 0;
  $("nextBtn").disabled = state.index === state.questions.length - 1;
}

function move(direction){
  state.index = Math.min(state.questions.length - 1, Math.max(0, state.index + direction));
  renderQuestion();
}

async function finishQuiz(){
  if(Object.keys(state.answers).length < QUIZ_LENGTH){
    const missing = QUIZ_LENGTH - Object.keys(state.answers).length;
    if(!confirm(`Faltan ${missing} pregunta(s) por responder. ¿Deseas finalizar de todos modos?`)) return;
  }
  const detail = state.questions.map(q => {
    const selected = state.answers[q.id] || "";
    const correct = selected === q.correctAnswer;
    return { id:q.id, year:q.year, number:q.number, selected, correctAnswer:q.correctAnswer, correct };
  });
  const score = detail.filter(d => d.correct).length;
  const percentage = Math.round((score / QUIZ_LENGTH) * 100);
  const result = {
    name: state.player,
    course: state.course,
    score,
    total: QUIZ_LENGTH,
    percentage,
    finishedAt: Date.now(),
    details: detail
  };
  state.lastResult = result;
  await saveResult(result);
  renderResults(result);
  $("quizPanel").classList.add("hidden");
  $("resultsPanel").classList.remove("hidden");
}

async function saveResult(result){
  if(db){
    const id = push(ref(db, "results")).key;
    await set(ref(db, `results/${id}`), {...result, createdAt: serverTimestamp()});
  } else {
    const local = JSON.parse(localStorage.getItem("icfesResults") || "[]");
    local.push(result);
    localStorage.setItem("icfesResults", JSON.stringify(local));
    loadLeaderboard();
  }
}

function renderResults(result){
  $("resultSummary").innerHTML = `
    <div class="metric"><span>Puntaje</span><strong>${result.score}/${result.total}</strong></div>
    <div class="metric"><span>Porcentaje</span><strong>${result.percentage}%</strong></div>
    <div class="metric"><span>Jugador</span><strong>${escapeHtml(result.name)}</strong><small>${escapeHtml(result.course)}</small></div>
  `;
  const review = $("reviewList");
  review.innerHTML = "";
  state.questions.forEach((q, i) => {
    const selected = state.answers[q.id] || "Sin responder";
    const ok = selected === q.correctAnswer;
    const item = document.createElement("article");
    item.className = `review-item ${ok ? "correct" : "wrong"}`;
    item.innerHTML = `
      <p class="tag">${i+1}. ${q.id}</p>
      <h3>${escapeHtml(q.question)}</h3>
      <p><strong>Tu respuesta:</strong> ${escapeHtml(selected)} ${selected && q.options[selected] ? "- " + escapeHtml(q.options[selected]) : ""}</p>
      <p><strong>Respuesta correcta:</strong> ${q.correctAnswer} - ${escapeHtml(q.options[q.correctAnswer])}</p>
      <p class="feedback">${escapeHtml(q.feedback)}</p>
      <p class="muted">${escapeHtml(q.sourceCredit)} Archivo: ${escapeHtml(q.sourceFile)}, página ${q.page}.</p>
    `;
    review.appendChild(item);
  });
  loadLeaderboard();
}

function loadLeaderboard(){
  if(db){
    onValue(ref(db, "results"), snap => renderLeaderboard(snapshotToArray(snap.val())), { onlyOnce:false });
  } else {
    renderLeaderboard(JSON.parse(localStorage.getItem("icfesResults") || "[]"));
  }
}

function renderLeaderboard(rows){
  const board = $("leaderboard");
  const sorted = [...rows].sort((a,b) => (b.score-a.score) || (b.percentage-a.percentage) || (a.finishedAt-b.finishedAt)).slice(0,30);
  if(!sorted.length){
    board.innerHTML = `<p class="muted">Aún no hay resultados registrados.</p>`;
    return;
  }
  board.innerHTML = sorted.map((r,i) => `
    <div class="rank-row">
      <strong>#${i+1}</strong>
      <div><div class="rank-name">${escapeHtml(r.name || "Estudiante")}</div><div class="rank-meta">${escapeHtml(r.course || "Sin curso")} · ${formatDate(r.finishedAt)}</div></div>
      <div class="rank-score">${Number(r.score || 0)}/${Number(r.total || QUIZ_LENGTH)}</div>
    </div>
  `).join("");
}

function snapshotToArray(value){
  if(!value) return [];
  return Object.entries(value).map(([id,row]) => ({id, ...row}));
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
function sanitize(text){ return text.replace(/[<>]/g, "").slice(0,80); }
function escapeHtml(text){ return String(text ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(ts){
  if(!ts) return "sin fecha";
  return new Intl.DateTimeFormat("es-CO", {dateStyle:"short", timeStyle:"short"}).format(new Date(ts));
}
