// Entry point.  Bootstraps the Game once Three.js has loaded.

import { Game } from "./game.js";

function boot() {
  if (!window.THREE) {
    // Wait briefly for the CDN script to finish if it was late.
    setTimeout(boot, 60);
    return;
  }
  const canvas = document.getElementById("stage");
  const game = new Game(canvas);
  window.__BERGSTIEG__ = game; // handy for debugging
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
