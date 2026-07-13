/**
 * i18n — small string table for Claw Machine.
 * Mirrors games/paintball/client/i18n.js (same batch, same shape): a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only (header, overlays, HUD
 * labels, toast) — the pseudo-3D pit/claw scene and the D-pad's left/right
 * meaning are a fixed spatial gameplay structure (not text) and are
 * deliberately kept un-mirrored, same precedent as games/paintball's arena
 * and games/cross-the-road's road/lanes (see index.html's dir="ltr" on the
 * stage/canvas/controls and style.css's `direction: ltr` on .clw-controls).
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
    title: 'Claw Machine',
    blurb: 'A real arcade claw machine, viewed at an angle through the glass. Steer the claw over the pile, drop it, and hope the grip holds all the way to the chute — just like the real thing, a dead-center grab still doesn’t always win.',
    startBtn: 'Insert credits',
    playAgainBtn: 'Play again',
    hint: 'D-pad to steer · DROP to grab · center the claw for a better grip',
    creditsAria: 'Credits',
    scoreAria: 'Score',
    prizesAria: 'Prizes won',
    bestAria: 'Best score',
    btnLeftAria: 'Move left',
    btnRightAria: 'Move right',
    btnFarAria: 'Move away (deeper into the machine)',
    btnNearAria: 'Move closer (toward the glass)',
    btnDropAria: 'Drop the claw',
    toastGrabbed: 'Got it—hold on…',
    toastMissed: 'Missed!',
    toastSlippedLift: 'So close—it slipped!',
    toastSlippedCarry: 'Slipped on the way!',
    toastWon: '+{points} prize!',
    toastNoCredits: 'No credits left',
    legendBall: 'Ball',
    legendBox: 'Gift box',
    legendBear: 'Bear plush',
    legendBunny: 'Bunny plush',
    legendStar: 'Star token',
    legendGem: 'Gem',
    resultsTitleWon: 'Out of credits!',
    resultsTitleEmpty: 'Out of credits—tough pit!',
    resultsScoreLine: 'Score: {score}',
    resultsPrizesLine: 'Prizes won: {n}',
    resultsAttemptsLine: 'Drops used: {n}',
    newBest: 'New best score!',
    bestLine: 'Best score: {best}',
  },
  ru: {
    back: 'Библиотека',
    title: 'Автомат с клешнёй',
    blurb: 'Настоящий автомат с клешнёй, вид сквозь стекло под углом. Веди клешню над кучей игрушек, опускай её и надейся, что захват додержится до самого жёлоба — как и в жизни, даже точный захват по центру не гарантирует победу.',
    startBtn: 'Вставить монеты',
    playAgainBtn: 'Играть снова',
    hint: 'Джойстик — движение · DROP — захват · центрируй клешню для лучшего захвата',
    creditsAria: 'Кредиты',
    scoreAria: 'Очки',
    prizesAria: 'Призов',
    bestAria: 'Лучший счёт',
    btnLeftAria: 'Влево',
    btnRightAria: 'Вправо',
    btnFarAria: 'Вглубь машины',
    btnNearAria: 'Ближе к стеклу',
    btnDropAria: 'Опустить клешню',
    toastGrabbed: 'Есть! Держится…',
    toastMissed: 'Мимо!',
    toastSlippedLift: 'Так близко — и выскользнул!',
    toastSlippedCarry: 'Выскользнул по дороге!',
    toastWon: '+{points} приз!',
    toastNoCredits: 'Кредиты закончились',
    legendBall: 'Мячик',
    legendBox: 'Подарочная коробка',
    legendBear: 'Мишка',
    legendBunny: 'Зайчик',
    legendStar: 'Звёздочка',
    legendGem: 'Камень',
    resultsTitleWon: 'Кредиты закончились!',
    resultsTitleEmpty: 'Кредиты закончились — тяжёлый был захват!',
    resultsScoreLine: 'Счёт: {score}',
    resultsPrizesLine: 'Призов выиграно: {n}',
    resultsAttemptsLine: 'Использовано попыток: {n}',
    newBest: 'Новый рекорд!',
    bestLine: 'Лучший счёт: {best}',
  },
  zh: {
    back: '资料库',
    title: '娃娃机',
    blurb: '一台造型真实的娃娃机，透过玻璃以斜角视角观察。操控钢爪移动到奖品堆上方，下爪抓取，并祥祷能把它带到出口——和现实一样，就算正中靶心也不保证能成功。',
    startBtn: '投币开始',
    playAgainBtn: '再玩一次',
    hint: '方向键移动 · DROP 下爪抓取 · 将钢爪对准中心命中率更高',
    creditsAria: '币数',
    scoreAria: '得分',
    prizesAria: '获得奖品',
    bestAria: '最高分',
    btnLeftAria: '向左移动',
    btnRightAria: '向右移动',
    btnFarAria: '向机内深处移动',
    btnNearAria: '向玻璃近处移动',
    btnDropAria: '下放钢爪',
    toastGrabbed: '抓住了！别松手…',
    toastMissed: '没抓住！',
    toastSlippedLift: '差一点——滑脱了！',
    toastSlippedCarry: '半路滑脱了！',
    toastWon: '+{points} 分！',
    toastNoCredits: '币数用完了',
    legendBall: '弹珠',
    legendBox: '礼盒',
    legendBear: '熊熊娃娃',
    legendBunny: '兔子娃娃',
    legendStar: '星星令牌',
    legendGem: '宝石',
    resultsTitleWon: '币数用完了！',
    resultsTitleEmpty: '币数用完了——这堆真难抓！',
    resultsScoreLine: '得分：{score}',
    resultsPrizesLine: '获得奖品：{n}',
    resultsAttemptsLine: '使用次数：{n}',
    newBest: '刷新最高分！',
    bestLine: '最高分：{best}',
  },
  es: {
    back: 'Biblioteca',
    title: 'Máquina de peluches',
    blurb: 'Una máquina de peluches de verdad, vista en ángulo a través del cristal. Mueve la garra sobre el montón de premios, bájala y espera que el agarre aguante hasta la rampa — como en la vida real, ni siquiera un agarre perfecto en el centro garantiza ganar.',
    startBtn: 'Insertar créditos',
    playAgainBtn: 'Jugar de nuevo',
    hint: 'Cruceta para mover · DROP para agarrar · centra la garra para un mejor agarre',
    creditsAria: 'Créditos',
    scoreAria: 'Puntuación',
    prizesAria: 'Premios ganados',
    bestAria: 'Mejor puntuación',
    btnLeftAria: 'Mover a la izquierda',
    btnRightAria: 'Mover a la derecha',
    btnFarAria: 'Alejar (más adentro de la máquina)',
    btnNearAria: 'Acercar (hacia el cristal)',
    btnDropAria: 'Bajar la garra',
    toastGrabbed: '¡Agarrado! Aguanta…',
    toastMissed: '¡Fallaste!',
    toastSlippedLift: '¡Tan cerca—se resbaló!',
    toastSlippedCarry: '¡Se resbaló en el camino!',
    toastWon: '¡+{points} premio!',
    toastNoCredits: 'Sin créditos',
    legendBall: 'Pelota',
    legendBox: 'Caja de regalo',
    legendBear: 'Osito de peluche',
    legendBunny: 'Conejito de peluche',
    legendStar: 'Ficha estrella',
    legendGem: 'Gema',
    resultsTitleWon: '¡Sin créditos!',
    resultsTitleEmpty: '¡Sin créditos—qué pozo tan difícil!',
    resultsScoreLine: 'Puntuación: {score}',
    resultsPrizesLine: 'Premios ganados: {n}',
    resultsAttemptsLine: 'Intentos usados: {n}',
    newBest: '¡Nueva mejor puntuación!',
    bestLine: 'Mejor puntuación: {best}',
  },
  ar: {
    back: 'المكتبة',
    title: 'آلة المخلب',
    blurb: 'آلة مخلب حقيقية، تُرى بزاوية من خلال الزجاج. وجّه المخلب فوق كومة الجوائز، أنزله واأمل أن يصمد القبض حتى الوصول إلى المزلق — مثل الواقع، القبضة الدقيقة في المنتصف لا تضمن الفوز دائمًا.',
    startBtn: 'أدخل الرصيد',
    playAgainBtn: 'العب مرة أخرى',
    hint: 'استخدم الأسهم للتحريك · DROP للقبض · توسيط المخلب يحسّن فرص القبض',
    creditsAria: 'الرصيد',
    scoreAria: 'النقاط',
    prizesAria: 'الجوائز المكسوبة',
    bestAria: 'أفضل نتيجة',
    btnLeftAria: 'تحريك لليسار',
    btnRightAria: 'تحريك لليمين',
    btnFarAria: 'الابتعاد إلى داخل الآلة',
    btnNearAria: 'الاقتراب من الزجاج',
    btnDropAria: 'أنزل المخلب',
    toastGrabbed: 'أمسكت بها! تماسك…',
    toastMissed: 'فاتتك!',
    toastSlippedLift: 'كانت قريبة جداً — لكنها انزلقت!',
    toastSlippedCarry: 'انزلقت في الطريق!',
    toastWon: '+{points} جائزة!',
    toastNoCredits: 'لا يوجد رصيد متبقّ',
    legendBall: 'كرة',
    legendBox: 'صندوق هدية',
    legendBear: 'دبّ محشو',
    legendBunny: 'أرنب محشو',
    legendStar: 'رمز نجمة',
    legendGem: 'جوهرة',
    resultsTitleWon: 'نفد الرصيد!',
    resultsTitleEmpty: 'نفد الرصيد — حفرة صعبة!',
    resultsScoreLine: 'النقاط: {score}',
    resultsPrizesLine: 'الجوائز المكسوبة: {n}',
    resultsAttemptsLine: 'المحاولات المستخدمة: {n}',
    newBest: 'أفضل نتيجة جديدة!',
    bestLine: 'أفضل نتيجة: {best}',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Machine à pinces',
    blurb: 'Une vraie machine à pinces, vue en angle à travers la vitre. Dirigez la pince au-dessus du tas de peluches, faites-la descendre, et espérez que la prise tienne jusqu’à la trémie — comme dans la vraie vie, une prise parfaitement centrée ne gagne pas à tous les coups.',
    startBtn: 'Insérer des crédits',
    playAgainBtn: 'Rejouer',
    hint: 'Croix directionnelle pour bouger · DROP pour saisir · centrez la pince pour une meilleure prise',
    creditsAria: 'Crédits',
    scoreAria: 'Score',
    prizesAria: 'Peluches gagnées',
    bestAria: 'Meilleur score',
    btnLeftAria: 'Déplacer à gauche',
    btnRightAria: 'Déplacer à droite',
    btnFarAria: 'Reculer (plus profond dans la machine)',
    btnNearAria: 'Avancer (vers la vitre)',
    btnDropAria: 'Faire descendre la pince',
    toastGrabbed: 'Attrapé ! Tiens bon…',
    toastMissed: 'Raté !',
    toastSlippedLift: 'Si près—ça a glissé !',
    toastSlippedCarry: 'Ça a glissé en chemin !',
    toastWon: '+{points} peluche !',
    toastNoCredits: 'Plus de crédits',
    legendBall: 'Balle',
    legendBox: 'Boîte cadeau',
    legendBear: 'Peluche ours',
    legendBunny: 'Peluche lapin',
    legendStar: 'Jeton étoile',
    legendGem: 'Gemme',
    resultsTitleWon: 'Plus de crédits !',
    resultsTitleEmpty: 'Plus de crédits—tas coriace !',
    resultsScoreLine: 'Score : {score}',
    resultsPrizesLine: 'Peluches gagnées : {n}',
    resultsAttemptsLine: 'Essais utilisés : {n}',
    newBest: 'Nouveau meilleur score !',
    bestLine: 'Meilleur score : {best}',
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
    const stored = localStorage.getItem('ogh_claw_machine_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_claw_machine_lang', lang);
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
