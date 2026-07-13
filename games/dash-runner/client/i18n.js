/**
 * i18n — small string table for Dash Runner.
 * Mirrors games/cross-the-road/client/i18n.js (same batch, same shape): a
 * flat STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only — the track/lane layout is
 * a fixed spatial gameplay structure (not text) and is deliberately kept
 * un-mirrored, including which physical side "left"/"right" lane-change
 * moves toward (see index.html's dir="ltr" on the stage/canvas and
 * track.js/render.js, same precedent as games/cross-the-road's #ctr-stage
 * and games/pop-the-bugs' #grid).
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
    title: 'Dash Runner',
    blurb: "Ember the glow-fox is off down the night trail — swipe to switch lanes, jump logs, duck vines, and dodge pillars. Speed never stops climbing. How far can you dash?",
    startBtn: 'Start',
    hint: 'Swipe left/right to switch lanes · up to jump · down to duck',
    distanceAria: 'Distance',
    coinsAria: 'Coins',
    bestAria: 'Best distance',
    bestLine: 'Best distance: {best}m',
    gameOverTitle: 'Caught!',
    finalStatsLine: 'Distance {distance}m · Coins {coins} · Score {score}',
    newBest: 'New best distance!',
    playAgainBtn: 'Run again',
    btnLeftAria: 'Switch to left lane',
    btnRightAria: 'Switch to right lane',
    btnJumpAria: 'Jump',
    btnDuckAria: 'Duck',
  },
  ru: {
    back: 'Библиотека',
    title: 'Ночной Забег',
    blurb: 'Лисёнок Эмбер мчится по светящейся ночной тропе — свайпай, чтобы менять полосу, прыгай через брёвна, ныряй под лианы и обходи столбы сбоку. Скорость постоянно растёт. Как далеко ты добежишь?',
    startBtn: 'Старт',
    hint: 'Свайп влево/вправо — смена полосы · вверх — прыжок · вниз — подкат',
    distanceAria: 'Дистанция',
    coinsAria: 'Монеты',
    bestAria: 'Лучшая дистанция',
    bestLine: 'Лучшая дистанция: {best} м',
    gameOverTitle: 'Поймали!',
    finalStatsLine: 'Дистанция {distance} м · Монеты {coins} · Очки {score}',
    newBest: 'Новый рекорд дистанции!',
    playAgainBtn: 'Бежать снова',
    btnLeftAria: 'Сменить на левую полосу',
    btnRightAria: 'Сменить на правую полосу',
    btnJumpAria: 'Прыжок',
    btnDuckAria: 'Подкат',
  },
  zh: {
    back: '资料库',
    title: '霓虹飞奔',
    blurb: '小狐灵艾伯在夜色小径上飞奔——滑动切换车道，跳过圆木，躲开藤蔓，绕开石柱。速度会不断加快，看你能跑多远！',
    startBtn: '开始',
    hint: '左右滑动切换车道 · 上滑跳跃 · 下滑下蹲',
    distanceAria: '距离',
    coinsAria: '金币',
    bestAria: '最佳距离',
    bestLine: '最佳距离：{best}米',
    gameOverTitle: '被抓住了！',
    finalStatsLine: '距离 {distance}米 · 金币 {coins} · 得分 {score}',
    newBest: '创造最佳距离新纪录！',
    playAgainBtn: '再跑一次',
    btnLeftAria: '切换到左侧车道',
    btnRightAria: '切换到右侧车道',
    btnJumpAria: '跳跃',
    btnDuckAria: '下蹲',
  },
  es: {
    back: 'Biblioteca',
    title: 'Carrera Neón',
    blurb: 'Ember, el zorrito brillante, corre por el sendero nocturno — desliza para cambiar de carril, salta troncos, agáchate bajo lianas y evita los pilares. La velocidad no deja de subir. ¿Hasta dónde llegarás?',
    startBtn: 'Empezar',
    hint: 'Desliza izquierda/derecha para cambiar de carril · arriba para saltar · abajo para agacharte',
    distanceAria: 'Distancia',
    coinsAria: 'Monedas',
    bestAria: 'Mejor distancia',
    bestLine: 'Mejor distancia: {best}m',
    gameOverTitle: '¡Atrapado!',
    finalStatsLine: 'Distancia {distance}m · Monedas {coins} · Puntos {score}',
    newBest: '¡Nueva mejor distancia!',
    playAgainBtn: 'Correr de nuevo',
    btnLeftAria: 'Cambiar al carril izquierdo',
    btnRightAria: 'Cambiar al carril derecho',
    btnJumpAria: 'Saltar',
    btnDuckAria: 'Agacharse',
  },
  ar: {
    back: 'المكتبة',
    title: 'اندفاع النيون',
    blurb: 'إمبر، الثعلب المتوهج، ينطلق عبر الدرب الليلي — اسحب لتغيير الحارة، اقفز فوق الجذوع، انحنِ تحت الكروم، وتفادَ الأعمدة. السرعة لا تتوقف عن الازدياد. إلى أي مدى يمكنك الاندفاع؟',
    startBtn: 'ابدأ',
    hint: 'اسحب يسارًا/يمينًا لتغيير الحارة · للأعلى للقفز · للأسفل للانحناء',
    distanceAria: 'المسافة',
    coinsAria: 'العملات',
    bestAria: 'أفضل مسافة',
    bestLine: 'أفضل مسافة: {best} م',
    gameOverTitle: 'أُمسك بك!',
    finalStatsLine: 'المسافة {distance} م · العملات {coins} · النقاط {score}',
    newBest: 'أفضل مسافة جديدة!',
    playAgainBtn: 'اركض مرة أخرى',
    btnLeftAria: 'التبديل إلى الحارة اليسرى',
    btnRightAria: 'التبديل إلى الحارة اليمنى',
    btnJumpAria: 'قفز',
    btnDuckAria: 'انحناء',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Course Néon',
    blurb: "Ember, le renard lumineux, dévale le sentier nocturne — glissez pour changer de voie, sautez par-dessus les troncs, baissez-vous sous les lianes et évitez les piliers. La vitesse ne cesse d'augmenter. Jusqu'où irez-vous ?",
    startBtn: 'Démarrer',
    hint: 'Glissez à gauche/droite pour changer de voie · vers le haut pour sauter · vers le bas pour se baisser',
    distanceAria: 'Distance',
    coinsAria: 'Pièces',
    bestAria: 'Meilleure distance',
    bestLine: 'Meilleure distance : {best}m',
    gameOverTitle: 'Attrapé !',
    finalStatsLine: 'Distance {distance}m · Pièces {coins} · Score {score}',
    newBest: 'Nouvelle meilleure distance !',
    playAgainBtn: 'Recommencer',
    btnLeftAria: 'Passer à la voie de gauche',
    btnRightAria: 'Passer à la voie de droite',
    btnJumpAria: 'Sauter',
    btnDuckAria: 'Se baisser',
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
    const stored = localStorage.getItem('ogh_dash_runner_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_dash_runner_lang', lang);
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
