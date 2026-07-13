/**
 * i18n — small string table for Music Synth.
 * Mirrors the pattern used by games/programs/video-convert/client/i18n.js and
 * games/programs/speech-tools/client/i18n.js.
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
    title: 'Music Synth',
    tagline: 'A procedural synth keyboard — no samples, just oscillators.',

    instPiano: 'Piano',
    instKalimba: 'Kalimba',
    instOrgan: 'Organ',
    instBells: 'Bells',
    instLead: 'Lead',
    instBass: 'Bass',

    octaveLabel: 'Octave',
    octDownAria: 'Shift octave down (Z)',
    octUpAria: 'Shift octave up (X)',
    volumeLabel: 'Volume',
    reverbLabel: 'Reverb',

    hint: 'Play with touch or mouse, or A S D F G H J K · W E T Y U · Z/X shifts octave',
    audioUnsupported: "This browser doesn't support the Web Audio API — no sound is possible here.",
  },
  ru: {
    back: 'Библиотека',
    title: 'Синтезатор',
    tagline: 'Процедурная синт-клавиатура — без сэмплов, только осцилляторы.',

    instPiano: 'Пианино',
    instKalimba: 'Калимба',
    instOrgan: 'Орган',
    instBells: 'Колокольчики',
    instLead: 'Лид',
    instBass: 'Бас',

    octaveLabel: 'Октава',
    octDownAria: 'Октава вниз (Z)',
    octUpAria: 'Октава вверх (X)',
    volumeLabel: 'Громкость',
    reverbLabel: 'Реверберация',

    hint: 'Играй пальцем или мышью, либо A S D F G H J K · W E T Y U · Z/X — смена октавы',
    audioUnsupported: 'Этот браузер не поддерживает Web Audio API — звук здесь невозможен.',
  },
  zh: {
    back: '库',
    title: '音乐合成器',
    tagline: '程序化合成键盘——没有采样，只有振荡器。',

    instPiano: '钢琴',
    instKalimba: '卡林巴琴',
    instOrgan: '管风琴',
    instBells: '钟琴',
    instLead: '主音',
    instBass: '贝斯',

    octaveLabel: '八度',
    octDownAria: '降低八度 (Z)',
    octUpAria: '升高八度 (X)',
    volumeLabel: '音量',
    reverbLabel: '混响',

    hint: '用触摸或鼠标演奏，或按 A S D F G H J K · W E T Y U · Z/X 切换八度',
    audioUnsupported: '此浏览器不支持 Web Audio API——此处无法发声。',
  },
  es: {
    back: 'Biblioteca',
    title: 'Sintetizador',
    tagline: 'Teclado sintetizador procedural — sin muestras, solo osciladores.',

    instPiano: 'Piano',
    instKalimba: 'Kalimba',
    instOrgan: 'Órgano',
    instBells: 'Campanas',
    instLead: 'Lead',
    instBass: 'Bajo',

    octaveLabel: 'Octava',
    octDownAria: 'Bajar una octava (Z)',
    octUpAria: 'Subir una octava (X)',
    volumeLabel: 'Volumen',
    reverbLabel: 'Reverberación',

    hint: 'Toca con el dedo o el ratón, o con A S D F G H J K · W E T Y U · Z/X cambia de octava',
    audioUnsupported: 'Este navegador no admite la API Web Audio — aquí no es posible el sonido.',
  },
  ar: {
    back: 'المكتبة',
    title: 'آلة التركيب الموسيقي',
    tagline: 'لوحة مفاتيح توليفية إجرائية — بلا عيّنات صوتية، أوسيلاتورات فقط.',

    instPiano: 'بيانو',
    instKalimba: 'كاليمبا',
    instOrgan: 'أرغن',
    instBells: 'أجراس',
    instLead: 'ليد',
    instBass: 'باص',

    octaveLabel: 'الأوكتاف',
    octDownAria: 'خفض الأوكتاف (Z)',
    octUpAria: 'رفع الأوكتاف (X)',
    volumeLabel: 'مستوى الصوت',
    reverbLabel: 'الصدى',

    hint: 'اعزف باللمس أو الفأرة، أو A S D F G H J K · W E T Y U · وZ/X لتغيير الأوكتاف',
    audioUnsupported: 'هذا المتصفح لا يدعم Web Audio API — لا يمكن إصدار صوت هنا.',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Synthétiseur',
    tagline: 'Clavier synthé procédural — sans échantillons, uniquement des oscillateurs.',

    instPiano: 'Piano',
    instKalimba: 'Kalimba',
    instOrgan: 'Orgue',
    instBells: 'Cloches',
    instLead: 'Lead',
    instBass: 'Basse',

    octaveLabel: 'Octave',
    octDownAria: 'Octave inférieure (Z)',
    octUpAria: 'Octave supérieure (X)',
    volumeLabel: 'Volume',
    reverbLabel: 'Réverbération',

    hint: 'Jouez au doigt ou à la souris, ou avec A S D F G H J K · W E T Y U · Z/X change d’octave',
    audioUnsupported: "Ce navigateur ne prend pas en charge l'API Web Audio — aucun son n'est possible ici.",
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
    const stored = localStorage.getItem('ogh_ms_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_ms_lang', lang);
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
