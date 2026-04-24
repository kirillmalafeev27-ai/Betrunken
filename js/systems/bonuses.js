// The five bonus slots (climb, sidestep, powerSwing, snowShield, cleanLens).
//
// Each slot opens a question; on correct answer it applies its effect; on
// wrong answer it cancels and may seed a crevasse (handled by game loop).

import { CONFIG } from "../config.js";
import { clamp } from "../util.js";

export class Bonuses {
  constructor(deps) {
    this.deps = deps;
  }

  // Return a descriptor for the game loop to open a question.
  requestSlot(slotId, payload = null) {
    const s = this.deps.state;
    if (s.questionOpen) return null;
    if (s.mode !== "running") return null;
    if (s.falling > 0) return null;

    if (slotId === "snowShield") {
      if (s.shieldActiveMs > 0) {
        this.deps.hud.pushFeed("Щит уже активен", "blocked");
        return null;
      }
      if (s.shieldCooldownMs > 0) {
        this.deps.hud.pushFeed("Щит в откате", "blocked");
        return null;
      }
    }

    return { slot: slotId, payload };
  }

  // On correct answer, apply effect.
  applyCorrect(slotId, payload) {
    const s = this.deps.state;
    switch (slotId) {
      case "climb": return this._applyClimb(s);
      case "sidestep": return this._applySidestep(s, payload);
      case "powerSwing": return this._applyPowerSwing(s, payload);
      case "snowShield": return this._applyShield(s);
      case "cleanLens": return this._applyCleanLens(s);
      default: return false;
    }
  }

  _applyClimb(s) {
    if (this.deps.hazards.isLaneBlocked(s.baseLane)) {
      this.deps.hud.pushFeed("Трещина впереди — подъём не прошёл", "crev");
      return false;
    }
    const bonusSteps = s.relics.includes("iceaxe") ? 3 : 2;
    s.climbTarget = s.climbTarget + bonusSteps * CONFIG.CLIMB_STEP;
    this.deps.audio.sfx("climb");
    this.deps.hud.pushFeed(`+${bonusSteps} хода вверх`, "blocked");
    this.deps.hazards.decrementCrevasseMoves();
    return true;
  }

  _applySidestep(s, payload) {
    const dir = payload?.dir || -1;
    const strong = payload?.strong || false;
    const target = clamp(s.baseLane + dir, -1, 1);
    if (target === s.baseLane) {
      // at edge — swing only
      s.playerVX += dir * 14;
      this.deps.audio.sfx("sidestep");
      this.deps.hud.pushFeed("Край: только раскачка", "rock");
      return false;
    }
    if (this.deps.hazards.isLaneBlocked(target)) {
      this.deps.hud.pushFeed("Трещина в соседней линии", "crev");
      s.playerVX += dir * 6;
      return false;
    }
    const delay = s.sidestepQueueMs;
    const commit = () => {
      s.baseLane = target;
      this.deps.audio.sfx("sidestep");
      this.deps.hud.pushFeed(
        target === 0 ? "Переход в центр" :
        target < 0 ? "Переход в левую линию" : "Переход в правую линию",
        "blocked"
      );
      if (strong) s.playerVX += dir * 10;
    };
    if (delay > 0) setTimeout(commit, delay);
    else commit();
    this.deps.hazards.decrementCrevasseMoves();
    return true;
  }

  _applyPowerSwing(s, payload) {
    const dir = payload?.dir || (s.baseLane < 0 ? 1 : -1);
    s.anchorX = dir * CONFIG.POWER_SWING_ANCHOR;
    s.anchorHoldMs = CONFIG.POWER_SWING_MS;
    s.playerVX += dir * CONFIG.POWER_SWING_IMPULSE * 0.25;
    s.powerSwingSign = dir;
    this.deps.audio.sfx("powerSwing");
    this.deps.hud.pushFeed("Сильная раскачка", "blocked");
    return true;
  }

  _applyShield(s) {
    s.shieldActiveMs = CONFIG.SHIELD_DURATION_MS;
    this.deps.audio.sfx("correct-carabiner");
    this.deps.hud.pushFeed("Щит активирован", "blocked");
    return true;
  }

  _applyCleanLens(s) {
    s.lens = Math.max(0, s.lens - CONFIG.LENS_CLEAN_AMOUNT);
    this.deps.audio.sfx("cleanLens");
    this.deps.hud.pushFeed("Объектив чист", "blocked");
    return true;
  }
}
