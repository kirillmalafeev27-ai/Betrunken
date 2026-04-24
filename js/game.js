// Top-level game orchestration:
//   * state machine  (idle / running / paused / panorama / falling / summit)
//   * main update loop
//   * camera follow with shake + lag + breathing
//   * question open/close, bonus slot routing, hazards integration

import { BONUS_SLOTS, CONFIG } from "./config.js";
import {
  createState, resetForRun,
  loadStats, saveStats, mergeRunStats,
} from "./state.js";
import { clamp, lerp, setCssVar } from "./util.js";

import { SceneStage } from "./render/scene.js";
import { Mountain }  from "./render/mountain.js";
import { Climber }   from "./render/climber.js";
import { Companion } from "./render/companion.js";
import { Tether }    from "./render/tether.js";
import { Particles } from "./render/particles.js";
import { HazardsView } from "./render/hazardsView.js";
import { PanoramaCtrl } from "./render/panorama.js";

import { Audio } from "./audio.js";
import { Input } from "./input.js";
import { HUD } from "./hud.js";

import { MockQuestionProvider } from "./questions.js";
import { Bonuses } from "./systems/bonuses.js";
import { HazardSystem } from "./systems/hazards.js";
import {
  phaseRatio, phaseLabel,
  updateLens, updateOxygen, updateCold,
  onCorrectAnswer, onWrongAnswer,
  updateDynamicSummit, updateCompanion, updateStormAndSerenity,
} from "./systems/world.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = createState();
    this.stats = loadStats();
    this.provider = new MockQuestionProvider();

    this.stage = new SceneStage(canvas);
    this.mountain = new Mountain();
    this.stage.place(this.mountain.group);

    this.climber = new Climber();
    this.stage.place(this.climber.group);

    this.companion = new Companion();
    this.stage.place(this.companion.group);

    this.tether = new Tether();
    this.stage.place(this.tether.group);

    this.particles = new Particles();
    this.stage.place(this.particles.group);

    this.hazardsView = new HazardsView(this.mountain);
    // HazardsView uses world-space coordinates via mountain.anchor() so it
    // lives at the scene root (not under mountain.group, which is translated
    // as the player climbs).
    this.stage.place(this.hazardsView.group);

    this.panorama = new PanoramaCtrl(this.stage.camera);

    this.audio = new Audio();

    this.hud = new HUD({
      onStart:  (opts) => this.startRun(opts),
      onPause:  () => this.togglePause(),
      onResume: () => this.resume(),
      onAbort:  () => this.abortRun(),
      onMute:   (muted) => { this.audio.setMuted(muted); },
      onAgain:  () => this.startRun({
        playerName: this.state.playerName,
        relics: this.state.relics,
        preset: this.state.preset,
        muted: this.audio.muted,
      }),
      onBack:   () => this.backToMenu(),
      onAnswer: (idx) => this.answerQuestion(idx),
      onSlot:   (idx) => this.openSlot(idx),
    });

    this.input = new Input({
      isQuestionOpen: () => this.state.questionOpen,
      answerQuestion: (i) => this.answerQuestion(i),
      openSlot: (i) => this.openSlot(i),
      requestClimb: () => this.openSlot(0),
      requestSidestep: (dir, strong) => {
        if (strong) this.openSlot(2, { dir });
        else        this.openSlot(1, { dir });
      },
      requestLens: () => this.openSlot(4),
      togglePause: () => {
        if (this.panorama.active) this.panorama.cancel();
        else this.togglePause();
      },
      toggleMute: () => {
        this.audio.ensureStarted();
        this.audio.setMuted(!this.audio.muted);
      },
    });
    this.input.attachCanvas(canvas);

    this.bonuses = new Bonuses({
      state: this.state,
      hud: this.hud,
      audio: this.audio,
      hazards: null, // late-bound
    });
    this.hazards = new HazardSystem({
      state: this.state,
      view: this.hazardsView,
      hud: this.hud,
      audio: this.audio,
      onPlayerHitDeadly: () => this.onDeath(),
    });
    this.bonuses.deps.hazards = this.hazards;

    this.lastFrame = performance.now();
    this.loopBound = () => this._tick();

    // Show menu at start.
    this.hud.showMenu(this.stats);
    if (this._isTouch()) this.hud.showTouchHints(true);
    requestAnimationFrame(this.loopBound);
  }

  _isTouch() {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  }

  /* ===== lifecycle ===== */

  startRun(opts) {
    this.audio.ensureStarted();
    resetForRun(this.state, opts);
    this.stage.setPreset(opts.preset || "classic");
    this.particles.setPreset(opts.preset || "classic", 0);
    this.mountain.tintByPreset(opts.preset || "classic", 0);
    this.hazards.reset();
    this.hud.hideMenu();
    this.hud.hideResult();
    this.hud.hidePause();
    this.hud.hidePanoramaToast();
    this.input.enable();
    this.audio.setMuted(opts.muted);
    setCssVar("--panorama-fade", "0");
    this.hud.showTouchHints(this._isTouch());
  }

  backToMenu() {
    this.state.mode = "idle";
    this.hud.hideResult();
    this.hud.hideMenu();
    this.hud.showMenu(this.stats);
    this.input.disable();
  }

  togglePause() {
    if (this.state.mode === "running") {
      this.state.mode = "paused";
      this.audio.setPaused(true);
      this.hud.showPause();
    } else if (this.state.mode === "paused") {
      this.resume();
    }
  }

  resume() {
    if (this.state.mode !== "paused") return;
    this.state.mode = "running";
    this.audio.setPaused(false);
    this.hud.hidePause();
  }

  abortRun() {
    this.hud.hidePause();
    this._endRun({ win: false });
  }

  _endRun({ win }) {
    const s = this.state;
    s.mode = win ? "summit" : "gameover";
    const runStats = {
      win,
      height: s.progress,
      bestStreak: s.bestStreak,
      avalanchesBlocked: s.avalanchesBlocked,
      correct: s.correct,
      answers: s.answers,
      playerName: s.playerName,
    };
    this.stats = mergeRunStats(this.stats, runStats);
    saveStats(this.stats);
    this.hud.showResult({ win, state: s, runStats });
    this.input.disable();
  }

  onDeath() {
    const s = this.state;
    s.mode = "falling";
    this.audio.sfx("fall");
    // Short dramatic fall, then end.
    setTimeout(() => this._endRun({ win: false }), 900);
  }

  /* ===== question / slot routing ===== */

  openSlot(index, payload) {
    const s = this.state;
    if (s.mode !== "running") return;
    if (s.questionOpen) return;
    if (s.falling > 0) return;
    const slot = BONUS_SLOTS[index];
    if (!slot) return;
    const desc = this.bonuses.requestSlot(slot.id, payload);
    if (!desc) return;
    const q = this.provider.next(desc.slot);
    s.questionOpen = true;
    s.pendingIntent = { slot: slot.id, payload: desc.payload, question: q };
    this.hud.openQuestion(q, {
      tag: slot.tag,
      sub: slot.hint,
    });
  }

  answerQuestion(index) {
    const s = this.state;
    if (!s.questionOpen || !s.pendingIntent) return;
    const { slot, payload, question } = s.pendingIntent;
    const correct = index === question.correctIndex;
    this.hud.flashAnswer(index, correct);
    s.answers += 1;

    if (correct) {
      onCorrectAnswer(s);
      this.audio.sfx("correct-carabiner");
      const applied = this.bonuses.applyCorrect(slot, payload);
      s.lastCorrectAt = s.elapsed;
      // applied=false still counts as correct answer (edge cases like
      // sidestep at edge, or lane blocked).  No penalties.
      void applied;
    } else {
      onWrongAnswer(s);
      updateCompanion(s);
      if (s.companionLost && !this.companion.fallen) this.companion.triggerFall();
      this.audio.sfx("wrong");
      this.hud.pushFeed("Ошибка — серия прервана", "rock");
      this.hazards.maybeSpawnCrevasse();
    }

    setTimeout(() => {
      s.questionOpen = false;
      s.pendingIntent = null;
      this.hud.closeQuestion();
    }, 550);
  }

  /* ===== main loop ===== */

  _tick() {
    const now = performance.now();
    const dtMs = Math.min(60, now - this.lastFrame);
    const dt = dtMs / 1000;
    this.lastFrame = now;

    this._update(dt, dtMs);
    this._render();
    requestAnimationFrame(this.loopBound);
  }

  _update(dt, dtMs) {
    const s = this.state;

    // Panorama always updates its camera tween, regardless of state.
    this.panorama.update(dtMs);
    this.hud.setPanoramaFade(this.panorama.fadeFactor);
    if (this.panorama.active) {
      this.hud.showPanoramaToast();
    } else {
      this.hud.hidePanoramaToast();
    }

    if (s.mode !== "running" && s.mode !== "falling" && s.mode !== "summit") {
      // Paused/menu/gameover -> still run particles gently + camera follow.
      this.particles.update(dt, {
        stormStrength: s.stormStrength,
        phaseRatio: phaseRatio(s.progress),
        danger: 0,
        serenity: s.serenity / CONFIG.SERENITY_MAX,
      });
      this._updateCamera(dt);
      return;
    }

    const isFrozen = this.panorama.active || s.mode === "summit" || s.mode === "falling";
    if (!isFrozen) {
      s.elapsed += dt;

      // Climb mechanics:
      // baseLane spring
      const laneTarget = s.baseLane * CONFIG.LANE_SPACING;
      const effectiveAnchor = s.anchorHoldMs > 0 ? s.anchorX : laneTarget;
      const k = CONFIG.SPRING_STIFFNESS;
      const d = CONFIG.SPRING_DAMPING;
      const ax = (effectiveAnchor - s.playerX) * k - s.playerVX * d;
      s.playerVX += ax * dt;
      s.playerX  += s.playerVX * dt;
      s.playerX  = clamp(s.playerX, -CONFIG.MAX_PLAYER_X, CONFIG.MAX_PLAYER_X);
      if (s.anchorHoldMs > 0) s.anchorHoldMs -= dtMs;

      // Falling recoil
      if (s.falling > 0) {
        const drop = CONFIG.FALL_SPEED * dt;
        const step = Math.min(drop, s.falling);
        s.progress = Math.max(0, s.progress - step);
        s.falling -= step;
        s.climbTarget = Math.max(s.climbTarget, s.progress);
        s.climbing = false;
      } else if (s.progress < s.climbTarget) {
        const up = CONFIG.CLIMB_SPEED * dt;
        s.progress = Math.min(s.climbTarget, s.progress + up);
        s.climbing = true;
      } else {
        s.climbing = false;
      }

      // Shield timers
      if (s.shieldActiveMs > 0) s.shieldActiveMs = Math.max(0, s.shieldActiveMs - dtMs);
      if (s.shieldCooldownMs > 0) s.shieldCooldownMs = Math.max(0, s.shieldCooldownMs - dtMs);

      // World systems
      updateOxygen(s, dt);
      updateLens(s, dt);
      if (s.lastCorrectAt !== s.elapsed) updateCold(s, dt);
      updateDynamicSummit(s, dt);
      updateStormAndSerenity(s, dt);

      // Phase ratio
      s.phaseRatio = phaseRatio(s.progress);

      // Hazards
      this.hazards.update(dt);

      // Phase panoramas (only if not already shown)
      this._maybeTriggerPanoramas(s);

      // Companion fall trigger
      if (s.companionLost && !this.companion.fallen) this.companion.triggerFall();

      // Win
      if (s.progress >= s.summitDynamic && s.mode === "running") {
        this._startSummit();
      }
    } else {
      // Even in frozen modes, advance tiny bits:
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2);
    }

    // Particles / visuals (run regardless of frozen, so world keeps looking alive).
    this.particles.update(dt, {
      stormStrength: s.stormStrength,
      phaseRatio: phaseRatio(s.progress),
      danger: s.danger,
      serenity: s.serenity / CONFIG.SERENITY_MAX,
    });

    // Mountain + tether scrolling
    this.mountain.followProgress(s.progress);
    this.tether.followProgress(s.progress);

    // Companion + climber
    this.climber.setPosition(s.playerX, 0.18, 1.4);
    this.climber.update(dt, { playerVX: s.playerVX, climbing: s.climbing });
    this.companion.update(dt, {
      playerX: s.playerX,
      playerZ: 1.4,
    });

    // Tether dynamic segment
    this.tether.update(dt, { x: s.playerX, y: 0.18, z: 1.4, vx: s.playerVX });

    // Mountain tint & atmospherics
    this.mountain.tintByPreset(s.preset, s.phaseRatio);
    this.stage.updateAtmosphere({
      phaseRatio: s.phaseRatio,
      danger: s.danger,
      serenity: s.serenity / CONFIG.SERENITY_MAX,
      progress: s.progress,
    });

    // Summit flag position
    const summitPos = this.mountain.anchor(CONFIG.SUMMIT_HEIGHT + 1, 0, 0);
    this.stage.positionSummitFlag(summitPos.x, summitPos.y, summitPos.z + 0.4);

    // Camera follow & shake
    this._updateCamera(dt);

    // Audio context
    this.audio.update(dt, {
      progress: s.progress / CONFIG.SUMMIT_HEIGHT,
      danger: s.danger,
      serenity: s.serenity / CONFIG.SERENITY_MAX,
      panoramaDuck: this.panorama.active ? 0.25 : 1,
      lowOxygen: s.oxygen < CONFIG.O2_LOW_THRESHOLD,
    });

    // HUD
    this.hud.updateHud(s, {
      phaseLabel: phaseLabel(s.progress),
      phaseRatio: s.phaseRatio,
      activeSlot: s.pendingIntent?.slot,
    });
  }

  _startSummit() {
    const s = this.state;
    s.mode = "summit";
    s.serenity = CONFIG.SERENITY_MAX;
    // Clear hazards for the cinematic.
    s.rocks = [];
    s.avalanche = null;
    this.hazardsView.clear();

    this.audio.sfx("win");
    this.panorama.start({
      durationMs: CONFIG.SUMMIT_MIN_MS,
      summit: true,
      onEnd: () => this._endRun({ win: true }),
    });
  }

  _maybeTriggerPanoramas(s) {
    if (this.panorama.active) return;
    const ratio = s.progress / CONFIG.SUMMIT_HEIGHT;
    for (let i = 0; i < CONFIG.PANORAMA_THRESHOLDS.length; i++) {
      const th = CONFIG.PANORAMA_THRESHOLDS[i];
      if (!s.panoramasShown[i] && ratio >= th) {
        s.panoramasShown[i] = true;
        // Bonus for clean streak (no avalanches hit).
        const cleanBonus = s.avalanchesHit === 0 ? CONFIG.PANORAMA_MAX_BONUS_MS : 0;
        let dur = CONFIG.PANORAMA_BASE_MS + cleanBonus;
        if (s.relics.includes("rosary")) dur = Math.round(dur * 0.7);
        this.panorama.start({ durationMs: dur });
        break;
      }
    }
  }

  _updateCamera(dt) {
    const s = this.state;
    const cam = this.stage.camera;
    if (this.panorama.active) return; // panorama controls camera directly

    // "Over the shoulder": close in behind the climber's right shoulder.
    const targetX = s.playerX * 0.32 + 0.6;
    const targetY = 2.7 + Math.sin(performance.now() * 0.0022) * 0.08;
    const targetZ = 7.0 + s.playerVX * 0.012;
    cam.position.x = lerp(cam.position.x, targetX, Math.min(1, dt * 3.5));
    cam.position.y = lerp(cam.position.y, targetY, Math.min(1, dt * 2.5));
    cam.position.z = lerp(cam.position.z, targetZ, Math.min(1, dt * 3.5));

    // Roll from player velocity.
    const rollTarget = clamp(-s.playerVX * 0.008, -0.25, 0.25);
    cam.rotation.z = lerp(cam.rotation.z, rollTarget, Math.min(1, dt * 3));

    // Shake
    if (s.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * s.shake * 0.6;
      cam.position.y += (Math.random() - 0.5) * s.shake * 0.6;
      cam.rotation.z += (Math.random() - 0.5) * s.shake * 0.06;
      s.shake = Math.max(0, s.shake - dt * 2.4);
    }

    cam.lookAt(s.playerX * 0.18, 1.5, -0.4);

    // Climber key light tracks the player so the jacket stays bright in any
    // weather.
    if (this.stage.climberKey) {
      this.stage.climberKey.position.set(
        s.playerX + 1.2,
        3.0,
        4.6
      );
    }
  }

  _render() { this.stage.render(); }
}
