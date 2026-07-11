/**
 * i18n — small string table for Flashlight.
 * Mirrors the pattern used by programs/speech-tools/client/i18n.js: a flat
 * STRINGS table per UN-6 language, a couple of detect/apply helpers, no
 * framework. This app has very little text (two buttons, one disclaimer,
 * one optional note), so the table stays short.
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
    title: 'Flashlight',
    tagline: 'A plain white screen — the classic phone-flashlight trick',
    langLabel: 'Language',

    turnOnBtn: 'Turn on',
    sosBtn: 'SOS',
    sosStopBtn: 'Stop SOS',

    brightnessNote: "This can't change your device's actual screen-brightness setting — it just fills the screen with white. Turn your device's own brightness all the way up for the brightest effect.",
    wakeNoteUnsupported: "This browser can't automatically keep the screen from timing out — you may want to check your device's screen-timeout setting.",
  },
  ru: {
    back: 'Библиотека',
    title: 'Фонарик',
    tagline: 'Просто белый экран — классический трюк с фонариком из телефона',
    langLabel: 'Язык',

    turnOnBtn: 'Включить',
    sosBtn: 'SOS',
    sosStopBtn: 'Остановить SOS',

    brightnessNote: 'Это не меняет реальную настройку яркости экрана вашего устройства — экран просто заливается белым цветом. Для максимального эффекта увеличьте яркость экрана в настройках самого устройства.',
    wakeNoteUnsupported: 'Этот браузер не может автоматически не давать экрану гаснуть — возможно, стоит проверить настройку тайм-аута экрана на вашем устройстве.',
  },
  zh: {
    back: '资料库',
    title: '手电筒',
    tagline: '纯白屏幕——经典的手机手电筒把戏',
    langLabel: '语言',

    turnOnBtn: '打开',
    sosBtn: 'SOS',
    sosStopBtn: '停止 SOS',

    brightnessNote: '这不会改变设备实际的屏幕亮度设置——它只是把屏幕填充为白色。请自行把设备亮度调到最高以获得最佳效果。',
    wakeNoteUnsupported: '此浏览器无法自动防止屏幕超时熄灭——你可能需要检查一下设备自身的屏幕超时设置。',
  },
  es: {
    back: 'Biblioteca',
    title: 'Linterna',
    tagline: 'Una pantalla blanca lisa — el truco clásico de linterna del móvil',
    langLabel: 'Idioma',

    turnOnBtn: 'Encender',
    sosBtn: 'SOS',
    sosStopBtn: 'Detener SOS',

    brightnessNote: 'Esto no cambia el ajuste real de brillo de pantalla de tu dispositivo — solo llena la pantalla de blanco. Sube al máximo el brillo de tu propio dispositivo para conseguir el mejor efecto.',
    wakeNoteUnsupported: 'Este navegador no puede evitar automáticamente que la pantalla se apague por inactividad — quizá quieras revisar el ajuste de tiempo de espera de pantalla de tu dispositivo.',
  },
  ar: {
    back: 'المكتبة',
    title: 'المصباح اليدوي',
    tagline: 'شاشة بيضاء بسيطة — الحيلة الكلاسيكية لمصباح الهاتف',
    langLabel: 'اللغة',

    turnOnBtn: 'تشغيل',
    sosBtn: 'SOS',
    sosStopBtn: 'إيقاف SOS',

    brightnessNote: 'هذا لا يغيّر إعداد سطوع الشاشة الفعلي لجهازك — إنه فقط يملأ الشاشة باللون الأبيض. ارفع سطوع جهازك بنفسك إلى أقصى درجة للحصول على أفضل تأثير.',
    wakeNoteUnsupported: 'لا يستطيع هذا المتصفح منع انطفاء الشاشة تلقائيًا بسبب عدم النشاط — قد ترغب في التحقق من إعداد مهلة الشاشة في جهازك.',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Lampe torche',
    tagline: 'Un écran blanc tout simple — l’astuce classique de lampe torche du téléphone',
    langLabel: 'Langue',

    turnOnBtn: 'Allumer',
    sosBtn: 'SOS',
    sosStopBtn: 'Arrêter SOS',

    brightnessNote: "Ceci ne modifie pas le réglage réel de luminosité de votre appareil — l'écran est simplement rempli de blanc. Augmentez vous-même la luminosité de votre appareil au maximum pour un meilleur effet.",
    wakeNoteUnsupported: "Ce navigateur ne peut pas empêcher automatiquement la mise en veille de l'écran — vous voudrez peut-être vérifier le réglage de mise en veille de votre appareil.",
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
    const stored = localStorage.getItem('ogh_fl_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_fl_lang', lang);
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
