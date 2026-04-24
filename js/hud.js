// DOM HUD: menu, in-game cards, question panel, pause, result, relic picker.
//
// All visuals driven by CSS variables declared in styles.css.  This file is
// pure DOM; the game keeps a reference to HUD methods and calls into them.

import { BONUS_SLOTS, CONFIG, RELICS } from "./config.js";
import { clamp, fmtNum, fmtPct, fmtTime, setCssVar } from "./util.js";

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor({ onStart, onPause, onResume, onAbort, onMute, onAgain, onBack, onAnswer, onSlot }) {
    this.cb = { onStart, onPause, onResume, onAbort, onMute, onAgain, onBack, onAnswer, onSlot };
    this.selectedRelics = new Set();
    this.preset = "classic";
    this.muted = false;
    this.slotLocked = false;
    this.questionTimer = 0;

    this._bindMenu();
    this._bindHud();
    this._bindPause();
    this._bindResult();
  }

  _bindMenu() {
    $("btnStart").addEventListener("click", () => {
      const name = $("playerName").value.trim() || "Альпинист";
      this.cb.onStart({
        playerName: name,
        relics: Array.from(this.selectedRelics),
        preset: this.preset,
        muted: this.muted,
      });
    });
    $("togglePresetNY").addEventListener("change", (e) => {
      this.preset = e.target.checked ? "newyear" : "classic";
    });
    $("toggleMute").addEventListener("change", (e) => {
      this.muted = e.target.checked;
      if (this.cb.onMute) this.cb.onMute(this.muted);
    });
  }

  _bindHud() {
    $("btnPause").addEventListener("click", () => this.cb.onPause());
    $("btnMute").addEventListener("click", () => {
      this.muted = !this.muted;
      this.cb.onMute(this.muted);
      $("btnMute").textContent = this.muted ? "♫̸" : "♪";
    });

    const bar = $("slotBar");
    bar.innerHTML = "";
    BONUS_SLOTS.forEach((slot, i) => {
      const btn = document.createElement("button");
      btn.className = "slot";
      btn.dataset.slot = slot.id;
      btn.innerHTML = `
        <span class="idx">${i + 1}</span>
        <span class="name">${slot.name}</span>
        <span class="hint">${slot.hint}</span>
        <span class="cd-bar" data-cd></span>
      `;
      btn.addEventListener("click", () => this.cb.onSlot(i));
      bar.appendChild(btn);
    });
  }

  _bindPause() {
    $("btnResume").addEventListener("click", () => this.cb.onResume());
    $("btnAbort").addEventListener("click", () => this.cb.onAbort());
  }

  _bindResult() {
    $("btnAgain").addEventListener("click", () => this.cb.onAgain());
    $("btnBack").addEventListener("click", () => this.cb.onBack());
  }

  /* ============== Menu state ============== */

  showMenu(stats) {
    $("menu").classList.remove("hidden");
    $("hud").classList.add("hidden");
    $("pauseScreen").classList.add("hidden");
    $("resultScreen").classList.add("hidden");
    $("questionPanel").classList.add("hidden");
    this._renderRelics();
    this._renderStats(stats);
    const lastName = stats.lastName || "Альпинист";
    $("playerName").value = lastName;
  }

  hideMenu() {
    $("menu").classList.add("hidden");
    $("hud").classList.remove("hidden");
  }

  _renderRelics() {
    const host = $("relicPicker");
    host.innerHTML = "";
    for (const r of RELICS) {
      const chip = document.createElement("div");
      chip.className = "relic-chip";
      chip.innerHTML = `<strong>${r.name}</strong><span>${r.desc}</span>`;
      chip.addEventListener("click", () => this._toggleRelic(r.id, chip));
      host.appendChild(chip);
    }
  }

  _toggleRelic(id, chip) {
    if (this.selectedRelics.has(id)) {
      this.selectedRelics.delete(id);
      chip.classList.remove("selected");
    } else if (this.selectedRelics.size < 2) {
      this.selectedRelics.add(id);
      chip.classList.add("selected");
    }
    // Disabled others when at max
    const chips = document.querySelectorAll(".relic-chip");
    chips.forEach((c) => {
      const rid = c.querySelector("strong").textContent;
      const selected = c.classList.contains("selected");
      c.classList.toggle(
        "disabled",
        this.selectedRelics.size >= 2 && !selected
      );
    });
  }

  _renderStats(stats) {
    const list = $("statsList");
    list.innerHTML = "";
    const rows = [
      ["Забегов",              stats.runs],
      ["Побед",                stats.wins],
      ["Лучшая высота",        fmtNum(stats.bestHeight) + " м"],
      ["Лучшая серия",         stats.bestStreak],
      ["Лавин заблокировано",  stats.avalanchesBlocked],
      ["Точность",             stats.totalAnswers
                                ? fmtPct(stats.totalCorrect / stats.totalAnswers)
                                : "—"],
    ];
    for (const [k, v] of rows) {
      const li = document.createElement("li");
      li.innerHTML = `<span>${k}</span>${v}`;
      list.appendChild(li);
    }
  }

  /* ============== Pause / result ============== */

  showPause() { $("pauseScreen").classList.remove("hidden"); }
  hidePause() { $("pauseScreen").classList.add("hidden"); }

  showResult({ win, state, runStats }) {
    const scr = $("resultScreen");
    scr.classList.remove("hidden");
    $("resultTitle").textContent = win ? "Вершина" : "Срыв";
    $("resultSub").textContent = win
      ? "Северная стена пройдена"
      : `Достигнута высота ${fmtNum(state.progress)} м`;
    const pairs = [
      ["Высота",    fmtNum(state.progress, 1) + " м"],
      ["Прогресс",  fmtPct(clamp(state.progress / CONFIG.SUMMIT_HEIGHT, 0, 1), 1)],
      ["Время",     fmtTime(state.elapsed)],
      ["Ответы",    state.answers],
      ["Правильно", state.correct],
      ["Точность",  state.answers ? fmtPct(state.correct / state.answers) : "—"],
      ["Лавин",     state.avalanchesHit],
      ["Блоков",    state.avalanchesBlocked],
      ["Уклонения", state.nearMisses],
      ["Серия",     state.bestStreak],
      ["Кислород",  fmtNum(state.oxygen) + " %"],
    ];
    const host = $("resultStats");
    host.innerHTML = "";
    for (const [k, v] of pairs) {
      const item = document.createElement("div");
      item.className = "stat";
      item.innerHTML = `<span class="stat-label">${k}</span><span class="stat-value">${v}</span>`;
      host.appendChild(item);
    }
  }

  hideResult() { $("resultScreen").classList.add("hidden"); }

  /* ============== Question panel ============== */

  openQuestion(question, meta) {
    const panel = $("questionPanel");
    panel.classList.remove("hidden");
    $("questionTag").textContent = meta.tag || "AUFGABE";
    $("questionSub").textContent = meta.sub || "";
    $("questionText").textContent = question.prompt;
    const disp = $("questionDisplay");
    if (question.display && question.display.trim()) {
      disp.textContent = question.display;
      disp.classList.remove("empty");
    } else {
      disp.textContent = "";
      disp.classList.add("empty");
    }
    const host = $("questionOptions");
    host.innerHTML = "";
    question.options.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.innerHTML = `<span class="kx">${i + 1}</span><span>${opt}</span>`;
      btn.addEventListener("click", () => this.cb.onAnswer(i));
      host.appendChild(btn);
    });
  }

  flashAnswer(index, correct) {
    const buttons = $("questionOptions").querySelectorAll("button");
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === index) b.classList.add(correct ? "correct" : "wrong");
    });
  }

  closeQuestion() {
    $("questionPanel").classList.add("hidden");
  }

  /* ============== Live updates ============== */

  updateHud(state, ctx) {
    $("altValue").textContent = fmtNum(state.progress);
    const pct = clamp(state.progress / CONFIG.SUMMIT_HEIGHT, 0, 1);
    $("progressBar").style.width = `${pct * 100}%`;
    const markPct = clamp(state.summitDynamic / CONFIG.SUMMIT_HEIGHT, 0, 1);
    $("progressMark").style.left = `${markPct * 100}%`;

    const phase = ctx.phaseLabel;
    const phaseTag = $("phaseTag");
    phaseTag.textContent = phase.label;
    phaseTag.className = `tag ${phase.mod}`;
    $("laneTag").textContent = `линия: ${laneName(state.baseLane)}`;

    $("oxygenBar").style.width = `${clamp(state.oxygen, 0, 100)}%`;
    $("oxygenValue").textContent = fmtNum(state.oxygen);

    $("lensBar").style.width = `${clamp(state.lens * 100, 0, 100)}%`;
    $("lensValue").textContent = lensLabel(state.lens);

    const swingPct = clamp(Math.abs(state.playerX) / CONFIG.MAX_PLAYER_X, 0, 1);
    $("swingBar").style.width = `${swingPct * 100}%`;

    const shieldPct = state.shieldActiveMs > 0
      ? (state.shieldActiveMs / CONFIG.SHIELD_DURATION_MS) * 100
      : state.shieldCooldownMs > 0
        ? (1 - state.shieldCooldownMs / CONFIG.SHIELD_COOLDOWN_MS) * 100
        : 100;
    $("shieldBar").style.width = `${clamp(shieldPct, 0, 100)}%`;
    $("shieldValue").textContent = shieldLabel(state);

    const cDot = $("companionDot");
    if (state.companionLost) {
      cDot.className = "dot lost";
      $("companionLabel").textContent = "Напарник сорвался";
    } else if (state.mistakes >= 2) {
      cDot.className = "dot warn";
      $("companionLabel").textContent = "Напарник отстаёт";
    } else {
      cDot.className = "dot ok";
      $("companionLabel").textContent = "Напарник рядом";
    }

    const dots = $("serenityDots").children;
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("on", i < state.serenity);
    }

    const coldEl = $("coldLabel");
    if (state.cold < CONFIG.COLD_STAGE1_SEC) {
      coldEl.textContent = "Пальцы в тепле";
      coldEl.parentElement.classList.remove("cold", "frozen");
    } else if (state.cold < CONFIG.COLD_STAGE2_SEC) {
      coldEl.textContent = "Пальцы немеют";
      coldEl.parentElement.classList.add("cold");
      coldEl.parentElement.classList.remove("frozen");
    } else {
      coldEl.textContent = "Пальцы деревянные";
      coldEl.parentElement.classList.add("frozen");
      coldEl.parentElement.classList.remove("cold");
    }

    // CSS vars for overlays
    setCssVar("--lens-fouling", state.lens.toFixed(3));
    setCssVar("--storm-strength", clamp(state.stormStrength, 0, 1).toFixed(3));
    setCssVar("--oxygen-vignette",
      clamp(1 - state.oxygen / CONFIG.O2_START, 0, 1) *
      (state.oxygen < CONFIG.O2_LOW_THRESHOLD ? 1 : 0.4));
    setCssVar("--serenity", (state.serenity / CONFIG.SERENITY_MAX).toFixed(3));
    setCssVar("--phase-warm", ctx.phaseRatio.toFixed(3));
    document.body.classList.toggle("low-oxygen", state.oxygen < CONFIG.O2_LOW_THRESHOLD);

    // Slot buttons state
    const slots = document.querySelectorAll("#slotBar .slot");
    slots.forEach((btn, i) => {
      const id = BONUS_SLOTS[i].id;
      btn.classList.toggle("active", ctx.activeSlot === id);
      let cdPct = 0;
      if (id === "snowShield") {
        if (state.shieldActiveMs > 0) cdPct = 1 - state.shieldActiveMs / CONFIG.SHIELD_DURATION_MS;
        else if (state.shieldCooldownMs > 0) cdPct = 1 - state.shieldCooldownMs / CONFIG.SHIELD_COOLDOWN_MS;
        else cdPct = 1;
      } else {
        cdPct = 1;
      }
      btn.querySelector("[data-cd]").style.width = `${cdPct * 100}%`;
      btn.classList.toggle(
        "cooldown",
        id === "snowShield" && state.shieldCooldownMs > 0 && state.shieldActiveMs <= 0
      );
    });

    $("sessionName").textContent = state.playerName;
  }

  pushFeed(msg, kind) {
    const feed = $("hazardFeed");
    const li = document.createElement("li");
    li.className = kind || "";
    li.textContent = msg;
    feed.prepend(li);
    while (feed.children.length > 6) feed.lastChild.remove();
    setTimeout(() => li.remove(), 4200);
  }

  /* ============== Panorama toast ============== */

  showPanoramaToast() {
    $("panoramaToast").classList.remove("hidden");
  }
  hidePanoramaToast() {
    $("panoramaToast").classList.add("hidden");
  }

  setPanoramaFade(v) {
    setCssVar("--panorama-fade", v.toFixed(3));
  }

  showTouchHints(show) {
    $("touchHints").classList.toggle("visible", show);
    $("touchHints").classList.toggle("hidden", !show);
  }
}

function laneName(l) {
  if (l < 0) return "левая";
  if (l > 0) return "правая";
  return "центр";
}
function lensLabel(v) {
  if (v < 0.3)  return "чисто";
  if (v < 0.65) return "лёгкий снег";
  if (v < 1.0)  return "плохая видимость";
  return "почти слепо";
}
function shieldLabel(s) {
  if (s.shieldActiveMs > 0) return (s.shieldActiveMs / 1000).toFixed(0) + " с";
  if (s.shieldCooldownMs > 0) return "откат " + (s.shieldCooldownMs / 1000).toFixed(0) + " с";
  return "готов";
}
