import { ArenaManager } from "./arena-manager.js";
import { OrbitCorrectorArena } from "./arenas/orbit-corrector.js";
import { WindTunnelBuilderArena } from "./arenas/wind-tunnel-builder.js";
import { RendezvousArena } from "./arenas/rendezvous.js";

const SESSION_KEY = "ylma_session_token_v1";
const state = {
  token: localStorage.getItem(SESSION_KEY) || null,
  socket: null,
  me: null,
  snapshot: { players: {}, rooms: {}, clans: {}, mmr: {}, queueSize: 0 },
  activeChallenge: null,
  competitive: { activeMatch: null },
  telemetry: [],
  streak: 0,
};

const el = (id) => document.getElementById(id);
const logEvent = (text) => { const d = document.createElement("div"); d.textContent = `[${new Date().toLocaleTimeString()}] ${text}`; el("events").prepend(d); };
const logMetric = (name, value) => state.telemetry.push({ t: Date.now(), name, value });

const COMP_MODES = {
  DV_WAR: { label: "ΔV WAR", arena: "ORBIT_CORRECTOR", score: (e, a) => e.stability * 0.65 + Math.max(0, 100 - (a.deltaV || 0) * 0.45) * 0.35 },
  WIND_TUNNEL_BATTLE: { label: "WIND TUNNEL BATTLE", arena: "WIND_TUNNEL_BUILDER", score: (e) => (e.score || 0) * 0.8 + e.stability * 0.2 },
  REACTION_ARENA: { label: "REACTION ARENA", arena: "ORBIT_CORRECTOR", score: (e, a) => e.stability + Math.max(0, 40 - ((performance.now() - (a.start || performance.now())) / 1000)) * 1.5 },
  ORBIT_DOMINATION: { label: "ORBIT DOMINATION", arena: "ORBIT_CORRECTOR", score: (e, a) => e.stability * 0.8 + (a.stableSince ? 25 : 0) },
};

function setArenaHud(name, stats) {
  el("arenaName").textContent = name;
  el("arenaTime").textContent = stats.time.toFixed(1);
  el("arenaFuel").textContent = stats.fuel.toFixed(1);
  el("arenaStability").textContent = stats.stability.toFixed(1);
  el("arenaDeltaV").textContent = stats.deltaV.toFixed(2);
  el("arenaEcc").textContent = stats.eccError.toFixed(2);
  el("arenaSmooth").textContent = stats.smoothness.toFixed(1);
}

function grantArenaRewards(evalState) {
  const elapsed = parseFloat(el("arenaTime").textContent || "0");
  const fuel = parseFloat(el("arenaFuel").textContent || "0");
  const xp = Math.round(45 + evalState.stability * 0.55 + Math.max(0, 40 - elapsed) * 0.3);
  const nova = Math.round(35 + evalState.smoothness * 0.35 + fuel * 0.15);
  if (!evalState.stable && evalState.stability > 85) {
    state.me.NOVA = (state.me.NOVA || 0) + 8;
    logEvent("Near miss bonus +8 NOVA");
  }
  if (state.me) { state.me.XP = (state.me.XP || 0) + xp; state.me.NOVA = (state.me.NOVA || 0) + nova; render(); }
  el("arenaResult").textContent = `Órbita certificada ✅ +${xp} XP / +${nova} NOVA`;
  logEvent(`Arena reward: +${xp} XP / +${nova} NOVA`);
  logMetric("arena_reward_xp", xp);
  logMetric("arena_reward_nova", nova);
}

const arenaManager = new ArenaManager({
  canvas: el("arenaCanvas"),
  setHud: setArenaHud,
  grantRewards: grantArenaRewards,
  logEvent,
  onArenaChange: (key) => {
    el("windBuilderPanel").style.display = key === "WIND_TUNNEL_BUILDER" ? "block" : "none";
    el("arenaSelector").value = key;
    el("arenaResult").textContent = "";
  },
});
arenaManager.register("ORBIT_CORRECTOR", () => new OrbitCorrectorArena(logEvent));
arenaManager.register("WIND_TUNNEL_BUILDER", () => new WindTunnelBuilderArena());
arenaManager.register("RENDEZVOUS", () => new RendezvousArena());
arenaManager.switchTo("ORBIT_CORRECTOR");
arenaManager.start();

function uiComp() {
  const m = state.competitive.activeMatch;
  el("compMatchId").textContent = m?.id || "-";
  el("compStake").textContent = m?.stake || 0;
  el("compPot").textContent = m?.pot || 0;
  el("compStatus").textContent = m?.status || "idle";
  el("compMyScore").textContent = m?.scores?.[state.me?.id] ? m.scores[state.me.id].toFixed(1) : "0";
  el("compBoard").innerHTML = m ? Object.entries(m.scores).sort((a,b)=>b[1]-a[1]).map(([id,s],i)=>`#${i+1} ${state.snapshot.players?.[id]?.name||id}: ${s.toFixed(1)}`).join("<br>") : "Sin match activo";
}

