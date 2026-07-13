/**
 * i18n — small string table for Neon Drift.
 * Mirrors the pattern used by games/pop-the-bugs/client/i18n.js: a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 *
 * RTL note: applyStaticStrings() flips document.documentElement.dir for
 * Arabic, which is correct for text chrome (HUD pills, overlay cards,
 * back link). It must NOT affect the game canvas, the track/minimap
 * rendering (both drawn in fixed world/canvas-pixel space, immune to CSS
 * dir), or the on-screen steer/gas/brake buttons (kept literal-LTR via
 * `direction: ltr` in style.css on .nd-controls, since left/right there is
 * a spatial control mapping, not text — same risk category as the
 * games/music-synth piano-key-order bug called out in the design brief).
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
    title: 'Neon Drift',
    blurb: 'A real circuit — hairpin, chicane, sweepers. Drift corners for a speed boost, bump rivals off your line. You + AI now; LAN-ready next.',
    aiLabel: 'AI rivals',
    lapsLabel: 'Laps',
    startBtn: 'Race',
    netOfflineBlurb: 'No host /ws yet — racing offline with AI. Same game will use LAN when core runs.',
    netOnlineBlurb: 'Host WebSocket found — multiplayer path active (core may still be relay-only).',
    netChecking: 'Network: checking…',
    hudOffline: 'OFFLINE',
    hudOnline: 'ONLINE',
    lapPrefix: 'LAP',
    speedLabel: 'SPD',
    goText: 'GO',
    driftBoost: 'DRIFT +{n}',
    finishTitle: 'Race over',
    finishedLine: 'Finished P{place} of {total}',
    standingsLabel: 'Standings',
    againBtn: 'Race again',
    gasLabel: 'GAS',
    brakeLabel: 'BRK',
    lapAria: 'Current lap',
    posAria: 'Current position',
    speedAria: 'Speed',
    netAria: 'Network status',
  },
  ru: {
    back: 'Библиотека',
    title: 'Неоновый Дрифт',
    blurb: 'Настоящая трасса — шпилька, шикана, свипер-повороты. Дрифти в поворотах ради ускорения, толкай соперников с траектории. Сейчас offline с AI, дальше — LAN.',
    aiLabel: 'Соперники AI',
    lapsLabel: 'Круги',
    startBtn: 'Гонка',
    netOfflineBlurb: 'Хост /ws не найден — гонка offline с AI. При запуске хоста заработает LAN.',
    netOnlineBlurb: 'Найден WebSocket хоста — путь мультиплеера активен (ядро может быть только релеем).',
    netChecking: 'Сеть: проверка…',
    hudOffline: 'ОФЛАЙН',
    hudOnline: 'ОНЛАЙН',
    lapPrefix: 'КРУГ',
    speedLabel: 'СКОР',
    goText: 'СТАРТ!',
    driftBoost: 'ДРИФТ +{n}',
    finishTitle: 'Гонка окончена',
    finishedLine: 'Финиш: P{place} из {total}',
    standingsLabel: 'Итоги',
    againBtn: 'Ещё раз',
    gasLabel: 'ГАЗ',
    brakeLabel: 'ТОРМ',
    lapAria: 'Текущий круг',
    posAria: 'Текущая позиция',
    speedAria: 'Скорость',
    netAria: 'Статус сети',
  },
  zh: {
    back: '资料库',
    title: '霓虹漂移',
    blurb: '真正的赛道——发夹弯、连续弯、大扫弯。过弯漂移可获得加速，冲撞对手抢占路线。现在离线对战AI，未来支持局域网联机。',
    aiLabel: 'AI 对手',
    lapsLabel: '圈数',
    startBtn: '开始比赛',
    netOfflineBlurb: '尚未发现主机 /ws——离线对战AI。主机运行后将自动切换到局域网。',
    netOnlineBlurb: '已发现主机 WebSocket——多人模式路径已激活（核心可能仅作中继）。',
    netChecking: '网络：检测中…',
    hudOffline: '离线',
    hudOnline: '在线',
    lapPrefix: '圈',
    speedLabel: '速度',
    goText: '出发！',
    driftBoost: '漂移 +{n}',
    finishTitle: '比赛结束',
    finishedLine: '完赛：第{place}名，共{total}名',
    standingsLabel: '排名',
    againBtn: '再来一局',
    gasLabel: '油门',
    brakeLabel: '刹车',
    lapAria: '当前圈数',
    posAria: '当前名次',
    speedAria: '速度',
    netAria: '网络状态',
  },
  es: {
    back: 'Biblioteca',
    title: 'Drift de Neón',
    blurb: 'Un circuito de verdad — horquilla, chicane, curvas rápidas. Derrapa en las curvas para ganar impulso y golpea a tus rivales fuera de la línea. Ahora offline contra la IA; listo para LAN.',
    aiLabel: 'Rivales IA',
    lapsLabel: 'Vueltas',
    startBtn: 'Correr',
    netOfflineBlurb: 'Aún no hay host /ws — corriendo offline con IA. Usará LAN cuando el host esté activo.',
    netOnlineBlurb: 'WebSocket del host encontrado — ruta multijugador activa (el núcleo puede ser solo de retransmisión).',
    netChecking: 'Red: comprobando…',
    hudOffline: 'SIN CONEXIÓN',
    hudOnline: 'EN LÍNEA',
    lapPrefix: 'VUELTA',
    speedLabel: 'VEL',
    goText: '¡YA!',
    driftBoost: 'DRIFT +{n}',
    finishTitle: 'Carrera terminada',
    finishedLine: 'Meta: P{place} de {total}',
    standingsLabel: 'Clasificación',
    againBtn: 'Otra vez',
    gasLabel: 'GAS',
    brakeLabel: 'FREN',
    lapAria: 'Vuelta actual',
    posAria: 'Posición actual',
    speedAria: 'Velocidad',
    netAria: 'Estado de la red',
  },
  ar: {
    back: 'المكتبة',
    title: 'درفت نيون',
    blurb: 'حلبة حقيقية — منعطف حاد وشيكين ومنحنيات سريعة. ادرِفت في المنعطفات لتكسب دفعة سرعة، وادفع منافسيك خارج خط السباق. الآن أوفلاين ضد الذكاء الاصطناعي، وجاهزة للشبكة المحلية لاحقًا.',
    aiLabel: 'منافسو الذكاء الاصطناعي',
    lapsLabel: 'اللفات',
    startBtn: 'انطلق',
    netOfflineBlurb: 'لا يوجد مضيف /ws بعد — السباق أوفلاين مع الذكاء الاصطناعي. سيعمل عبر الشبكة المحلية عند تشغيل المضيف.',
    netOnlineBlurb: 'تم العثور على WebSocket للمضيف — مسار اللعب الجماعي نشط (قد يكون النواة تناقلًا فقط).',
    netChecking: 'الشبكة: جارٍ الفحص…',
    hudOffline: 'غير متصل',
    hudOnline: 'متصل',
    lapPrefix: 'اللفة',
    speedLabel: 'سرعة',
    goText: 'انطلق!',
    driftBoost: 'درفت +{n}',
    finishTitle: 'انتهى السباق',
    finishedLine: 'الوصول: المركز {place} من {total}',
    standingsLabel: 'الترتيب',
    againBtn: 'العب مرة أخرى',
    gasLabel: 'غاز',
    brakeLabel: 'كبح',
    lapAria: 'اللفة الحالية',
    posAria: 'المركز الحالي',
    speedAria: 'السرعة',
    netAria: 'حالة الشبكة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Drift Néon',
    blurb: "Un vrai circuit — épingle, chicane, virages rapides. Dérivez dans les virages pour gagner un boost, poussez vos rivaux hors de votre trajectoire. Hors ligne contre l'IA pour l'instant, prêt pour le LAN ensuite.",
    aiLabel: 'Rivaux IA',
    lapsLabel: 'Tours',
    startBtn: 'Course',
    netOfflineBlurb: "Pas encore d'hôte /ws — course hors ligne avec l'IA. Passera en LAN quand l'hôte tournera.",
    netOnlineBlurb: "WebSocket hôte trouvé — mode multijoueur actif (le noyau peut n'être qu'un relais).",
    netChecking: 'Réseau : vérification…',
    hudOffline: 'HORS LIGNE',
    hudOnline: 'EN LIGNE',
    lapPrefix: 'TOUR',
    speedLabel: 'VIT',
    goText: 'PARTEZ !',
    driftBoost: 'DRIFT +{n}',
    finishTitle: 'Course terminée',
    finishedLine: 'Arrivée : P{place} sur {total}',
    standingsLabel: 'Classement',
    againBtn: 'Rejouer',
    gasLabel: 'GAZ',
    brakeLabel: 'FREIN',
    lapAria: 'Tour actuel',
    posAria: 'Position actuelle',
    speedAria: 'Vitesse',
    netAria: 'État du réseau',
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
    const stored = localStorage.getItem('ogh_nd_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_nd_lang', lang);
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
