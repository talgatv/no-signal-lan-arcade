/**
 * i18n — small string table for Blade Fruit.
 * Mirrors games/dash-runner/client/i18n.js (same batch, same shape): a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only — the play field (where
 * fruit/bombs launch from, the swipe path) is spatial gameplay, not text,
 * and is deliberately kept un-mirrored (see index.html's dir="ltr" on the
 * stage/canvas and game.js's forced ctx.direction = 'ltr'), same precedent
 * as games/dash-runner's #game and games/drop-smash's canvas.
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
    title: 'Blade Fruit',
    blurb: "Fruit launches up from below — swipe to slice it out of the air. Chain hits in one continuous stroke for a rising combo bonus. Never slice the bomb — one cut and the run is over. Miss too many fruit and you're out of lives.",
    startBtn: 'Start',
    hint: 'Swipe to slice — chain combos, dodge the bomb',
    scoreLabel: 'Score',
    livesLabel: 'Lives',
    bestLabel: 'Best',
    livesAria: '{n} lives remaining',
    comboPopup: '×{combo} COMBO!',
    gameOverBombTitle: 'Sliced a Bomb!',
    gameOverLivesTitle: 'Out of Lives!',
    statScore: 'Score: {score}',
    statCombo: 'Best combo: ×{combo}',
    statSliced: 'Fruit sliced: {count}',
    newBest: 'New high score!',
    bestLine: 'Best score: {best}',
    playAgainBtn: 'Slice again',
  },
  ru: {
    back: 'Библиотека',
    title: 'Фруктовый Клинок',
    blurb: 'Фрукты взлетают снизу — проведи пальцем или мышью, чтобы разрезать их в воздухе. Разрежь несколько подряд одним непрерывным движением — получишь бонус за комбо. Никогда не режь бомбу — один разрез, и забег окончен. Пропустишь слишком много фруктов — закончатся жизни.',
    startBtn: 'Старт',
    hint: 'Свайп — разрезай фрукты, собирай комбо, обходи бомбу',
    scoreLabel: 'Очки',
    livesLabel: 'Жизни',
    bestLabel: 'Рекорд',
    livesAria: 'Осталось жизней: {n}',
    comboPopup: '×{combo} КОМБО!',
    gameOverBombTitle: 'Разрезана бомба!',
    gameOverLivesTitle: 'Жизни закончились!',
    statScore: 'Очки: {score}',
    statCombo: 'Лучшее комбо: ×{combo}',
    statSliced: 'Фруктов разрезано: {count}',
    newBest: 'Новый рекорд!',
    bestLine: 'Лучший счёт: {best}',
    playAgainBtn: 'Резать снова',
  },
  zh: {
    back: '资料库',
    title: '霓虹斩果',
    blurb: '水果从下方飞起——滑动手指或鼠标，在空中将其切开。连续一划命中多个水果可获得连击加成。千万不要切到炸弹——切中即刻结束本局。漏掉太多水果会失去生命。',
    startBtn: '开始',
    hint: '滑动切水果 · 连击加分 · 躲开炸弹',
    scoreLabel: '得分',
    livesLabel: '生命',
    bestLabel: '最佳',
    livesAria: '剩余生命：{n}',
    comboPopup: '×{combo} 连击！',
    gameOverBombTitle: '切到炸弹了！',
    gameOverLivesTitle: '生命耗尽！',
    statScore: '得分：{score}',
    statCombo: '最佳连击：×{combo}',
    statSliced: '切中水果数：{count}',
    newBest: '创造新纪录！',
    bestLine: '最佳得分：{best}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    title: 'Corte Neón',
    blurb: 'La fruta sale volando desde abajo — desliza el dedo o el ratón para cortarla en el aire. Encadena varios cortes en un solo trazo continuo para conseguir un bono de combo. Nunca cortes la bomba: un solo corte y la partida termina. Si dejas caer demasiadas frutas, se te acaban las vidas.',
    startBtn: 'Empezar',
    hint: 'Desliza para cortar — encadena combos, esquiva la bomba',
    scoreLabel: 'Puntos',
    livesLabel: 'Vidas',
    bestLabel: 'Mejor',
    livesAria: '{n} vidas restantes',
    comboPopup: '¡×{combo} COMBO!',
    gameOverBombTitle: '¡Cortaste una bomba!',
    gameOverLivesTitle: '¡Sin vidas!',
    statScore: 'Puntos: {score}',
    statCombo: 'Mejor combo: ×{combo}',
    statSliced: 'Frutas cortadas: {count}',
    newBest: '¡Nueva puntuación máxima!',
    bestLine: 'Mejor puntuación: {best}',
    playAgainBtn: 'Cortar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    title: 'شفرة النيون',
    blurb: 'تنطلق الفاكهة من الأسفل — اسحب إصبعك أو الفأرة لتقطيعها في الهواء. اقطع عدة قطع بحركة واحدة متواصلة للحصول على مكافأة كومبو متصاعدة. لا تقطع القنبلة أبدًا — قطعة واحدة تُنهي الجولة فورًا. فوّت الكثير من الفاكهة وستخسر حياتك.',
    startBtn: 'ابدأ',
    hint: 'اسحب لتقطيع الفاكهة · اجمع الكومبو · تجنّب القنبلة',
    scoreLabel: 'النقاط',
    livesLabel: 'الأرواح',
    bestLabel: 'الأفضل',
    livesAria: 'الأرواح المتبقية: {n}',
    comboPopup: '×{combo} كومبو!',
    gameOverBombTitle: 'قطعت قنبلة!',
    gameOverLivesTitle: 'نفدت الأرواح!',
    statScore: 'النقاط: {score}',
    statCombo: 'أفضل كومبو: ×{combo}',
    statSliced: 'الفاكهة المقطوعة: {count}',
    newBest: 'رقم قياسي جديد!',
    bestLine: 'أفضل نتيجة: {best}',
    playAgainBtn: 'قطّع مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Tranche Néon',
    blurb: "Les fruits jaillissent du bas de l'écran — glissez le doigt ou la souris pour les trancher en plein vol. Enchaînez plusieurs fruits en un seul geste continu pour obtenir un bonus de combo. Ne tranchez jamais la bombe : une seule coupe et la partie est terminée. Laissez tomber trop de fruits et vous perdrez toutes vos vies.",
    startBtn: 'Démarrer',
    hint: 'Glissez pour trancher — enchaînez les combos, évitez la bombe',
    scoreLabel: 'Score',
    livesLabel: 'Vies',
    bestLabel: 'Record',
    livesAria: '{n} vies restantes',
    comboPopup: '×{combo} COMBO !',
    gameOverBombTitle: 'Bombe tranchée !',
    gameOverLivesTitle: 'Plus de vies !',
    statScore: 'Score : {score}',
    statCombo: 'Meilleur combo : ×{combo}',
    statSliced: 'Fruits tranchés : {count}',
    newBest: 'Nouveau record !',
    bestLine: 'Meilleur score : {best}',
    playAgainBtn: 'Trancher à nouveau',
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
    const stored = localStorage.getItem('ogh_blade_fruit_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_blade_fruit_lang', lang);
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
