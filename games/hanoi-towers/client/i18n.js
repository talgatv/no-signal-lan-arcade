/**
 * i18n — string table for Towers of Hanoi. Mirrors games/memory-match/client/i18n.js
 * and games/sliding-puzzle/client/i18n.js (same shape this whole batch uses): a flat
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header, HUD pill labels,
 * hint, setup/result cards. It deliberately does NOT mirror the peg board: peg 0
 * (the leftmost, holding the starting stack) is always the visual left peg and
 * peg 2 (the goal) is always the visual right peg, regardless of document
 * direction (see index.html/app.js — the board carries dir="ltr"). Which peg is
 * "the start" and which is "the goal" is a fixed spatial gameplay convention,
 * not prose — mirroring it would silently swap start/goal for Arabic players,
 * the exact mistake already caught and fixed in several earlier games this
 * batch (see games/gem-swap's .gs-board and games/sliding-puzzle's #board
 * notes).
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
    title: 'Towers of Hanoi',
    blurb: 'Move the whole stack to the goal peg, one disk at a time, big never on small.',
    langSwitchAria: 'Language',
    setupTitle: 'Towers of Hanoi',
    setupSub: 'Choose how many disks to move — that’s your difficulty.',
    diskCountLabel: 'Disks',
    diffEasyLabel: 'Easy',
    diffMediumLabel: 'Medium',
    diffHardLabel: 'Hard',
    diffExtremeLabel: 'Extreme',
    optimalPreview: 'Minimum possible moves: {n}',
    startBtn: 'Start',
    movesLabel: 'MOVES',
    optimalLabelShort: 'OPT',
    timeLabel: 'TIME',
    hudMovesAria: 'Moves',
    hudOptimalAria: 'Optimal move count',
    hudTimeAria: 'Elapsed time',
    newGameBtn: 'Restart',
    changeSizeBtn: 'Change disks',
    hint: 'Tap a peg to pick up its top disk, tap another peg to place it.',
    targetLabel: 'Goal',
    invalidMsg: 'Can’t place a bigger disk on a smaller one!',
    winTitle: 'Solved!',
    resultStats: 'Moves: {moves} · Optimal: {optimal}',
    perfectSolve: 'Perfect! You matched the optimal solution!',
    newBestLine: 'New best!',
    bestLine: 'Best for {n} disks: {moves} moves',
    noBestYet: 'No best yet for this many disks',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    title: 'Ханойская башня',
    blurb: 'Перенеси всю стопку на целевой стержень по одному диску, большой никогда на меньший.',
    langSwitchAria: 'Язык',
    setupTitle: 'Ханойская башня',
    setupSub: 'Выбери число дисков — это и есть сложность.',
    diskCountLabel: 'Диски',
    diffEasyLabel: 'Легко',
    diffMediumLabel: 'Средне',
    diffHardLabel: 'Сложно',
    diffExtremeLabel: 'Экстремально',
    optimalPreview: 'Минимум ходов: {n}',
    startBtn: 'Начать',
    movesLabel: 'ХОДЫ',
    optimalLabelShort: 'МИН',
    timeLabel: 'ВРЕМЯ',
    hudMovesAria: 'Ходы',
    hudOptimalAria: 'Минимальное число ходов',
    hudTimeAria: 'Прошедшее время',
    newGameBtn: 'Заново',
    changeSizeBtn: 'Сменить диски',
    hint: 'Тапни стержень, чтобы взять верхний диск, затем тапни другой, чтобы его поставить.',
    targetLabel: 'Цель',
    invalidMsg: 'Нельзя ставить больший диск на меньший!',
    winTitle: 'Решено!',
    resultStats: 'Ходы: {moves} · Минимум: {optimal}',
    perfectSolve: 'Идеально! Ты повторил оптимальное решение!',
    newBestLine: 'Новый рекорд!',
    bestLine: 'Лучший результат для {n} дисков: {moves} ходов',
    noBestYet: 'Пока нет результата для этого числа дисков',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    title: '汉诺塔',
    blurb: '将整摞圆盘一次一个地移到目标柱，大盘永远不能放在小盘上面。',
    langSwitchAria: '语言',
    setupTitle: '汉诺塔',
    setupSub: '选择圆盘数量——这就是难度。',
    diskCountLabel: '圆盘数',
    diffEasyLabel: '简单',
    diffMediumLabel: '中等',
    diffHardLabel: '困难',
    diffExtremeLabel: '极限',
    optimalPreview: '最少步数：{n}',
    startBtn: '开始',
    movesLabel: '步数',
    optimalLabelShort: '最优',
    timeLabel: '用时',
    hudMovesAria: '步数',
    hudOptimalAria: '最少步数',
    hudTimeAria: '已用时间',
    newGameBtn: '重新开始',
    changeSizeBtn: '更改圆盘数',
    hint: '点击一根柱子拿起最上面的圆盘，再点击另一根柱子放下。',
    targetLabel: '目标',
    invalidMsg: '不能把大圆盘放在小圆盘上面！',
    winTitle: '解开了！',
    resultStats: '步数：{moves} · 最优：{optimal}',
    perfectSolve: '完美！你达到了最优解！',
    newBestLine: '新纪录！',
    bestLine: '{n} 个圆盘的最佳成绩：{moves} 步',
    noBestYet: '该圆盘数还没有最佳成绩',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    title: 'Torres de Hanói',
    blurb: 'Mueve toda la pila al poste meta, un disco a la vez, nunca uno grande sobre uno pequeño.',
    langSwitchAria: 'Idioma',
    setupTitle: 'Torres de Hanói',
    setupSub: 'Elige cuántos discos mover: esa es la dificultad.',
    diskCountLabel: 'Discos',
    diffEasyLabel: 'Fácil',
    diffMediumLabel: 'Medio',
    diffHardLabel: 'Difícil',
    diffExtremeLabel: 'Extremo',
    optimalPreview: 'Movimientos mínimos: {n}',
    startBtn: 'Empezar',
    movesLabel: 'MOVS',
    optimalLabelShort: 'ÓPT',
    timeLabel: 'TIEMPO',
    hudMovesAria: 'Movimientos',
    hudOptimalAria: 'Número óptimo de movimientos',
    hudTimeAria: 'Tiempo transcurrido',
    newGameBtn: 'Reiniciar',
    changeSizeBtn: 'Cambiar discos',
    hint: 'Toca un poste para tomar su disco superior, toca otro poste para colocarlo.',
    targetLabel: 'Meta',
    invalidMsg: '¡No puedes poner un disco grande sobre uno pequeño!',
    winTitle: '¡Resuelto!',
    resultStats: 'Movimientos: {moves} · Óptimo: {optimal}',
    perfectSolve: '¡Perfecto! ¡Igualaste la solución óptima!',
    newBestLine: '¡Nuevo récord!',
    bestLine: 'Mejor para {n} discos: {moves} movimientos',
    noBestYet: 'Aún sin mejor marca para esta cantidad de discos',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    title: 'أبراج هانوي',
    blurb: 'انقل الكومة بأكملها إلى العمود الهدف، قرصًا واحدًا في كل مرة، ولا يوضع الكبير أبدًا فوق الصغير.',
    langSwitchAria: 'اللغة',
    setupTitle: 'أبراج هانوي',
    setupSub: 'اختر عدد الأقراص — وهو مستوى الصعوبة.',
    diskCountLabel: 'الأقراص',
    diffEasyLabel: 'سهل',
    diffMediumLabel: 'متوسط',
    diffHardLabel: 'صعب',
    diffExtremeLabel: 'شديد الصعوبة',
    optimalPreview: 'أقل عدد ممكن من الحركات: {n}',
    startBtn: 'ابدأ',
    movesLabel: 'الحركات',
    optimalLabelShort: 'الأمثل',
    timeLabel: 'الوقت',
    hudMovesAria: 'الحركات',
    hudOptimalAria: 'أقل عدد من الحركات',
    hudTimeAria: 'الوقت المنقضي',
    newGameBtn: 'إعادة البدء',
    changeSizeBtn: 'تغيير عدد الأقراص',
    hint: 'اضغط على عمود لالتقاط قرصه العلوي، ثم اضغط على عمود آخر لوضعه هناك.',
    targetLabel: 'الهدف',
    invalidMsg: 'لا يمكن وضع قرص أكبر فوق قرص أصغر!',
    winTitle: 'تم الحل!',
    resultStats: 'الحركات: {moves} · الأمثل: {optimal}',
    perfectSolve: 'ممتاز! لقد طابقت الحل الأمثل!',
    newBestLine: 'رقم قياسي جديد!',
    bestLine: 'أفضل نتيجة لعدد {n} أقراص: {moves} حركة',
    noBestYet: 'لا توجد أفضل نتيجة بعد لهذا العدد من الأقراص',
    playAgainBtn: 'العب مجدداً',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Tours de Hanoï',
    blurb: 'Déplacez toute la pile vers la tige cible, un disque à la fois, jamais un grand sur un petit.',
    langSwitchAria: 'Langue',
    setupTitle: 'Tours de Hanoï',
    setupSub: 'Choisissez le nombre de disques — c’est votre difficulté.',
    diskCountLabel: 'Disques',
    diffEasyLabel: 'Facile',
    diffMediumLabel: 'Moyen',
    diffHardLabel: 'Difficile',
    diffExtremeLabel: 'Extrême',
    optimalPreview: 'Coups minimum : {n}',
    startBtn: 'Commencer',
    movesLabel: 'COUPS',
    optimalLabelShort: 'OPT',
    timeLabel: 'TEMPS',
    hudMovesAria: 'Coups',
    hudOptimalAria: 'Nombre de coups optimal',
    hudTimeAria: 'Temps écoulé',
    newGameBtn: 'Recommencer',
    changeSizeBtn: 'Changer les disques',
    hint: 'Touchez une tige pour prendre son disque du dessus, touchez une autre tige pour le poser.',
    targetLabel: 'Objectif',
    invalidMsg: 'Impossible de poser un grand disque sur un petit !',
    winTitle: 'Résolu !',
    resultStats: 'Coups : {moves} · Optimal : {optimal}',
    perfectSolve: 'Parfait ! Vous avez égalé la solution optimale !',
    newBestLine: 'Nouveau record !',
    bestLine: 'Meilleur score pour {n} disques : {moves} coups',
    noBestYet: 'Pas encore de meilleur score pour ce nombre de disques',
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
    const stored = localStorage.getItem('ogh_hanoi_towers_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_hanoi_towers_lang', lang);
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
