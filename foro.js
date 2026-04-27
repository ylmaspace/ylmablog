const KEY = "ylma_foro_v1";
const CHAT_KEY = "ylma_foro_chat_v1";

const CATEGORIES = [
  { name: "🚀 General", sub: ["Noticias YLMA", "Ideas del proyecto"] },
  { name: "🧠 Aprendizaje", sub: ["Física espacial", "Código y simulación"] },
  { name: "🎮 Arena & Competitivo", sub: ["Estrategias", "Clips y jugadas", "Retos"] },
  { name: "🛠 Ingeniería", sub: ["Diseño de naves", "Builds del túnel de viento"] },
  { name: "🧪 Experimental", sub: ["Ideas locas", "Nuevas arenas"] },
];

const RANKS = [
  { name: "Cadete", xp: 0 },
  { name: "Piloto", xp: 300 },
  { name: "Comandante", xp: 900 },
  { name: "Ingeniero orbital", xp: 1800 },
];

const state = {
  me: null,
  posts: [],
  notifications: [],
  chat: [],
  online: 18,
  showTrendingOnly: false,
};

const $ = (id) => document.getElementById(id);
const read = (k, fallback) => JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback));
const write = (k, val) => localStorage.setItem(k, JSON.stringify(val));

function getRank(xp = 0) {
  return [...RANKS].reverse().find((r) => xp >= r.xp)?.name || RANKS[0].name;
}

function createDefaultPost() {
  return {
    id: `p-${Date.now()}`,
    title: "Bienvenidos a la tripulación YLMA",
    category: "🚀 General",
    subcategory: "Noticias YLMA",
    author: "YLMA_ADMIN",
    content: "Comparte resultados de arena, clips y aprendizaje de física orbital.",
    likes: 12,
    pinned: true,
    image: "",
    replies: [{ author: "Mentor", text: "Listos para despegar 🚀", likes: 3 }],
    tags: ["#onboarding", "#ylma"],
    createdAt: Date.now() - 1000 * 60 * 40,
  };
}

function getBridgeProfile() {
  const bridge = window.opener?.YLMACommunityBridge || window.YLMACommunityBridge;
  if (bridge?.getProfile) return bridge.getProfile();
  return { name: "GuestPilot", xp: 140, nova: 40, avatar: "🧑‍🚀", role: "user", postsHistory: [] };
}

function addReward(reason, xp, nova = 0) {
  state.me.xp += xp;
  state.me.nova += nova;
  state.notifications.unshift({ text: `+${xp} XP / +${nova} NOVA • ${reason}`, at: Date.now() });
  const bridge = window.opener?.YLMACommunityBridge || window.YLMACommunityBridge;
  bridge?.applyReward?.({ xp, nova, reason });
}

function bootstrap() {
  state.me = getBridgeProfile();
  state.posts = read(KEY, [createDefaultPost()]);
  state.chat = read(CHAT_KEY, []);
  renderCategorySelectors();
  bindEvents();
  renderAll();
  simulateLiveSignals();
}

function renderCategorySelectors() {
  const cats = ["Todas", ...CATEGORIES.map((c) => c.name)];
  $("categoryFilter").innerHTML = cats.map((c) => `<option>${c}</option>`).join("");
  $("postCategory").innerHTML = CATEGORIES.map((c) => c.sub.map((s) => `<option value="${c.name}::${s}">${c.name} / ${s}</option>`).join("")).join("");
  $("sections").innerHTML = `<h3>Secciones</h3>${CATEGORIES.map((c) => `<div class="small"><b>${c.name}</b><br>${c.sub.join(" • ")}</div>`).join("<hr>")}`;
}

function renderProfile() {
  const rank = getRank(state.me.xp);
  $("profileCard").innerHTML = `
    <div class="card">
      <h3>Perfil</h3>
      <div>${state.me.avatar} <b>${state.me.name}</b></div>
      <div class="small">Rango: ${rank}</div>
      <div class="small">XP: ${state.me.xp} • NOVA: ${state.me.nova}</div>
      <div class="small">Posts: ${state.posts.filter((p) => p.author === state.me.name).length}</div>
    </div>
  `;
}

function renderPosts() {
  const q = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  let posts = [...state.posts];
  if (category && category !== "Todas") posts = posts.filter((p) => p.category === category);
  if (q) posts = posts.filter((p) => [p.title, p.content, p.author, p.tags.join(" ")].join(" ").toLowerCase().includes(q));
  if (state.showTrendingOnly) posts.sort((a, b) => (b.likes + b.replies.length * 2) - (a.likes + a.replies.length * 2));

  $("postFeed").innerHTML = `<h3>Hilos</h3>${posts.map((p) => `
    <article class="post">
      <h4>${p.pinned ? "📌" : ""} ${p.title}</h4>
      <div class="meta">${p.category} / ${p.subcategory} • por ${p.author} • ❤️ ${p.likes}</div>
      <p>${p.content}</p>
      ${p.image ? `<img src="${p.image}" alt="adjunto" style="max-width:100%;border-radius:8px;border:1px solid #325a83" />` : ""}
      <div class="small">${p.tags.map((t) => `<span class="tag">${t}</span>`).join(" ")}</div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button data-like="${p.id}">Like</button>
        <button data-reply="${p.id}">Responder</button>
        ${state.me.role !== "user" ? `<button data-pin="${p.id}">${p.pinned ? "Desfijar" : "Fijar"}</button><button data-delete="${p.id}">Eliminar</button>` : ""}
      </div>
      <div>${p.replies.map((r) => `<div class="reply"><b>${r.author}</b>: ${r.text} <span class="small">❤️ ${r.likes || 0}</span></div>`).join("")}</div>
    </article>
  `).join("") || "<p class='small'>Sin resultados.</p>"}`;

  $("pinnedPosts").innerHTML = `<h3>📌 Posts fijados</h3>${state.posts.filter((p) => p.pinned).map((p) => `<div class='small'>${p.title} • ${p.author}</div>`).join("") || "<div class='small'>No hay hilos fijados.</div>"}`;
}

