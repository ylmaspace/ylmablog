const KEY = "ylma_ghost_runs";
export function saveGhostRun(name, history) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  data[name] = history;
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function loadGhostRun(name) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  return data[name] || [];
}
