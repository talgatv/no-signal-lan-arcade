/**
 * i18n — small string table for Memory Match.
 * Mirrors games/solitaire/client/i18n.js and games/tic-tac-toe/client/i18n.js:
 * a flat STRINGS table per UN-6 language, detect/apply helpers, no
 * framework. RTL (Arabic) flips text-bearing UI chrome only — the card
 * grid's spatial layout is a fixed convention and is deliberately kept
 * un-mirrored (see index.html's dir="ltr" on #board).
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN',
  ru: 'RU',
  zh: '中文',
  es: 'ES',
  ar: 'AR',
  fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    setupTitle: 'Memory Match',
    setupSub: 'Pick a grid size and a card theme.',
    gridSizeLabel: 'Grid size',
    gridEasyBtn: '4×4 (8 pairs)',
    gridMediumBtn: '6×4 (12 pairs)',
    gridHardBtn: '6×6 (18 pairs)',
    themeLabel: 'Theme',
    themeShapesBtn: 'Shapes',
    themeAnimalsBtn: 'Animals',
    themeLettersBtn: 'Letters',
    themeTilesBtn: 'Tiles',
    startBtn: 'Start',
    newGameBtn: 'New game',
    changeSetupBtn: 'Change setup',
    movesLabel: 'Moves',
    timeLabel: 'Time',
    pairsLabel: 'Pairs',
    hint: 'Tap two cards to find a matching pair.',
    winTitle: 'You found them all!',
    resultStats: 'Moves: {moves} · Time: {time}',
    newBestMoves: 'New best moves!',
    newBestTime: 'New best time!',
    newBestBoth: 'New best moves and time!',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    setupTitle: 'Найди пару',
    setupSub: 'Выберите размер поля и тему карточек.',
    gridSizeLabel: 'Размер поля',
    gridEasyBtn: '4×4 (8 пар)',
    gridMediumBtn: '6×4 (12 пар)',
    gridHardBtn: '6×6 (18 пар)',
    themeLabel: 'Тема',
    themeShapesBtn: 'Фигуры',
    themeAnimalsBtn: 'Животные',
    themeLettersBtn: 'Буквы',
    themeTilesBtn: 'Плитки',
    startBtn: 'Начать',
    newGameBtn: 'Новая игра',
    changeSetupBtn: 'Сменить настройки',
    movesLabel: 'Ходы',
    timeLabel: 'Время',
    pairsLabel: 'Пары',
    hint: 'Открой две карточки, чтобы найти пару.',
    winTitle: 'Все пары найдены!',
    resultStats: 'Ходов: {moves} · Время: {time}',
    newBestMoves: 'Новый рекорд по ходам!',
    newBestTime: 'Новый рекорд по времени!',
    newBestBoth: 'Новый рекорд по ходам и времени!',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    setupTitle: '记忆配对',
    setupSub: '选择场地大小和卡牌主题。',
    gridSizeLabel: '场地大小',
    gridEasyBtn: '4×4（8 对）',
    gridMediumBtn: '6×4（12 对）',
    gridHardBtn: '6×6（18 对）',
    themeLabel: '主题',
    themeShapesBtn: '图形',
    themeAnimalsBtn: '动物',
    themeLettersBtn: '字母',
    themeTilesBtn: '麻将牌',
    startBtn: '开始',
    newGameBtn: '新游戏',
    changeSetupBtn: '更改设置',
    movesLabel: '步数',
    timeLabel: '用时',
    pairsLabel: '配对',
    hint: '点击两张卡牌，找出相同的一对。',
    winTitle: '全部配对成功！',
    resultStats: '步数：{moves} · 用时：{time}',
    newBestMoves: '步数新纪录！',
    newBestTime: '用时新纪录！',
    newBestBoth: '步数和用时都创新纪录！',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    setupTitle: 'Memorama',
    setupSub: 'Elige un tamaño de tablero y un tema de cartas.',
    gridSizeLabel: 'Tamaño del tablero',
    gridEasyBtn: '4×4 (8 pares)',
    gridMediumBtn: '6×4 (12 pares)',
    gridHardBtn: '6×6 (18 pares)',
    themeLabel: 'Tema',
    themeShapesBtn: 'Formas',
    themeAnimalsBtn: 'Animales',
    themeLettersBtn: 'Letras',
    themeTilesBtn: 'Fichas',
    startBtn: 'Empezar',
    newGameBtn: 'Nueva partida',
    changeSetupBtn: 'Cambiar ajustes',
    movesLabel: 'Movimientos',
    timeLabel: 'Tiempo',
    pairsLabel: 'Pares',
    hint: 'Toca dos cartas para encontrar una pareja.',
    winTitle: '¡Encontraste todas las parejas!',
    resultStats: 'Movimientos: {moves} · Tiempo: {time}',
    newBestMoves: '¡Nuevo récord de movimientos!',
    newBestTime: '¡Nuevo récord de tiempo!',
    newBestBoth: '¡Nuevo récord de movimientos y tiempo!',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    setupTitle: 'لعبة الذاكرة',
    setupSub: 'اختر حجم اللوحة وموضوع البطاقات.',
    gridSizeLabel: 'حجم اللوحة',
    gridEasyBtn: '4×4 (8 أزواج)',
    gridMediumBtn: '6×4 (12 زوجًا)',
    gridHardBtn: '6×6 (18 زوجًا)',
    themeLabel: 'الموضوع',
    themeShapesBtn: 'أشكال',
    themeAnimalsBtn: 'حيوانات',
    themeLettersBtn: 'حروف',
    themeTilesBtn: 'قطع الماهجونغ',
    startBtn: 'ابدأ',
    newGameBtn: 'لعبة جديدة',
    changeSetupBtn: 'تغيير الإعداد',
    movesLabel: 'الحركات',
    timeLabel: 'الوقت',
    pairsLabel: 'الأزواج',
    hint: 'اضغط على بطاقتين للعثور على زوج متطابق.',
    winTitle: 'لقد وجدت كل الأزواج!',
    resultStats: 'الحركات: {moves} · الوقت: {time}',
    newBestMoves: 'رقم قياسي جديد في الحركات!',
    newBestTime: 'رقم قياسي جديد في الوقت!',
    newBestBoth: 'رقم قياسي جديد في الحركات والوقت!',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    setupTitle: 'Jeu de mémoire',
    setupSub: 'Choisissez une taille de plateau et un thème de cartes.',
    gridSizeLabel: 'Taille du plateau',
    gridEasyBtn: '4×4 (8 paires)',
    gridMediumBtn: '6×4 (12 paires)',
    gridHardBtn: '6×6 (18 paires)',
    themeLabel: 'Thème',
    themeShapesBtn: 'Formes',
    themeAnimalsBtn: 'Animaux',
    themeLettersBtn: 'Lettres',
    themeTilesBtn: 'Tuiles',
    startBtn: 'Commencer',
    newGameBtn: 'Nouvelle partie',
    changeSetupBtn: 'Changer les réglages',
    movesLabel: 'Coups',
    timeLabel: 'Temps',
    pairsLabel: 'Paires',
    hint: 'Touchez deux cartes pour trouver une paire.',
    winTitle: 'Vous avez trouvé toutes les paires !',
    resultStats: 'Coups : {moves} · Temps : {time}',
    newBestMoves: 'Nouveau record de coups !',
    newBestTime: 'Nouveau record de temps !',
    newBestBoth: 'Nouveau record de coups et de temps !',
    playAgainBtn: 'Rejouer',
  },
};

function qs(name) {
  try {
    return new URLSearchParams(location.search).get(name);
  } catch {
    return null;
  }
}

export function detectLang() {
  const q = qs('lang');
  if (q && STRINGS[q]) return q;
  try {
    const stored = localStorage.getItem('ogh_memorymatch_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_memorymatch_lang', lang);
  } catch { /* ignore */ }
}

/** Translate a key for a given language, with optional {placeholder} substitution. */
export function t(lang, key, vars) {
  const dict = STRINGS[lang] || STRINGS.en;
  let s = dict[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}

export function applyStaticStrings(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(lang, key);
  });
}
