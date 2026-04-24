// Web Audio API wrapper.
//
// Synthesises wind/threat loops and small SFX without any external assets.
// Master gain sits at CONFIG.MASTER_GAIN and is muted/paused together with the
// game state.

import { CONFIG } from "./config.js";
import { clamp } from "./util.js";

export class Audio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.windGain = null;
    this.threatGain = null;
    this.heartGain = null;
    this.windSource = null;
    this.threatSource = null;
    this.heartOsc = null;
    this.heartLFO = null;
    this.muted = false;
    this.paused = false;
    this.started = false;
    this.panoramaDuck = 1;
    this.serenity = 0;
    this.progress = 0;
    this.danger = 0;
  }

  ensureStarted() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = CONFIG.MASTER_GAIN;
    this.master.connect(this.ctx.destination);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.25;
    this.threatGain = this.ctx.createGain();
    this.threatGain.gain.value = 0.0;
    this.heartGain = this.ctx.createGain();
    this.heartGain.gain.value = 0;

    this.windGain.connect(this.master);
    this.threatGain.connect(this.master);
    this.heartGain.connect(this.master);

    this._startWind();
    this._startThreat();
    this._startHeart();
    this.started = true;
  }

  _noiseBuffer(duration = 4.0) {
    const len = this.ctx.sampleRate * duration;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    // Pink-ish noise via simple integration.
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) * 0.985;
      d[i] = last * 6;
    }
    return buf;
  }

  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(6);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.7;
    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;
    src.connect(filter).connect(gain).connect(this.windGain);
    src.start();
    this.windSource = { src, filter, gain };
  }

  _startThreat() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(5);
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const gain = this.ctx.createGain();
    gain.gain.value = 1.0;
    src.connect(filter).connect(gain).connect(this.threatGain);
    src.start();
    this.threatSource = { src, filter, gain };
  }

  _startHeart() {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 62;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 1.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.16;
    lfo.connect(lfoGain).connect(this.heartGain.gain);
    osc.connect(this.heartGain);
    osc.start();
    lfo.start();
    this.heartOsc = osc;
    this.heartLFO = lfo;
  }

  update(dt, ctx) {
    if (!this.started) return;
    this.progress = ctx.progress;
    this.danger = ctx.danger;
    this.serenity = ctx.serenity;
    this.panoramaDuck = ctx.panoramaDuck;
    const muteFactor = this.muted || this.paused ? 0 : 1;

    const base = 0.15 + 0.25 * ctx.progress + 0.15 * ctx.danger;
    const serenityBoost = 1 - 0.35 * ctx.serenity;
    const windTarget = base * serenityBoost * ctx.panoramaDuck * muteFactor;
    const threatTarget = (0.05 + ctx.danger * 0.55) * ctx.panoramaDuck * muteFactor;

    this.windGain.gain.value += (windTarget - this.windGain.gain.value) * Math.min(1, dt * 3);
    this.threatGain.gain.value += (threatTarget - this.threatGain.gain.value) * Math.min(1, dt * 3);

    const heartTarget = ctx.lowOxygen ? (0.22 * muteFactor) : 0;
    this.heartGain.gain.value += (heartTarget - this.heartGain.gain.value) * Math.min(1, dt * 3);

    if (this.windSource) {
      this.windSource.filter.frequency.value = 220 + ctx.progress * 420 + ctx.danger * 180;
    }
    if (this.threatSource) {
      this.threatSource.filter.frequency.value = 110 + ctx.danger * 120;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (!this.master) return;
    this.master.gain.value = muted ? 0 : CONFIG.MASTER_GAIN;
  }

  setPaused(paused) {
    this.paused = paused;
    if (!this.master) return;
    if (paused) {
      this.master.gain.value = 0;
      if (this.ctx && this.ctx.suspend) this.ctx.suspend();
    } else {
      if (this.ctx && this.ctx.resume) this.ctx.resume();
      this.master.gain.value = this.muted ? 0 : CONFIG.MASTER_GAIN;
    }
  }

  sfx(kind) {
    if (!this.started || this.paused || this.muted) return;
    const t = this.ctx.currentTime;
    switch (kind) {
      case "correct":          return this._blip(t, 880, 0.18, 0.12, "triangle");
      case "correct-carabiner":return this._clank(t, 0.18);
      case "wrong":            return this._buzz(t, 160, 0.28);
      case "climb":            return this._blip(t, 320, 0.2, 0.16, "sawtooth");
      case "sidestep":         return this._scrape(t);
      case "powerSwing":       return this._blip(t, 240, 0.3, 0.2, "square");
      case "cleanLens":        return this._whoosh(t, 0.3);
      case "rockImpact":       return this._thud(t, 0.28);
      case "avalanche":        return this._avalanche(t, 0.5);
      case "avalancheBlocked": return this._blip(t, 520, 0.35, 0.2, "triangle");
      case "fall":             return this._buzz(t, 90, 0.45);
      case "win":              return this._chime(t);
      default: break;
    }
  }

  _blip(t, freq, dur, vol, type = "sine") {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  _buzz(t, freq, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(freq * 0.4, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
  _clank(t, dur) {
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = 640 + i * 320;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.005 + i * 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t + i * 0.01);
      osc.stop(t + dur + 0.05);
    }
  }
  _scrape(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.3);
  }
  _whoosh(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(dur + 0.1);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
  _thud(t, dur) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  _avalanche(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(dur + 0.2);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.linearRampToValueAtTime(160, t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.3, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.2);
  }
  _chime(t) {
    const freqs = [523, 659, 784, 1046];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = f;
      const start = t + i * 0.09;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.14, start + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.9);
      osc.connect(g).connect(this.master);
      osc.start(start);
      osc.stop(start + 1.0);
    });
  }
}
