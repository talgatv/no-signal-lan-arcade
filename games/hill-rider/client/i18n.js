/**
 * i18n — string table for Hill Rider. Mirrors games/void-drift/client/i18n.js
 * and other siblings this batch (same shape): a flat STRINGS table per UN-6
 * language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link, HUD
 * pill labels, hint, overlay cards and touch-button aria-labels. It
 * deliberately does NOT mirror the terrain, the vehicle's direction of
 * travel or the camera. The rover always drives left-to-right/forward
 * regardless of UI text direction — a physics simulation with a fixed
 * "forward" has no reading direction to flip, and mirroring it would invert
 * which button is "accelerate" against a control scheme that has nothing to
 * do with text layout. Same reasoning (and the same dir="ltr" stage guard)
 * as void-drift's play field and neon-drift's chase-camera view.
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
    title: 'Hill Rider',
    blurb:
      "Gas and brake are your only controls — there's no steering. Roll across endless procedurally-generated hills, keep the rover's nose out of the dirt, and don't run dry.",
    langSwitchAria: 'Language',
    startBtn: 'Start engine',
    playAgainBtn: 'Ride again',
    distanceLabel: 'DIST',
    coinsLabel: 'COINS',
    fuelLabel: 'FUEL',
    hudDistanceAria: 'Distance',
    hudCoinsAria: 'Coins collected',
    hudFuelAria: 'Fuel remaining',
    crashTitle: 'Crashed!',
    crashSub: 'The rover tipped past recovery and went in nose-first.',
    fuelOutTitle: 'Out of Fuel',
    fuelOutSub: 'The tank ran dry and the rover coasted to a stop.',
    finalDistanceLabel: 'Distance',
    finalCoinsLabel: 'Coins',
    bestLabel: 'Best distance',
    newBestLine: 'New best distance!',
    controlsNote:
      'Touch: hold GAS to accelerate (tips the nose up), hold BRAKE to slow down or reverse (tips the nose down) — both also rotate the rover while airborne, so you can level out for a landing. Desktop bonus: Up arrow / W for gas, Down arrow / S for brake.',
    hint: 'Hold GAS / BRAKE — no steering, the terrain (and momentum) does the rest',
    btnGasAria: 'Gas',
    btnBrakeAria: 'Brake',
    legendCoin: 'Coin — adds to your score',
    legendFuel: 'Fuel canister — refills the tank',
  },
  ru: {
    back: 'Библиотека',
    title: 'Покоритель холмов',
    blurb:
      'Газ и тормоз — вот и всё управление, руля нет. Катись по бесконечным процедурным холмам, не зарывайся носом в землю и не глуши бак досуха.',
    langSwitchAria: 'Язык',
    startBtn: 'Завести мотор',
    playAgainBtn: 'Ещё заезд',
    distanceLabel: 'ДИСТ',
    coinsLabel: 'МОНЕТЫ',
    fuelLabel: 'ТОПЛИВО',
    hudDistanceAria: 'Дистанция',
    hudCoinsAria: 'Собрано монет',
    hudFuelAria: 'Остаток топлива',
    crashTitle: 'Авария!',
    crashSub: 'Вездеход завалился за грань устойчивости и врезался носом в землю.',
    fuelOutTitle: 'Кончилось топливо',
    fuelOutSub: 'Бак опустел, и вездеход катился накатом до полной остановки.',
    finalDistanceLabel: 'Дистанция',
    finalCoinsLabel: 'Монеты',
    bestLabel: 'Лучшая дистанция',
    newBestLine: 'Новый рекорд дистанции!',
    controlsNote:
      'Сенсор: удержи GAS для разгона (нос приподнимается), удержи BRAKE для торможения/заднего хода (нос опускается) — обе кнопки также вращают вездеход в полёте, чтобы выровняться перед приземлением. Бонус для ПК: стрелка вверх / W — газ, стрелка вниз / S — тормоз.',
    hint: 'Держи GAS / BRAKE — руля нет, всё решают рельеф и инерция',
    btnGasAria: 'Газ',
    btnBrakeAria: 'Тормоз',
    legendCoin: 'Монета — добавляет очки',
    legendFuel: 'Канистра топлива — пополняет бак',
  },
  zh: {
    back: '资料库',
    title: '丘陵骑手',
    blurb:
      '只有油门和刹车,没有方向盘。穿越无穷无尽的程序生成丘陵地形,别让车头一头栽进土里,也别把油箱开空。',
    langSwitchAria: '语言',
    startBtn: '发动引擎',
    playAgainBtn: '再来一程',
    distanceLabel: '距离',
    coinsLabel: '金币',
    fuelLabel: '燃料',
    hudDistanceAria: '距离',
    hudCoinsAria: '已收集金币',
    hudFuelAria: '剩余燃料',
    crashTitle: '坠毁!',
    crashSub: '车身倾斜过度,车头一头栽进了地面。',
    fuelOutTitle: '燃料耗尽',
    fuelOutSub: '油箱见底,车辆缓缓滑行至停止。',
    finalDistanceLabel: '距离',
    finalCoinsLabel: '金币',
    bestLabel: '最佳距离',
    newBestLine: '刷新最佳距离!',
    controlsNote:
      '触屏:按住 GAS 加速(车头上扬),按住 BRAKE 减速或倒退(车头下压)——腾空时两个按钮还能旋转车身,方便你调整姿态平稳落地。桌面加成:↑ 或 W 加速,↓ 或 S 刹车。',
    hint: '按住 GAS / BRAKE——没有方向盘,地形和惯性说了算',
    btnGasAria: '油门',
    btnBrakeAria: '刹车',
    legendCoin: '金币——增加分数',
    legendFuel: '燃料罐——为油箱补给',
  },
  es: {
    back: 'Biblioteca',
    title: 'Piloto de Colinas',
    blurb:
      'El acelerador y el freno son tus únicos controles — no hay volante. Recorre colinas generadas sin fin, no dejes que el morro se clave en la tierra y no te quedes sin combustible.',
    langSwitchAria: 'Idioma',
    startBtn: 'Arrancar motor',
    playAgainBtn: 'Rodar de nuevo',
    distanceLabel: 'DIST',
    coinsLabel: 'MONEDAS',
    fuelLabel: 'COMBUST.',
    hudDistanceAria: 'Distancia',
    hudCoinsAria: 'Monedas recogidas',
    hudFuelAria: 'Combustible restante',
    crashTitle: '¡Choque!',
    crashSub: 'El vehículo se inclinó más allá del límite y cayó de morro contra el suelo.',
    fuelOutTitle: 'Sin Combustible',
    fuelOutSub: 'El depósito se vació y el vehículo rodó hasta detenerse.',
    finalDistanceLabel: 'Distancia',
    finalCoinsLabel: 'Monedas',
    bestLabel: 'Mejor distancia',
    newBestLine: '¡Nueva mejor distancia!',
    controlsNote:
      'Táctil: mantén GAS para acelerar (el morro se levanta), mantén BRAKE para frenar o dar marcha atrás (el morro baja); ambos también rotan el vehículo en el aire, para nivelarlo antes de aterrizar. Bonus de escritorio: flecha arriba / W para acelerar, flecha abajo / S para frenar.',
    hint: 'Mantén GAS / BRAKE — sin volante, el terreno (y el impulso) hacen el resto',
    btnGasAria: 'Acelerar',
    btnBrakeAria: 'Frenar',
    legendCoin: 'Moneda — suma puntos',
    legendFuel: 'Bidón de combustible — rellena el depósito',
  },
  ar: {
    back: 'المكتبة',
    title: 'راكب التلال',
    blurb:
      'دواسة الوقود والفرامل هما تحكّمك الوحيد — لا عجلة قيادة هنا. اعبر تلالًا لا نهائية تُولَّد إجرائيًا، ولا تدع مقدمة المركبة تغرز في التراب، ولا تدع الخزان يجف.',
    langSwitchAria: 'اللغة',
    startBtn: 'تشغيل المحرك',
    playAgainBtn: 'جولة أخرى',
    distanceLabel: 'المسافة',
    coinsLabel: 'العملات',
    fuelLabel: 'الوقود',
    hudDistanceAria: 'المسافة',
    hudCoinsAria: 'العملات المجمعة',
    hudFuelAria: 'الوقود المتبقي',
    crashTitle: 'تحطّم!',
    crashSub: 'انقلبت المركبة إلى ما بعد حد الاتزان واصطدمت بمقدمتها بالأرض.',
    fuelOutTitle: 'نفد الوقود',
    fuelOutSub: 'جفّ الخزان وتدحرجت المركبة حتى توقفت.',
    finalDistanceLabel: 'المسافة',
    finalCoinsLabel: 'العملات',
    bestLabel: 'أفضل مسافة',
    newBestLine: 'رقم قياسي جديد للمسافة!',
    controlsNote:
      'باللمس: اضغط مطوّلًا GAS للتسارع (ترتفع المقدمة)، واضغط مطوّلًا BRAKE للتباطؤ أو الرجوع للخلف (تنخفض المقدمة) — كلا الزرين يُدوّران المركبة أيضًا أثناء تحليقها لمساعدتك على الاستواء قبل الهبوط. إضافة للحاسوب: السهم لأعلى أو W للتسارع، السهم لأسفل أو S للفرامل.',
    hint: 'اضغط مطوّلًا GAS / BRAKE — لا عجلة قيادة، التضاريس والزخم يتكفلان بالباقي',
    btnGasAria: 'تسارع',
    btnBrakeAria: 'فرامل',
    legendCoin: 'عملة — تضيف نقاطًا',
    legendFuel: 'عبوة وقود — تملأ الخزان',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Cavalier des Collines',
    blurb:
      "L'accélérateur et le frein sont vos seuls contrôles — pas de volant. Parcourez des collines générées à l'infini, évitez de planter le nez dans la terre, et ne tombez pas en panne d'essence.",
    langSwitchAria: 'Langue',
    startBtn: 'Démarrer le moteur',
    playAgainBtn: 'Rouler encore',
    distanceLabel: 'DIST',
    coinsLabel: 'PIÈCES',
    fuelLabel: 'ESSENCE',
    hudDistanceAria: 'Distance',
    hudCoinsAria: 'Pièces collectées',
    hudFuelAria: 'Essence restante',
    crashTitle: 'Accident !',
    crashSub: 'Le véhicule a basculé au-delà du point de récupération et a plongé nez en avant dans le sol.',
    fuelOutTitle: "Panne d'Essence",
    fuelOutSub: 'Le réservoir est à sec et le véhicule a roulé jusqu\'à l\'arrêt.',
    finalDistanceLabel: 'Distance',
    finalCoinsLabel: 'Pièces',
    bestLabel: 'Meilleure distance',
    newBestLine: 'Nouvelle meilleure distance !',
    controlsNote:
      "Tactile : maintenez GAS pour accélérer (le nez se lève), maintenez BRAKE pour ralentir ou reculer (le nez baisse) — les deux boutons font aussi pivoter le véhicule en plein vol, pour se stabiliser avant d'atterrir. Bonus bureau : flèche haut / W pour accélérer, flèche bas / S pour freiner.",
    hint: "Maintenez GAS / BRAKE — pas de volant, le terrain (et l'élan) font le reste",
    btnGasAria: 'Accélérer',
    btnBrakeAria: 'Freiner',
    legendCoin: 'Pièce — ajoute des points',
    legendFuel: "Bidon d'essence — remplit le réservoir",
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
    const stored = localStorage.getItem('ogh_hill_rider_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_hill_rider_lang', lang);
  } catch {
    /* ignore */
  }
}

/** Translate a key, with optional {placeholder} substitution. */
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
