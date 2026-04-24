// Input bindings: keyboard (desktop) and edge-tap (mobile).
//
// The game translates *intents* (climb, sidestep left/right, etc.) into a
// QuestionProvider request rather than applying actions directly.

export class Input {
  constructor(handlers) {
    this.h = handlers;
    this.enabled = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    window.addEventListener("keydown", this._onKeyDown);
  }

  enable()  { this.enabled = true; }
  disable() { this.enabled = false; }

  attachCanvas(canvas) {
    canvas.addEventListener("touchstart", this._onTouchStart, { passive: false });
  }

  _onKeyDown(ev) {
    if (!this.enabled) {
      // Always allow pause/mute/resume keys even if inputs disabled, but
      // handlers guard their semantics.
      if (["Escape", "m", "M", " "].includes(ev.key)) {
        this._dispatchGlobal(ev);
      }
      return;
    }

    this._dispatchGlobal(ev);
    if (ev.defaultPrevented) return;

    // Question-specific 1..4
    if (this.h.isQuestionOpen && this.h.isQuestionOpen()) {
      if (ev.key >= "1" && ev.key <= "4") {
        ev.preventDefault();
        this.h.answerQuestion(parseInt(ev.key, 10) - 1);
      }
      return;
    }

    // Slot-open 1..5
    if (ev.key >= "1" && ev.key <= "5") {
      ev.preventDefault();
      this.h.openSlot(parseInt(ev.key, 10) - 1);
      return;
    }

    const k = ev.key;
    const shift = ev.shiftKey;
    const leftKeys  = ["a", "A", "ArrowLeft"];
    const rightKeys = ["d", "D", "ArrowRight"];

    if (leftKeys.includes(k)) {
      ev.preventDefault();
      this.h.requestSidestep(-1, shift);
    } else if (rightKeys.includes(k)) {
      ev.preventDefault();
      this.h.requestSidestep(+1, shift);
    } else if (k === "w" || k === "W" || k === "ArrowUp") {
      ev.preventDefault();
      this.h.requestClimb();
    } else if (k === "e" || k === "E") {
      ev.preventDefault();
      this.h.requestLens();
    }
  }

  _dispatchGlobal(ev) {
    if (ev.key === "Escape") {
      this.h.togglePause();
      ev.preventDefault();
    } else if (ev.key === "m" || ev.key === "M") {
      this.h.toggleMute();
      ev.preventDefault();
    }
  }

  _onTouchStart(ev) {
    if (!this.enabled) return;
    if (!ev.touches || ev.touches.length === 0) return;
    const t = ev.touches[0];
    const w = window.innerWidth;
    const edge = w * 0.18;
    if (t.clientX < edge)  {
      ev.preventDefault();
      this.h.requestSidestep(-1, false);
    } else if (t.clientX > w - edge) {
      ev.preventDefault();
      this.h.requestSidestep(+1, false);
    }
  }
}
