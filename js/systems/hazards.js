// Hazard gameplay: rocks, avalanche, crevasses.
// Pure logic — visuals are updated via a callback into HazardsView.

import { CONFIG } from "../config.js";
import { clamp, pick, rand, randInt } from "../util.js";

let nextId = 1;

export class HazardSystem {
  constructor(deps) {
    this.deps = deps; // { state, view, hud, audio, onPlayerHitDeadly, onAvalancheHit, onNearMiss, onCrevasseSpawn }
    this.waveOnRock = 1;
  }

  reset() {
    const s = this.deps.state;
    s.rocks = [];
    s.avalanche = null;
    s.crevasseLane = null;
    s.nextRockAt = CONFIG.ROCK_FIRST_DELAY;
    s.nextAvalancheAt = CONFIG.AVAL_FIRST_DELAY;
    this.deps.view.clear();
  }

  update(dt) {
    const s = this.deps.state;
    if (s.mode !== "running") return;

    // Spawn rocks
    if (s.elapsed >= s.nextRockAt) {
      this._spawnRockWave();
      const phaseFactor = clamp(s.phaseRatio, 0, 1);
      const gapMin = Math.max(1.6, CONFIG.ROCK_MIN_GAP - phaseFactor * 1.4);
      const gapMax = Math.max(gapMin + 1.2, CONFIG.ROCK_MAX_GAP - phaseFactor * 2.2);
      // time acceleration with elapsed
      const timeScale = clamp(1 - s.elapsed / 420, 0.6, 1);
      let gap = rand(gapMin, gapMax) * timeScale;
      if (this._hasRelic("schnapps")) gap *= 1.35;
      s.nextRockAt = s.elapsed + gap;
    }

    // Rocks motion
    const rockSpeedMod = this._hasRelic("schnapps") ? 0.7 : 1;
    for (let i = s.rocks.length - 1; i >= 0; i--) {
      const r = s.rocks[i];
      r.y -= r.speed * rockSpeedMod * dt;
      r.dt = dt;

      const worldPos = this._rockWorldPos(r, s);
      // marker sits at player level on the lane.
      r.markerY = -0.05;
      this.deps.view.updateRock(r, worldPos);

      // Collision: if y close to player y (progress) and lane matches and x close
      const relY = r.y - s.progress;
      const laneDist = Math.abs(r.lane - s.baseLane);
      const xDist = Math.abs(s.playerX - (r.lane * CONFIG.LANE_SPACING));
      if (relY <= 0.8 && relY >= -1.2 && laneDist === 0 && xDist < 1.2) {
        // Collision!
        this.deps.audio.sfx("rockImpact");
        if (s.extraLife) {
          s.extraLife = false;
          this.deps.hud.pushFeed("Фотокарточка спасла — откат на 2 хода", "rock");
          // Knock back 2 climb steps
          s.climbTarget = Math.max(0, s.climbTarget - 2 * CONFIG.CLIMB_STEP);
          s.falling = Math.max(s.falling, 2 * CONFIG.CLIMB_STEP);
          s.shake = Math.max(s.shake, 1.3);
        } else {
          this.deps.onPlayerHitDeadly("rock");
        }
        this.deps.view.removeRock(r.id);
        s.rocks.splice(i, 1);
        s.rocksKilled += 1;
        continue;
      }

      // Evade (passed below player)
      if (relY < -4) {
        this.deps.view.removeRock(r.id);
        s.rocks.splice(i, 1);
        s.rocksEvaded += 1;
      }
    }

    // Avalanche
    if (!s.avalanche && s.elapsed >= s.nextAvalancheAt) {
      this._spawnAvalanche();
    }
    if (s.avalanche) {
      const av = s.avalanche;
      const speedMod = this._hasRelic("schnapps") ? 0.75 : 1;
      av.y -= av.speed * speedMod * dt;
      const worldY = av.y - s.progress;
      this.deps.view.updateAvalanche(worldY);

      // Collision when avalanche reaches player Y
      const relY = av.y - s.progress;
      if (!av.resolved && relY <= 0.3 && relY >= -3.5) {
        av.resolved = true;
        this._resolveAvalanche(av);
      }
      if (relY < -8) {
        s.avalanche = null;
        this.deps.view.removeAvalanche();
        const gapBase = rand(CONFIG.AVAL_MIN_GAP, CONFIG.AVAL_MAX_GAP);
        const gap = this._hasRelic("schnapps") ? gapBase * 1.4 : gapBase;
        s.nextAvalancheAt = s.elapsed + gap;
      }
    }

    // Crevasse timer / position
    if (s.crevasseLane) {
      const cv = s.crevasseLane;
      cv.ttl -= dt;
      // Visually keep the crevasse glued to the mountain anchor.
      const pos = this.deps.view.mountain.anchor(
        cv.metres,
        cv.lane,
        0
      );
      this.deps.view.updateCrevassePos(cv.id, pos);
      if (cv.ttl <= 0 || cv.movesLeft <= 0) {
        this.deps.view.removeCrevasse(cv.id);
        s.crevasseLane = null;
      }
    }

    // Danger measure 0..1
    const rockDanger = clamp(s.rocks.length / 3, 0, 1);
    const avalDanger = s.avalanche ? 1 : 0;
    s.danger = clamp(rockDanger * 0.7 + avalDanger * 0.9, 0, 1);
  }