window.startCompetitiveMatch = () => {
  if (!state.me) return logEvent("Necesitas sesión para iniciar match competitivo.");
  const modeKey = el("compMode").value; const mode = COMP_MODES[modeKey];
  const stake = Math.max(5, Number(el("stakeInput").value || 0));
  if ((state.me.NOVA || 0) < stake) return logEvent("NOVA insuficiente para stake.");
  if (mode.arena !== arenaManager.activeKey) arenaManager.switchTo(mode.arena);
  state.me.NOVA -= stake;
  const pool = Object.keys(state.snapshot.players || {}).filter((id) => id !== state.me.id).slice(0, 3);
  const entrants = [state.me.id, ...pool];
  state.competitive.activeMatch = { id:`CMP-${Date.now()}`, mode:modeKey, stake, pot: entrants.length * stake, entrants, scores:{}, status:"running", startedAt:Date.now() };
  logEvent(`Match competitivo ${mode.label} iniciado. Stake ${stake} NOVA.`);
  uiComp(); render();
  logMetric("match_start", { mode: modeKey, stake, entrants: entrants.length });
};
window.submitCompetitiveScore = () => {
  const m = state.competitive.activeMatch; if (!m || m.status !== "running") return;
  const mode = COMP_MODES[m.mode]; const evalState = arenaManager.evaluate(false); const score = mode.score(evalState, arenaManager.active);
  const volatility = 1 + (Math.random() - 0.5) * 0.1; // ±5%
  const streakBonus = 1 + Math.min(0.75, state.streak * 0.05);
  m.scores[state.me.id] = score * volatility * streakBonus;
  for (const pid of m.entrants) if (pid !== state.me.id && !m.scores[pid]) m.scores[pid] = score * (0.75 + Math.random() * 0.55);
  logEvent(`Score enviado para ${mode.label}: ${m.scores[state.me.id].toFixed(1)}`); uiComp();
  logMetric("score_submit", m.scores[state.me.id]);
};
window.resolveCompetitiveMatch = () => {
  const m = state.competitive.activeMatch; if (!m || m.status !== "running") return;
  window.submitCompetitiveScore();
  const duration = (Date.now() - m.startedAt) / 1000;
  if (duration < 8) {
    m.status = "invalid";
    state.me.NOVA += m.stake;
    logEvent("Match invalidado por duración mínima (anti-exploit)");
    logMetric("invalid_match_short_duration", duration);
    return;
  }
  const winnerId = Object.entries(m.scores).sort((a,b)=>b[1]-a[1])[0]?.[0];
  m.status = "resolved";
  if (winnerId === state.me.id) { state.me.NOVA += m.pot; state.me.XP += Math.round(m.pot * 0.6); state.streak += 1; logEvent(`🏆 Ganaste ${COMP_MODES[m.mode].label}. +${m.pot} NOVA`); }
  else { state.streak = 0; logEvent(`Perdiste ${COMP_MODES[m.mode].label}. Ganador: ${state.snapshot.players?.[winnerId]?.name || winnerId}`); }
  uiComp(); render();
  logMetric("match_resolve", { winnerId, duration, pot: m.pot, mode: m.mode });
};

window.switchArena = (k) => arenaManager.switchTo(k);
window.arenaInput = (a) => arenaManager.input(a);
window.resetArena = () => arenaManager.reset();
window.evaluateArena = (m) => arenaManager.evaluate(m);
window.addPart = (k) => arenaManager.input(`ADD_PART:${k}`);
window.clearBuild = () => arenaManager.input("CLEAR_BUILD");
window.launchTunnel = () => arenaManager.input("LAUNCH");
window.exportWindBlueprint = () => {
  if (arenaManager.activeKey !== "WIND_TUNNEL_BUILDER") return logEvent("Activa WIND_TUNNEL_BUILDER para exportar.");
  const payload = { arena: arenaManager.active.id, parts: arenaManager.active.parts };
  el("blueprintJson").value = JSON.stringify(payload, null, 2);
  localStorage.setItem("ylma_wind_blueprint_v1", JSON.stringify(payload));
  logEvent("Blueprint exportado.");
};
window.importWindBlueprint = () => {
  if (arenaManager.activeKey !== "WIND_TUNNEL_BUILDER") return logEvent("Activa WIND_TUNNEL_BUILDER para importar.");
  const raw = el("blueprintJson").value || localStorage.getItem("ylma_wind_blueprint_v1");
  if (!raw) return;
  try { const data = JSON.parse(raw); if (!Array.isArray(data.parts)) return; arenaManager.active.parts = data.parts.filter((k)=>arenaManager.active.partsCatalog[k]); logEvent(`Blueprint importado (${arenaManager.active.parts.length} piezas).`); }
  catch { logEvent("Blueprint inválido."); }
};