function renderNotifications() {
  $("notificationList").innerHTML = state.notifications.slice(0, 8).map((n) => `<div class="small">${new Date(n.at).toLocaleTimeString()} • ${n.text}</div>`).join("") || "<div class='small'>Sin notificaciones.</div>";
}

function renderTrending() {
  const top = [...state.posts].sort((a, b) => (b.likes + b.replies.length) - (a.likes + a.replies.length)).slice(0, 5);
  $("trendingList").innerHTML = top.map((p, i) => `<div class="small">#${i + 1} ${p.title}<br><span class='meta'>${p.likes} likes • ${p.replies.length} respuestas</span></div>`).join("<hr>");
}

function renderChat() {
  $("onlineIndicator").textContent = `${state.online} online`;
  $("chatMessages").innerHTML = state.chat.slice(-60).map((m) => `<div class='small'><b>${m.user}</b>: ${m.text}</div>`).join("");
}

function renderAll() {
  renderProfile();
  renderPosts();
  renderNotifications();
  renderTrending();
  renderChat();
}

function bindEvents() {
  $("createPostBtn").onclick = () => $("postDialog").showModal();
  $("postForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const [category, subcategory] = $("postCategory").value.split("::");
    const post = {
      id: `p-${Date.now()}`,
      title: $("postTitle").value,
      content: $("postContent").value,
      image: $("postImage").value,
      category,
      subcategory,
      author: state.me.name,
      likes: 0,
      pinned: false,
      replies: [],
      tags: ["#nuevo", "#ylma"],
      createdAt: Date.now(),
    };
    state.posts.unshift(post);
    write(KEY, state.posts);
    addReward("Crear publicación", 35, 2);
    $("postDialog").close();
    e.target.reset();
    renderAll();
  });

  $("searchInput").oninput = renderPosts;
  $("categoryFilter").onchange = renderPosts;
  $("toggleTrending").onclick = () => { state.showTrendingOnly = !state.showTrendingOnly; renderPosts(); };

  $("postFeed").onclick = (e) => {
    const id = e.target.dataset.like || e.target.dataset.reply || e.target.dataset.pin || e.target.dataset.delete;
    if (!id) return;
    const post = state.posts.find((p) => p.id === id);
    if (!post) return;

    if (e.target.dataset.like) {
      post.likes += 1;
      addReward("Recibir/emitir interacción", 8, post.likes > 20 ? 10 : 0);
      if (post.likes === 15) state.notifications.unshift({ text: `Post viral: ${post.title} (+NOVA)`, at: Date.now() });
    }
    if (e.target.dataset.reply) {
      const text = prompt("Responder (usa @usuario para menciones):");
      if (text) {
        post.replies.push({ author: state.me.name, text, likes: 0 });
        addReward("Responder hilo", 20, text.includes("@") ? 2 : 0);
        if (text.includes("@")) state.notifications.unshift({ text: `Mención detectada en ${post.title}`, at: Date.now() });
      }
    }
    if (e.target.dataset.pin && state.me.role !== "user") post.pinned = !post.pinned;
    if (e.target.dataset.delete && state.me.role !== "user") state.posts = state.posts.filter((p) => p.id !== id);

    write(KEY, state.posts);
    renderAll();
  };

  $("sendChatBtn").onclick = sendChat;
  $("chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
}

function sendChat() {
  const text = $("chatInput").value.trim();
  if (!text) return;
  state.chat.push({ user: state.me.name, text, t: Date.now() });
  write(CHAT_KEY, state.chat);
  $("chatInput").value = "";
  renderChat();
}

function simulateLiveSignals() {
  setInterval(() => {
    state.online = Math.max(8, state.online + Math.floor(Math.random() * 5) - 2);
    if (Math.random() > 0.55) {
      state.chat.push({ user: ["Nova", "Orion", "Vega", "Mentor"][Math.floor(Math.random() * 4)], text: ["GG en ORBIT", "Nuevo build en túnel", "¿Quién para reto?", "Subí clip al foro"][Math.floor(Math.random() * 4)], t: Date.now() });
      state.chat = state.chat.slice(-120);
      write(CHAT_KEY, state.chat);
    }
    renderChat();
  }, 4000);
}

bootstrap();
