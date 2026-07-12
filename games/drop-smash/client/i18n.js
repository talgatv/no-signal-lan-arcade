/**
 * i18n — string table for Drop Smash. Same flat shape as
 * games/siege-break/client/i18n.js and the other siblings this batch: a
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header, HUD pill
 * labels, hint, controls row labels, overlay cards. It deliberately does NOT
 * mirror the tower scene: the horizontal spawn-position track keeps its
 * visual-left = smaller-x meaning in every language, and the tower's
 * platform layout (which rows have a gap on which side) never flips.
 * Mirroring either would silently swap where a dragged position actually
 * drops the ball, or which side of a staggered/split tower a routing gap
 * sits on, for Arabic players only — the exact mistake caught and fixed in
 * earlier games this batch (see games/hill-rider, games/gem-swap,
 * games/leap-quest, games/siege-break notes). index.html pins the stage and
 * canvas dir="ltr", and game.js forces ctx.direction = 'ltr' as a second
 * guard for any canvas text.
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN', ru: 'RU', zh: '中文', es: 'ES', ar: 'AR', fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    title: 'Drop Smash',
    blurb: 'Choose how many balls, how heavy, and where to drop them — then let real physics smash through as many tower layers as it can.',
    langSwitchAria: 'Language',
    startBtn: 'Start smashing',
    towerLabel: 'Tower',
    hudTowerAria: 'Current tower — tap to switch',
    layersLabel: 'Layers',
    hudLayersAria: 'Layers broken',
    scoreLabel: 'Score',
    hudScoreAria: 'Score',
    bestLabel: 'Best',
    hudBestAria: 'Best score',
    ballsLabel: 'Balls',
    ballGroupAria: 'Ball count',
    weightLabel: 'Weight',
    weightGroupAria: 'Ball weight',
    weightLight: 'Light',
    weightMedium: 'Medium',
    weightHeavy: 'Heavy',
    dropBtn: 'Drop',
    hintConfig: 'Drag across the top to aim, then press Drop',
    hintFalling: 'Smashing through…',
    hintSettling: 'Settling…',
    towerSheer: 'Sheer Tower',
    towerStaggered: 'Staggered Ledges',
    towerFortress: 'Fortress Bands',
    towerTwin: 'Twin Spire',
    dropDoneTitle: 'Drop settled',
    towerClearedTitle: 'Tower cleared!',
    layersBrokenLabel: 'Layers broken',
    depthReachedLabel: 'Depth reached',
    reachedBottomValue: 'Reached the bottom!',
    depthValue: '{rows} / {total} rows',
    scoreGainLabel: 'This drop',
    totalScoreLabel: 'Total score',
    newBestLine: 'New best score!',
    continueBtn: 'Configure next drop',
    nextTowerBtn: 'Next tower',
  },
  ru: {
    back: 'Библиотека',
    title: 'Крушение Башни',
    blurb: 'Выбери число шаров, их вес и точку сброса — и дай настоящей физике проломить как можно больше слоёв башни.',
    langSwitchAria: 'Язык',
    startBtn: 'Начать крушить',
    towerLabel: 'Башня',
    hudTowerAria: 'Текущая башня — нажми, чтобы сменить',
    layersLabel: 'Слои',
    hudLayersAria: 'Разрушено слоёв',
    scoreLabel: 'Очки',
    hudScoreAria: 'Очки',
    bestLabel: 'Рекорд',
    hudBestAria: 'Лучший результат',
    ballsLabel: 'Шары',
    ballGroupAria: 'Количество шаров',
    weightLabel: 'Вес',
    weightGroupAria: 'Вес шара',
    weightLight: 'Лёгкий',
    weightMedium: 'Средний',
    weightHeavy: 'Тяжёлый',
    dropBtn: 'Сбросить',
    hintConfig: 'Проведи по верхней полосе, чтобы прицелиться, затем нажми «Сбросить»',
    hintFalling: 'Крушит слои…',
    hintSettling: 'Обломки оседают…',
    towerSheer: 'Отвесная башня',
    towerStaggered: 'Уступчатые карнизы',
    towerFortress: 'Полосы крепости',
    towerTwin: 'Двойной шпиль',
    dropDoneTitle: 'Сброс завершён',
    towerClearedTitle: 'Башня разрушена!',
    layersBrokenLabel: 'Разрушено слоёв',
    depthReachedLabel: 'Достигнутая глубина',
    reachedBottomValue: 'Достигнуто дно!',
    depthValue: '{rows} / {total} рядов',
    scoreGainLabel: 'За этот сброс',
    totalScoreLabel: 'Всего очков',
    newBestLine: 'Новый рекорд!',
    continueBtn: 'Настроить следующий сброс',
    nextTowerBtn: 'Следующая башня',
  },
  zh: {
    back: '资料库',
    title: '高塔粉碎',
    blurb: '选择球数、重量和投放位置——让真实物理引擎尽可能砸穿高塔的层数。',
    langSwitchAria: '语言',
    startBtn: '开始粉碎',
    towerLabel: '高塔',
    hudTowerAria: '当前高塔——点击切换',
    layersLabel: '层数',
    hudLayersAria: '已击破层数',
    scoreLabel: '分数',
    hudScoreAria: '分数',
    bestLabel: '最高分',
    hudBestAria: '最高分',
    ballsLabel: '球数',
    ballGroupAria: '球的数量',
    weightLabel: '重量',
    weightGroupAria: '球的重量',
    weightLight: '轻',
    weightMedium: '中',
    weightHeavy: '重',
    dropBtn: '投放',
    hintConfig: '在顶部拖动以瞄准，然后点击"投放"',
    hintFalling: '正在砸穿……',
    hintSettling: '正在落定……',
    towerSheer: '陡峭高塔',
    towerStaggered: '错落壁架',
    towerFortress: '要塞条带',
    towerTwin: '双子尖塔',
    dropDoneTitle: '本次投放结束',
    towerClearedTitle: '高塔已清空！',
    layersBrokenLabel: '击破层数',
    depthReachedLabel: '到达深度',
    reachedBottomValue: '已到达塔底！',
    depthValue: '{rows} / {total} 层',
    scoreGainLabel: '本次得分',
    totalScoreLabel: '总分',
    newBestLine: '刷新最高分！',
    continueBtn: '设置下一次投放',
    nextTowerBtn: '下一座高塔',
  },
  es: {
    back: 'Biblioteca',
    title: 'Rompe la Torre',
    blurb: 'Elige cuántas bolas, cuánto pesan y dónde soltarlas — deja que la física real destroce tantas capas de la torre como pueda.',
    langSwitchAria: 'Idioma',
    startBtn: 'Empezar a romper',
    towerLabel: 'Torre',
    hudTowerAria: 'Torre actual — toca para cambiar',
    layersLabel: 'Capas',
    hudLayersAria: 'Capas destruidas',
    scoreLabel: 'Puntos',
    hudScoreAria: 'Puntuación',
    bestLabel: 'Récord',
    hudBestAria: 'Mejor puntuación',
    ballsLabel: 'Bolas',
    ballGroupAria: 'Número de bolas',
    weightLabel: 'Peso',
    weightGroupAria: 'Peso de la bola',
    weightLight: 'Ligera',
    weightMedium: 'Media',
    weightHeavy: 'Pesada',
    dropBtn: 'Soltar',
    hintConfig: 'Arrastra por la franja superior para apuntar y luego pulsa Soltar',
    hintFalling: 'Destrozando capas…',
    hintSettling: 'Los escombros se asientan…',
    towerSheer: 'Torre Vertical',
    towerStaggered: 'Salientes Escalonados',
    towerFortress: 'Bandas de Fortaleza',
    towerTwin: 'Aguja Gemela',
    dropDoneTitle: 'Caída completada',
    towerClearedTitle: '¡Torre despejada!',
    layersBrokenLabel: 'Capas destruidas',
    depthReachedLabel: 'Profundidad alcanzada',
    reachedBottomValue: '¡Llegó hasta el fondo!',
    depthValue: '{rows} / {total} filas',
    scoreGainLabel: 'Esta caída',
    totalScoreLabel: 'Puntuación total',
    newBestLine: '¡Nueva mejor puntuación!',
    continueBtn: 'Configurar la siguiente caída',
    nextTowerBtn: 'Siguiente torre',
  },
  ar: {
    back: 'المكتبة',
    title: 'تحطيم البرج',
    blurb: 'اختر عدد الكرات ووزنها ومكان إسقاطها — ودع الفيزياء الحقيقية تحطّم أكبر عدد ممكن من طبقات البرج.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ التحطيم',
    towerLabel: 'البرج',
    hudTowerAria: 'البرج الحالي — اضغط للتبديل',
    layersLabel: 'الطبقات',
    hudLayersAria: 'الطبقات المحطَّمة',
    scoreLabel: 'النقاط',
    hudScoreAria: 'النقاط',
    bestLabel: 'الأفضل',
    hudBestAria: 'أفضل نتيجة',
    ballsLabel: 'الكرات',
    ballGroupAria: 'عدد الكرات',
    weightLabel: 'الوزن',
    weightGroupAria: 'وزن الكرة',
    weightLight: 'خفيفة',
    weightMedium: 'متوسطة',
    weightHeavy: 'ثقيلة',
    dropBtn: 'إسقاط',
    hintConfig: 'اسحب عبر الشريط العلوي للتصويب، ثم اضغط "إسقاط"',
    hintFalling: 'يحطّم الطبقات…',
    hintSettling: 'الحطام يستقر…',
    towerSheer: 'البرج الشاهق',
    towerStaggered: 'الأرفف المتعرجة',
    towerFortress: 'أحزمة الحصن',
    towerTwin: 'البرج التوأم المدبب',
    dropDoneTitle: 'اكتمل الإسقاط',
    towerClearedTitle: 'انهار البرج بالكامل!',
    layersBrokenLabel: 'الطبقات المحطَّمة',
    depthReachedLabel: 'العمق المُحرَز',
    reachedBottomValue: 'وصل إلى القاع!',
    depthValue: '{rows} / {total} صفوف',
    scoreGainLabel: 'هذا الإسقاط',
    totalScoreLabel: 'مجموع النقاط',
    newBestLine: 'رقم قياسي جديد!',
    continueBtn: 'إعداد الإسقاط التالي',
    nextTowerBtn: 'البرج التالي',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Tour Fracassée',
    blurb: "Choisis le nombre de balles, leur poids et le point de largage — laisse une vraie physique fracasser un maximum d'étages de la tour.",
    langSwitchAria: 'Langue',
    startBtn: 'Commencer à fracasser',
    towerLabel: 'Tour',
    hudTowerAria: 'Tour actuelle — toucher pour changer',
    layersLabel: 'Étages',
    hudLayersAria: 'Étages détruits',
    scoreLabel: 'Score',
    hudScoreAria: 'Score',
    bestLabel: 'Record',
    hudBestAria: 'Meilleur score',
    ballsLabel: 'Balles',
    ballGroupAria: 'Nombre de balles',
    weightLabel: 'Poids',
    weightGroupAria: 'Poids de la balle',
    weightLight: 'Légère',
    weightMedium: 'Moyenne',
    weightHeavy: 'Lourde',
    dropBtn: 'Lâcher',
    hintConfig: 'Glisse en haut pour viser, puis appuie sur Lâcher',
    hintFalling: 'Fracasse les étages…',
    hintSettling: 'Les débris se stabilisent…',
    towerSheer: 'Tour Verticale',
    towerStaggered: 'Corniches Décalées',
    towerFortress: 'Bandes de Forteresse',
    towerTwin: 'Flèche Jumelle',
    dropDoneTitle: 'Chute terminée',
    towerClearedTitle: 'Tour détruite !',
    layersBrokenLabel: 'Étages détruits',
    depthReachedLabel: 'Profondeur atteinte',
    reachedBottomValue: 'A atteint le fond !',
    depthValue: '{rows} / {total} rangées',
    scoreGainLabel: 'Cette chute',
    totalScoreLabel: 'Score total',
    newBestLine: 'Nouveau meilleur score !',
    continueBtn: 'Configurer la prochaine chute',
    nextTowerBtn: 'Tour suivante',
  },
};

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

export function detectLang() {
  const q = qs('lang');
  if (q && STRINGS[q]) return q;
  try {
    const stored = localStorage.getItem('ogh_drop_smash_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try { localStorage.setItem('ogh_drop_smash_lang', lang); } catch { /* ignore */ }
}

/** Translate a key, with optional {placeholder} substitution. */
export function t(lang, key, vars) {
  const dict = STRINGS[lang] || STRINGS.en;
  let s = dict[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function applyStaticStrings(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-aria')));
  });
}
