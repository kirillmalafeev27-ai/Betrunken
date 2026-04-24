// Panorama camera transitions — phase milestones and summit cinematic.
//
// When a panorama starts, the game loop freezes hazards (see game.js mode).
// Here we interpolate the camera position/FOV to give a "step back and
// breathe" shot before returning control.

import { CONFIG } from "../config.js";
import { clamp, lerp } from "../util.js";

export class PanoramaCtrl {
  constructor(camera) {
    this.camera = camera;
    this.active = false;
    this.phase = "idle"; // in | hold | out | idle
    this.timer = 0;
    this.durationMs = CONFIG.PANORAMA_BASE_MS;
    this.baseCamPos = { x: 0, y: 4, z: 14 };
    this.targetCamPos = { x: 0, y: 9, z: 22 };
    this._onEnd = null;
    this.isSummit = false;
  }

  start({ durationMs, summit = false, onEnd = null } = {}) {
    this.active = true;
    this.phase = "in";
    this.timer = 0;
    this.durationMs = durationMs || CONFIG.PANORAMA_BASE_MS;
    this.isSummit = summit;
    this._onEnd = onEnd;

    this.baseCamPos = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
    this.targetCamPos = summit
      ? { x: 0,  y: 12, z: 26 }
      : { x: 0,  y: 8,  z: 20 };
    this.startFov = this.camera.fov;
    this.targetFov = summit ? 60 : 68;
  }

  cancel() {
    this.active = false;
    this.phase = "idle";
    if (this._onEnd) this._onEnd(true);
    this._onEnd = null;
  }

  get fadeFactor() {
    if (!this.active) return 0;
    const inMs = CONFIG.PANORAMA_FADE_IN_MS;
    const outMs = CONFIG.PANORAMA_FADE_OUT_MS;
    if (this.phase === "in")   return clamp(this.timer / inMs, 0, 1) * 0.65;
    if (this.phase === "hold") return 0.65;
    if (this.phase === "out")  return (1 - clamp(this.timer / outMs, 0, 1)) * 0.65;
    return 0;
  }

  update(dtMs) {
    if (!this.active) return;
    this.timer += dtMs;
    const inMs = CONFIG.PANORAMA_FADE_IN_MS;
    const outMs = CONFIG.PANORAMA_FADE_OUT_MS;

    if (this.phase === "in") {
      const t = clamp(this.timer / inMs, 0, 1);
      this.camera.position.x = lerp(this.baseCamPos.x, this.targetCamPos.x, smooth(t));
      this.camera.position.y = lerp(this.baseCamPos.y, this.targetCamPos.y, smooth(t));
      this.camera.position.z = lerp(this.baseCamPos.z, this.targetCamPos.z, smooth(t));
      this.camera.fov = lerp(this.startFov, this.targetFov, smooth(t));
      this.camera.updateProjectionMatrix();
      if (this.timer >= inMs) {
        this.phase = "hold";
        this.timer = 0;
      }
    } else if (this.phase === "hold") {
      if (this.timer >= this.durationMs) {
        this.phase = "out";
        this.timer = 0;
      }
    } else if (this.phase === "out") {
      const t = clamp(this.timer / outMs, 0, 1);
      this.camera.position.x = lerp(this.targetCamPos.x, this.baseCamPos.x, smooth(t));
      this.camera.position.y = lerp(this.targetCamPos.y, this.baseCamPos.y, smooth(t));
      this.camera.position.z = lerp(this.targetCamPos.z, this.baseCamPos.z, smooth(t));
      this.camera.fov = lerp(this.targetFov, this.startFov, smooth(t));
      this.camera.updateProjectionMatrix();
      if (this.timer >= outMs) {
        this.active = false;
        this.phase = "idle";
        if (this._onEnd) this._onEnd(false);
        this._onEnd = null;
      }
    }
  }
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}
