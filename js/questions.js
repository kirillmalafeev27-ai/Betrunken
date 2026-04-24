// Abstract QuestionProvider.
//
// The game is deliberately agnostic to the learning layer: it only requests a
// question with 4 options and `correctIndex` and rewards correctness.
//
// Swap MOCK_BANK or the whole provider to plug in your own source.

export class QuestionProvider {
  /**
   * Return the next Question for a given intent.
   *
   * intent is a free-form hint used by the game — e.g. "climb", "sidestep",
   * "powerSwing", "snowShield", "cleanLens" — providers may use it to pick
   * a question from a particular pool but are not required to.
   *
   * Shape:
   *   {
   *     id: string,
   *     prompt: string,      // main question text
   *     display?: string,    // optional highlighted fragment (italic block)
   *     options: [string, string, string, string],
   *     correctIndex: 0 | 1 | 2 | 3,
   *   }
   */
  next(/* intent */) {
    throw new Error("QuestionProvider.next() not implemented");
  }
}

/**
 * In-memory mock bank with light German A1/A2 flavour.
 * Intentionally static — no grammar engine, no level selection, no topics.
 *
 * Each entry matches the Question shape.  All 4 options are plausible, and
 * correctIndex is randomly 0..3 across the bank for fairness.
 */
export const MOCK_BANK = [
  { id: "q1",  prompt: "Выбери правильный артикль.", display: "___ Berg",
    options: ["die", "der", "das", "den"], correctIndex: 1 },
  { id: "q2",  prompt: "Какое слово означает «вершина»?",
    options: ["Gipfel", "Tal", "Hang", "Gletscher"], correctIndex: 0 },
  { id: "q3",  prompt: "Заполни пропуск.", display: "Ich ___ müde.",
    options: ["hat", "habe", "bin", "ist"], correctIndex: 2 },
  { id: "q4",  prompt: "Что значит «Seil»?",
    options: ["тропа", "верёвка", "ветер", "туман"], correctIndex: 1 },
  { id: "q5",  prompt: "Выбери правильную форму глагола.", display: "Wir ___ den Berg.",
    options: ["steigt", "steigen", "steigst", "steige"], correctIndex: 1 },
  { id: "q6",  prompt: "Какое слово означает «снег»?",
    options: ["Sand", "Regen", "Schnee", "Eis"], correctIndex: 2 },
  { id: "q7",  prompt: "Заполни пропуск.", display: "Das Wetter ist ___ heute.",
    options: ["kalt", "kalte", "kalten", "kalter"], correctIndex: 0 },
  { id: "q8",  prompt: "Какое местоимение подходит?", display: "___ gehen zum Gipfel.",
    options: ["Ich", "Du", "Er", "Wir"], correctIndex: 3 },
  { id: "q9",  prompt: "Что означает «Eispickel»?",
    options: ["ледоруб", "кошки", "каска", "карабин"], correctIndex: 0 },
  { id: "q10", prompt: "Выбери правильный предлог.", display: "Ich gehe ___ den Berg hinauf.",
    options: ["in", "auf", "an", "über"], correctIndex: 1 },
  { id: "q11", prompt: "Что значит «der Nebel»?",
    options: ["мороз", "ветер", "туман", "лёд"], correctIndex: 2 },
  { id: "q12", prompt: "Какая форма прошедшего времени?", display: "Er ist gestern ___ (gehen).",
    options: ["gegangen", "gegeht", "gegangen ist", "gegehen"], correctIndex: 0 },
  { id: "q13", prompt: "Выбери правильный артикль.", display: "___ Lawine",
    options: ["der", "das", "den", "die"], correctIndex: 3 },
  { id: "q14", prompt: "Что означает «müde»?",
    options: ["холодный", "усталый", "смелый", "медленный"], correctIndex: 1 },
  { id: "q15", prompt: "Какой перевод у слова «дышать»?",
    options: ["atmen", "denken", "sehen", "hören"], correctIndex: 0 },
  { id: "q16", prompt: "Заполни пропуск.", display: "Die Luft ___ dünn.",
    options: ["ist", "bin", "sind", "hat"], correctIndex: 0 },
  { id: "q17", prompt: "Что значит «verschneit»?",
    options: ["мокрый", "туманный", "заснеженный", "ветреный"], correctIndex: 2 },
  { id: "q18", prompt: "Выбери правильный вариант.", display: "Ich habe einen ___.",
    options: ["Eispickel", "Eispickeln", "Eispickels", "Eispickeler"], correctIndex: 0 },
  { id: "q19", prompt: "Как перевести «шаг за шагом»?",
    options: ["Hand in Hand", "Schritt für Schritt", "Tag für Tag", "Stück für Stück"], correctIndex: 1 },
  { id: "q20", prompt: "Что означает «die Höhe»?",
    options: ["высота", "глубина", "ширина", "длина"], correctIndex: 0 },
  { id: "q21", prompt: "Выбери правильную форму.", display: "Du ___ vorsichtig sein.",
    options: ["muss", "musst", "müsst", "musste"], correctIndex: 1 },
  { id: "q22", prompt: "Что значит «der Gletscher»?",
    options: ["ледник", "склон", "пик", "ущелье"], correctIndex: 0 },
  { id: "q23", prompt: "Как перевести «тишина»?",
    options: ["die Stille", "der Lärm", "der Schrei", "das Echo"], correctIndex: 0 },
  { id: "q24", prompt: "Заполни пропуск.", display: "Ich ___ Angst.",
    options: ["bin", "habe", "hat", "sind"], correctIndex: 1 },
  { id: "q25", prompt: "Что значит «klettern»?",
    options: ["идти", "спать", "карабкаться", "падать"], correctIndex: 2 },
  { id: "q26", prompt: "Выбери правильный артикль.", display: "___ Fels",
    options: ["die", "das", "der", "den"], correctIndex: 2 },
  { id: "q27", prompt: "Как перевести «камнепад»?",
    options: ["Steinschlag", "Schneefall", "Windstoß", "Eisbruch"], correctIndex: 0 },
  { id: "q28", prompt: "Что означает «die Wand»?",
    options: ["окно", "пол", "стена", "крыша"], correctIndex: 2 },
  { id: "q29", prompt: "Выбери правильное окончание.", display: "ein stark___ Wind",
    options: ["er", "e", "en", "es"], correctIndex: 0 },
  { id: "q30", prompt: "Что значит «Morgenröte»?",
    options: ["заря", "сумерки", "полдень", "полночь"], correctIndex: 0 },
  { id: "q31", prompt: "Как будет «я дышу»?",
    options: ["ich atmest", "ich atme", "ich atmen", "ich geatmet"], correctIndex: 1 },
  { id: "q32", prompt: "Что означает «unten»?",
    options: ["над", "внизу", "слева", "справа"], correctIndex: 1 },
  { id: "q33", prompt: "Выбери правильный вариант.", display: "Es ___ kalt.",
    options: ["wird", "werdet", "werden", "wirst"], correctIndex: 0 },
  { id: "q34", prompt: "Что значит «Risse»?",
    options: ["облака", "трещины", "следы", "волны"], correctIndex: 1 },
  { id: "q35", prompt: "Как перевести «ночь»?",
    options: ["der Tag", "der Abend", "die Nacht", "der Morgen"], correctIndex: 2 },
  { id: "q36", prompt: "Выбери правильный вариант.", display: "Wir ___ gleich am Gipfel.",
    options: ["ist", "seid", "sind", "bin"], correctIndex: 2 },
  { id: "q37", prompt: "Что означает «der Schatten»?",
    options: ["тень", "свет", "блеск", "день"], correctIndex: 0 },
  { id: "q38", prompt: "Как перевести «холодный ветер»?",
    options: ["kalter Wind", "kaltes Wind", "kalte Wind", "kalten Wind"], correctIndex: 0 },
  { id: "q39", prompt: "Что значит «steil»?",
    options: ["пологий", "крутой", "скользкий", "мягкий"], correctIndex: 1 },
  { id: "q40", prompt: "Заполни пропуск.", display: "Der Berg ist ___.",
    options: ["hoch", "hohe", "hohen", "höher"], correctIndex: 0 },
  { id: "q41", prompt: "Что означает «der Nordwand»?",
    options: ["южный склон", "северная стена", "восточный гребень", "западный ледник"], correctIndex: 1 },
  { id: "q42", prompt: "Как перевести «одиночество»?",
    options: ["die Einsamkeit", "die Freiheit", "die Stille", "die Sicherheit"], correctIndex: 0 },
  { id: "q43", prompt: "Что значит «das Seil»?",
    options: ["снаряжение", "верёвка", "палатка", "флаг"], correctIndex: 1 },
  { id: "q44", prompt: "Выбери правильный вариант.", display: "Ich ___ fast oben.",
    options: ["werde", "bin", "hat", "sind"], correctIndex: 1 },
  { id: "q45", prompt: "Как перевести «вперёд»?",
    options: ["zurück", "vorwärts", "oben", "unten"], correctIndex: 1 },
  { id: "q46", prompt: "Что значит «der Atem»?",
    options: ["дыхание", "шаг", "удар", "голос"], correctIndex: 0 },
  { id: "q47", prompt: "Выбери правильную форму.", display: "Sie ___ den Gipfel erreicht.",
    options: ["hat", "haben", "ist", "sind"], correctIndex: 0 },
  { id: "q48", prompt: "Что означает «der Sturm»?",
    options: ["покой", "буря", "закат", "восход"], correctIndex: 1 },
  { id: "q49", prompt: "Как перевести «я могу»?",
    options: ["ich muss", "ich kann", "ich soll", "ich will"], correctIndex: 1 },
  { id: "q50", prompt: "Что значит «frei»?",
    options: ["свободный", "связанный", "тёплый", "тяжёлый"], correctIndex: 0 },
  { id: "q51", prompt: "Как будет «он поднимается»?",
    options: ["er steigen", "er steigt", "er steigst", "er gesteigen"], correctIndex: 1 },
  { id: "q52", prompt: "Что означает «die Kälte»?",
    options: ["холод", "тепло", "ветер", "туман"], correctIndex: 0 },
  { id: "q53", prompt: "Выбери правильный вариант.", display: "___ dir warm?",
    options: ["Bist", "Ist", "Hast", "Hat"], correctIndex: 1 },
  { id: "q54", prompt: "Что значит «die Aussicht»?",
    options: ["вид", "звук", "запах", "страх"], correctIndex: 0 },
  { id: "q55", prompt: "Как перевести «усталые руки»?",
    options: ["müde Hände", "müder Hände", "müden Hände", "müdes Hände"], correctIndex: 0 },
];

export class MockQuestionProvider extends QuestionProvider {
  constructor(bank = MOCK_BANK) {
    super();
    this.bank = bank;
    this.pool = [];
    this._refill();
  }
  _refill() {
    // Fisher-Yates shuffle over indices.
    const ids = this.bank.map((_, i) => i);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.pool = ids;
  }
  next(/* intent */) {
    if (this.pool.length === 0) this._refill();
    const idx = this.pool.pop();
    const q = this.bank[idx];
    return { ...q, options: q.options.slice() };
  }
}
