/**
 * i18n — string table for Sliding Puzzle. Mirrors games/memory-match/client/i18n.js
 * and games/gem-swap/client/i18n.js (same shape this whole batch uses): a flat
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header, HUD pill labels,
 * hint, setup/result cards. It deliberately does NOT mirror the tile grid: tile
 * (0,0) is always the visual top-left cell and "slide right" always means
 * "toward higher column index" regardless of document direction (see
 * index.html/app.js — the board carries dir="ltr"). A sliding puzzle's grid is
 * a fixed spatial gameplay convention, not prose — mirroring it would silently
 * invert every tap-adjacency direction for Arabic players, the exact mistake
 * already caught and fixed in several earlier games this batch (see
 * games/gem-swap's .gs-board and games/memory-match's #board notes).
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
    title: 'Sliding Puzzle',
    blurb: 'Slide tiles into the blank space to put every number back in order.',
    langSwitchAria: 'Language',
    setupTitle: 'Sliding Puzzle',
    setupSub: 'Choose a grid size — that’s your difficulty.',
    sizeLabel: 'Grid size',
    sizeEasyBtn: '3×3 · 8-puzzle',
    sizeMediumBtn: '4×4 · 15-puzzle',
    sizeHardBtn: '5×5 · 24-puzzle',
    startBtn: 'Start',
    movesLabel: 'MOVES',
    timeLabel: 'TIME',
    hudMovesAria: 'Moves',
    hudTimeAria: 'Elapsed time',
    newGameBtn: 'Shuffle',
    changeSizeBtn: 'Change size',
    hint: 'Tap a tile in the blank’s row or column to slide it.',
    winTitle: 'Solved!',
    resultStats: 'Moves: {moves} · Time: {time}',
    newBestMoves: 'New best moves!',
    newBestTime: 'New best time!',
    newBestBoth: 'New best moves and time!',
    bestLine: 'Best for this size: {moves} moves · {time}',
    noBestYet: 'No best time yet for this size',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    title: 'Пятнашка',
    blurb: 'Сдвигай плитки на пустое место, чтобы расставить все цифры по порядку.',
    langSwitchAria: 'Язык',
    setupTitle: 'Пятнашка',
    setupSub: 'Выбери размер поля — это и есть сложность.',
    sizeLabel: 'Размер поля',
    sizeEasyBtn: '3×3 · 8 фишек',
    sizeMediumBtn: '4×4 · 15 фишек',
    sizeHardBtn: '5×5 · 24 фишки',
    startBtn: 'Начать',
    movesLabel: 'ХОДЫ',
    timeLabel: 'ВРЕМЯ',
    hudMovesAria: 'Ходы',
    hudTimeAria: 'Прошедшее время',
    newGameBtn: 'Перемешать',
    changeSizeBtn: 'Сменить размер',
    hint: 'Тапни плитку в строке или столбце пустого места, чтобы её сдвинуть.',
    winTitle: 'Решено!',
    resultStats: 'Ходы: {moves} · Время: {time}',
    newBestMoves: 'Новый рекорд по ходам!',
    newBestTime: 'Новый рекорд по времени!',
    newBestBoth: 'Новый рекорд по ходам и времени!',
    bestLine: 'Лучший результат для этого размера: {moves} ходов · {time}',
    noBestYet: 'Пока нет результата для этого размера',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    title: '滑动拼图',
    blurb: '将方块滑入空格，按顺序排好所有数字。',
    langSwitchAria: '语言',
    setupTitle: '滑动拼图',
    setupSub: '选择棋盘大小——这就是难度。',
    sizeLabel: '棋盘大小',
    sizeEasyBtn: '3×3 · 8拼图',
    sizeMediumBtn: '4×4 · 15拼图',
    sizeHardBtn: '5×5 · 24拼图',
    startBtn: '开始',
    movesLabel: '步数',
    timeLabel: '用时',
    hudMovesAria: '步数',
    hudTimeAria: '已用时间',
    newGameBtn: '重洗',
    changeSizeBtn: '更改大小',
    hint: '点击空格所在行或列中的方块即可滑动。',
    winTitle: '解开了！',
    resultStats: '步数：{moves} · 用时：{time}',
    newBestMoves: '步数新纪录！',
    newBestTime: '用时新纪录！',
    newBestBoth: '步数和用时都创新纪录！',
    bestLine: '此大小最佳成绩：{moves} 步 · {time}',
    noBestYet: '该大小还没有最佳成绩',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    title: 'Puzzle Deslizante',
    blurb: 'Desliza fichas hacia el hueco vacío para ordenar todos los números.',
    langSwitchAria: 'Idioma',
    setupTitle: 'Puzzle Deslizante',
    setupSub: 'Elige un tamaño de tablero: esa es la dificultad.',
    sizeLabel: 'Tamaño del tablero',
    sizeEasyBtn: '3×3 · 8 piezas',
    sizeMediumBtn: '4×4 · 15 piezas',
    sizeHardBtn: '5×5 · 24 piezas',
    startBtn: 'Empezar',
    movesLabel: 'MOVS',
    timeLabel: 'TIEMPO',
    hudMovesAria: 'Movimientos',
    hudTimeAria: 'Tiempo transcurrido',
    newGameBtn: 'Barajar',
    changeSizeBtn: 'Cambiar tamaño',
    hint: 'Toca una ficha en la fila o columna del hueco para deslizarla.',
    winTitle: '¡Resuelto!',
    resultStats: 'Movimientos: {moves} · Tiempo: {time}',
    newBestMoves: '¡Nuevo récord de movimientos!',
    newBestTime: '¡Nuevo récord de tiempo!',
    newBestBoth: '¡Nuevo récord de movimientos y tiempo!',
    bestLine: 'Mejor para este tamaño: {moves} movimientos · {time}',
    noBestYet: 'Aún sin mejor marca para este tamaño',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    title: 'أحجية الإزلاق',
    blurb: 'حرّك القطع نحو المربع الفارغ لترتّب كل الأرقام.',
    langSwitchAria: 'اللغة',
    setupTitle: 'أحجية الإزلاق',
    setupSub: 'اختر حجم اللوحة — وهو مستوى الصعوبة.',
    sizeLabel: 'حجم اللوحة',
    sizeEasyBtn: '3×3 · 8 قطع',
    sizeMediumBtn: '4×4 · 15 قطعة',
    sizeHardBtn: '5×5 · 24 قطعة',
    startBtn: 'ابدأ',
    movesLabel: 'الحركات',
    timeLabel: 'الوقت',
    hudMovesAria: 'الحركات',
    hudTimeAria: 'الوقت المنقضي',
    newGameBtn: 'إعادة الخلط',
    changeSizeBtn: 'تغيير الحجم',
    hint: 'اضغط على قطعة في صف أو عمود المربع الفارغ لتحريكها.',
    winTitle: 'تم الحل!',
    resultStats: 'الحركات: {moves} · الوقت: {time}',
    newBestMoves: 'رقم قياسي جديد في الحركات!',
    newBestTime: 'رقم قياسي جديد في الوقت!',
    newBestBoth: 'رقم قياسي جديد في الحركات والوقت!',
    bestLine: 'أفضل نتيجة لهذا الحجم: {moves} حركة · {time}',
    noBestYet: 'لا توجد أفضل نتيجة بعد لهذا الحجم',
    playAgainBtn: 'العب مجدداً',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Puzzle Coulissant',
    blurb: 'Faites glisser les tuiles vers la case vide pour remettre tous les nombres en ordre.',
    langSwitchAria: 'Langue',
    setupTitle: 'Puzzle Coulissant',
    setupSub: 'Choisissez une taille de grille — c’est votre difficulté.',
    sizeLabel: 'Taille de la grille',
    sizeEasyBtn: '3×3 · 8 pièces',
    sizeMediumBtn: '4×4 · 15 pièces',
    sizeHardBtn: '5×5 · 24 pièces',
    startBtn: 'Commencer',
    movesLabel: 'COUPS',
    timeLabel: 'TEMPS',
    hudMovesAria: 'Coups',
    hudTimeAria: 'Temps écoulé',
    newGameBtn: 'Mélanger',
    changeSizeBtn: 'Changer la taille',
    hint: 'Touchez une tuile sur la ligne ou la colonne de la case vide pour la faire glisser.',
    winTitle: 'Résolu !',
    resultStats: 'Coups : {moves} · Temps : {time}',
    newBestMoves: 'Nouveau record de coups !',
    newBestTime: 'Nouveau record de temps !',
    newBestBoth: 'Nouveau record de coups et de temps !',
    bestLine: 'Meilleur score pour cette taille : {moves} coups · {time}',
    noBestYet: 'Pas encore de meilleur score pour cette taille',
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
    const stored = localStorage.getItem('ogh_sliding_puzzle_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_sliding_puzzle_lang', lang);
  } catch {
    /* ignore */
  }
}

/** Translate a key, with optional {placeholder} substitution. */
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
