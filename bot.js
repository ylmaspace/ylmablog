export const BOT_LEVELS = { EASY: 0.6, MEDIUM: 0.8, HARD: 0.95 };
export function createTrainingBot(level = "MEDIUM") {
  const skill = BOT_LEVELS[level] ?? BOT_LEVELS.MEDIUM;
  return {
    level,
    errorFactor: 1 - skill,
    step(state) {
      const out = { thrust: 0, stabilize: true };
      if (state.distance > state.targetRadius) out.thrust = 1;
      out.noiseX = (Math.random() - 0.5) * this.errorFactor;
      out.noiseY = (Math.random() - 0.5) * this.errorFactor;
      return out;
    },
  };
}
