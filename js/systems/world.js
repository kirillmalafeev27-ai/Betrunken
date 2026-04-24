// World systems: oxygen, cold, serenity, lens fouling, phases, companion,
// dynamic summit.  All expose pure-ish update functions that mutate state.

import { CONFIG } from "../config.js";
import { clamp, lerp } from "../util.js";

export function phaseRatio(progress) {
  return clamp((progress / CONFIG.SUMMIT_HEIGHT - CONFIG.PHASE_WARM_START) / CONFIG.PHASE_WARM_BAND, 0, 1);
}

export function phaseLabel(progress) {
  const r = progress / CONFIG.SUMMIT_HEIGHT;
  if (r < 0.45) return { label: "снежный склон", mod: "" };
  if (r < 0.78) return { label: "ледяной разлом", mod: "warm" };
  return { label: "вулканическая стена", mod: "hot" };
}

export function updateLens(state, dt) {
  const phase = phaseRatio(state.progress);
  const shieldSlow = state.shieldActiveMs > 0 ? 0.5 : 1;
  const gain = (CONFIG.LENS_BASE_DPS + phase * CONFIG.LENS_PHASE_DPS +
                state.danger * CONFIG.LENS_DANGER_DPS) * shieldSlow;
  state.lens = clamp(state.lens + gain * dt, 0, 1.2);
}

export function updateOxygen(state, dt) {
  const alt = clamp(state.progress / CONFIG.SUMMIT_HEIGHT, 0, 1);
  const rosary = state.relics.includes("rosary") ? 0.78 : 1;
  const drain = (CONFIG.O2_DRAIN + alt * CONFIG.O2_ALT_FACTOR) * rosary;
  state.oxygen = clamp(state.oxygen - drain * dt, 0, 100);
}

export function awardOxygenOnCorrect(state) {
  const bonus = state.relics.includes("iceaxe") ? CONFIG.O2_CORRECT_BONUS + 3 : CONFIG.O2_CORRECT_BONUS;
  state.oxygen = clamp(state.oxygen + bonus, 0, 100);
}

export function penalizeOxygenOnWrong(state) {
  state.oxygen = clamp(state.oxygen - CONFIG.O2_WRONG_PENALTY, 0, 100);
}

export function updateCold(state, dt) {
  state.cold += dt;
  if (state.cold < CONFIG.COLD_STAGE1_SEC) state.sidestepQueueMs = 0;
  else if (state.cold < CONFIG.COLD_STAGE2_SEC) state.sidestepQueueMs = CONFIG.COLD_STAGE1_DELAY;
  else state.sidestepQueueMs = CONFIG.COLD_STAGE2_DELAY;
}

export function warmFingersOnCorrect(state) {
  state.cold = Math.max(0, state.cold - CONFIG.COLD_RELIEF_ON_CORRECT);
}

export function onCorrectAnswer(state) {
  state.correct += 1;
  state.streak += 1;
  state.serenity = Math.min(CONFIG.SERENITY_MAX, state.serenity + 1);
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  awardOxygenOnCorrect(state);
  warmFingersOnCorrect(state);
}

export function onWrongAnswer(state) {
  state.streak = 0;
  state.serenity = 0;
  state.mistakes += 1;
  penalizeOxygenOnWrong(state);
}

export function updateDynamicSummit(state, dt) {
  const paceBonus = clamp(state.progress / Math.max(1, state.elapsed) / 0.25, 0, 1);
  const target = clamp(
    CONFIG.SUMMIT_HEIGHT - paceBonus * 5.4 + state.avalanchesHit * 1.4,
    CONFIG.DYN_SUMMIT_MIN,
    CONFIG.DYN_SUMMIT_MAX
  );
  state.summitDynamic = lerp(state.summitDynamic, target, Math.min(1, dt * 0.35));
}

export function updateCompanion(state) {
  if (state.mistakes >= CONFIG.COMPANION_LIMIT) state.companionLost = true;
}

export function updateStormAndSerenity(state, dt) {
  const base = 0.35 + phaseRatio(state.progress) * 0.4 + state.danger * 0.3;
  const serenityEffect = (state.serenity / CONFIG.SERENITY_MAX) * 0.25;
  const target = clamp(base - serenityEffect, 0.12, 1.2);
  state.stormStrength = lerp(state.stormStrength, target, Math.min(1, dt * 0.6));
}
