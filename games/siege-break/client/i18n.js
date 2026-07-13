/**
 * i18n — string table for Siege Break. Same flat shape as
 * games/leap-quest/client/i18n.js and the other siblings this batch: a
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — the header/back link,
 * HUD pill labels, hint, and overlay cards. It deliberately does NOT mirror
 * the play field. The catapult is on the LEFT and the besieged structure on
 * the RIGHT in every language; the launch direction (left -> right) and every
 * structure's geometry are a fixed spatial gameplay convention, not prose.
 * Mirroring them for Arabic would silently invert every shot's aim and flip
 * the level layout — the exact mistake caught and fixed in earlier games this
 * batch (see games/hill-rider, games/gem-swap, games/leap-quest notes). The
 * stage/canvas is pinned dir="ltr" in the markup and game.js forces
 * ctx.direction = 'ltr' for any canvas text as a second guard.
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN', ru: 'RU', zh: '中文', es: 'ES', ar: 'AR', fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    title: 'Siege Break',
    blurb:
      'Load the catapult, drag back to aim, and let the boulder fly. Smash through walls, topple towers, and bring the whole structure down on the enemies holding it — in as few boulders as you can.',
    langSwitchAria: 'Language',
    startBtn: 'Start siege',
    nextLevelBtn: 'Next stronghold',
    retryBtn: 'Retry stronghold',
    playAgainBtn: 'Play again',
    levelLabel: 'Level',
    targetsLabel: 'Targets',
    ammoLabel: 'Boulders',
    scoreLabel: 'Score',
    hudLevelAria: 'Current level',
    hudTargetsAria: 'Targets remaining',
    hudAmmoAria: 'Boulders remaining',
    hudScoreAria: 'Score',
    controlsNote:
      'Touch or mouse (Pointer Events): press near the catapult, drag back like a slingshot, and release to launch. Power comes from how far you pull (capped); the launch angle comes from the pull direction. A dashed arc previews the shot as you aim.',
    hint: 'Drag back from the catapult, then release to launch',
    aimReadout: 'Power {power}% · Angle {angle}°',
    flyingHint: 'Boulder away!',
    settlingHint: 'Let the rubble settle…',
    levelClearTitle: 'Stronghold broken!',
    levelClearSub: 'Every target is down. Onward.',
    levelFailTitle: 'Out of boulders',
    levelFailSub: 'Some targets still stand. Take this stronghold again.',
    winTitle: 'Siege complete!',
    winSub: 'Every stronghold has fallen. Masterful work.',
    levelLine: 'Level {n} — {name}',
    shotsUsedLabel: 'Boulders used',
    starsLabel: 'Rating',
    finalScoreLabel: 'Final score',
    bestLabel: 'Best score',
    newBestLine: 'New best score!',
    lvlWatchtower: 'The Watchpost',
    lvlTwinGate: 'Twin Gate',
    lvlBunker: 'The Vault',
    lvlSteppedKeep: 'Stepped Keep',
    lvlSkyBridge: 'Sky Bridge',
    lvlCitadel: 'The Citadel',
  },
  ru: {
    back: 'Библиотека',
    title: 'Осадный Пролом',
    blurb:
      'Заряди катапульту, оттяни назад для прицела и отпусти — валун летит. Проламывай стены, роняй башни и обрушивай всю постройку на засевших в ней врагов — потратив как можно меньше валунов.',
    langSwitchAria: 'Язык',
    startBtn: 'Начать осаду',
    nextLevelBtn: 'Следующая крепость',
    retryBtn: 'Заново',
    playAgainBtn: 'Играть ещё',
    levelLabel: 'Уровень',
    targetsLabel: 'Цели',
    ammoLabel: 'Валуны',
    scoreLabel: 'Очки',
    hudLevelAria: 'Текущий уровень',
    hudTargetsAria: 'Осталось целей',
    hudAmmoAria: 'Осталось валунов',
    hudScoreAria: 'Очки',
    controlsNote:
      'Тач или мышь (Pointer Events): нажми рядом с катапультой, оттяни назад, как рогатку, и отпусти для запуска. Сила зависит от того, насколько далеко ты оттянул (с пределом), угол — от направления оттяжки. Пунктирная дуга показывает предполагаемый полёт.',
    hint: 'Оттяни катапульту назад и отпусти для запуска',
    aimReadout: 'Сила {power}% · Угол {angle}°',
    flyingHint: 'Валун полетел!',
    settlingHint: 'Пусть обломки осядут…',
    levelClearTitle: 'Крепость пала!',
    levelClearSub: 'Все цели повержены. Дальше.',
    levelFailTitle: 'Валуны кончились',
    levelFailSub: 'Часть целей уцелела. Возьми эту крепость снова.',
    winTitle: 'Осада завершена!',
    winSub: 'Все крепости пали. Мастерская работа.',
    levelLine: 'Уровень {n} — {name}',
    shotsUsedLabel: 'Использовано валунов',
    starsLabel: 'Оценка',
    finalScoreLabel: 'Итоговый счёт',
    bestLabel: 'Лучший результат',
    newBestLine: 'Новый рекорд!',
    lvlWatchtower: 'Дозорная башня',
    lvlTwinGate: 'Двойные врата',
    lvlBunker: 'Каземат',
    lvlSteppedKeep: 'Ступенчатый форт',
    lvlSkyBridge: 'Небесный мост',
    lvlCitadel: 'Цитадель',
  },
  zh: {
    back: '资料库',
    title: '破城',
    blurb:
      '装填投石机，向后拖拽瞄准，松手让巨石飞出。砸穿墙壁、掀翻高塔，把整座建筑连同据守其中的敌人一起砸垮——用尽可能少的巨石完成。',
    langSwitchAria: '语言',
    startBtn: '开始攻城',
    nextLevelBtn: '下一座要塞',
    retryBtn: '重试',
    playAgainBtn: '再玩一次',
    levelLabel: '关卡',
    targetsLabel: '目标',
    ammoLabel: '巨石',
    scoreLabel: '分数',
    hudLevelAria: '当前关卡',
    hudTargetsAria: '剩余目标',
    hudAmmoAria: '剩余巨石',
    hudScoreAria: '分数',
    controlsNote:
      '触屏或鼠标（Pointer Events）：在投石机附近按下，像弹弓一样向后拖拽，松手即可发射。力度取决于你拉多远（有上限），发射角度取决于拉拽方向。瞄准时会有一条虚线弧预示弹道。',
    hint: '从投石机向后拖拽，松手发射',
    aimReadout: '力度 {power}% · 角度 {angle}°',
    flyingHint: '巨石飞出！',
    settlingHint: '等废墟落定…',
    levelClearTitle: '要塞已破！',
    levelClearSub: '所有目标已被击倒。继续前进。',
    levelFailTitle: '巨石用尽',
    levelFailSub: '仍有目标屹立。再攻一次这座要塞。',
    winTitle: '攻城完成！',
    winSub: '所有要塞皆已陷落。干得漂亮。',
    levelLine: '第 {n} 关 — {name}',
    shotsUsedLabel: '已用巨石',
    starsLabel: '评级',
    finalScoreLabel: '最终得分',
    bestLabel: '最高分',
    newBestLine: '刷新最高分！',
    lvlWatchtower: '瞭望塔',
    lvlTwinGate: '双子城门',
    lvlBunker: '地堡',
    lvlSteppedKeep: '阶梯要塞',
    lvlSkyBridge: '天桥',
    lvlCitadel: '堡垒',
  },
  es: {
    back: 'Biblioteca',
    title: 'Asalto',
    blurb:
      'Carga la catapulta, tira hacia atrás para apuntar y suelta la roca. Rompe muros, derriba torres y haz caer toda la estructura sobre los enemigos que la ocupan — con las menos rocas posibles.',
    langSwitchAria: 'Idioma',
    startBtn: 'Comenzar asedio',
    nextLevelBtn: 'Siguiente fortaleza',
    retryBtn: 'Reintentar',
    playAgainBtn: 'Jugar de nuevo',
    levelLabel: 'Nivel',
    targetsLabel: 'Objetivos',
    ammoLabel: 'Rocas',
    scoreLabel: 'Puntos',
    hudLevelAria: 'Nivel actual',
    hudTargetsAria: 'Objetivos restantes',
    hudAmmoAria: 'Rocas restantes',
    hudScoreAria: 'Puntuación',
    controlsNote:
      'Táctil o ratón (Pointer Events): pulsa cerca de la catapulta, tira hacia atrás como un tirachinas y suelta para lanzar. La potencia depende de cuánto tires (con tope); el ángulo, de la dirección del tirón. Un arco punteado muestra la trayectoria mientras apuntas.',
    hint: 'Tira hacia atrás desde la catapulta y suelta para lanzar',
    aimReadout: 'Potencia {power}% · Ángulo {angle}°',
    flyingHint: '¡Roca en el aire!',
    settlingHint: 'Deja que se asienten los escombros…',
    levelClearTitle: '¡Fortaleza quebrada!',
    levelClearSub: 'Todos los objetivos caídos. Adelante.',
    levelFailTitle: 'Sin rocas',
    levelFailSub: 'Algunos objetivos siguen en pie. Toma esta fortaleza otra vez.',
    winTitle: '¡Asedio completado!',
    winSub: 'Todas las fortalezas han caído. Trabajo magistral.',
    levelLine: 'Nivel {n} — {name}',
    shotsUsedLabel: 'Rocas usadas',
    starsLabel: 'Valoración',
    finalScoreLabel: 'Puntuación final',
    bestLabel: 'Mejor puntuación',
    newBestLine: '¡Nueva mejor puntuación!',
    lvlWatchtower: 'La Atalaya',
    lvlTwinGate: 'Puerta Gemela',
    lvlBunker: 'La Bóveda',
    lvlSteppedKeep: 'Fortín Escalonado',
    lvlSkyBridge: 'Puente Alto',
    lvlCitadel: 'La Ciudadela',
  },
  ar: {
    back: 'المكتبة',
    title: 'كسر الحصار',
    blurb:
      'حمِّل المنجنيق، واسحب للخلف للتصويب، ثم أفلت الصخرة لتنطلق. حطِّم الجدران، وأسقط الأبراج، وأنزل البناء بأكمله على الأعداء المتحصنين فيه — بأقل عدد ممكن من الصخور.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ الحصار',
    nextLevelBtn: 'الحصن التالي',
    retryBtn: 'أعد المحاولة',
    playAgainBtn: 'العب مجددًا',
    levelLabel: 'المرحلة',
    targetsLabel: 'الأهداف',
    ammoLabel: 'الصخور',
    scoreLabel: 'النقاط',
    hudLevelAria: 'المرحلة الحالية',
    hudTargetsAria: 'الأهداف المتبقية',
    hudAmmoAria: 'الصخور المتبقية',
    hudScoreAria: 'النقاط',
    controlsNote:
      'باللمس أو الفأرة (Pointer Events): اضغط قرب المنجنيق، واسحب للخلف كأنه مقلاع، ثم أفلت للإطلاق. القوة من مقدار السحب (بحد أقصى)، وزاوية الإطلاق من اتجاه السحب. يظهر قوس منقّط يتوقّع مسار الرمية أثناء التصويب.',
    hint: 'اسحب المنجنيق للخلف ثم أفلت للإطلاق',
    aimReadout: 'القوة {power}٪ · الزاوية {angle}°',
    flyingHint: 'انطلقت الصخرة!',
    settlingHint: 'دع الركام يستقر…',
    levelClearTitle: 'سقط الحصن!',
    levelClearSub: 'سقطت كل الأهداف. إلى الأمام.',
    levelFailTitle: 'نفدت الصخور',
    levelFailSub: 'لا تزال بعض الأهداف صامدة. أعد اقتحام هذا الحصن.',
    winTitle: 'اكتمل الحصار!',
    winSub: 'سقطت كل الحصون. عملٌ بارع.',
    levelLine: 'المرحلة {n} — {name}',
    shotsUsedLabel: 'الصخور المستخدمة',
    starsLabel: 'التقييم',
    finalScoreLabel: 'النتيجة النهائية',
    bestLabel: 'أفضل نتيجة',
    newBestLine: 'رقم قياسي جديد!',
    lvlWatchtower: 'برج المراقبة',
    lvlTwinGate: 'البوابة التوأم',
    lvlBunker: 'القبو',
    lvlSteppedKeep: 'الحصن المُدرَّج',
    lvlSkyBridge: 'الجسر المعلّق',
    lvlCitadel: 'القلعة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Brise-Siège',
    blurb:
      'Charge la catapulte, tire vers l\'arrière pour viser, et lâche le rocher. Défonce les murs, renverse les tours et fais s\'effondrer toute la structure sur les ennemis qui la tiennent — avec le moins de rochers possible.',
    langSwitchAria: 'Langue',
    startBtn: 'Lancer le siège',
    nextLevelBtn: 'Forteresse suivante',
    retryBtn: 'Réessayer',
    playAgainBtn: 'Rejouer',
    levelLabel: 'Niveau',
    targetsLabel: 'Cibles',
    ammoLabel: 'Rochers',
    scoreLabel: 'Score',
    hudLevelAria: 'Niveau actuel',
    hudTargetsAria: 'Cibles restantes',
    hudAmmoAria: 'Rochers restants',
    hudScoreAria: 'Score',
    controlsNote:
      'Tactile ou souris (Pointer Events) : appuie près de la catapulte, tire vers l\'arrière comme une fronde, puis lâche pour lancer. La puissance dépend de la distance tirée (plafonnée) ; l\'angle, de la direction du tir. Un arc pointillé prévisualise la trajectoire pendant que tu vises.',
    hint: 'Tire la catapulte vers l\'arrière puis lâche pour lancer',
    aimReadout: 'Puissance {power}% · Angle {angle}°',
    flyingHint: 'Rocher parti !',
    settlingHint: 'Laisse les décombres se poser…',
    levelClearTitle: 'Forteresse brisée !',
    levelClearSub: 'Toutes les cibles à terre. En avant.',
    levelFailTitle: 'Plus de rochers',
    levelFailSub: 'Des cibles tiennent encore. Reprends cette forteresse.',
    winTitle: 'Siège terminé !',
    winSub: 'Toutes les forteresses sont tombées. Du grand art.',
    levelLine: 'Niveau {n} — {name}',
    shotsUsedLabel: 'Rochers utilisés',
    starsLabel: 'Note',
    finalScoreLabel: 'Score final',
    bestLabel: 'Meilleur score',
    newBestLine: 'Nouveau meilleur score !',
    lvlWatchtower: 'Le Poste de Guet',
    lvlTwinGate: 'La Porte Jumelle',
    lvlBunker: 'Le Caveau',
    lvlSteppedKeep: 'Le Donjon en Gradins',
    lvlSkyBridge: 'Le Pont Suspendu',
    lvlCitadel: 'La Citadelle',
  },
};

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

export function detectLang() {
  const q = qs('lang');
  if (q && STRINGS[q]) return q;
  try {
    const stored = localStorage.getItem('ogh_siege_break_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try { localStorage.setItem('ogh_siege_break_lang', lang); } catch { /* ignore */ }
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
