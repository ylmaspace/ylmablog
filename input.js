export function bindArenaInput(map) {
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
    const action = map[e.code] || map[e.key?.toLowerCase?.()];
    if (action) { e.preventDefault(); action(); }
  });
}
