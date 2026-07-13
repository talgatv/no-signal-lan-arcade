/**
 * i18n — small string table for Cross the Road.
 * Mirrors games/mahjong/client/i18n.js (same batch, same shape): a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only — the road/lane layout is a
 * fixed spatial gameplay structure (not text) and is deliberately kept
 * un-mirrored, including which physical side "left"/"right" dodge move on
 * (see index.html's dir="ltr" on the stage/canvas and road.js/render.js,
 * same precedent as games/pop-the-bugs' #grid and games/mahjong's #board).
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
    title: 'Cross the Road',
    blurb: 'Hop forward lane by lane and dodge the traffic. Every stage the road gets wider and faster — how far can you get?',
    startBtn: 'Start',
    hint: 'Tap to hop forward · swipe or tap left/right to dodge',
    stageAria: 'Stage',
    distanceAria: 'Distance',
    bestAria: 'Best distance',
    stagePrefix: 'Stage',
    distancePrefix: 'Dist',
    bestPrefix: 'Best',
    bestLine: 'Best distance: {best}',
    gameOverTitle: 'Crashed!',
    finalStatsLine: 'Stage {stage} · Distance {distance}',
    newBest: 'New best distance!',
    playAgainBtn: 'Play again',
    stageClear: 'Stage {n} clear!',
    btnLeftAria: 'Dodge left',
    btnForwardAria: 'Hop forward',
    btnRightAria: 'Dodge right',
  },
  ru: {
    back: 'Библиотека',
    title: 'Через дорогу',
    blurb: 'Прыгай вперёд полосу за полосой и уворачивайся от машин. С каждым этапом дорога становится шире и быстрее — как далеко ты продвинешься?',
    startBtn: 'Старт',
    hint: 'Тапни, чтобы прыгнуть вперёд · свайп или тап влево/вправо — уворот',
    stageAria: 'Этап',
    distanceAria: 'Дистанция',
    bestAria: 'Лучшая дистанция',
    stagePrefix: 'Этап',
    distancePrefix: 'Путь',
    bestPrefix: 'Рекорд',
    bestLine: 'Лучшая дистанция: {best}',
    gameOverTitle: 'Авария!',
    finalStatsLine: 'Этап {stage} · Дистанция {distance}',
    newBest: 'Новый рекорд дистанции!',
    playAgainBtn: 'Играть снова',
    stageClear: 'Этап {n} пройден!',
    btnLeftAria: 'Уворот влево',
    btnForwardAria: 'Прыжок вперёд',
    btnRightAria: 'Уворот вправо',
  },
  zh: {
    back: '资料库',
    title: '过马路',
    blurb: '逐条车道向前跳跃，躲避车流。每过一关，道路会变得更宽、车速更快——你能走多远？',
    startBtn: '开始',
    hint: '点击向前跳一格 · 滑动或点击左右两侧可躲避',
    stageAria: '关卡',
    distanceAria: '距离',
    bestAria: '最佳距离',
    stagePrefix: '关卡',
    distancePrefix: '距离',
    bestPrefix: '最佳',
    bestLine: '最佳距离：{best}',
    gameOverTitle: '撞车了！',
    finalStatsLine: '关卡 {stage} · 距离 {distance}',
    newBest: '创造最佳距离新纪录！',
    playAgainBtn: '再玩一次',
    stageClear: '第 {n} 关通过！',
    btnLeftAria: '向左躲避',
    btnForwardAria: '向前跳',
    btnRightAria: '向右躲避',
  },
  es: {
    back: 'Biblioteca',
    title: 'Cruza la Calle',
    blurb: 'Avanza carril a carril y esquiva el tráfico. En cada etapa la carretera se vuelve más ancha y más rápida — ¿hasta dónde puedes llegar?',
    startBtn: 'Empezar',
    hint: 'Toca para avanzar · desliza o toca izquierda/derecha para esquivar',
    stageAria: 'Etapa',
    distanceAria: 'Distancia',
    bestAria: 'Mejor distancia',
    stagePrefix: 'Etapa',
    distancePrefix: 'Dist.',
    bestPrefix: 'Mejor',
    bestLine: 'Mejor distancia: {best}',
    gameOverTitle: '¡Choque!',
    finalStatsLine: 'Etapa {stage} · Distancia {distance}',
    newBest: '¡Nueva mejor distancia!',
    playAgainBtn: 'Jugar de nuevo',
    stageClear: '¡Etapa {n} superada!',
    btnLeftAria: 'Esquivar a la izquierda',
    btnForwardAria: 'Saltar adelante',
    btnRightAria: 'Esquivar a la derecha',
  },
  ar: {
    back: 'المكتبة',
    title: 'اعبر الطريق',
    blurb: 'اقفز للأمام حارة تلو الأخرى وتفادَ حركة المرور. مع كل مرحلة يصبح الطريق أعرض وأسرع — إلى أي مدى يمكنك الوصول؟',
    startBtn: 'ابدأ',
    hint: 'اضغط للقفز للأمام · اسحب أو اضغط يسارًا/يمينًا للتفادي',
    stageAria: 'المرحلة',
    distanceAria: 'المسافة',
    bestAria: 'أفضل مسافة',
    stagePrefix: 'المرحلة',
    distancePrefix: 'المسافة',
    bestPrefix: 'الأفضل',
    bestLine: 'أفضل مسافة: {best}',
    gameOverTitle: 'اصطدمت!',
    finalStatsLine: 'المرحلة {stage} · المسافة {distance}',
    newBest: 'أفضل مسافة جديدة!',
    playAgainBtn: 'العب مرة أخرى',
    stageClear: 'اجتزت المرحلة {n}!',
    btnLeftAria: 'تفادَ يسارًا',
    btnForwardAria: 'اقفز للأمام',
    btnRightAria: 'تفادَ يمينًا',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Traverse la Route',
    blurb: "Avancez voie par voie et évitez la circulation. À chaque étape, la route s'élargit et accélère — jusqu'où irez-vous ?",
    startBtn: 'Démarrer',
    hint: 'Touchez pour avancer · glissez ou touchez à gauche/droite pour esquiver',
    stageAria: 'Étape',
    distanceAria: 'Distance',
    bestAria: 'Meilleure distance',
    stagePrefix: 'Étape',
    distancePrefix: 'Dist.',
    bestPrefix: 'Record',
    bestLine: 'Meilleure distance : {best}',
    gameOverTitle: 'Accident !',
    finalStatsLine: 'Étape {stage} · Distance {distance}',
    newBest: 'Nouvelle meilleure distance !',
    playAgainBtn: 'Rejouer',
    stageClear: 'Étape {n} franchie !',
    btnLeftAria: 'Esquiver à gauche',
    btnForwardAria: 'Sauter en avant',
    btnRightAria: 'Esquiver à droite',
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
    const stored = localStorage.getItem('ogh_cross_the_road_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_cross_the_road_lang', lang);
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
