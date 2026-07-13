/**
 * i18n — string table for Barrel Climb. Mirrors games/fight-arena/client/
 * i18n.js and games/cross-the-road/client/i18n.js (same batch, same shape):
 * a flat STRINGS table per UN-6 language, plus detect/apply helpers, no
 * framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header, HUD pill
 * labels, hint text, overlay cards, touch-button *aria-labels*. It
 * deliberately does NOT mirror the tower itself: climbing is always toward
 * the top of the screen, "right" always walks the figure right, and ladders
 * keep their absolute canvas position. A climbing stage is fixed spatial
 * gameplay (like a game board), not reading-order text — mirroring it would
 * silently invert every dodge/climb direction relative to the keys. Same
 * precedent as games/fight-arena's stage and games/cross-the-road's road
 * (see index.html's dir="ltr" on the stage/canvas and the `ctx.direction =
 * 'ltr'` guard in game.js).
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
    title: 'Barrel Climb',
    blurb: 'Climb the scrapyard signal tower, dodge Warden-9’s rolling drums, and reach Mira at the top. Jump barrels, ride the ladders, and grab the hammer to smash your way through.',
    langSwitchAria: 'Language',
    startBtn: 'Start Climb',
    playAgainBtn: 'Climb Again',
    stageLabel: 'Stage',
    livesLabel: 'Lives',
    scoreLabel: 'Score',
    bestLabel: 'Best',
    hudStageAria: 'Current stage',
    hudLivesAria: 'Lives remaining',
    hudScoreAria: 'Score',
    hintTitle: 'Buttons or arrow keys to move · Up/Down on a ladder to climb · Space or ▲ to jump',
    stageClearBanner: 'Stage {n} clear!',
    stageClearSub: 'Mira is safe — Warden-9 flees to the next tower…',
    gameOverTitle: 'Tower Lost',
    finalStatsLine: 'Stage {stage} · Score {score}',
    gemsLine: 'Energy cells collected: {n}',
    newBestLine: 'New best score!',
    bestLine: 'Best: {best}',
    hammerHud: 'HAMMER!',
    controlsNote: 'Touch: on-screen buttons. Keyboard: Arrows/WASD to move, Up/Down to climb, Space to jump.',
    btnLeftAria: 'Move left',
    btnRightAria: 'Move right',
    btnUpAria: 'Climb up',
    btnDownAria: 'Climb down',
    btnJumpAria: 'Jump',
  },
  ru: {
    back: 'Библиотека',
    title: 'Штурм бочками',
    blurb: 'Забирайся на сигнальную башню на свалке, уворачивайся от бочек Стража-9 и доберись до Миры на вершине. Прыгай через бочки, лезь по лестницам и хватай молот, чтобы крушить их вдребезги.',
    langSwitchAria: 'Язык',
    startBtn: 'Начать подъём',
    playAgainBtn: 'Снова наверх',
    stageLabel: 'Этап',
    livesLabel: 'Жизни',
    scoreLabel: 'Очки',
    bestLabel: 'Рекорд',
    hudStageAria: 'Текущий этап',
    hudLivesAria: 'Осталось жизней',
    hudScoreAria: 'Очки',
    hintTitle: 'Кнопки или стрелки — движение · Вверх/вниз на лестнице — подъём · Пробел или ▲ — прыжок',
    stageClearBanner: 'Этап {n} пройден!',
    stageClearSub: 'Мира в безопасности — Страж-9 бежит к следующей башне…',
    gameOverTitle: 'Башня потеряна',
    finalStatsLine: 'Этап {stage} · Очки {score}',
    gemsLine: 'Энергоячеек: {n}',
    newBestLine: 'Новый рекорд!',
    bestLine: 'Рекорд: {best}',
    hammerHud: 'МОЛОТ!',
    controlsNote: 'Сенсор: кнопки на экране. Клавиатура: стрелки/WASD — движение, вверх/вниз — подъём, пробел — прыжок.',
    btnLeftAria: 'Влево',
    btnRightAria: 'Вправо',
    btnUpAria: 'Подъём вверх',
    btnDownAria: 'Спуск вниз',
    btnJumpAria: 'Прыжок',
  },
  zh: {
    back: '资料库',
    title: '滚桶爬塔',
    blurb: '爬上废料场的信号塔，闪避 Warden-9 滚下的油桶，抵达塔顶解救 Mira。跳过油桶，靠梯子躲避，拾取锤子便可一路砸开阻碍。',
    langSwitchAria: '语言',
    startBtn: '开始爬塔',
    playAgainBtn: '再次爬塔',
    stageLabel: '关卡',
    livesLabel: '生命',
    scoreLabel: '分数',
    bestLabel: '最佳',
    hudStageAria: '当前关卡',
    hudLivesAria: '剩余生命',
    hudScoreAria: '分数',
    hintTitle: '按钮或方向键移动 · 梯子处上/下键爬行 · 空格或 ▲ 跳跃',
    stageClearBanner: '第 {n} 关通关！',
    stageClearSub: 'Mira 暂时安全了——Warden-9 逃往下一座塔…',
    gameOverTitle: '塔楼失守',
    finalStatsLine: '第 {stage} 关 · 分数 {score}',
    gemsLine: '收集能量晶体：{n}',
    newBestLine: '刷新最佳成绩！',
    bestLine: '最佳：{best}',
    hammerHud: '锤子！',
    controlsNote: '触控：屏幕按钮。键盘：方向键/WASD 移动，上/下键爬梯，空格跳跃。',
    btnLeftAria: '向左移动',
    btnRightAria: '向右移动',
    btnUpAria: '向上爬',
    btnDownAria: '向下爬',
    btnJumpAria: '跳跃',
  },
  es: {
    back: 'Biblioteca',
    title: 'Escalada de Barriles',
    blurb: 'Escala la torre de señal del desguace, esquiva los bidones rodantes de Warden-9 y llega hasta Mira en la cima. Salta los barriles, sube por las escaleras y toma el martillo para abrirte paso.',
    langSwitchAria: 'Idioma',
    startBtn: 'Empezar a escalar',
    playAgainBtn: 'Escalar de nuevo',
    stageLabel: 'Etapa',
    livesLabel: 'Vidas',
    scoreLabel: 'Puntos',
    bestLabel: 'Récord',
    hudStageAria: 'Etapa actual',
    hudLivesAria: 'Vidas restantes',
    hudScoreAria: 'Puntuación',
    hintTitle: 'Botones o flechas para moverte · Arriba/abajo en la escalera para trepar · Espacio o ▲ para saltar',
    stageClearBanner: '¡Etapa {n} superada!',
    stageClearSub: 'Mira está a salvo — Warden-9 huye hacia la siguiente torre…',
    gameOverTitle: 'Torre Perdida',
    finalStatsLine: 'Etapa {stage} · Puntos {score}',
    gemsLine: 'Células de energía recogidas: {n}',
    newBestLine: '¡Nuevo récord!',
    bestLine: 'Récord: {best}',
    hammerHud: '¡MARTILLO!',
    controlsNote: 'Táctil: botones en pantalla. Teclado: flechas/WASD para moverte, arriba/abajo para trepar, espacio para saltar.',
    btnLeftAria: 'Mover a la izquierda',
    btnRightAria: 'Mover a la derecha',
    btnUpAria: 'Subir escalera',
    btnDownAria: 'Bajar escalera',
    btnJumpAria: 'Saltar',
  },
  ar: {
    back: 'المكتبة',
    title: 'تسلق البراميل',
    blurb: 'تسلق برج الإشارة في ساحة الخردة، وتجنب براميل الوقود التي يدحرجها الروبوت Warden-9، للوصول إلى Mira في الأعلى. اقفز فوق البراميل أو استخدم السلم لتفاديها، والتقط المطرقة لتحطيم البراميل بدلاً من تجنبها.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ التسلق',
    playAgainBtn: 'تسلق من جديد',
    stageLabel: 'المرحلة',
    livesLabel: 'الأرواح',
    scoreLabel: 'النقاط',
    bestLabel: 'الأفضل',
    hudStageAria: 'المرحلة الحالية',
    hudLivesAria: 'الأرواح المتبقية',
    hudScoreAria: 'النقاط',
    hintTitle: 'الأزرار أو الأسهم للحركة · أعلى/أسفل عند السلم للتسلق · المسافة أو ▲ للقفز',
    stageClearBanner: 'اكتملت المرحلة {n}!',
    stageClearSub: 'Mira بأمان الآن — Warden-9 يفر إلى البرج التالي…',
    gameOverTitle: 'البرج ضائع',
    finalStatsLine: 'المرحلة {stage} · النقاط {score}',
    gemsLine: 'خلايا الطاقة المجموعة: {n}',
    newBestLine: 'رقم قياسي جديد!',
    bestLine: 'الأفضل: {best}',
    hammerHud: 'المطرقة!',
    controlsNote: 'اللمس: أزرار على الشاشة. لوحة المفاتيح: الأسهم/WASD للحركة، أعلى/أسفل للتسلق، المسافة للقفز.',
    btnLeftAria: 'تحرك يسارًا',
    btnRightAria: 'تحرك يمينًا',
    btnUpAria: 'تسلق لأعلى',
    btnDownAria: 'نزول لأسفل',
    btnJumpAria: 'قفز',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Ascension des Barils',
    blurb: 'Grimpez la tour-relais de la casse, esquivez les fûts roulants de Warden-9 et atteignez Mira tout en haut. Sautez par-dessus les barils, empruntez les échelles et attrapez le marteau pour tout défoncer.',
    langSwitchAria: 'Langue',
    startBtn: 'Commencer l’ascension',
    playAgainBtn: 'Grimper à nouveau',
    stageLabel: 'Étape',
    livesLabel: 'Vies',
    scoreLabel: 'Score',
    bestLabel: 'Record',
    hudStageAria: 'Étape actuelle',
    hudLivesAria: 'Vies restantes',
    hudScoreAria: 'Score',
    hintTitle: 'Boutons ou flèches pour bouger · Haut/bas sur une échelle pour grimper · Espace ou ▲ pour sauter',
    stageClearBanner: 'Étape {n} terminée !',
    stageClearSub: 'Mira est en sécurité — Warden-9 s’enfuit vers la tour suivante…',
    gameOverTitle: 'Tour Perdue',
    finalStatsLine: 'Étape {stage} · Score {score}',
    gemsLine: 'Énergie collectée : {n}',
    newBestLine: 'Nouveau record !',
    bestLine: 'Record : {best}',
    hammerHud: 'MARTEAU !',
    controlsNote: 'Tactile : boutons à l’écran. Clavier : flèches/WASD pour bouger, haut/bas pour grimper, espace pour sauter.',
    btnLeftAria: 'Aller à gauche',
    btnRightAria: 'Aller à droite',
    btnUpAria: 'Grimper',
    btnDownAria: 'Descendre',
    btnJumpAria: 'Sauter',
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
    const stored = localStorage.getItem('ogh_barrel_climb_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_barrel_climb_lang', lang);
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
