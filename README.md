# BERGSTIEG

Кинематографичный 3D-подъём на северную стену. Браузерная SPA на vanilla HTML/CSS/JS + Three.js r128, без сборщика.

## Запуск

Любой статический сервер в корне проекта.

```
node server.js        # http://localhost:5173/
```

Или:

```
python3 -m http.server 5173
```

Просто открыть `index.html` через `file://` — не сработает из-за ES-модулей.

## Управление

- **1–5** — открыть слот бонуса
- **1–4** — ответ в вопросе
- **A / ←** · **D / →** — рывок влево / вправо (Shift = сильный)
- **W / ↑** — подъём
- **E** — очистить объектив
- **Esc** — пауза (во время панорамы завершает панораму)
- **M** — звук

На мобильном: тап по левому / правому краю экрана = sidestep-вопрос, остальные действия через HUD-кнопки.

## Архитектура

```
index.html          SPA shell: canvas + HUD overlays
styles.css          все стили HUD, оверлеи, виньетки, экраны

js/main.js          бутстрап
js/game.js          state machine, основной цикл, камера, win/lose
js/config.js        константы (climb-step, spring, speeds, phases, relics)
js/state.js         игровое состояние + localStorage-статистика
js/util.js          clamp/lerp/rand/formatters
js/audio.js         Web Audio API: wind/threat loops, SFX, heartbeat
js/input.js         клавиатура + edge-tap
js/hud.js           DOM HUD + меню + вопрос + результаты
js/questions.js     abstract QuestionProvider + мок-банк (немецкий, A1/A2)

js/render/
  scene.js          THREE scene, fog, ACES, sky, stars, ridges, clouds, flag
  mountain.js       плоскость с vertex-displacement + функция surface/anchor
  climber.js        альпинист из примитивов + свет фонаря
  companion.js      напарник (падает после 3 ошибок)
  tether.js         фикс-трос + динамический tether
  particles.js      три слоя снега / пепел
  hazardsView.js    визуалы камней, лавины, трещин, меток
  panorama.js       панорамы на phaseRatio 0.45/0.78 и саммит

js/systems/
  world.js          oxygen / cold / lens / serenity / phases / dynamic summit
  hazards.js        логика rocks/avalanche/crevasse + столкновения
  bonuses.js        5 слотов (climb/sidestep/powerSwing/shield/cleanLens)
```

## Обучающий слой

Игра взаимодействует с вопросами только через `QuestionProvider`:

```js
class QuestionProvider {
  next(intent) {
    return { id, prompt, display?, options: [a,b,c,d], correctIndex: 0..3 };
  }
}
```

По умолчанию подключён `MockQuestionProvider` с банком немецких вопросов
A1/A2. Чтобы подменить банк на собственный, передай другой экземпляр:

```js
// Например, в js/game.js:
this.provider = new MyOwnProvider();
```

Никакой генерации упражнений, переводов или уровней внутри игры нет.
