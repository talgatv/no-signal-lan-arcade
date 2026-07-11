/**
 * i18n — small string table for Mahjong Solitaire.
 * Mirrors games/solitaire/client/i18n.js (same batch, same shape): a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only — the tile board's layout
 * is a fixed spatial puzzle structure (not text), and is deliberately kept
 * un-mirrored (see index.html's dir="ltr" on #board and layout.js).
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
    hintBtn: 'Hint',
    undoBtn: 'Undo',
    shuffleBtn: 'Shuffle',
    newGameBtn: 'New game',
    movesAria: 'Moves',
    timeAria: 'Time elapsed',
    tilesLeftAria: 'Tiles left',
    hint: 'Tap two matching free tiles to clear them. A tile is free when nothing covers it and at least one side is open. Mahjong Solitaire — a solo tile-matching puzzle, not the 4-player Mahjong card game.',
    winTitle: 'Board cleared!',
    winStats: 'Moves: {moves} · Time: {time}',
    playAgainBtn: 'Play again',
    deadlockTitle: 'No moves left',
    deadlockMsg: 'No two free tiles match right now. Shuffle the remaining tiles into a fresh, solvable arrangement, or start over.',
    deadlockShuffleBtn: 'Shuffle tiles',
    deadlockRestartBtn: 'New game',
    deadlockUndoBtn: 'Undo last move',
  },
  ru: {
    back: 'Библиотека',
    hintBtn: 'Подсказка',
    undoBtn: 'Отменить',
    shuffleBtn: 'Перемешать',
    newGameBtn: 'Новая игра',
    movesAria: 'Ходы',
    timeAria: 'Прошло времени',
    tilesLeftAria: 'Осталось плиток',
    hint: 'Тапни две одинаковые свободные плитки, чтобы убрать их. Плитка свободна, если она ничем не накрыта и хотя бы одна её сторона открыта. Маджонг-пасьянс — головоломка на составление пар для одного игрока, а не карточная игра на четверых.',
    winTitle: 'Поле очищено!',
    winStats: 'Ходов: {moves} · Время: {time}',
    playAgainBtn: 'Играть снова',
    deadlockTitle: 'Нет ходов',
    deadlockMsg: 'Сейчас нет двух одинаковых свободных плиток. Перемешай оставшиеся плитки в новую решаемую расстановку или начни заново.',
    deadlockShuffleBtn: 'Перемешать плитки',
    deadlockRestartBtn: 'Новая игра',
    deadlockUndoBtn: 'Отменить последний ход',
  },
  zh: {
    back: '资料库',
    hintBtn: '提示',
    undoBtn: '撤销',
    shuffleBtn: '洗牌',
    newGameBtn: '新游戏',
    movesAria: '步数',
    timeAria: '已用时间',
    tilesLeftAria: '剩余牌数',
    hint: '点击两张相同的空闲牌即可消除。一张牌"空闲"需满足：上面没有牌压住，且左右两侧至少一侧无牌相邻。麻将接龙是单人配对益智游戏，不是四人麻将牌类游戏。',
    winTitle: '牌局清空！',
    winStats: '步数：{moves} · 用时：{time}',
    playAgainBtn: '再玩一次',
    deadlockTitle: '无牌可走',
    deadlockMsg: '当前没有两张相同的空闲牌可以配对。可以把剩余的牌重新洗成一个可解的新排列，或者重新开始。',
    deadlockShuffleBtn: '洗牌',
    deadlockRestartBtn: '新游戏',
    deadlockUndoBtn: '撤销上一步',
  },
  es: {
    back: 'Biblioteca',
    hintBtn: 'Pista',
    undoBtn: 'Deshacer',
    shuffleBtn: 'Mezclar',
    newGameBtn: 'Nueva partida',
    movesAria: 'Movimientos',
    timeAria: 'Tiempo transcurrido',
    tilesLeftAria: 'Fichas restantes',
    hint: 'Toca dos fichas libres iguales para eliminarlas. Una ficha está libre si nada la cubre y al menos un lado queda abierto. Mahjong Solitario: un rompecabezas de emparejar fichas para un jugador, no el juego de cartas de Mahjong a cuatro.',
    winTitle: '¡Tablero despejado!',
    winStats: 'Movimientos: {moves} · Tiempo: {time}',
    playAgainBtn: 'Jugar de nuevo',
    deadlockTitle: 'Sin movimientos',
    deadlockMsg: 'Ahora mismo no hay dos fichas libres iguales. Mezcla las fichas restantes en una disposición nueva y resoluble, o empieza de nuevo.',
    deadlockShuffleBtn: 'Mezclar fichas',
    deadlockRestartBtn: 'Nueva partida',
    deadlockUndoBtn: 'Deshacer última jugada',
  },
  ar: {
    back: 'المكتبة',
    hintBtn: 'تلميح',
    undoBtn: 'تراجع',
    shuffleBtn: 'خلط',
    newGameBtn: 'لعبة جديدة',
    movesAria: 'الحركات',
    timeAria: 'الوقت المنقضي',
    tilesLeftAria: 'القطع المتبقية',
    hint: 'اضغط على قطعتين متطابقتين وحرّتين لإزالتهما. تكون القطعة حرّة إذا لم يكن هناك شيء فوقها وكان أحد جانبيها مفتوحًا على الأقل. سوليتير ماهجونغ لعبة ألغاز لمطابقة القطع لاعب واحد، وليست لعبة الورق الجماعية لأربعة لاعبين.',
    winTitle: 'تم تفريغ اللوحة!',
    winStats: 'الحركات: {moves} · الوقت: {time}',
    playAgainBtn: 'العب مرة أخرى',
    deadlockTitle: 'لا حركات متاحة',
    deadlockMsg: 'لا توجد الآن قطعتان حرّتان متطابقتان. أعد خلط القطع المتبقية بترتيب جديد قابل للحل، أو ابدأ من جديد.',
    deadlockShuffleBtn: 'خلط القطع',
    deadlockRestartBtn: 'لعبة جديدة',
    deadlockUndoBtn: 'تراجع عن آخر حركة',
  },
  fr: {
    back: 'Bibliothèque',
    hintBtn: 'Indice',
    undoBtn: 'Annuler',
    shuffleBtn: 'Mélanger',
    newGameBtn: 'Nouvelle partie',
    movesAria: 'Coups',
    timeAria: 'Temps écoulé',
    tilesLeftAria: 'Tuiles restantes',
    hint: "Touchez deux tuiles libres identiques pour les retirer. Une tuile est libre si rien ne la recouvre et qu'au moins un côté est dégagé. Mahjong Solitaire : un casse-tête d'appariement en solo, pas le jeu de cartes Mahjong à quatre joueurs.",
    winTitle: 'Plateau nettoyé !',
    winStats: 'Coups : {moves} · Temps : {time}',
    playAgainBtn: 'Rejouer',
    deadlockTitle: 'Plus aucun coup possible',
    deadlockMsg: "Aucune paire de tuiles libres identiques pour l'instant. Mélangez les tuiles restantes en un nouvel arrangement soluble, ou recommencez.",
    deadlockShuffleBtn: 'Mélanger les tuiles',
    deadlockRestartBtn: 'Nouvelle partie',
    deadlockUndoBtn: 'Annuler le dernier coup',
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
    const stored = localStorage.getItem('ogh_mahjong_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_mahjong_lang', lang);
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
