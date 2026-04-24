// Game state + persistent stats in localStorage.

import { CONFIG } from "./config.js";

const STORAGE_KEY = "bergstieg.v1";

export function createState() {
  return {
    // Lifecycle
    mode: "idle",              // idle | running | paused | panorama | falling | summit | gameover
    elapsed: 0,                // total running seconds
    startTimestamp: 0,

    // Climb
    progress: 0,               // current climbed metres (smoothed)
    climbTarget: 0,            // where the climber is pulling themselves to
    falling: 0,                // metres still to fall (after hit)
    baseLane: 0,               // -1 left, 0 center, +1 right
    playerX: 0,                // world x, eased by spring
    playerVX: 0,
    anchorX: 0,                // spring target x (lane center or power-swing)
    anchorHoldMs: 0,           // ms remaining on a forced anchor
    climbing: false,
    sidestepQueueMs: 0,        // extra latency on next sidestep (cold)

    // Answers / questions
    questionOpen: false,
    pendingIntent: null,       // { id, payload }
    answers: 0,
    correct: 0,
    streak: 0,
    serenity: 0,
    bestStreak: 0,

    // Oxygen / cold
    oxygen: CONFIG.O2_START,
    cold: 0,                   // seconds without correct
    lastCorrectAt: 0,

    // Lens
    lens: 0,                   // 0..1

    // Shield
    shieldActiveMs: 0,
    shieldCooldownMs: 0,
    shieldUsed: 0,

    // Companion
    mistakes: 0,
    companionLost: false,

    // Phases / dynamic summit
    phaseRatio: 0,
    summitDynamic: CONFIG.DYN_SUMMIT_BASE,
    panoramasShown: { 0: false, 1: false },

    // Relics / preset
    relics: [],
    preset: "classic",         // classic | newyear
    playerName: "Альпинист",

    // Hazards state
    rocks: [],                 // list of active rocks
    avalanche: null,           // single active avalanche
    crevasseLane: null,        // { lane, remainingMoves } or null
    avalanchesHit: 0,
    avalanchesBlocked: 0,
    nearMisses: 0,
    rocksEvaded: 0,
    rocksKilled: 0,

    // Spawn timers
    nextRockAt: CONFIG.ROCK_FIRST_DELAY,
    nextAvalancheAt: CONFIG.AVAL_FIRST_DELAY,

    // Active power-swing state
    powerSwingUntil: 0,        // elapsed seconds after which power-swing ends
    powerSwingSign: 1,

    // Extra life (from photo relic)
    extraLife: false,

    // Camera shake
    shake: 0,

    // Panorama flags
    panoramaRemainingMs: 0,
    panoramaPhase: null,       // "in" | "hold" | "out" | null

    // Visual helpers
    stormStrength: 0.1,
    danger: 0,                 // 0..1, driven by active threats
  };
}

export function resetForRun(s, opts) {
  const fresh = createState();
  Object.assign(s, fresh);
  s.relics = opts.relics.slice();
  s.preset = opts.preset || "classic";
  s.playerName = opts.playerName || "Альпинист";
  s.mode = "running";
  s.startTimestamp = performance.now();
  if (s.relics.includes("photo")) s.extraLife = true;
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const data = JSON.parse(raw);
    return { ...defaultStats(), ...data };
  } catch {
    return defaultStats();
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage failure
  }
}

export function defaultStats() {
  return {
    runs: 0,
    wins: 0,
    bestHeight: 0,
    bestStreak: 0,
    avalanchesBlocked: 0,
    totalCorrect: 0,
    totalAnswers: 0,
    lastName: "Альпинист",
  };
}

export function mergeRunStats(prev, run) {
  return {
    runs: prev.runs + 1,
    wins: prev.wins + (run.win ? 1 : 0),
    bestHeight: Math.max(prev.bestHeight, run.height),
    bestStreak: Math.max(prev.bestStreak, run.bestStreak),
    avalanchesBlocked: prev.avalanchesBlocked + run.avalanchesBlocked,
    totalCorrect: prev.totalCorrect + run.correct,
    totalAnswers: prev.totalAnswers + run.answers,
    lastName: run.playerName || prev.lastName,
  };
}
