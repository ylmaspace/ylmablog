import { createTrainingBot } from "./bot.js";
const TRAINING_XP_CAP_DAILY = 200;
let trainingXP = Number(localStorage.getItem("training_xp_today") || 0);
export function initTrainingSystem() { window.training = { active: false, bot: createTrainingBot("EASY") }; }
export function getTrainingReward(stability) {
  let xp = Math.round(10 + stability * 0.2);
  if (trainingXP >= TRAINING_XP_CAP_DAILY) xp = 0;
  trainingXP += xp;
  localStorage.setItem("training_xp_today", String(trainingXP));
  return { xp, nova: 0 };
}
