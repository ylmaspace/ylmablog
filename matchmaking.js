export function getCommonContent(players = []) {
  const arenaSets = players.map((p) => new Set(p?.unlockedContent?.arenas || []));
  if (!arenaSets.length) return [];
  return [...arenaSets[0]].filter((a) => arenaSets.every((s) => s.has(a)));
}

export function pickWeightedArena(pool, weights = {}) {
  const entries = pool.map((k) => ({ k, w: weights[k] ?? 1 }));
  const sum = entries.reduce((a, b) => a + b.w, 0) || 1;
  let r = Math.random() * sum;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.k;
  }
  return entries[0]?.k;
}
