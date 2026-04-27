export function flagSuspicious(playerId, reason = "unknown") {
  console.warn("Suspicious player", playerId, reason);
}

export function validateMatch({ deltaV, matchDuration, MAX_DELTA_V_ALLOWED = 1000, MIN_TIME_THRESHOLD = 8 }) {
  if (Math.abs(deltaV) > MAX_DELTA_V_ALLOWED) return { valid: false, reason: "delta_v_exceeded" };
  if (matchDuration < MIN_TIME_THRESHOLD) return { valid: false, reason: "duration_too_short" };
  return { valid: true };
}
