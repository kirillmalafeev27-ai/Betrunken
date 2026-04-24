// Game-wide constants and tuning.
// All numeric values are tuned to the gameplay spec in the brief.

export const CONFIG = {
  // World
  SUMMIT_HEIGHT: 100,
  CLIMB_STEP: 6,
  CLIMB_BONUS: 12,
  LANE_SPACING: 6.35,
  MAX_PLAYER_X: 16.5,
  SPRING_STIFFNESS: 30,
  SPRING_DAMPING: 7.6,
  CLIMB_SPEED: 2.05,        // m/s while climbing up
  FALL_SPEED: 11.0,         // m/s while recoiling down

  // Powerswing
  POWER_SWING_MS: 820,
  POWER_SWING_ANCHOR: 9.8,
  POWER_SWING_IMPULSE: 46,
  POWER_SWING_SAFE_X: 8.1,  // |player.x| >= this = avalanche near miss

  // Shield
  SHIELD_DURATION_MS: 15000,
  SHIELD_COOLDOWN_MS: 180000,

  // Lens
  LENS_CLEAN_AMOUNT: 0.65,
  LENS_BASE_DPS: 0.0045,
  LENS_PHASE_DPS: 0.0035,
  LENS_DANGER_DPS: 0.0025,

  // Rocks
  ROCK_FIRST_DELAY: 13.0,
  ROCK_MIN_GAP: 3.4,
  ROCK_MAX_GAP: 7.8,
  ROCK_SPAWN_AHEAD_MIN: 62,
  ROCK_SPAWN_AHEAD_MAX: 82,
  ROCK_SPEED: 18.5,

  // Avalanche
  AVAL_FIRST_DELAY: 72.0,
  AVAL_MIN_GAP: 32.0,
  AVAL_MAX_GAP: 60.0,
  AVAL_SPAWN_AHEAD_MIN: 60,
  AVAL_SPAWN_AHEAD_MAX: 78,
  AVAL_SPEED_MIN: 7.6,
  AVAL_SPEED_MAX: 10.0,
  AVAL_KNOCKBACK: 18,          // = 3 CLIMB_STEP
  AVAL_LENS_ADD: 0.22,

  // Crevasse
  CREVASSE_CHANCE: 0.5,
  CREVASSE_HOLD_MOVES: 3,

  // Oxygen
  O2_START: 100,
  O2_DRAIN: 0.72,
  O2_ALT_FACTOR: 1.18,
  O2_CORRECT_BONUS: 9,
  O2_WRONG_PENALTY: 7,
  O2_LOW_THRESHOLD: 35,

  // Cold
  COLD_STAGE1_SEC: 15,
  COLD_STAGE2_SEC: 30,
  COLD_STAGE1_DELAY: 200,
  COLD_STAGE2_DELAY: 400,
  COLD_RELIEF_ON_CORRECT: 20,

  // Serenity
  SERENITY_MAX: 5,

  // Companion
  COMPANION_LIMIT: 3,

  // Phases
  PHASE_WARM_START: 0.42,
  PHASE_WARM_BAND: 0.4,
  PANORAMA_THRESHOLDS: [0.45, 0.78],

  // Panorama
  PANORAMA_BASE_MS: 900,
  PANORAMA_MAX_BONUS_MS: 2100,
  PANORAMA_FADE_IN_MS: 420,
  PANORAMA_FADE_OUT_MS: 520,
  SUMMIT_MIN_MS: 8500,

  // Dynamic summit
  DYN_SUMMIT_BASE: 94,
  DYN_SUMMIT_MIN: 86,
  DYN_SUMMIT_MAX: 100,

  // Audio
  MASTER_GAIN: 0.38,
};

export const RELICS = [
  {
    id: "compass",
    name: "Компас",
    desc: "Показывает линию ближайшего камня в сводке опасностей.",
  },
  {
    id: "rosary",
    name: "Чётки",
    desc: "Кислород тратится медленнее, панорама короче.",
  },
  {
    id: "schnapps",
    name: "Шнапс",
    desc: "Камни и лавины движутся медленнее, интервалы длиннее.",
  },
  {
    id: "photo",
    name: "Фотокарточка",
    desc: "Один раз спасает от смертельного удара камнем.",
  },
  {
    id: "iceaxe",
    name: "Ледоруб",
    desc: "Climb даёт +1 ход; правильный ответ даёт больше кислорода.",
  },
];

export const BONUS_SLOTS = [
  { id: "climb",       name: "Подъём",     hint: "+2 хода вверх", tag: "CLIMB"    },
  { id: "sidestep",    name: "Рывок",      hint: "Смена линии",   tag: "STEP"     },
  { id: "powerSwing",  name: "Раскачка",   hint: "Сильный мах",   tag: "SWING"    },
  { id: "snowShield",  name: "Щит",        hint: "Ловит лавину",  tag: "SHIELD"   },
  { id: "cleanLens",   name: "Объектив",   hint: "Очистить",      tag: "LENS"     },
];
