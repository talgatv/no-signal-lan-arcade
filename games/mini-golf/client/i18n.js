/**
 * i18n — small string table for Mini Golf.
 * Mirrors games/cross-the-road/client/i18n.js (same batch, same shape): a
 * flat STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only (HUD pills, overlay cards,
 * buttons) — the course itself (fairway shape, wall/hazard positions, aim
 * direction) is a fixed spatial gameplay layout, not text, and is
 * deliberately kept un-mirrored: game.js hardcodes dir="ltr" on the canvas
 * regardless of document-level RTL, same precedent as games/penguin-fling's
 * canvas and games/cross-the-road's #board/#grid.
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
    title: 'Mini Golf',
    blurb: 'Drag back from the ball like a slingshot, then let go to putt. Roll around sand, cross water carefully, and sink the cup in as few strokes as you can — 9 holes, real par.',
    startBtn: 'Start Round',
    holeLabel: 'Hole {n}/{total}',
    parLabel: 'Par {par}',
    strokesLabel: 'Strokes {n}',
    totalLabel: 'Total {v}',
    aimHint: 'Drag back from the ball, then let go to putt',
    aimReadout: 'Power {power}%',
    rollingHint: 'Rolling…',
    waterMessage: 'Splash! +1 stroke penalty',
    holeCompleteTitle: 'Hole complete!',
    holeCompleteLine: 'Par {par} — you took {strokes} ({diff})',
    nextHoleBtn: 'Next hole',
    finalTitle: 'Round complete!',
    finalTotalLine: 'Total: {strokes} strokes ({diff} vs par {par})',
    playAgainBtn: 'Play again',
    scorecardHoleCol: 'Hole',
    scorecardParCol: 'Par',
    scorecardStrokesCol: 'Strokes',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: 'Total',
    termAce: 'Hole in one!',
    termEagle: 'Eagle',
    termBirdie: 'Birdie',
    termPar: 'Par',
    termBogey: 'Bogey',
    termDouble: 'Double bogey+',
    langSwitchAria: 'Language',
  },
  ru: {
    back: 'Библиотека',
    title: 'Мини-гольф',
    blurb: 'Оттяни мяч назад, как рогатку, и отпусти для удара. Обходи песок, аккуратно пересекай воду и загони мяч в лунку за минимум ударов — 9 лунок, настоящий пар.',
    startBtn: 'Начать раунд',
    holeLabel: 'Лунка {n}/{total}',
    parLabel: 'Пар {par}',
    strokesLabel: 'Удары {n}',
    totalLabel: 'Итог {v}',
    aimHint: 'Оттяни мяч назад и отпусти для удара',
    aimReadout: 'Сила {power}%',
    rollingHint: 'Катится…',
    waterMessage: 'Плюх! Штраф +1 удар',
    holeCompleteTitle: 'Лунка пройдена!',
    holeCompleteLine: 'Пар {par} — ударов: {strokes} ({diff})',
    nextHoleBtn: 'Следующая лунка',
    finalTitle: 'Раунд завершён!',
    finalTotalLine: 'Итого: {strokes} ударов ({diff} к пару {par})',
    playAgainBtn: 'Играть снова',
    scorecardHoleCol: 'Лунка',
    scorecardParCol: 'Пар',
    scorecardStrokesCol: 'Удары',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: 'Итого',
    termAce: 'Лунка с одного удара!',
    termEagle: 'Игл',
    termBirdie: 'Берди',
    termPar: 'Пар',
    termBogey: 'Богги',
    termDouble: 'Двойной боги+',
    langSwitchAria: 'Язык',
  },
  zh: {
    back: '资料库',
    title: '迷你高尔夫',
    blurb: '像弹弓一样把球向后拉，松开即可击球。绕开沙坑，小心穿过水域，用最少的杆数把球打进洞——共 9 洞，真实标准杆。',
    startBtn: '开始比赛',
    holeLabel: '第 {n}/{total} 洞',
    parLabel: '标准杆 {par}',
    strokesLabel: '杆数 {n}',
    totalLabel: '总计 {v}',
    aimHint: '把球向后拖拽，松开即可击球',
    aimReadout: '力度 {power}%',
    rollingHint: '滚动中…',
    waterMessage: '扑通！罚一杆',
    holeCompleteTitle: '本洞完成！',
    holeCompleteLine: '标准杆 {par} — 你用了 {strokes} 杆（{diff}）',
    nextHoleBtn: '下一洞',
    finalTitle: '全场结束！',
    finalTotalLine: '总杆数：{strokes}（相对标准杆 {par} 为 {diff}）',
    playAgainBtn: '再玩一次',
    scorecardHoleCol: '球洞',
    scorecardParCol: '标准杆',
    scorecardStrokesCol: '杆数',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: '总计',
    termAce: '一杆进洞！',
    termEagle: '老鹰',
    termBirdie: '小鸟',
    termPar: '标准杆',
    termBogey: '柏忌',
    termDouble: '双柏忌+',
    langSwitchAria: '语言',
  },
  es: {
    back: 'Biblioteca',
    title: 'Minigolf',
    blurb: 'Arrastra hacia atrás desde la bola como un tirachinas y suelta para golpear. Esquiva la arena, cruza el agua con cuidado y mete la bola en el hoyo con los menos golpes posibles — 9 hoyos, par real.',
    startBtn: 'Iniciar Ronda',
    holeLabel: 'Hoyo {n}/{total}',
    parLabel: 'Par {par}',
    strokesLabel: 'Golpes {n}',
    totalLabel: 'Total {v}',
    aimHint: 'Arrastra hacia atrás desde la bola y suelta para golpear',
    aimReadout: 'Potencia {power}%',
    rollingHint: 'Rodando…',
    waterMessage: '¡Chapuzón! Penalización de +1 golpe',
    holeCompleteTitle: '¡Hoyo completado!',
    holeCompleteLine: 'Par {par} — hiciste {strokes} ({diff})',
    nextHoleBtn: 'Siguiente hoyo',
    finalTitle: '¡Ronda completada!',
    finalTotalLine: 'Total: {strokes} golpes ({diff} vs par {par})',
    playAgainBtn: 'Jugar de nuevo',
    scorecardHoleCol: 'Hoyo',
    scorecardParCol: 'Par',
    scorecardStrokesCol: 'Golpes',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: 'Total',
    termAce: '¡Hoyo en uno!',
    termEagle: 'Águila',
    termBirdie: 'Birdie',
    termPar: 'Par',
    termBogey: 'Bogey',
    termDouble: 'Doble bogey+',
    langSwitchAria: 'Idioma',
  },
  ar: {
    back: 'المكتبة',
    title: 'الغولف المصغر',
    blurb: 'اسحب الكرة للخلف كالمقلاع ثم أفلتها لتضربها. تجنب الرمال، واعبر الماء بحذر، وأدخل الكرة في الحفرة بأقل عدد من الضربات — 9 حفر، بمعدل قياسي حقيقي.',
    startBtn: 'ابدأ الجولة',
    holeLabel: 'الحفرة {n}/{total}',
    parLabel: 'المعدل القياسي {par}',
    strokesLabel: 'الضربات {n}',
    totalLabel: 'المجموع {v}',
    aimHint: 'اسحب الكرة للخلف ثم أفلتها لضربها',
    aimReadout: 'القوة {power}%',
    rollingHint: 'تتدحرج…',
    waterMessage: 'غطس! عقوبة ضربة واحدة إضافية',
    holeCompleteTitle: 'اكتملت الحفرة!',
    holeCompleteLine: 'المعدل القياسي {par} — استغرقت {strokes} ({diff})',
    nextHoleBtn: 'الحفرة التالية',
    finalTitle: 'اكتملت الجولة!',
    finalTotalLine: 'المجموع: {strokes} ضربة ({diff} مقابل المعدل القياسي {par})',
    playAgainBtn: 'العب مرة أخرى',
    scorecardHoleCol: 'الحفرة',
    scorecardParCol: 'المعدل',
    scorecardStrokesCol: 'الضربات',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: 'المجموع',
    termAce: 'حفرة بضربة واحدة!',
    termEagle: 'إيغل',
    termBirdie: 'بيردي',
    termPar: 'بار',
    termBogey: 'بوغي',
    termDouble: 'بوغي مزدوج+',
    langSwitchAria: 'اللغة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Mini-Golf',
    blurb: "Tirez la balle vers l'arrière comme une fronde, puis relâchez pour putter. Évitez le sable, traversez l'eau avec prudence, et envoyez la balle dans le trou en le moins de coups possible — 9 trous, vrai par.",
    startBtn: 'Démarrer la Partie',
    holeLabel: 'Trou {n}/{total}',
    parLabel: 'Par {par}',
    strokesLabel: 'Coups {n}',
    totalLabel: 'Total {v}',
    aimHint: "Tirez la balle vers l'arrière puis relâchez pour putter",
    aimReadout: 'Puissance {power}%',
    rollingHint: 'En mouvement…',
    waterMessage: 'Plouf ! Pénalité de +1 coup',
    holeCompleteTitle: 'Trou terminé !',
    holeCompleteLine: 'Par {par} — vous avez fait {strokes} ({diff})',
    nextHoleBtn: 'Trou suivant',
    finalTitle: 'Partie terminée !',
    finalTotalLine: 'Total : {strokes} coups ({diff} vs par {par})',
    playAgainBtn: 'Rejouer',
    scorecardHoleCol: 'Trou',
    scorecardParCol: 'Par',
    scorecardStrokesCol: 'Coups',
    scorecardDiffCol: '+/-',
    scorecardTotalRow: 'Total',
    termAce: 'Trou en un !',
    termEagle: 'Aigle',
    termBirdie: 'Birdie',
    termPar: 'Par',
    termBogey: 'Bogey',
    termDouble: 'Double bogey+',
    langSwitchAria: 'Langue',
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
    const stored = localStorage.getItem('ogh_mini_golf_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_mini_golf_lang', lang);
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

/** Localized display name for a hole (courses.js's per-hole `name` object),
 * with an English fallback — same fallback shape as t() above. */
export function holeName(lang, hole) {
  return hole.name?.[lang] || hole.name?.en || `#${hole.id}`;
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
