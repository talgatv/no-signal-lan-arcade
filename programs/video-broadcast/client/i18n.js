/**
 * i18n — small string table for Video Broadcast.
 * Mirrors the pattern used by games/catalog/games.json (per-language maps),
 * scoped to this program's own UI strings. Shape mirrors
 * programs/p2p-share/client/i18n.js exactly.
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
    title: 'Video Broadcast',
    tagline: 'Live camera and mic, straight between browsers — full mesh, no media server.',
    back: 'Library',
    online: 'ONLINE',
    offline: 'OFFLINE',
    offlineHint: 'Start the PC host (./start.sh) to broadcast over the LAN.',
    room: 'Room',
    you: 'you',
    host: 'host',
    langLabel: 'Language',
    peerIdle: 'idle',
    peerConnecting: 'connecting…',
    peerConnected: 'connected',
    peerFailed: 'failed',
    peerClosed: 'disconnected',
    roomHeading: 'In this room',
    noPeers: 'No one else here yet',
    gridEmptyHint: 'No one is broadcasting yet. Tap Start broadcasting to go live.',
    startBroadcast: 'Start broadcasting',
    stopBroadcast: 'Stop broadcasting',
    starting: 'Starting camera…',
    mute: 'Mute',
    unmute: 'Unmute',
    cameraOff: 'Camera off',
    cameraOn: 'Camera on',
    flipCamera: 'Flip camera',
    mutedBadge: 'Muted',
    cameraOffBadge: 'Camera off',
    insecureMsg:
      "Camera/mic access needs a secure connection. This page is loaded over plain HTTP on your LAN, so the browser blocks it. Ask the host to enable HTTPS (pc/host.py --https or the Android host's HTTPS toggle), or use this page directly on the host device (localhost).",
    permissionDeniedMsg:
      'Camera/mic access was denied. Allow camera and microphone access for this site in your browser settings, then try again.',
    noDeviceMsg: 'No camera or microphone was found on this device.',
    deviceBusyMsg: 'The camera or microphone is already in use by another app or browser tab. Close it and try again.',
    genericMediaErrorMsg: "Couldn't access the camera/microphone ({error}).",
    webrtcUnsupported: "WebRTC isn't supported in this browser.",
    privacyHint:
      'Video and audio go directly between browsers over your LAN. The host only ever relays small connection-setup and status messages — never your camera or microphone.',
  },
  ru: {
    title: 'Видеотрансляция',
    tagline: 'Камера и микрофон — напрямую между браузерами, полносвязная сеть без сервера трансляции.',
    back: 'Библиотека',
    online: 'ОНЛАЙН',
    offline: 'ОФЛАЙН',
    offlineHint: 'Запустите PC-хост (./start.sh), чтобы транслировать по LAN.',
    room: 'Комната',
    you: 'вы',
    host: 'хост',
    langLabel: 'Язык',
    peerIdle: 'ожидание',
    peerConnecting: 'соединение…',
    peerConnected: 'подключено',
    peerFailed: 'ошибка',
    peerClosed: 'отключено',
    roomHeading: 'В этой комнате',
    noPeers: 'Пока никого нет',
    gridEmptyHint: 'Пока никто не транслирует. Нажмите «Начать трансляцию», чтобы выйти в эфир.',
    startBroadcast: 'Начать трансляцию',
    stopBroadcast: 'Остановить трансляцию',
    starting: 'Запуск камеры…',
    mute: 'Выключить звук',
    unmute: 'Включить звук',
    cameraOff: 'Выключить камеру',
    cameraOn: 'Включить камеру',
    flipCamera: 'Переключить камеру',
    mutedBadge: 'Звук выключен',
    cameraOffBadge: 'Камера выключена',
    insecureMsg:
      'Доступ к камере/микрофону требует защищённого соединения. Эта страница открыта по обычному HTTP в локальной сети, поэтому браузер блокирует доступ. Попросите включить HTTPS на хосте (pc/host.py --https или переключатель HTTPS в Android-хосте), либо откройте эту страницу прямо на хост-устройстве (localhost).',
    permissionDeniedMsg:
      'Доступ к камере/микрофону запрещён. Разрешите доступ к камере и микрофону для этого сайта в настройках браузера и попробуйте снова.',
    noDeviceMsg: 'На этом устройстве не найдены камера или микрофон.',
    deviceBusyMsg: 'Камера или микрофон уже используются другим приложением или вкладкой браузера. Закройте его и попробуйте снова.',
    genericMediaErrorMsg: 'Не удалось получить доступ к камере/микрофону ({error}).',
    webrtcUnsupported: 'Этот браузер не поддерживает WebRTC.',
    privacyHint:
      'Видео и звук передаются напрямую между браузерами по вашей локальной сети. Хост передаёт только небольшие сообщения установки соединения и статуса — никогда не видео и не звук.',
  },
  zh: {
    title: '视频直播',
    tagline: '摄像头和麦克风直接在浏览器之间传输——全网状连接，无需媒体服务器。',
    back: '库',
    online: '在线',
    offline: '离线',
    offlineHint: '启动 PC 主机 (./start.sh) 以便在局域网内直播。',
    room: '房间',
    you: '你',
    host: '主机',
    langLabel: '语言',
    peerIdle: '空闲',
    peerConnecting: '连接中…',
    peerConnected: '已连接',
    peerFailed: '连接失败',
    peerClosed: '已断开',
    roomHeading: '房间成员',
    noPeers: '房间里暂时没有其他人',
    gridEmptyHint: '还没有人开始直播。点击"开始直播"即可上线。',
    startBroadcast: '开始直播',
    stopBroadcast: '停止直播',
    starting: '正在启动摄像头…',
    mute: '静音',
    unmute: '取消静音',
    cameraOff: '关闭摄像头',
    cameraOn: '打开摄像头',
    flipCamera: '切换摄像头',
    mutedBadge: '已静音',
    cameraOffBadge: '摄像头已关闭',
    insecureMsg:
      '访问摄像头/麦克风需要安全连接。此页面通过局域网上的普通 HTTP 加载，因此浏览器会阻止访问。请让主机启用 HTTPS（pc/host.py --https，或 Android 主机的 HTTPS 开关），或直接在主机设备上（localhost）打开此页面。',
    permissionDeniedMsg: '摄像头/麦克风访问被拒绝。请在浏览器设置中为此站点允许摄像头和麦克风权限，然后重试。',
    noDeviceMsg: '此设备未找到摄像头或麦克风。',
    deviceBusyMsg: '摄像头或麦克风正被其他应用或浏览器标签页占用。请先关闭它，然后重试。',
    genericMediaErrorMsg: '无法访问摄像头/麦克风（{error}）。',
    webrtcUnsupported: '此浏览器不支持 WebRTC。',
    privacyHint: '视频和音频通过局域网在浏览器之间直接传输。主机只转发很小的连接建立和状态消息——绝不会经手你的摄像头或麦克风数据。',
  },
  es: {
    title: 'Transmisión de vídeo',
    tagline: 'Cámara y micrófono en vivo, directo entre navegadores — malla completa, sin servidor de medios.',
    back: 'Biblioteca',
    online: 'EN LÍNEA',
    offline: 'SIN CONEXIÓN',
    offlineHint: 'Inicia el host de PC (./start.sh) para transmitir por LAN.',
    room: 'Sala',
    you: 'tú',
    host: 'anfitrión',
    langLabel: 'Idioma',
    peerIdle: 'inactivo',
    peerConnecting: 'conectando…',
    peerConnected: 'conectado',
    peerFailed: 'error',
    peerClosed: 'desconectado',
    roomHeading: 'En esta sala',
    noPeers: 'Todavía no hay nadie más aquí',
    gridEmptyHint: 'Todavía nadie está transmitiendo. Toca «Iniciar transmisión» para salir en vivo.',
    startBroadcast: 'Iniciar transmisión',
    stopBroadcast: 'Detener transmisión',
    starting: 'Iniciando cámara…',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    cameraOff: 'Apagar cámara',
    cameraOn: 'Encender cámara',
    flipCamera: 'Cambiar cámara',
    mutedBadge: 'Silenciado',
    cameraOffBadge: 'Cámara apagada',
    insecureMsg:
      'El acceso a la cámara/micrófono necesita una conexión segura. Esta página se cargó por HTTP normal en tu red local, así que el navegador lo bloquea. Pide que el host se ejecute con HTTPS activado (pc/host.py --https, o el interruptor de HTTPS del host de Android), o abre esta página directamente en el dispositivo host (localhost).',
    permissionDeniedMsg:
      'Se denegó el acceso a la cámara/micrófono. Permite el acceso a la cámara y el micrófono para este sitio en la configuración de tu navegador y vuelve a intentarlo.',
    noDeviceMsg: 'No se encontró ninguna cámara ni micrófono en este dispositivo.',
    deviceBusyMsg: 'La cámara o el micrófono ya están en uso por otra aplicación o pestaña del navegador. Ciérrala e inténtalo de nuevo.',
    genericMediaErrorMsg: 'No se pudo acceder a la cámara/micrófono ({error}).',
    webrtcUnsupported: 'Este navegador no admite WebRTC.',
    privacyHint:
      'El vídeo y el audio van directamente entre navegadores por tu red local. El host solo transmite pequeños mensajes de conexión y estado — nunca tu cámara ni tu micrófono.',
  },
  ar: {
    title: 'بث الفيديو',
    tagline: 'كاميرا وميكروفون مباشرة بين المتصفحات — شبكة متكاملة دون خادم وسائط.',
    back: 'المكتبة',
    online: 'متصل',
    offline: 'غير متصل',
    offlineHint: 'شغّل مضيف الكمبيوتر (./start.sh) للبث عبر الشبكة المحلية.',
    room: 'الغرفة',
    you: 'أنت',
    host: 'المضيف',
    langLabel: 'اللغة',
    peerIdle: 'خامل',
    peerConnecting: 'جارٍ الاتصال…',
    peerConnected: 'متصل',
    peerFailed: 'فشل الاتصال',
    peerClosed: 'منقطع',
    roomHeading: 'في هذه الغرفة',
    noPeers: 'لا يوجد أحد آخر هنا بعد',
    gridEmptyHint: 'لا أحد يبث حاليًا. اضغط «بدء البث» لتصبح مباشرًا.',
    startBroadcast: 'بدء البث',
    stopBroadcast: 'إيقاف البث',
    starting: 'جارٍ تشغيل الكاميرا…',
    mute: 'كتم الصوت',
    unmute: 'إلغاء كتم الصوت',
    cameraOff: 'إيقاف الكاميرا',
    cameraOn: 'تشغيل الكاميرا',
    flipCamera: 'تبديل الكاميرا',
    mutedBadge: 'الصوت مكتوم',
    cameraOffBadge: 'الكاميرا متوقفة',
    insecureMsg:
      'يحتاج الوصول إلى الكاميرا/الميكروفون اتصالًا آمنًا. تم تحميل هذه الصفحة عبر HTTP عادي على شبكتك المحلية، لذا يمنع المتصفح الوصول. اطلب من المضيف التشغيل بتفعيل HTTPS (pc/host.py --https، أو مفتاح HTTPS في مضيف أندرويد)، أو افتح هذه الصفحة مباشرة على جهاز المضيف (localhost).',
    permissionDeniedMsg: 'تم رفض الوصول إلى الكاميرا/الميكروفون. اسمح بالوصول إلى الكاميرا والميكروفون لهذا الموقع في إعدادات المتصفح، ثم حاول مرة أخرى.',
    noDeviceMsg: 'لم يتم العثور على كاميرا أو ميكروفون على هذا الجهاز.',
    deviceBusyMsg: 'الكاميرا أو الميكروفون قيد الاستخدام بالفعل من تطبيق آخر أو علامة تبويب أخرى في المتصفح. أغلقه ثم حاول مرة أخرى.',
    genericMediaErrorMsg: 'تعذّر الوصول إلى الكاميرا/الميكروفون ({error}).',
    webrtcUnsupported: 'هذا المتصفح لا يدعم WebRTC.',
    privacyHint: 'ينتقل الفيديو والصوت مباشرة بين المتصفحات عبر شبكتك المحلية. لا يقوم المضيف إلا بترحيل رسائل صغيرة لإعداد الاتصال والحالة — ولا يرى أبدًا كاميرتك أو ميكروفونك.',
  },
  fr: {
    title: 'Diffusion vidéo',
    tagline: 'Caméra et micro en direct, directement entre navigateurs — maillage complet, sans serveur de médias.',
    back: 'Bibliothèque',
    online: 'EN LIGNE',
    offline: 'HORS LIGNE',
    offlineHint: "Démarrez l'hôte PC (./start.sh) pour diffuser sur le réseau local.",
    room: 'Salon',
    you: 'vous',
    host: 'hôte',
    langLabel: 'Langue',
    peerIdle: 'inactif',
    peerConnecting: 'connexion…',
    peerConnected: 'connecté',
    peerFailed: 'échec',
    peerClosed: 'déconnecté',
    roomHeading: 'Dans ce salon',
    noPeers: "Personne d'autre ici pour l'instant",
    gridEmptyHint: 'Personne ne diffuse pour le moment. Touchez « Démarrer la diffusion » pour passer en direct.',
    startBroadcast: 'Démarrer la diffusion',
    stopBroadcast: 'Arrêter la diffusion',
    starting: 'Démarrage de la caméra…',
    mute: 'Couper le son',
    unmute: 'Réactiver le son',
    cameraOff: 'Couper la caméra',
    cameraOn: 'Activer la caméra',
    flipCamera: 'Changer de caméra',
    mutedBadge: 'Son coupé',
    cameraOffBadge: 'Caméra coupée',
    insecureMsg:
      "L'accès à la caméra/au micro nécessite une connexion sécurisée. Cette page est chargée en HTTP simple sur votre réseau local, donc le navigateur le bloque. Demandez à ce que l'hôte soit lancé avec HTTPS activé (pc/host.py --https, ou le commutateur HTTPS de l'hôte Android), ou ouvrez cette page directement sur l'appareil hôte (localhost).",
    permissionDeniedMsg:
      "L'accès à la caméra/au micro a été refusé. Autorisez l'accès à la caméra et au micro pour ce site dans les paramètres de votre navigateur, puis réessayez.",
    noDeviceMsg: "Aucune caméra ni aucun micro n'a été trouvé sur cet appareil.",
    deviceBusyMsg: 'La caméra ou le micro est déjà utilisé par une autre application ou un autre onglet. Fermez-le puis réessayez.',
    genericMediaErrorMsg: "Impossible d'accéder à la caméra/au micro ({error}).",
    webrtcUnsupported: 'Ce navigateur ne prend pas en charge WebRTC.',
    privacyHint:
      "La vidéo et l'audio passent directement entre navigateurs sur votre réseau local. L'hôte ne relaie que de petits messages de mise en connexion et de statut — jamais votre caméra ni votre micro.",
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
    const stored = localStorage.getItem('ogh_vb_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_vb_lang', lang);
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
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(lang, key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(lang, key);
  });
}
