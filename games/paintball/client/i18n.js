/**
 * i18n — small string table for Paintball.
 * Mirrors games/cross-the-road/client/i18n.js (same batch, same shape): a
 * flat STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only (header, overlays, HUD
 * labels) — the arena/target layout is a fixed spatial gameplay structure
 * (not text) and is deliberately kept un-mirrored, same precedent as
 * games/cross-the-road's road/lanes and games/billiards' table (see
 * index.html's dir="ltr" on the stage/canvas and game.js's ctx.direction).
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
    title: 'Paintball',
    blurb: 'A fixed-camera paintball shooting gallery. Aim with your mouse or finger and fire before targets duck away — score on marks and rare bonus targets, grab crates for ammo, and never hit a civilian.',
    startBtn: 'Start',
    hint: 'Aim, then tap or click to fire · reload before you run dry · never hit a civilian',
    waveAria: 'Wave',
    scoreAria: 'Score',
    ammoAria: 'Ammo',
    strikesAria: 'Strikes',
    bestAria: 'Best score',
    reloadingLabel: 'Reloading…',
    btnReloadAria: 'Reload',
    legendGrunt: 'Target',
    legendAce: 'Bonus target',
    legendCivilian: "Don't shoot!",
    legendCrate: 'Ammo crate',
    waveClearTitle: 'Wave {n} clear!',
    waveClearLine: 'Wave score {score} · Total {total}',
    nextWaveBtn: 'Next wave',
    resultsTitleClear: 'Course cleared!',
    resultsTitleStrikeout: 'Too many civilians hit!',
    resultsScoreLine: 'Score: {score}',
    resultsAccuracyLine: 'Accuracy: {pct}%',
    resultsWavesLine: 'Waves survived: {n}/{total}',
    newBest: 'New best score!',
    bestLine: 'Best score: {best}',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    title: 'Пейнтбол',
    blurb: 'Тир с пейнтболом и фиксированной камерой. Целься мышью или пальцем и стреляй, пока мишени не спрятались — набирай очки за обычные и редкие бонусные цели, хватай ящики с патронами и никогда не стреляй в мирных.',
    startBtn: 'Старт',
    hint: 'Целься и тапни/кликни для выстрела · перезаряжайся вовремя · не стреляй в мирных',
    waveAria: 'Волна',
    scoreAria: 'Очки',
    ammoAria: 'Патроны',
    strikesAria: 'Штрафы',
    bestAria: 'Лучший счёт',
    reloadingLabel: 'Перезарядка…',
    btnReloadAria: 'Перезарядить',
    legendGrunt: 'Цель',
    legendAce: 'Бонусная цель',
    legendCivilian: 'Не стрелять!',
    legendCrate: 'Ящик с патронами',
    waveClearTitle: 'Волна {n} пройдена!',
    waveClearLine: 'Очки за волну {score} · Всего {total}',
    nextWaveBtn: 'Следующая волна',
    resultsTitleClear: 'Трасса пройдена!',
    resultsTitleStrikeout: 'Слишком много мирных задето!',
    resultsScoreLine: 'Счёт: {score}',
    resultsAccuracyLine: 'Точность: {pct}%',
    resultsWavesLine: 'Волн пройдено: {n}/{total}',
    newBest: 'Новый рекорд!',
    bestLine: 'Лучший счёт: {best}',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    title: '彩弹射击',
    blurb: '固定视角的彩弹射击场。用鼠标或手指瞄准，趁目标还没躲开时开枪——命中普通和稀有奖励目标得分，捡箱子补充弹药，千万别打到平民。',
    startBtn: '开始',
    hint: '瞄准后点击/轻触射击 · 记得及时装弹 · 千万别打到平民',
    waveAria: '波次',
    scoreAria: '得分',
    ammoAria: '弹药',
    strikesAria: '警告',
    bestAria: '最高分',
    reloadingLabel: '装弹中…',
    btnReloadAria: '装弹',
    legendGrunt: '目标',
    legendAce: '奖励目标',
    legendCivilian: '禁止射击！',
    legendCrate: '弹药箱',
    waveClearTitle: '第 {n} 波完成！',
    waveClearLine: '本波得分 {score} · 总分 {total}',
    nextWaveBtn: '下一波',
    resultsTitleClear: '全部波次通关！',
    resultsTitleStrikeout: '误伤平民次数过多！',
    resultsScoreLine: '得分：{score}',
    resultsAccuracyLine: '命中率：{pct}%',
    resultsWavesLine: '通过波次：{n}/{total}',
    newBest: '创造新纪录！',
    bestLine: '最高分：{best}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    title: 'Paintball',
    blurb: 'Una galería de tiro de paintball con cámara fija. Apunta con el ratón o el dedo y dispara antes de que los blancos se escondan — suma puntos con los blancos normales y los bonus raros, recoge cajas de munición y nunca le dispares a un civil.',
    startBtn: 'Empezar',
    hint: 'Apunta y toca/haz clic para disparar · recarga antes de quedarte sin balas · nunca dispares a un civil',
    waveAria: 'Oleada',
    scoreAria: 'Puntuación',
    ammoAria: 'Munición',
    strikesAria: 'Faltas',
    bestAria: 'Mejor puntuación',
    reloadingLabel: 'Recargando…',
    btnReloadAria: 'Recargar',
    legendGrunt: 'Blanco',
    legendAce: 'Blanco de bonificación',
    legendCivilian: '¡No dispares!',
    legendCrate: 'Caja de munición',
    waveClearTitle: '¡Oleada {n} superada!',
    waveClearLine: 'Puntos de la oleada {score} · Total {total}',
    nextWaveBtn: 'Siguiente oleada',
    resultsTitleClear: '¡Recorrido superado!',
    resultsTitleStrikeout: '¡Demasiados civiles alcanzados!',
    resultsScoreLine: 'Puntuación: {score}',
    resultsAccuracyLine: 'Precisión: {pct}%',
    resultsWavesLine: 'Oleadas superadas: {n}/{total}',
    newBest: '¡Nueva mejor puntuación!',
    bestLine: 'Mejor puntuación: {best}',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    title: 'حرب الطلاء',
    blurb: 'ميدان رماية بالطلاء بزاوية كاميرا ثابتة. صوّب بالماوس أو إصبعك واطلق النار قبل أن تختفي الأهداف — اجمع النقاط من الأهداف العادية والمكافآت النادرة، والتقط صناديق الذخيرة، ولا تُصب أي مدني أبدًا.',
    startBtn: 'ابدأ',
    hint: 'صوّب ثم اضغط أو انقر لإطلاق النار · أعد التذخير قبل أن تنفد الطلقات · لا تُصب أي مدني',
    waveAria: 'الموجة',
    scoreAria: 'النقاط',
    ammoAria: 'الذخيرة',
    strikesAria: 'الإنذارات',
    bestAria: 'أفضل نتيجة',
    reloadingLabel: 'إعادة التذخير…',
    btnReloadAria: 'إعادة التذخير',
    legendGrunt: 'هدف',
    legendAce: 'هدف مكافأة',
    legendCivilian: 'ممنوع إطلاق النار!',
    legendCrate: 'صندوق ذخيرة',
    waveClearTitle: 'اجتزت الموجة {n}!',
    waveClearLine: 'نقاط الموجة {score} · الإجمالي {total}',
    nextWaveBtn: 'الموجة التالية',
    resultsTitleClear: 'تم اجتياز الميدان!',
    resultsTitleStrikeout: 'أصبت عددًا كبيرًا من المدنيين!',
    resultsScoreLine: 'النقاط: {score}',
    resultsAccuracyLine: 'الدقة: {pct}%',
    resultsWavesLine: 'الموجات المُجتازة: {n}/{total}',
    newBest: 'أفضل نتيجة جديدة!',
    bestLine: 'أفضل نتيجة: {best}',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Paintball',
    blurb: "Un stand de tir au paintball à caméra fixe. Visez à la souris ou au doigt et tirez avant que les cibles ne se cachent — marquez des points sur les cibles normales et les bonus rares, ramassez des caisses de munitions, et ne touchez jamais un civil.",
    startBtn: 'Démarrer',
    hint: "Visez puis touchez ou cliquez pour tirer · rechargez avant d'être à sec · ne touchez jamais un civil",
    waveAria: 'Vague',
    scoreAria: 'Score',
    ammoAria: 'Munitions',
    strikesAria: 'Fautes',
    bestAria: 'Meilleur score',
    reloadingLabel: 'Rechargement…',
    btnReloadAria: 'Recharger',
    legendGrunt: 'Cible',
    legendAce: 'Cible bonus',
    legendCivilian: 'Ne tirez pas !',
    legendCrate: 'Caisse de munitions',
    waveClearTitle: 'Vague {n} terminée !',
    waveClearLine: 'Score de la vague {score} · Total {total}',
    nextWaveBtn: 'Vague suivante',
    resultsTitleClear: 'Parcours terminé !',
    resultsTitleStrikeout: 'Trop de civils touchés !',
    resultsScoreLine: 'Score : {score}',
    resultsAccuracyLine: 'Précision : {pct}%',
    resultsWavesLine: 'Vagues terminées : {n}/{total}',
    newBest: 'Nouveau meilleur score !',
    bestLine: 'Meilleur score : {best}',
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
    const stored = localStorage.getItem('ogh_paintball_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_paintball_lang', lang);
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
