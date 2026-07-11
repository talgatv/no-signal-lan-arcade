/**
 * i18n — small string table for Media Player.
 * Mirrors the pattern used by programs/video-convert/client/i18n.js
 * (itself mirroring programs/p2p-share/client/i18n.js), scoped to this
 * program's own UI strings.
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
    // header
    back: 'Library',
    title: 'Media Player',
    tagline: 'Private · in-browser · no uploads',
    langLabel: 'Language',

    // drop zone
    pickBtn: 'Choose file(s)',
    dropHint: 'or drag & drop here',
    dropSub: 'Video or audio — plays whatever your browser can decode, processed locally, never uploaded',

    // control titles / keyboard-hint tooltips
    playTitle: 'Play (Space)',
    pauseTitle: 'Pause (Space)',
    prevTitle: 'Previous track',
    nextTitle: 'Next track',
    loopTitle: 'Repeat track',
    loopOnTitle: 'Repeat: on',
    muteTitle: 'Mute (M)',
    unmuteTitle: 'Unmute (M)',
    fullscreenTitle: 'Fullscreen (F)',
    exitFullscreenTitle: 'Exit fullscreen (F)',
    volumeTitle: 'Volume (↑ / ↓)',
    seekTitle: 'Seek (← / →)',
    rateTitle: 'Playback speed',
    kbdHint: 'Space play/pause · ←/→ seek 5s · ↑/↓ volume · F fullscreen · M mute',

    // playlist
    playlistHeading: 'Playlist',
    addMoreBtn: '+ Add files',
    removeTitle: 'Remove from playlist',
    addSubtitleTitle: 'Attach subtitles (.vtt)',
    playRowTitle: 'Play this track',
    probeWarn: 'this browser may not support this format',

    // errors (mapped from HTMLMediaElement.error.code)
    err_aborted: 'Loading {name} was interrupted.',
    err_network: 'A network error interrupted loading {name}.',
    err_decode: '{name} could not be decoded — the file may be corrupt or use an unsupported codec.',
    err_unsupported: "This browser can't decode {name} — the container or codec isn't supported here.",
    err_unknown: 'Something went wrong while playing {name}.',
    errorDismiss: 'Dismiss',

    // toasts
    toastSubtitleAttached: 'Subtitles attached to {name}.',
    toastFullscreenFailed: "Fullscreen isn't available right now.",
    toastFullscreenUnsupported: "This browser doesn't support fullscreen.",
    toastPlayBlocked: "Playback didn't start automatically — tap play.",
  },
  ru: {
    back: 'Библиотека',
    title: 'Медиаплеер',
    tagline: 'Приватно · прямо в браузере · без загрузок',
    langLabel: 'Язык',

    pickBtn: 'Выбрать файл(ы)',
    dropHint: 'или перетащите сюда',
    dropSub: 'Видео или аудио — воспроизводится всё, что умеет декодировать ваш браузер; всё локально, ничего не загружается',

    playTitle: 'Воспроизвести (Пробел)',
    pauseTitle: 'Пауза (Пробел)',
    prevTitle: 'Предыдущий трек',
    nextTitle: 'Следующий трек',
    loopTitle: 'Повтор трека',
    loopOnTitle: 'Повтор: включён',
    muteTitle: 'Выключить звук (M)',
    unmuteTitle: 'Включить звук (M)',
    fullscreenTitle: 'Полный экран (F)',
    exitFullscreenTitle: 'Выйти из полноэкранного режима (F)',
    volumeTitle: 'Громкость (↑ / ↓)',
    seekTitle: 'Перемотка (← / →)',
    rateTitle: 'Скорость воспроизведения',
    kbdHint: 'Пробел — play/pause · ←/→ — перемотка на 5с · ↑/↓ — громкость · F — полный экран · M — без звука',

    playlistHeading: 'Плейлист',
    addMoreBtn: '+ Добавить файлы',
    removeTitle: 'Убрать из плейлиста',
    addSubtitleTitle: 'Прикрепить субтитры (.vtt)',
    playRowTitle: 'Воспроизвести этот трек',
    probeWarn: 'этот браузер может не поддерживать данный формат',

    err_aborted: 'Загрузка {name} была прервана.',
    err_network: 'Сетевая ошибка прервала загрузку {name}.',
    err_decode: 'Не удалось декодировать {name} — файл может быть повреждён или использует неподдерживаемый кодек.',
    err_unsupported: 'Этот браузер не может декодировать {name} — контейнер или кодек здесь не поддерживаются.',
    err_unknown: 'Что-то пошло не так при воспроизведении {name}.',
    errorDismiss: 'Закрыть',

    toastSubtitleAttached: 'Субтитры прикреплены к {name}.',
    toastFullscreenFailed: 'Полноэкранный режим сейчас недоступен.',
    toastFullscreenUnsupported: 'Этот браузер не поддерживает полноэкранный режим.',
    toastPlayBlocked: 'Воспроизведение не началось автоматически — нажмите play.',
  },
  zh: {
    back: '库',
    title: '媒体播放器',
    tagline: '隐私 · 浏览器本地处理 · 无需上传',
    langLabel: '语言',

    pickBtn: '选择文件',
    dropHint: '或将文件拖到此处',
    dropSub: '视频或音频——只要浏览器能解码就能播放；全部本地处理，绝不上传',

    playTitle: '播放（空格）',
    pauseTitle: '暂停（空格）',
    prevTitle: '上一曲',
    nextTitle: '下一曲',
    loopTitle: '单曲循环',
    loopOnTitle: '循环：开启',
    muteTitle: '静音（M）',
    unmuteTitle: '取消静音（M）',
    fullscreenTitle: '全屏（F）',
    exitFullscreenTitle: '退出全屏（F）',
    volumeTitle: '音量（↑ / ↓）',
    seekTitle: '快进快退（← / →）',
    rateTitle: '播放速度',
    kbdHint: '空格 播放/暂停 · ←/→ 快退/快进 5 秒 · ↑/↓ 音量 · F 全屏 · M 静音',

    playlistHeading: '播放列表',
    addMoreBtn: '+ 添加文件',
    removeTitle: '从播放列表移除',
    addSubtitleTitle: '添加字幕（.vtt）',
    playRowTitle: '播放此曲目',
    probeWarn: '此浏览器可能不支持该格式',

    err_aborted: '加载 {name} 已中断。',
    err_network: '网络错误中断了 {name} 的加载。',
    err_decode: '无法解码 {name}——文件可能已损坏，或使用了不受支持的编码格式。',
    err_unsupported: '此浏览器无法解码 {name}——该封装格式或编码器在此不受支持。',
    err_unknown: '播放 {name} 时出了点问题。',
    errorDismiss: '关闭',

    toastSubtitleAttached: '字幕已添加到 {name}。',
    toastFullscreenFailed: '目前无法进入全屏。',
    toastFullscreenUnsupported: '此浏览器不支持全屏。',
    toastPlayBlocked: '未能自动开始播放——请点击播放。',
  },
  es: {
    back: 'Biblioteca',
    title: 'Reproductor multimedia',
    tagline: 'Privado · en el navegador · sin subidas',
    langLabel: 'Idioma',

    pickBtn: 'Elegir archivo(s)',
    dropHint: 'o arrástralos aquí',
    dropSub: 'Vídeo o audio — reproduce lo que tu navegador pueda decodificar; todo se procesa localmente, nunca se sube',

    playTitle: 'Reproducir (Espacio)',
    pauseTitle: 'Pausa (Espacio)',
    prevTitle: 'Pista anterior',
    nextTitle: 'Pista siguiente',
    loopTitle: 'Repetir pista',
    loopOnTitle: 'Repetir: activado',
    muteTitle: 'Silenciar (M)',
    unmuteTitle: 'Activar sonido (M)',
    fullscreenTitle: 'Pantalla completa (F)',
    exitFullscreenTitle: 'Salir de pantalla completa (F)',
    volumeTitle: 'Volumen (↑ / ↓)',
    seekTitle: 'Buscar (← / →)',
    rateTitle: 'Velocidad de reproducción',
    kbdHint: 'Espacio reproducir/pausa · ←/→ buscar 5s · ↑/↓ volumen · F pantalla completa · M silenciar',

    playlistHeading: 'Lista de reproducción',
    addMoreBtn: '+ Añadir archivos',
    removeTitle: 'Quitar de la lista',
    addSubtitleTitle: 'Adjuntar subtítulos (.vtt)',
    playRowTitle: 'Reproducir esta pista',
    probeWarn: 'es posible que este navegador no admita este formato',

    err_aborted: 'La carga de {name} se interrumpió.',
    err_network: 'Un error de red interrumpió la carga de {name}.',
    err_decode: 'No se pudo decodificar {name} — el archivo puede estar dañado o usar un códec no compatible.',
    err_unsupported: 'Este navegador no puede decodificar {name} — el contenedor o el códec no son compatibles aquí.',
    err_unknown: 'Algo salió mal al reproducir {name}.',
    errorDismiss: 'Cerrar',

    toastSubtitleAttached: 'Subtítulos adjuntados a {name}.',
    toastFullscreenFailed: 'La pantalla completa no está disponible ahora mismo.',
    toastFullscreenUnsupported: 'Este navegador no admite pantalla completa.',
    toastPlayBlocked: 'La reproducción no se inició automáticamente — toca reproducir.',
  },
  ar: {
    back: 'المكتبة',
    title: 'مشغل الوسائط',
    tagline: 'خاص · داخل المتصفح · بلا رفع ملفات',
    langLabel: 'اللغة',

    pickBtn: 'اختر ملفًا (أو أكثر)',
    dropHint: 'أو اسحبها وأفلتها هنا',
    dropSub: 'فيديو أو صوت — يشغّل أي شيء يستطيع متصفحك فك ترميزه؛ يُعالَج محليًا بالكامل، ولا يُرفع أبدًا',

    playTitle: 'تشغيل (مسافة)',
    pauseTitle: 'إيقاف مؤقت (مسافة)',
    prevTitle: 'المقطع السابق',
    nextTitle: 'المقطع التالي',
    loopTitle: 'تكرار المقطع',
    loopOnTitle: 'التكرار: مفعّل',
    muteTitle: 'كتم الصوت (M)',
    unmuteTitle: 'إلغاء كتم الصوت (M)',
    fullscreenTitle: 'ملء الشاشة (F)',
    exitFullscreenTitle: 'الخروج من ملء الشاشة (F)',
    volumeTitle: 'مستوى الصوت (↑ / ↓)',
    seekTitle: 'تقديم/ترجيع (← / →)',
    rateTitle: 'سرعة التشغيل',
    kbdHint: 'مسافة تشغيل/إيقاف · ←/→ تقديم/ترجيع 5 ثوانٍ · ↑/↓ الصوت · F ملء الشاشة · M كتم',

    playlistHeading: 'قائمة التشغيل',
    addMoreBtn: '+ إضافة ملفات',
    removeTitle: 'إزالة من القائمة',
    addSubtitleTitle: 'إرفاق ترجمة (.vtt)',
    playRowTitle: 'تشغيل هذا المقطع',
    probeWarn: 'قد لا يدعم هذا المتصفح هذه الصيغة',

    err_aborted: 'تم مقاطعة تحميل {name}.',
    err_network: 'قطع خطأ في الشبكة تحميل {name}.',
    err_decode: 'تعذّر فك ترميز {name} — قد يكون الملف تالفًا أو يستخدم ترميزًا غير مدعوم.',
    err_unsupported: 'هذا المتصفح غير قادر على فك ترميز {name} — الحاوية أو الترميز غير مدعومين هنا.',
    err_unknown: 'حدث خطأ ما أثناء تشغيل {name}.',
    errorDismiss: 'إغلاق',

    toastSubtitleAttached: 'تم إرفاق الترجمة بـ {name}.',
    toastFullscreenFailed: 'وضع ملء الشاشة غير متاح الآن.',
    toastFullscreenUnsupported: 'هذا المتصفح لا يدعم ملء الشاشة.',
    toastPlayBlocked: 'لم يبدأ التشغيل تلقائيًا — اضغط تشغيل.',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Lecteur multimédia',
    tagline: 'Privé · dans le navigateur · aucun envoi',
    langLabel: 'Langue',

    pickBtn: 'Choisir des fichiers',
    dropHint: 'ou glissez-déposez ici',
    dropSub: "Vidéo ou audio — lit tout ce que votre navigateur sait décoder ; traitement 100% local, jamais envoyé",

    playTitle: 'Lecture (Espace)',
    pauseTitle: 'Pause (Espace)',
    prevTitle: 'Piste précédente',
    nextTitle: 'Piste suivante',
    loopTitle: 'Répéter la piste',
    loopOnTitle: 'Répétition : activée',
    muteTitle: 'Couper le son (M)',
    unmuteTitle: 'Réactiver le son (M)',
    fullscreenTitle: 'Plein écran (F)',
    exitFullscreenTitle: 'Quitter le plein écran (F)',
    volumeTitle: 'Volume (↑ / ↓)',
    seekTitle: 'Avancer/reculer (← / →)',
    rateTitle: 'Vitesse de lecture',
    kbdHint: 'Espace lecture/pause · ←/→ avancer/reculer 5 s · ↑/↓ volume · F plein écran · M muet',

    playlistHeading: 'Liste de lecture',
    addMoreBtn: '+ Ajouter des fichiers',
    removeTitle: 'Retirer de la liste',
    addSubtitleTitle: 'Ajouter des sous-titres (.vtt)',
    playRowTitle: 'Lire cette piste',
    probeWarn: 'ce navigateur ne prend peut-être pas en charge ce format',

    err_aborted: 'Le chargement de {name} a été interrompu.',
    err_network: 'Une erreur réseau a interrompu le chargement de {name}.',
    err_decode: "Impossible de décoder {name} — le fichier est peut-être corrompu ou utilise un codec non pris en charge.",
    err_unsupported: "Ce navigateur ne peut pas décoder {name} — le conteneur ou le codec n'est pas pris en charge ici.",
    err_unknown: "Une erreur s'est produite pendant la lecture de {name}.",
    errorDismiss: 'Fermer',

    toastSubtitleAttached: 'Sous-titres ajoutés à {name}.',
    toastFullscreenFailed: "Le plein écran n'est pas disponible pour le moment.",
    toastFullscreenUnsupported: 'Ce navigateur ne prend pas en charge le plein écran.',
    toastPlayBlocked: "La lecture n'a pas démarré automatiquement — appuyez sur lecture.",
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
    const stored = localStorage.getItem('ogh_mp_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_mp_lang', lang);
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