window.loginGuest = async () => {
  const name = el("guestName").value.trim() || "PILOT";
  const res = await fetch("/api/auth/guest", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name}) });
  if(!res.ok) return logEvent("Error al crear sesión guest");
  const data = await res.json(); state.token = data.token; state.me = data.player; localStorage.setItem(SESSION_KEY, data.token); connectSocket(); logEvent(`Sesión creada para ${data.player.name}`);
};
window.reconnect = () => { if (!state.token) return logEvent("No hay token guardado"); connectSocket(); };
window.setName = () => { const name = el("newName").value.trim(); if (!state.socket || !name) return; state.socket.emit("set_name", name); el("newName").value = ""; };
window.joinRoom = (id) => state.socket?.emit("join_room", id);
window.findMatch = () => state.socket?.emit("find_match");
window.joinClan = (c) => state.socket?.emit("join_clan", c);
window.submitCode = () => state.socket?.emit("challenge_submit", { code: el("code").value });

function connectSocket() {
  if (!state.token) return;
  if (state.socket) state.socket.disconnect();
  state.socket = io({ auth: { token: state.token } });
  state.socket.on("connect", ()=>{ el("status").textContent="conectado"; logEvent("Socket conectado"); });
  state.socket.on("connect_error", (e)=>{ el("status").textContent="error"; logEvent(`Error de conexión: ${e.message}`); });
  state.socket.on("auth_ok", ({me,snapshot})=>{ state.me=me; state.snapshot=snapshot; render(); });
  state.socket.on("state_sync", (snapshot)=>{ state.snapshot=snapshot; if(state.me&&snapshot.players[state.me.id]) state.me=snapshot.players[state.me.id]; render(); });
  state.socket.on("match_found", ({roomId,challenge})=>{ state.activeChallenge=challenge; logEvent(`Partida encontrada en ${roomId}`); render(); });
  state.socket.on("challenge_update", ({submissions})=>{ el("challengeResult").textContent=`Submissions: ${Object.keys(submissions||{}).length}`; });
  state.socket.on("match_result", ({winnerId,rewards,scores})=>{ const name=state.snapshot.players[winnerId]?.name||winnerId; logEvent(`Ganador ${name} (+${rewards.xp} XP / +${rewards.nova} NOVA)`); el("challengeResult").textContent=`Resultado: ${JSON.stringify(scores)}`; });
  state.socket.on("tick", (t)=>el("tick").textContent=t);
  state.socket.on("disconnect", ()=>el("status").textContent="desconectado");
}

function render() {
  const me = state.me || {};
  el("pid").textContent = me.id || "-"; el("ptoken").textContent = state.token || "-"; el("pname").textContent = me.name || "-"; el("pclan").textContent = me.clan || "NONE";
  el("pxp").textContent = me.XP ?? 0; el("pnova").textContent = me.NOVA ?? 0; el("proom").textContent = me.room || "-"; el("pmmr").textContent = state.snapshot.mmr?.[me.id] || 1000;
  el("challenge").innerHTML = state.activeChallenge ? `<b>${state.activeChallenge.title}</b><br>${state.activeChallenge.prompt}<br><span class="mono">input: ${JSON.stringify(state.activeChallenge.input)}</span>` : "Sin reto activo.";
  el("players").innerHTML = Object.values(state.snapshot.players||{}).map((p)=>`${p.name} (${p.id}) • ${p.status} • clan:${p.clan} • sala:${p.room||"-"} • XP:${p.XP} NOVA:${p.NOVA}`).join("<br>") || "Sin jugadores";
  el("clans").innerHTML = Object.entries(state.snapshot.clans||{}).map(([n,c])=>`${n}: miembros=${c.members.length}, clanXP=${c.xp}`).join("<br>");
  const ranked = Object.values(state.snapshot.players||{}).sort((a,b)=>(state.snapshot.mmr?.[b.id]||1000)-(state.snapshot.mmr?.[a.id]||1000));
  el("leaderboard").innerHTML = ranked.slice(0,10).map((p,i)=>`#${i+1} ${p.name} • MMR:${state.snapshot.mmr?.[p.id]||1000} • XP:${p.XP}`).join("<br>") || "Sin datos";
  uiComp();
  if (state.telemetry.length > 2000) state.telemetry = state.telemetry.slice(-1000);
}

setInterval(()=>{ if(state.socket?.connected) state.socket.emit("heartbeat"); }, 4000);
window.addEventListener("keydown", (e)=>{
  if(["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) return;
  if(e.key.toLowerCase()==="w") window.arenaInput("UP");
  if(e.key.toLowerCase()==="s") window.arenaInput("DOWN");
  if(e.key.toLowerCase()==="a") window.arenaInput("LEFT");
  if(e.key.toLowerCase()==="d") window.arenaInput("RIGHT");
  if(e.key.toLowerCase()==="q") window.arenaInput("BACKWARD");
  if(e.key.toLowerCase()==="e") window.arenaInput("FORWARD");
  if(e.code==="Space"){ e.preventDefault(); window.arenaInput("MAIN_TOGGLE"); }
});

render();
if (state.token) window.reconnect();

if (!localStorage.getItem("ylma_onboarding_seen")) {
  logEvent("Tutorial: usa W/A/S/D + Q/E + SPACE para controlar la nave.");
  logEvent("Objetivo inicial: estabilidad > 85% para bonus Near Miss.");
  localStorage.setItem("ylma_onboarding_seen", "1");
}