  _hasRelic(id) { return this.deps.state.relics.includes(id); }

  _spawnRockWave() {
    const s = this.deps.state;
    const phase = clamp(s.phaseRatio, 0, 1);
    const waveCount = Math.random() < 0.2 + phase * 0.25 ? randInt(2, 3) : 1;
    for (let i = 0; i < waveCount; i++) this._spawnRock();
  }

  _spawnRock() {
    const s = this.deps.state;
    const id = nextId++;
    const lane = randInt(-1, 1);
    const ahead = rand(CONFIG.ROCK_SPAWN_AHEAD_MIN, CONFIG.ROCK_SPAWN_AHEAD_MAX);
    const rock = {
      id,
      lane,
      y: s.progress + ahead,
      speed: CONFIG.ROCK_SPEED + rand(-2, 4) + s.phaseRatio * 3,
      size: rand(0.7, 1.4),
      dt: 0,
      markerY: -0.05,
    };
    s.rocks.push(rock);
    this.deps.view.spawnRock(rock);

    const compassHint = this._hasRelic("compass")
      ? ` линия: ${laneName(lane)}`
      : "";
    this.deps.hud.pushFeed(`Камень сверху${compassHint}`, "rock");
  }

  _rockWorldPos(rock, s) {
    const worldY = (rock.y - s.progress);
    const worldX = rock.lane * CONFIG.LANE_SPACING;
    const worldZ = 1.2;
    return new window.THREE.Vector3(worldX, worldY, worldZ);
  }

  _spawnAvalanche() {
    const s = this.deps.state;
    const ahead = rand(CONFIG.AVAL_SPAWN_AHEAD_MIN, CONFIG.AVAL_SPAWN_AHEAD_MAX);
    const speed = rand(CONFIG.AVAL_SPEED_MIN, CONFIG.AVAL_SPEED_MAX) + s.phaseRatio * 1.8;
    s.avalanche = {
      y: s.progress + ahead,
      speed,
      resolved: false,
    };
    this.deps.view.spawnAvalanche();
    this.deps.hud.pushFeed("Лавина!", "aval");
    this.deps.audio.sfx("avalanche");
  }

  _resolveAvalanche(av) {
    const s = this.deps.state;

    if (s.shieldActiveMs > 0) {
      // Shield blocks it.
      s.shieldActiveMs = 0;
      s.shieldCooldownMs = CONFIG.SHIELD_COOLDOWN_MS;
      s.avalanchesBlocked += 1;
      this.deps.hud.pushFeed("Щит поглотил лавину", "blocked");
      this.deps.audio.sfx("avalancheBlocked");
      this._retireAvalanche();
      return;
    }
    if (Math.abs(s.playerX) >= CONFIG.POWER_SWING_SAFE_X) {
      // Near miss via power swing.
      s.nearMisses += 1;
      this.deps.hud.pushFeed("Увернулся на раскачке", "blocked");
      this.deps.audio.sfx("avalancheBlocked");
      this._retireAvalanche();
      return;
    }

    // Hit.
    s.avalanchesHit += 1;
    s.climbTarget = Math.max(0, s.climbTarget - CONFIG.AVAL_KNOCKBACK);
    s.falling = Math.max(s.falling, CONFIG.AVAL_KNOCKBACK);
    s.lens = clamp(s.lens + CONFIG.AVAL_LENS_ADD, 0, 1.2);
    s.shake = Math.max(s.shake, 1.5);
    this.deps.hud.pushFeed("Лавина сбила на 3 хода", "aval");
    this.deps.audio.sfx("fall");
    this._retireAvalanche();
  }

  _retireAvalanche() {
    const s = this.deps.state;
    // Avalanche keeps existing visually for a moment, but we mark resolved.
    // Force removal to simplify:
    s.avalanche = null;
    this.deps.view.removeAvalanche();
    const gapBase = rand(CONFIG.AVAL_MIN_GAP, CONFIG.AVAL_MAX_GAP);
    s.nextAvalancheAt = s.elapsed + (this._hasRelic("schnapps") ? gapBase * 1.4 : gapBase);
  }

  maybeSpawnCrevasse() {
    const s = this.deps.state;
    if (Math.random() > CONFIG.CREVASSE_CHANCE) return;
    if (s.crevasseLane) {
      // refresh
      this.deps.view.removeCrevasse(s.crevasseLane.id);
      s.crevasseLane = null;
    }
    const lane = randInt(-1, 1);
    const id = nextId++;
    const cv = {
      id,
      lane,
      movesLeft: CONFIG.CREVASSE_HOLD_MOVES,
      ttl: 22,
      metres: s.progress + 8,
    };
    s.crevasseLane = cv;
    const pos = this.deps.view.mountain.anchor(cv.metres, lane, 0);
    this.deps.view.spawnCrevasse(id, pos);
    this.deps.hud.pushFeed(
      `Трещина в ${laneName(lane)} линии`,
      "crev"
    );
  }

  decrementCrevasseMoves() {
    const s = this.deps.state;
    if (s.crevasseLane) s.crevasseLane.movesLeft -= 1;
  }

  isLaneBlocked(lane) {
    const s = this.deps.state;
    return !!(s.crevasseLane && s.crevasseLane.lane === lane && s.crevasseLane.movesLeft > 0);
  }
}

function laneName(l) {
  if (l < 0) return "левая";
  if (l > 0) return "правая";
  return "центральная";
}
