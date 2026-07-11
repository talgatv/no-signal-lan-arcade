/**
 * i18n — small string table for Pop the Bugs.
 * Mirrors the pattern used by games/music-synth/client/i18n.js and
 * programs/flashlight/client/i18n.js: a flat STRINGS table per UN-6
 * language, a couple of detect/apply helpers, no framework.
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
    title: 'Pop the Bugs',
    tagline: 'A whack-a-mole reaction game — neon bugs and fast fingers.',
    blurb: 'Tap bugs the instant they pop up to score. Avoid the red trap bug — it costs you points. Grab the rare golden bug for a bonus. Ready?',
    legendGood: 'Bug +{n}',
    legendGolden: 'Golden +{n}',
    legendBad: 'Trap −{n}',
    startBtn: 'Start',
    hint: "Tap fast — bugs don't stick around long!",
    roundOverTitle: "Time's up!",
    finalScoreLabel: 'Final score',
    bestLabel: 'Best',
    newBest: 'New best!',
    playAgainBtn: 'Play again',
    timeAria: 'Time left',
    scoreAria: 'Score',
    bestAria: 'Best score',
  },
  ru: {
    back: 'Библиотека',
    title: 'Прихлопни жука',
    tagline: 'Реакция в стиле «ударь крота» — неоновые жуки и быстрые пальцы.',
    blurb: 'Тапай жуков сразу как они появились — это очки. Красный жук-ловушка отнимает очки, его лучше не трогать. Редкий золотой жук даёт бонус. Готов?',
    legendGood: 'Жук +{n}',
    legendGolden: 'Золотой +{n}',
    legendBad: 'Ловушка −{n}',
    startBtn: 'Начать',
    hint: 'Тапай быстрее — жуки долго не задерживаются!',
    roundOverTitle: 'Время вышло!',
    finalScoreLabel: 'Итоговый счёт',
    bestLabel: 'Рекорд',
    newBest: 'Новый рекорд!',
    playAgainBtn: 'Играть снова',
    timeAria: 'Осталось времени',
    scoreAria: 'Счёт',
    bestAria: 'Рекорд',
  },
  zh: {
    back: '资料库',
    title: '拍虫子',
    tagline: '打地鼠式反应游戏——霓虹虫子和快手指。',
    blurb: '虫子一冒出来就点它得分。红色陷阱虫会倒扣分——别碰它。稀有的金虫能拿到奖励分。准备好了吗？',
    legendGood: '虫子 +{n}',
    legendGolden: '金虫 +{n}',
    legendBad: '陷阱 −{n}',
    startBtn: '开始',
    hint: '快点触碰——虫子待不了多久！',
    roundOverTitle: '时间到！',
    finalScoreLabel: '最终得分',
    bestLabel: '最高分',
    newBest: '刷新最高分！',
    playAgainBtn: '再玩一次',
    timeAria: '剩余时间',
    scoreAria: '得分',
    bestAria: '最高分',
  },
  es: {
    back: 'Biblioteca',
    title: 'Revienta Bichos',
    tagline: 'Un juego de reacción estilo «topo golpeado» — bichos de neón y dedos rápidos.',
    blurb: 'Toca los bichos en cuanto aparezcan para sumar puntos. El bicho trampa rojo te resta puntos — no lo toques. Atrapa el raro bicho dorado para un bono. ¿Listo?',
    legendGood: 'Bicho +{n}',
    legendGolden: 'Dorado +{n}',
    legendBad: 'Trampa −{n}',
    startBtn: 'Empezar',
    hint: '¡Toca rápido — los bichos no se quedan mucho tiempo!',
    roundOverTitle: '¡Se acabó el tiempo!',
    finalScoreLabel: 'Puntuación final',
    bestLabel: 'Récord',
    newBest: '¡Nuevo récord!',
    playAgainBtn: 'Jugar de nuevo',
    timeAria: 'Tiempo restante',
    scoreAria: 'Puntuación',
    bestAria: 'Mejor puntuación',
  },
  ar: {
    back: 'المكتبة',
    title: 'اضرب الحشرة',
    tagline: 'لعبة ردة فعل على طريقة «اضرب الخلد» — حشرات نيون وأصابع سريعة.',
    blurb: 'اضغط الحشرات فور ظهورها لتسجيل نقاط. الحشرة الحمراء الخادعة تخصم نقاطًا — لا تلمسها. أمسك الحشرة الذهبية النادرة لمكافأة إضافية. جاهز؟',
    legendGood: 'حشرة +{n}',
    legendGolden: 'ذهبية +{n}',
    legendBad: 'فخ −{n}',
    startBtn: 'ابدأ',
    hint: 'اضغط بسرعة — الحشرات لا تبقى طويلًا!',
    roundOverTitle: 'انتهى الوقت!',
    finalScoreLabel: 'النتيجة النهائية',
    bestLabel: 'الأفضل',
    newBest: 'رقم قياسي جديد!',
    playAgainBtn: 'العب مرة أخرى',
    timeAria: 'الوقت المتبقي',
    scoreAria: 'النقاط',
    bestAria: 'أفضل نتيجة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Tape la Bestiole',
    tagline: 'Un jeu de réaction façon « tape-taupe » — bestioles néon et doigts rapides.',
    blurb: "Touchez les bestioles dès qu'elles apparaissent pour marquer des points. La bestiole piège rouge vous fait perdre des points — évitez-la. Attrapez la rare bestiole dorée pour un bonus. Prêt ?",
    legendGood: 'Bestiole +{n}',
    legendGolden: 'Dorée +{n}',
    legendBad: 'Piège −{n}',
    startBtn: 'Commencer',
    hint: 'Touchez vite — les bestioles ne restent pas longtemps !',
    roundOverTitle: 'Temps écoulé !',
    finalScoreLabel: 'Score final',
    bestLabel: 'Meilleur score',
    newBest: 'Nouveau record !',
    playAgainBtn: 'Rejouer',
    timeAria: 'Temps restant',
    scoreAria: 'Score',
    bestAria: 'Meilleur score',
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
    const stored = localStorage.getItem('ogh_ptb_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_ptb_lang', lang);
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
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(lang, key);
  });
}
