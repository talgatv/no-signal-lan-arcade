/**
 * i18n — small string table for Klondike Solitaire.
 * Mirrors the pattern used by games/pop-the-bugs/client/i18n.js: a flat
 * STRINGS table per UN-6 language, a couple of detect/apply helpers, no
 * framework. RTL (Arabic) flips text-bearing UI chrome only — the card
 * board's layout (column order, foundation positions) is a fixed spatial
 * convention and is deliberately kept un-mirrored (see index.html's
 * dir="ltr" on #board and layout.js's header comment).
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
    undoBtn: 'Undo',
    newGameBtn: 'New game',
    autoFinishBtn: 'Auto-finish',
    hint: 'Drag a card, or tap to select then tap a destination. Foundations build up by suit from Ace; tableau builds down in alternating colors.',
    winTitle: 'You win!',
    winStats: 'Moves: {moves} · Time: {time}',
    playAgainBtn: 'Play again',
    movesAria: 'Moves',
    timeAria: 'Time elapsed',
    drawLabel: 'Draw',
    drawAria: 'Draw mode — tap to switch between drawing 1 or 3 cards from the stock',
    stockAria: 'Stock — tap to draw',
    wasteAria: 'Waste pile',
    foundationAria: 'Foundation pile',
    tableauAria: 'Tableau column',
  },
  ru: {
    back: 'Библиотека',
    undoBtn: 'Отменить',
    newGameBtn: 'Новая игра',
    autoFinishBtn: 'Автозавершение',
    hint: 'Перетащи карту или тапни, чтобы выбрать, затем тапни место назначения. Фундамент собирается по масти от туза; в раскладе — по убыванию с чередованием цвета.',
    winTitle: 'Вы выиграли!',
    winStats: 'Ходов: {moves} · Время: {time}',
    playAgainBtn: 'Играть снова',
    movesAria: 'Ходы',
    timeAria: 'Прошло времени',
    drawLabel: 'Открытие',
    drawAria: 'Режим открытия карт — тапни, чтобы переключить между 1 и 3 картами из колоды',
    stockAria: 'Колода — тапни, чтобы открыть карту',
    wasteAria: 'Отбой',
    foundationAria: 'Стопка фундамента',
    tableauAria: 'Колонка расклада',
  },
  zh: {
    back: '资料库',
    undoBtn: '撤销',
    newGameBtn: '新游戏',
    autoFinishBtn: '自动完成',
    hint: '拖动卡牌，或点击选中后再点击目标位置。基础堆按花色从 A 开始递增；牌列按降序交替颜色排列。',
    winTitle: '你赢了！',
    winStats: '步数：{moves} · 用时：{time}',
    playAgainBtn: '再玩一次',
    movesAria: '步数',
    timeAria: '已用时间',
    drawLabel: '发牌',
    drawAria: '发牌模式——点击切换每次从牌堆翻开 1 张或 3 张',
    stockAria: '牌堆——点击翻牌',
    wasteAria: '弃牌堆',
    foundationAria: '基础堆',
    tableauAria: '牌列',
  },
  es: {
    back: 'Biblioteca',
    undoBtn: 'Deshacer',
    newGameBtn: 'Nueva partida',
    autoFinishBtn: 'Auto-terminar',
    hint: 'Arrastra una carta, o toca para seleccionar y luego toca un destino. Los cimientos se arman por palo desde el As; el tablero desciende alternando colores.',
    winTitle: '¡Has ganado!',
    winStats: 'Movimientos: {moves} · Tiempo: {time}',
    playAgainBtn: 'Jugar de nuevo',
    movesAria: 'Movimientos',
    timeAria: 'Tiempo transcurrido',
    drawLabel: 'Robo',
    drawAria: 'Modo de robo — toca para alternar entre robar 1 o 3 cartas del mazo',
    stockAria: 'Mazo — toca para robar',
    wasteAria: 'Pila de descarte',
    foundationAria: 'Pila de cimiento',
    tableauAria: 'Columna del tablero',
  },
  ar: {
    back: 'المكتبة',
    undoBtn: 'تراجع',
    newGameBtn: 'لعبة جديدة',
    autoFinishBtn: 'إنهاء تلقائي',
    hint: 'اسحب ورقة، أو اضغط للتحديد ثم اضغط الوجهة. تُبنى الأساسات حسب نوع الورق من الآس صعودًا؛ ويُبنى الرصيف تنازليًا بتناوب الألوان.',
    winTitle: 'لقد فزت!',
    winStats: 'الحركات: {moves} · الوقت: {time}',
    playAgainBtn: 'العب مرة أخرى',
    movesAria: 'الحركات',
    timeAria: 'الوقت المنقضي',
    drawLabel: 'سحب',
    drawAria: 'وضع السحب — اضغط للتبديل بين سحب ورقة واحدة أو ثلاث من الحزمة',
    stockAria: 'الحزمة — اضغط للسحب',
    wasteAria: 'كومة النفايات',
    foundationAria: 'كومة الأساس',
    tableauAria: 'عمود الرصيف',
  },
  fr: {
    back: 'Bibliothèque',
    undoBtn: 'Annuler',
    newGameBtn: 'Nouvelle partie',
    autoFinishBtn: 'Terminer auto',
    hint: "Faites glisser une carte, ou touchez pour sélectionner puis touchez une destination. Les fondations se construisent par couleur depuis l'As ; le tableau descend en alternant les couleurs.",
    winTitle: 'Vous avez gagné !',
    winStats: 'Coups : {moves} · Temps : {time}',
    playAgainBtn: 'Rejouer',
    movesAria: 'Coups',
    timeAria: 'Temps écoulé',
    drawLabel: 'Pioche',
    drawAria: 'Mode de pioche — touchez pour basculer entre piocher 1 ou 3 cartes de la pioche',
    stockAria: 'Pioche — touchez pour piocher',
    wasteAria: 'Talon',
    foundationAria: 'Pile de fondation',
    tableauAria: 'Colonne du tableau',
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
    const stored = localStorage.getItem('ogh_solitaire_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_solitaire_lang', lang);
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
