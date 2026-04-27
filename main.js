import * as PhysicsEngine from "./physics-engine.js";
import "./src/app.js";
import { initTrainingSystem } from "./training.js";
import { initStoreSystem } from "./store.js";
import { initProgression } from "./progression.js";
import { initCompetitiveSystem } from "./competitive.js";

window.YLMA = window.YLMA || {};
window.YLMA.physics = PhysicsEngine;
window.YLMA.links = {
  index: "./index.html",
  foro: "./foro.html",
  app: "./src/app.js",
  physics: "./physics-engine.js",
  arenas: "./arena-registry.js",
};
window.YLMA.modules = { gameplay: "src/app.js", render: "render.js", network: "network.js" };

initTrainingSystem();
initStoreSystem();
initProgression();
initCompetitiveSystem();

setupSpaNavigation();
setupHomeContent();
setupCompetitionFlow();
setupTrainingFlow();
setupForumFlow();
setupStoreAndGroup();

function setupSpaNavigation() {
  const buttons = [...document.querySelectorAll(".nav-btn")];
  const sections = [...document.querySelectorAll(".spa-section")];
  const open = (id) => {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.section === id));
    sections.forEach((s) => s.classList.toggle("active", s.id === id));
  };
  buttons.forEach((btn) => btn.addEventListener("click", () => open(btn.dataset.section)));
  [...document.querySelectorAll("[data-section-jump]")].forEach((el) => el.addEventListener("click", () => open(el.dataset.sectionJump)));
}

function setupHomeContent() {
  const news = ["Nueva temporada orbital disponible", "Balance competitivo ajustado", "Evento: Sprint de rendezvous"]; 
  const events = ["Weekend x1.2 XP en entrenamiento", "Bonus grupal +8% NOVA", "Reto comunitario: estabilidad 90+"];
  const newsList = document.getElementById("newsList");
  const eventsList = document.getElementById("eventsList");
  if (newsList) newsList.innerHTML = news.map((n) => `• ${n}`).join("<br>");
  if (eventsList) eventsList.innerHTML = events.map((n) => `• ${n}`).join("<br>");
}

function setupCompetitionFlow() {
  const startBtn = document.getElementById("startCompetitionFlow");
  const mm = document.getElementById("mmStatus");
  const lobby = document.getElementById("lobbyStatus");
  const carousel = document.getElementById("arenaCarousel");
  const selected = document.getElementById("selectedArenaName");
  if (!startBtn || !mm || !lobby || !carousel || !selected) return;

  const arenas = ["orbit_corrector", "wind_tunnel_builder", "rendezvous"];
  let interval = null;

  const renderCarousel = (activeIndex = 0) => {
    carousel.innerHTML = arenas.map((a, i) => `<div class="carousel-item ${i === activeIndex ? "active" : ""}">${a}</div>`).join("");
  };
  renderCarousel(0);

  startBtn.onclick = async () => {
    mm.textContent = "Matchmaking: buscando (máx 20s)...";
    await wait(2500 + Math.random() * 2500);
    mm.textContent = "Matchmaking: lobby encontrado";

    const humans = 2 + Math.floor(Math.random() * 4);
    const bots = Math.max(0, 6 - humans);
    lobby.textContent = `Lobby: ${humans} jugadores + ${bots} bots`;

    let idx = 0;
    interval = setInterval(() => {
      idx = (idx + 1) % arenas.length;
      renderCarousel(idx);
    }, 220);

    await wait(2800);
    clearInterval(interval);
    const finalArena = arenas[Math.floor(Math.random() * arenas.length)];
    const finalIdx = arenas.indexOf(finalArena);
    renderCarousel(finalIdx);
    selected.textContent = finalArena;

    await loadArenaModule(finalArena);
    const map = { orbit_corrector: "ORBIT_CORRECTOR", wind_tunnel_builder: "WIND_TUNNEL_BUILDER", rendezvous: "RENDEZVOUS" };
    if (window.switchArena) window.switchArena(map[finalArena]);
  };
}

