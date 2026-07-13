/**
 * i18n — small string table for Penguin Fling.
 * Mirrors the pattern used by games/pop-the-bugs/client/i18n.js and
 * games/neon-drift/client/i18n.js: a flat STRINGS table per UN-6 language,
 * a couple of detect/apply helpers, no framework.
 *
 * RTL note: applyStaticStrings() flips document.documentElement.dir for
 * Arabic, which is correct for text chrome (HUD pills, overlay cards, back
 * link). It must NOT affect the game canvas — the yeti/penguin scene, the
 * flight arc, and the ice course are spatial gameplay (which way is
 * "forward" is physically meaningful: gravity and the throw direction
 * don't flip because the UI language does), same risk category called out
 * in games/music-synth (piano key order) and games/neon-drift (track
 * direction). game.js keeps the canvas's own text rendering pinned to LTR
 * for the same reason.
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
    title: 'Penguin Fling',
    tagline: 'Fling a penguin off a friendly yeti — real bounce-and-slide ice physics.',
    blurb: 'Drag back from the penguin like a slingshot, then let go. Watch it arc, skip across the ice, and glide to a stop. Land on a flag for a bonus!',
    startBtn: 'Play',
    aimHint: 'Drag back from the penguin, then let go!',
    aimReadout: 'Power {power}% · Angle {angle}°',
    liveDistance: 'Distance {d} m',
    windLabel: 'Wind',
    bestLabel: 'Best',
    attemptLabel: 'Throw #{n}',
    resultTitle: 'Nice throw!',
    distanceResultLabel: 'Distance',
    newBestLine: 'New best distance!',
    bonusLine: '{name} bonus +{n}!',
    comparisonLine: "That's as long as {n} city buses end to end!",
    throwAgainBtn: 'Throw again',
    targetIcicleName: 'Icicle Point',
    targetFrostName: 'Frost Ridge',
    targetGlacierName: 'Glacier Edge',
    targetAuroraName: 'Aurora Point',
    rampLabel: 'Ramp',
    windAria: 'Wind',
    bestAria: 'Best distance',
    distanceAria: 'Distance',
  },
  ru: {
    back: 'Библиотека',
    title: 'Пингвин-бросок',
    tagline: 'Запусти пингвина катапультой из лап йети — настоящая физика отскоков и скольжения по льду.',
    blurb: 'Тяни пингвина назад, как из рогатки, и отпускай. Смотри, как он летит по дуге, скачет по льду и скользит до полной остановки. Попади во флажок — получи бонус!',
    startBtn: 'Играть',
    aimHint: 'Тяни пингвина назад и отпускай!',
    aimReadout: 'Сила {power}% · Угол {angle}°',
    liveDistance: 'Дистанция {d} м',
    windLabel: 'Ветер',
    bestLabel: 'Рекорд',
    attemptLabel: 'Бросок №{n}',
    resultTitle: 'Отличный бросок!',
    distanceResultLabel: 'Дистанция',
    newBestLine: 'Новый рекорд дистанции!',
    bonusLine: 'Бонус «{name}» +{n}!',
    comparisonLine: 'Это примерно {n} городских автобусов в ряд!',
    throwAgainBtn: 'Бросить ещё раз',
    targetIcicleName: 'Сосулькин мыс',
    targetFrostName: 'Морозный хребет',
    targetGlacierName: 'Ледниковый край',
    targetAuroraName: 'Точка Сияния',
    rampLabel: 'Трамплин',
    windAria: 'Ветер',
    bestAria: 'Лучшая дистанция',
    distanceAria: 'Дистанция',
  },
  zh: {
    back: '资料库',
    title: '企鹅大甩飞',
    tagline: '雪怪把企鹅甩向远方——真实的冰面弹跳滑行物理。',
    blurb: '像弹弓一样把企鹅向后拉，松手发射。看它划出抛物线，在冰面上一路弹跳，然后滑行到停下。落在旗子上还有额外奖励！',
    startBtn: '开始',
    aimHint: '向后拖拽企鹅，松手发射！',
    aimReadout: '力度 {power}% · 角度 {angle}°',
    liveDistance: '距离 {d} 米',
    windLabel: '风力',
    bestLabel: '最佳',
    attemptLabel: '第 {n} 次投掷',
    resultTitle: '好一记妙投！',
    distanceResultLabel: '距离',
    newBestLine: '刷新最远距离！',
    bonusLine: '「{name}」奖励 +{n}！',
    comparisonLine: '相当于 {n} 辆公交车首尾相连的长度！',
    throwAgainBtn: '再来一次',
    targetIcicleName: '冰柱角',
    targetFrostName: '霜脊',
    targetGlacierName: '冰川边缘',
    targetAuroraName: '极光点',
    rampLabel: '跳台',
    windAria: '风力',
    bestAria: '最佳距离',
    distanceAria: '距离',
  },
  es: {
    back: 'Biblioteca',
    title: 'Pingüino Volador',
    tagline: 'Un yeti lanza a un pingüino con física real de rebotes y deslizamiento sobre el hielo.',
    blurb: 'Arrastra hacia atrás desde el pingüino como un tirachinas y suelta. Míralo volar en arco, rebotar sobre el hielo y deslizarse hasta detenerse. ¡Cae sobre una bandera para un bono!',
    startBtn: 'Jugar',
    aimHint: '¡Arrastra hacia atrás desde el pingüino y suelta!',
    aimReadout: 'Potencia {power}% · Ángulo {angle}°',
    liveDistance: 'Distancia {d} m',
    windLabel: 'Viento',
    bestLabel: 'Mejor',
    attemptLabel: 'Lanzamiento n.º{n}',
    resultTitle: '¡Buen lanzamiento!',
    distanceResultLabel: 'Distancia',
    newBestLine: '¡Nueva mejor distancia!',
    bonusLine: '¡Bono {name} +{n}!',
    comparisonLine: '¡Eso es tan largo como {n} autobuses urbanos en fila!',
    throwAgainBtn: 'Lanzar de nuevo',
    targetIcicleName: 'Punta del Carámbano',
    targetFrostName: 'Cresta de Escarcha',
    targetGlacierName: 'Borde del Glaciar',
    targetAuroraName: 'Punto de Aurora',
    rampLabel: 'Rampa',
    windAria: 'Viento',
    bestAria: 'Mejor distancia',
    distanceAria: 'Distancia',
  },
  ar: {
    back: 'المكتبة',
    title: 'قذف البطريق',
    tagline: 'يقذف رجل الثلج البطريق عبر الجليد — فيزياء ارتداد وانزلاق حقيقية.',
    blurb: 'اسحب للخلف من البطريق كأنه مقلاع، ثم أفلته. شاهده يطير في قوس، يرتد فوق الجليد، وينزلق حتى يتوقف. اهبط على علم لتحصل على مكافأة!',
    startBtn: 'ابدأ',
    aimHint: 'اسحب البطريق للخلف ثم أفلته!',
    aimReadout: 'القوة {power}% · الزاوية {angle}°',
    liveDistance: 'المسافة {d} م',
    windLabel: 'الرياح',
    bestLabel: 'الأفضل',
    attemptLabel: 'الرمية رقم {n}',
    resultTitle: 'رمية رائعة!',
    distanceResultLabel: 'المسافة',
    newBestLine: 'رقم قياسي جديد للمسافة!',
    bonusLine: 'مكافأة {name} +{n}!',
    comparisonLine: 'هذا يعادل طول {n} حافلة مدينة متتالية!',
    throwAgainBtn: 'ارمِ مرة أخرى',
    targetIcicleName: 'رأس الجليد',
    targetFrostName: 'حافة الصقيع',
    targetGlacierName: 'حافة النهر الجليدي',
    targetAuroraName: 'نقطة الشفق',
    rampLabel: 'منحدر القفز',
    windAria: 'الرياح',
    bestAria: 'أفضل مسافة',
    distanceAria: 'المسافة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Lancer de Manchot',
    tagline: 'Un yéti catapulte un manchot sur la glace — vraie physique de rebonds puis de glisse.',
    blurb: "Tirez vers l'arrière depuis le manchot comme une fronde, puis lâchez. Regardez-le voler en arc, rebondir sur la glace et glisser jusqu'à l'arrêt. Atterrissez sur un drapeau pour un bonus !",
    startBtn: 'Jouer',
    aimHint: "Tirez le manchot vers l'arrière puis lâchez !",
    aimReadout: 'Puissance {power}% · Angle {angle}°',
    liveDistance: 'Distance {d} m',
    windLabel: 'Vent',
    bestLabel: 'Record',
    attemptLabel: 'Lancer n°{n}',
    resultTitle: 'Beau lancer !',
    distanceResultLabel: 'Distance',
    newBestLine: 'Nouveau record de distance !',
    bonusLine: 'Bonus {name} +{n} !',
    comparisonLine: "C'est aussi long que {n} bus urbains mis bout à bout !",
    throwAgainBtn: 'Relancer',
    targetIcicleName: 'Pointe des Glaçons',
    targetFrostName: 'Crête de Givre',
    targetGlacierName: 'Bord du Glacier',
    targetAuroraName: "Point d'Aurore",
    rampLabel: 'Tremplin',
    windAria: 'Vent',
    bestAria: 'Meilleure distance',
    distanceAria: 'Distance',
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
    const stored = localStorage.getItem('ogh_pf_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_pf_lang', lang);
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
