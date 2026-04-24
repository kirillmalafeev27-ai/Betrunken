// Misc math/time helpers shared across modules.

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const now = () => performance.now();

// Read/write simple numeric CSS variable on :root.
export const setCssVar = (name, value) => {
  document.documentElement.style.setProperty(name, value);
};

// Format helpers.
export const fmtTime = (seconds) => {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};
export const fmtPct = (v, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const fmtNum = (v, digits = 0) => {
  const n = Number(v) || 0;
  return n.toFixed(digits);
};

// Simple EventEmitter-ish bus.
export function makeBus() {
  const map = new Map();
  return {
    on(ev, fn) {
      if (!map.has(ev)) map.set(ev, new Set());
      map.get(ev).add(fn);
      return () => map.get(ev).delete(fn);
    },
    emit(ev, payload) {
      const set = map.get(ev);
      if (set) for (const fn of set) fn(payload);
    },
  };
}

// Deep-ish object merge for small shallow configs.
export function assignIn(target, patch) {
  for (const k of Object.keys(patch)) target[k] = patch[k];
  return target;
}
