/**
 * i18n — string table for Gem Swap. Mirrors games/hill-rider/client/i18n.js
 * and other siblings this batch (same shape): a flat STRINGS table per
 * UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link,
 * HUD pill labels, hint, legend and overlay cards. It deliberately does
 * NOT mirror the gem grid: column 0 is always the visual left column and
 * "swap right" always means "toward higher column index" regardless of
 * document direction (see game.js/style.css — the board and its stage
 * wrapper are pinned dir="ltr"). A puzzle grid is a fixed spatial
 * gameplay convention, not prose, and mirroring it would silently invert
 * every drag/tap-adjacency direction for Arabic players — the exact
 * mistake already caught and fixed in a few earlier games this batch
 * (see games/pop-the-bugs' .pb-grid and games/solitaire's #board notes).
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
    title: 'Gem Swap',
    blurb:
      'Swap adjacent gems to line up 3 or more of the same shape. Matches cascade, cascades combo, and a big enough line earns a gem worth using.',
    langSwitchAria: 'Language',
    startBtn: 'Start',
    playAgainBtn: 'Play again',
    scoreLabel: 'SCORE',
    movesLabel: 'MOVES',
    hudScoreAria: 'Score',
    hudMovesAria: 'Moves remaining',
    comboLabel: 'COMBO ×{n}',
    reshuffleMsg: 'No moves left — reshuffling the board!',
    resultTitle: 'Out of Moves',
    resultSub: 'The board is yours until the next swap — see how you did.',
    finalScoreLabel: 'Score',
    bestLabel: 'Best score',
    newBestLine: 'New best score!',
    controlsNote:
      'Drag a gem into a neighbor to swap, or tap a gem then tap an adjacent one. Only swaps that make a match are allowed — anything else swaps back.',
    hint: 'Swap two adjacent gems to match 3 or more',
    legendMatch3: '3 in a line: clears and scores',
    legendMatch4: '4 in a line: creates a line-clear gem',
    legendMatch5: '5 in a line: creates a color bomb',
    legendBomb: 'Color bomb: swap it to clear a whole color',
  },
  ru: {
    back: 'Библиотека',
    title: 'Самоцветы',
    blurb:
      'Меняй местами соседние самоцветы, чтобы выстроить 3 и более одинаковых. Совпадения вызывают цепочки, цепочки — комбо, а достаточно длинная линия создаёт особый самоцвет.',
    langSwitchAria: 'Язык',
    startBtn: 'Начать',
    playAgainBtn: 'Играть ещё',
    scoreLabel: 'ОЧКИ',
    movesLabel: 'ХОДЫ',
    hudScoreAria: 'Очки',
    hudMovesAria: 'Осталось ходов',
    comboLabel: 'КОМБО ×{n}',
    reshuffleMsg: 'Нет ходов — поле перемешивается!',
    resultTitle: 'Ходы закончились',
    resultSub: 'Партия окончена — посмотри, что получилось.',
    finalScoreLabel: 'Очки',
    bestLabel: 'Лучший результат',
    newBestLine: 'Новый рекорд!',
    controlsNote:
      'Перетащи самоцвет на соседнюю клетку, либо тапни один самоцвет и затем соседний. Разрешены только ходы, создающие совпадение — остальные откатываются обратно.',
    hint: 'Меняй местами соседние самоцветы, чтобы собрать 3 и более',
    legendMatch3: '3 в ряд: очищаются и приносят очки',
    legendMatch4: '4 в ряд: создаёт самоцвет-очиститель линии',
    legendMatch5: '5 в ряд: создаёт цветную бомбу',
    legendBomb: 'Цветная бомба: смени её местом, чтобы очистить весь цвет',
  },
  zh: {
    back: '资料库',
    title: '宝石交换',
    blurb:
      '交换相邻的宝石，凑齐3个或以上相同形状即可消除。连锁会触发连击，足够长的连线还能生成强力宝石。',
    langSwitchAria: '语言',
    startBtn: '开始',
    playAgainBtn: '再玩一次',
    scoreLabel: '分数',
    movesLabel: '步数',
    hudScoreAria: '分数',
    hudMovesAria: '剩余步数',
    comboLabel: '连击 ×{n}',
    reshuffleMsg: '没有可用的一步——正在重新排列棋盘！',
    resultTitle: '步数用完',
    resultSub: '这局到此为止——看看你的成绩吧。',
    finalScoreLabel: '分数',
    bestLabel: '最高分',
    newBestLine: '刷新最高分！',
    controlsNote:
      '把一颗宝石拖到相邻格子即可交换，或先点击一颗宝石再点击相邻的一颗。只有能消除的交换才会生效，否则会自动换回去。',
    hint: '交换相邻宝石，凑齐3个或以上',
    legendMatch3: '3连：消除并得分',
    legendMatch4: '4连：生成清线宝石',
    legendMatch5: '5连：生成彩色炸弹',
    legendBomb: '彩色炸弹：与之交换可清除整个颜色',
  },
  es: {
    back: 'Biblioteca',
    title: 'Gemas al Cambio',
    blurb:
      'Intercambia gemas adyacentes para alinear 3 o más de la misma forma. Las combinaciones encadenan, las cadenas dan combo, y una línea suficientemente larga crea una gema especial.',
    langSwitchAria: 'Idioma',
    startBtn: 'Empezar',
    playAgainBtn: 'Jugar de nuevo',
    scoreLabel: 'PUNTOS',
    movesLabel: 'MOVS',
    hudScoreAria: 'Puntuación',
    hudMovesAria: 'Movimientos restantes',
    comboLabel: 'COMBO ×{n}',
    reshuffleMsg: '¡Sin movimientos posibles — barajando el tablero!',
    resultTitle: 'Sin Movimientos',
    resultSub: 'La partida terminó — mira cómo te fue.',
    finalScoreLabel: 'Puntos',
    bestLabel: 'Mejor puntuación',
    newBestLine: '¡Nueva mejor puntuación!',
    controlsNote:
      'Arrastra una gema hacia una vecina para intercambiarlas, o toca una gema y luego una adyacente. Solo se permiten intercambios que formen una combinación — el resto vuelve a su sitio.',
    hint: 'Intercambia dos gemas adyacentes para combinar 3 o más',
    legendMatch3: '3 en línea: se eliminan y suman puntos',
    legendMatch4: '4 en línea: crea una gema que limpia una línea',
    legendMatch5: '5 en línea: crea una bomba de color',
    legendBomb: 'Bomba de color: intercámbiala para limpiar un color entero',
  },
  ar: {
    back: 'المكتبة',
    title: 'تبديل الجواهر',
    blurb:
      'بدّل الجواهر المتجاورة لتصطف 3 أو أكثر من نفس الشكل. التطابقات تُحدث تسلسلات متتابعة، والتسلسلات تمنحك كومبو، وخط طويل بما يكفي يصنع جوهرة خاصة قوية.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ',
    playAgainBtn: 'العب مجددًا',
    scoreLabel: 'النقاط',
    movesLabel: 'الحركات',
    hudScoreAria: 'النقاط',
    hudMovesAria: 'الحركات المتبقية',
    comboLabel: 'كومبو ×{n}',
    reshuffleMsg: 'لا حركات ممكنة — يعاد ترتيب اللوحة!',
    resultTitle: 'نفدت الحركات',
    resultSub: 'انتهت الجولة — انظر كيف كانت نتيجتك.',
    finalScoreLabel: 'النقاط',
    bestLabel: 'أفضل نتيجة',
    newBestLine: 'رقم قياسي جديد!',
    controlsNote:
      'اسحب جوهرة إلى جوهرة مجاورة لتبديلهما، أو اضغط على جوهرة ثم اضغط على المجاورة لها. يُسمح فقط بالتبديلات التي تُحدث تطابقًا — أي تبديل آخر يعود كما كان.',
    hint: 'بدّل جوهرتين متجاورتين لتطابق 3 أو أكثر',
    legendMatch3: '3 في خط: تُزال وتمنح نقاطًا',
    legendMatch4: '4 في خط: تصنع جوهرة تُفرغ خطًا كاملًا',
    legendMatch5: '5 في خط: تصنع قنبلة لونية',
    legendBomb: 'قنبلة لونية: بدّلها لتفريغ لون كامل من اللوحة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Échange de Gemmes',
    blurb:
      'Échangez des gemmes adjacentes pour aligner 3 ou plus de la même forme. Les combinaisons s\'enchaînent, les enchaînements donnent des combos, et une ligne assez longue crée une gemme spéciale.',
    langSwitchAria: 'Langue',
    startBtn: 'Commencer',
    playAgainBtn: 'Rejouer',
    scoreLabel: 'SCORE',
    movesLabel: 'COUPS',
    hudScoreAria: 'Score',
    hudMovesAria: 'Coups restants',
    comboLabel: 'COMBO ×{n}',
    reshuffleMsg: 'Plus aucun coup possible — mélange du plateau !',
    resultTitle: 'Plus de Coups',
    resultSub: 'La partie est terminée — regardez votre résultat.',
    finalScoreLabel: 'Score',
    bestLabel: 'Meilleur score',
    newBestLine: 'Nouveau meilleur score !',
    controlsNote:
      "Glissez une gemme vers une voisine pour les échanger, ou touchez une gemme puis une gemme adjacente. Seuls les échanges qui créent une combinaison sont autorisés — les autres reviennent en place.",
    hint: 'Échangez deux gemmes adjacentes pour en aligner 3 ou plus',
    legendMatch3: '3 alignées : éliminées et comptées',
    legendMatch4: '4 alignées : crée une gemme qui nettoie une ligne',
    legendMatch5: '5 alignées : crée une bombe de couleur',
    legendBomb: 'Bombe de couleur : échangez-la pour effacer toute une couleur',
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
    const stored = localStorage.getItem('ogh_gem_swap_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_gem_swap_lang', lang);
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