async function loadArenaModule(arenaName) {
  const modulePath = `/arenas/${arenaName}/arena.js`;
  try {
    await import(modulePath);
    document.getElementById("mmStatus").textContent = `Arena cargada dinámicamente desde ${modulePath}`;
  } catch {
    document.getElementById("mmStatus").textContent = `Fallback local para ${arenaName} (sin bundle /arenas)`;
  }
}

function setupTrainingFlow() {
  const arenaSel = document.getElementById("trainingArena");
  const diffSel = document.getElementById("trainingDifficulty");
  const reward = document.getElementById("trainingReward");
  const start = document.getElementById("startTrainingBtn");
  const status = document.getElementById("trainingStatus");
  if (!arenaSel || !diffSel || !reward || !start || !status) return;

  const calc = () => {
    const base = 10;
    const mult = { EASY: 1, MEDIUM: 1.35, HARD: 1.8 }[diffSel.value] || 1;
    reward.value = String(Math.round(base * mult));
  };
  diffSel.onchange = calc;
  calc();

  start.onclick = () => {
    status.textContent = `Entrenamiento iniciado en ${arenaSel.value} vs BOT ${diffSel.value}. Recompensa NOVA: 0 | XP: ${reward.value}`;
    if (window.switchArena) window.switchArena(arenaSel.value);
  };
}

function setupForumFlow() {
  const postsEl = document.getElementById("forumPosts");
  const chatEl = document.getElementById("forumChat");
  const onlineEl = document.getElementById("forumOnline");
  const publish = document.getElementById("publishForumPost");
  const send = document.getElementById("sendForumChat");
  if (!postsEl || !chatEl || !onlineEl || !publish || !send) return;

  const posts = JSON.parse(localStorage.getItem("ylma_spa_forum_posts") || "[]");
  const chat = JSON.parse(localStorage.getItem("ylma_spa_forum_chat") || "[]");
  let online = 12;

  const render = () => {
    postsEl.innerHTML = posts.map((p) => `<div style="border-top:1px solid #274f75;padding:8px 0"><b>${p.title}</b><br>${p.body}<br><span class='muted'>❤️ ${p.likes} • ${p.author}</span></div>`).join("") || "Sin publicaciones";
    chatEl.innerHTML = chat.slice(-30).map((m) => `<div><b>${m.user}</b>: ${m.text}</div>`).join("");
    onlineEl.textContent = String(online);
  };

  publish.onclick = () => {
    const title = document.getElementById("forumTitle").value.trim();
    const body = document.getElementById("forumBody").value.trim();
    if (!title || !body) return;
    posts.unshift({ title, body, likes: 0, author: window.YLMACommunityBridge?.getProfile?.().name || "Guest" });
    localStorage.setItem("ylma_spa_forum_posts", JSON.stringify(posts));
    window.YLMACommunityBridge?.applyReward?.({ xp: 30, nova: 2, reason: "post_foro_spa" });
    render();
  };

  send.onclick = () => {
    const text = document.getElementById("forumChatInput").value.trim();
    if (!text) return;
    chat.push({ user: window.YLMACommunityBridge?.getProfile?.().name || "Guest", text });
    localStorage.setItem("ylma_spa_forum_chat", JSON.stringify(chat));
    render();
  };

  setInterval(() => {
    online = Math.max(6, online + Math.floor(Math.random() * 5) - 2);
    if (Math.random() > 0.62) chat.push({ user: "NovaBot", text: "Nuevo reto en arena disponible" });
    render();
  }, 4500);

  render();
}

function setupStoreAndGroup() {
  const store = document.getElementById("storeItems");
  const groupBtn = document.getElementById("joinGroupBtn");
  const groupCode = document.getElementById("groupCode");
  const groupStatus = document.getElementById("groupStatus");
  if (store) {
    store.innerHTML = [
      "Pack piezas básicas — 120 NOVA",
      "Expansión arenas — 500 NOVA",
      "Multiplicador XP x1.2 — 200 XP",
      "Perk estabilidad — 350 NOVA",
    ].map((i) => `• ${i}`).join("<br>");
  }
  if (groupBtn && groupCode && groupStatus) {
    groupBtn.onclick = () => {
      const code = groupCode.value.trim().toUpperCase();
      if (!code) return;
      groupStatus.textContent = `Grupo ${code} unido. Bonus grupal activo +8% XP/NOVA`;
    };
  }
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
