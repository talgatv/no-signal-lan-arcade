/**
 * UN-6 localization for Cart Corral. Text UI follows document direction;
 * the parking lot, minimap, joystick, and physical left/right directions remain
 * spatial gameplay and are deliberately not mirrored by this module.
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
    title: 'Cart Corral',
    blurb: 'Round up all 12 loose shopping carts and park them fully inside the return zone before your shift ends. Mind your stamina—and the parked cars.',
    startBtn: 'Start shift',
    hint: 'Joystick / WASD to move · ACTION / Space to grab or release',
    cartsPrefix: 'Returned',
    loadPrefix: 'Train',
    timePrefix: 'Time',
    staminaLabel: 'Stamina',
    strikesLabel: 'Strikes',
    bestLine: 'Best: {score} pts · {time}',
    grabBtn: 'GRAB CART',
    releaseBtn: 'RELEASE TRAIN',
    noCartBtn: 'NO CART NEARBY',
    paused: 'PAUSED',
    winTitle: 'Corral complete!',
    loseTitle: 'Shift over',
    damageLostTitle: 'Too much damage!',
    timeLostTitle: 'Time’s up!',
    finalWin: 'All 12 carts returned in {time}. Score: {score}.',
    finalLose: '{carts}/12 carts returned. Score: {score}.',
    newBest: 'New best shift!',
    againBtn: 'Work another shift',
    shiftReady: 'Shift ready—round up all 12 carts!',
    grabbed: 'Cart attached',
    trainReleased: 'Train released',
    carHit: 'Car hit—strike!',
    delivered: 'Cart returned!',
    allDelivered: 'All carts returned!',
    dropZoneLabel: 'CART RETURN',
    controlsTitle: 'How to work the lot',
    controlsBody: 'Move with the joystick, WASD, or arrow keys. ACTION / Space grabs the nearest free cart or releases your train. Stop moving to recover stamina.',
    btnActionAria: 'Grab nearest cart or release attached train',
    joystickAria: 'Movement joystick',
    minimapAria: 'Parking lot minimap',
  },
  ru: {
    back: 'Библиотека',
    title: 'Сборщик тележек',
    blurb: 'Собери все 12 тележек и целиком закати их в зону возврата до конца смены. Следи за стаминой и не врезайся в припаркованные машины.',
    startBtn: 'Начать смену',
    hint: 'Джойстик / WASD — движение · ДЕЙСТВИЕ / пробел — прицепить или отпустить',
    cartsPrefix: 'Возвращено',
    loadPrefix: 'В составе',
    timePrefix: 'Время',
    staminaLabel: 'Стамина',
    strikesLabel: 'Страйки',
    bestLine: 'Рекорд: {score} оч. · {time}',
    grabBtn: 'ПРИЦЕПИТЬ',
    releaseBtn: 'ОТПУСТИТЬ СОСТАВ',
    noCartBtn: 'РЯДОМ НЕТ ТЕЛЕЖКИ',
    paused: 'ПАУЗА',
    winTitle: 'Все тележки на месте!',
    loseTitle: 'Смена окончена',
    damageLostTitle: 'Слишком много повреждений!',
    timeLostTitle: 'Время вышло!',
    finalWin: 'Все 12 тележек возвращены за {time}. Счёт: {score}.',
    finalLose: 'Возвращено тележек: {carts}/12. Счёт: {score}.',
    newBest: 'Новый рекорд смены!',
    againBtn: 'Ещё одна смена',
    shiftReady: 'Смена началась — собери все 12 тележек!',
    grabbed: 'Тележка прицеплена',
    trainReleased: 'Состав отпущен',
    carHit: 'Удар по машине — страйк!',
    delivered: 'Тележка возвращена!',
    allDelivered: 'Все тележки возвращены!',
    dropZoneLabel: 'ВОЗВРАТ ТЕЛЕЖЕК',
    controlsTitle: 'Как работать на парковке',
    controlsBody: 'Двигайся джойстиком, WASD или стрелками. ДЕЙСТВИЕ / пробел цепляет ближайшую свободную тележку или отпускает состав. Остановись, чтобы восстановить стамину.',
    btnActionAria: 'Прицепить ближайшую тележку или отпустить состав',
    joystickAria: 'Джойстик движения',
    minimapAria: 'Мини-карта парковки',
  },
  zh: {
    back: '游戏库',
    title: '购物车归位',
    blurb: '在下班前找齐12辆散落的购物车，并将它们完全送进归还区。注意体力，也别撞到停放的汽车。',
    startBtn: '开始值班',
    hint: '摇杆 / WASD 移动 · 操作键 / 空格键挂接或松开',
    cartsPrefix: '已归位',
    loadPrefix: '已挂接',
    timePrefix: '时间',
    staminaLabel: '体力',
    strikesLabel: '撞击',
    bestLine: '最佳：{score} 分 · {time}',
    grabBtn: '挂接购物车',
    releaseBtn: '松开车队',
    noCartBtn: '附近没有购物车',
    paused: '已暂停',
    winTitle: '全部归位！',
    loseTitle: '值班结束',
    damageLostTitle: '车辆损伤过多！',
    timeLostTitle: '时间到！',
    finalWin: '全部12辆购物车已在 {time} 内归位。得分：{score}。',
    finalLose: '已归位 {carts}/12 辆。得分：{score}。',
    newBest: '刷新最佳纪录！',
    againBtn: '再值一班',
    shiftReady: '值班开始——找齐全部12辆购物车！',
    grabbed: '购物车已挂接',
    trainReleased: '车队已松开',
    carHit: '撞到汽车——记一次！',
    delivered: '购物车已归位！',
    allDelivered: '所有购物车均已归位！',
    dropZoneLabel: '购物车归还',
    controlsTitle: '停车场工作指南',
    controlsBody: '使用摇杆、WASD 或方向键移动。操作键 / 空格键可挂接最近的空闲购物车，或松开车队。停下不动即可恢复体力。',
    btnActionAria: '挂接最近的购物车或松开已挂接的车队',
    joystickAria: '移动摇杆',
    minimapAria: '停车场小地图',
  },
  es: {
    back: 'Biblioteca',
    title: 'Corral de Carritos',
    blurb: 'Reúne los 12 carritos sueltos y déjalos completamente dentro de la zona de devolución antes de que termine el turno. Cuida tu resistencia y los coches aparcados.',
    startBtn: 'Empezar turno',
    hint: 'Joystick / WASD para moverte · ACCIÓN / Espacio para enganchar o soltar',
    cartsPrefix: 'Devueltos',
    loadPrefix: 'Tren',
    timePrefix: 'Tiempo',
    staminaLabel: 'Resistencia',
    strikesLabel: 'Golpes',
    bestLine: 'Mejor: {score} ptos. · {time}',
    grabBtn: 'ENGANCHAR CARRITO',
    releaseBtn: 'SOLTAR TREN',
    noCartBtn: 'NO HAY CARRITO CERCA',
    paused: 'PAUSA',
    winTitle: '¡Corral completo!',
    loseTitle: 'Turno terminado',
    damageLostTitle: '¡Demasiados daños!',
    timeLostTitle: '¡Se acabó el tiempo!',
    finalWin: 'Los 12 carritos fueron devueltos en {time}. Puntuación: {score}.',
    finalLose: 'Carritos devueltos: {carts}/12. Puntuación: {score}.',
    newBest: '¡Nuevo récord de turno!',
    againBtn: 'Hacer otro turno',
    shiftReady: '¡Turno listo: reúne los 12 carritos!',
    grabbed: 'Carrito enganchado',
    trainReleased: 'Tren liberado',
    carHit: '¡Golpe al coche!',
    delivered: '¡Carrito devuelto!',
    allDelivered: '¡Todos los carritos devueltos!',
    dropZoneLabel: 'DEVOLUCIÓN',
    controlsTitle: 'Cómo trabajar en el aparcamiento',
    controlsBody: 'Muévete con el joystick, WASD o las flechas. ACCIÓN / Espacio engancha el carrito libre más cercano o suelta tu tren. Detente para recuperar resistencia.',
    btnActionAria: 'Enganchar el carrito más cercano o soltar el tren',
    joystickAria: 'Joystick de movimiento',
    minimapAria: 'Minimapa del aparcamiento',
  },
  ar: {
    back: 'المكتبة',
    title: 'جامع عربات التسوق',
    blurb: 'اجمع عربات التسوق الـ12 المتناثرة وضعها بالكامل داخل منطقة الإرجاع قبل انتهاء الوردية. راقب قدرتك على التحمل وتجنّب السيارات المتوقفة.',
    startBtn: 'ابدأ الوردية',
    hint: 'عصا التحكم / WASD للحركة · زر الإجراء / المسافة للإمساك أو الإفلات',
    cartsPrefix: 'المعادة',
    loadPrefix: 'القطار',
    timePrefix: 'الوقت',
    staminaLabel: 'القدرة',
    strikesLabel: 'الاصطدامات',
    bestLine: 'الأفضل: {score} نقطة · {time}',
    grabBtn: 'أمسك عربة',
    releaseBtn: 'أفلت القطار',
    noCartBtn: 'لا عربة قريبة',
    paused: 'متوقفة مؤقتًا',
    winTitle: 'اكتمل جمع العربات!',
    loseTitle: 'انتهت الوردية',
    damageLostTitle: 'أضرار كثيرة جدًا!',
    timeLostTitle: 'انتهى الوقت!',
    finalWin: 'أُعيدت العربات الـ12 كلها خلال {time}. النتيجة: {score}.',
    finalLose: 'أُعيدت {carts}/12 عربة. النتيجة: {score}.',
    newBest: 'أفضل وردية جديدة!',
    againBtn: 'ابدأ وردية أخرى',
    shiftReady: 'الوردية جاهزة — اجمع العربات الـ12 كلها!',
    grabbed: 'تم ربط العربة',
    trainReleased: 'تم إفلات القطار',
    carHit: 'اصطدمت بسيارة — مخالفة!',
    delivered: 'أُعيدت عربة!',
    allDelivered: 'أُعيدت كل العربات!',
    dropZoneLabel: 'إرجاع العربات',
    controlsTitle: 'طريقة العمل في الموقف',
    controlsBody: 'تحرّك بعصا التحكم أو WASD أو مفاتيح الأسهم. زر الإجراء / المسافة يربط أقرب عربة حرة أو يفلت القطار. توقّف لاستعادة القدرة.',
    btnActionAria: 'ربط أقرب عربة أو إفلات القطار المربوط',
    joystickAria: 'عصا تحكم الحركة',
    minimapAria: 'خريطة مصغرة لموقف السيارات',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Rangement des Chariots',
    blurb: 'Rassemblez les 12 chariots et garez-les entièrement dans la zone de retour avant la fin du service. Surveillez votre endurance et évitez les voitures stationnées.',
    startBtn: 'Prendre son service',
    hint: 'Joystick / WASD pour bouger · ACTION / Espace pour attacher ou libérer',
    cartsPrefix: 'Rangés',
    loadPrefix: 'Convoi',
    timePrefix: 'Temps',
    staminaLabel: 'Endurance',
    strikesLabel: 'Chocs',
    bestLine: 'Record : {score} pts · {time}',
    grabBtn: 'ATTACHER LE CHARIOT',
    releaseBtn: 'LIBÉRER LE CONVOI',
    noCartBtn: 'AUCUN CHARIOT PROCHE',
    paused: 'PAUSE',
    winTitle: 'Tous les chariots sont rangés !',
    loseTitle: 'Service terminé',
    damageLostTitle: 'Trop de dégâts !',
    timeLostTitle: 'Temps écoulé !',
    finalWin: 'Les 12 chariots ont été rangés en {time}. Score : {score}.',
    finalLose: 'Chariots rangés : {carts}/12. Score : {score}.',
    newBest: 'Nouveau record de service !',
    againBtn: 'Reprendre un service',
    shiftReady: 'Service prêt — rassemblez les 12 chariots !',
    grabbed: 'Chariot attaché',
    trainReleased: 'Convoi libéré',
    carHit: 'Voiture heurtée — un choc !',
    delivered: 'Chariot rangé !',
    allDelivered: 'Tous les chariots sont rangés !',
    dropZoneLabel: 'RETOUR CHARIOTS',
    controlsTitle: 'Travailler sur le parking',
    controlsBody: 'Déplacez-vous avec le joystick, WASD ou les flèches. ACTION / Espace attache le chariot libre le plus proche ou libère le convoi. Arrêtez-vous pour récupérer votre endurance.',
    btnActionAria: 'Attacher le chariot le plus proche ou libérer le convoi',
    joystickAria: 'Joystick de déplacement',
    minimapAria: 'Mini-carte du parking',
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
  const queryLang = qs('lang');
  if (queryLang && STRINGS[queryLang]) return queryLang;
  try {
    const stored = localStorage.getItem('ogh_cart_corral_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* local storage may be unavailable */ }
  const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[browserLang] ? browserLang : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_cart_corral_lang', lang);
  } catch { /* ignore unavailable storage */ }
}

/** Translate a key, optionally replacing {named} placeholders. */
export function t(lang, key, vars) {
  const dictionary = STRINGS[lang] || STRINGS.en;
  let value = dictionary[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
  }
  return value;
}

export function applyStaticStrings(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    const key = element.getAttribute('data-i18n-title');
    element.title = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria');
    element.setAttribute('aria-label', t(lang, key));
  });
}
