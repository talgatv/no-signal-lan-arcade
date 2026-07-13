/**
 * i18n — small string table for P2P File Share.
 * Mirrors the pattern used by games/catalog/games.json (per-language maps),
 * scoped to this program's own UI strings.
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
    title: 'P2P File Share',
    tagline: 'Direct browser-to-browser transfer. Files never touch the server.',
    back: 'Library',
    online: 'ONLINE',
    offline: 'OFFLINE',
    offlineHint: 'Start the PC host (./start.sh) to share files over the LAN.',
    room: 'Room',
    you: 'you',
    host: 'host',
    peerIdle: 'idle',
    peerConnecting: 'connecting…',
    peerConnected: 'connected',
    peerFailed: 'failed',
    peerClosed: 'disconnected',
    dropHint: 'Drag a file here, or click to choose',
    browse: 'Choose file',
    stagedHeading: 'Ready to send',
    clearFile: 'Remove',
    noFileHint: 'Pick a file above, then send it to someone in the room.',
    send: 'Send',
    sendToAll: 'Send to everyone',
    noPeers: 'No one else here yet',
    outgoingHeading: 'Outgoing',
    noOutgoing: 'No outgoing transfers yet',
    receivedHeading: 'Received files',
    noReceived: 'No files received yet',
    save: 'Save',
    statusConnecting: 'Connecting…',
    statusSending: 'Sending…',
    statusDone: 'Done',
    statusFailed: 'Failed',
    statusReceiving: 'Receiving…',
    statusWaiting: 'Waiting…',
    retry: 'Retry',
    from: 'from',
    to: 'to',
    privacyHint:
      'Transfers go directly between browsers over your LAN. Nothing is uploaded to the host or the internet.',
    connectError: "Couldn't connect to {name}.",
    sizeMismatch: 'File arrived incomplete — size mismatch.',
    langLabel: 'Language',
    webrtcUnsupported: "WebRTC isn't supported in this browser.",
  },
  ru: {
    title: 'P2P обмен файлами',
    tagline: 'Прямая передача между браузерами. Файлы не проходят через сервер.',
    back: 'Библиотека',
    online: 'ОНЛАЙН',
    offline: 'ОФЛАЙН',
    offlineHint: 'Запустите PC-хост (./start.sh), чтобы делиться файлами по LAN.',
    room: 'Комната',
    you: 'вы',
    host: 'хост',
    peerIdle: 'ожидание',
    peerConnecting: 'соединение…',
    peerConnected: 'подключено',
    peerFailed: 'ошибка',
    peerClosed: 'отключено',
    dropHint: 'Перетащите файл сюда или нажмите, чтобы выбрать',
    browse: 'Выбрать файл',
    stagedHeading: 'Готово к отправке',
    clearFile: 'Убрать',
    noFileHint: 'Выберите файл выше, затем отправьте его кому-то в комнате.',
    send: 'Отправить',
    sendToAll: 'Отправить всем',
    noPeers: 'Пока никого нет',
    outgoingHeading: 'Исходящие',
    noOutgoing: 'Исходящих передач пока нет',
    receivedHeading: 'Полученные файлы',
    noReceived: 'Файлы пока не получены',
    save: 'Сохранить',
    statusConnecting: 'Соединение…',
    statusSending: 'Отправка…',
    statusDone: 'Готово',
    statusFailed: 'Ошибка',
    statusReceiving: 'Получение…',
    statusWaiting: 'Ожидание…',
    retry: 'Повторить',
    from: 'от',
    to: 'кому',
    privacyHint:
      'Передача идёт напрямую между браузерами по вашей локальной сети. Ничего не загружается на хост или в интернет.',
    connectError: 'Не удалось подключиться к {name}.',
    sizeMismatch: 'Файл получен не полностью — размер не совпадает.',
    langLabel: 'Язык',
    webrtcUnsupported: 'Этот браузер не поддерживает WebRTC.',
  },
  zh: {
    title: '点对点文件传输',
    tagline: '浏览器之间直接传输文件，服务器不经手。',
    back: '库',
    online: '在线',
    offline: '离线',
    offlineHint: '启动 PC 主机 (./start.sh) 以便在局域网内共享文件。',
    room: '房间',
    you: '你',
    host: '主机',
    peerIdle: '空闲',
    peerConnecting: '连接中…',
    peerConnected: '已连接',
    peerFailed: '连接失败',
    peerClosed: '已断开',
    dropHint: '将文件拖到此处，或点击选择',
    browse: '选择文件',
    stagedHeading: '待发送',
    clearFile: '移除',
    noFileHint: '先在上方选择文件，然后发送给房间里的人。',
    send: '发送',
    sendToAll: '发送给所有人',
    noPeers: '房间里暂时没有其他人',
    outgoingHeading: '发送记录',
    noOutgoing: '暂无发送记录',
    receivedHeading: '已接收文件',
    noReceived: '暂无接收到的文件',
    save: '保存',
    statusConnecting: '连接中…',
    statusSending: '发送中…',
    statusDone: '已完成',
    statusFailed: '失败',
    statusReceiving: '接收中…',
    statusWaiting: '等待中…',
    retry: '重试',
    from: '来自',
    to: '发给',
    privacyHint: '文件通过局域网在浏览器之间直接传输，不会上传到主机或互联网。',
    connectError: '无法连接到 {name}。',
    sizeMismatch: '文件接收不完整——大小不匹配。',
    langLabel: '语言',
    webrtcUnsupported: '此浏览器不支持 WebRTC。',
  },
  es: {
    title: 'Compartir archivos P2P',
    tagline: 'Transferencia directa entre navegadores. Los archivos no pasan por el servidor.',
    back: 'Biblioteca',
    online: 'EN LÍNEA',
    offline: 'SIN CONEXIÓN',
    offlineHint: 'Inicia el host de PC (./start.sh) para compartir archivos por LAN.',
    room: 'Sala',
    you: 'tú',
    host: 'anfitrión',
    peerIdle: 'inactivo',
    peerConnecting: 'conectando…',
    peerConnected: 'conectado',
    peerFailed: 'error',
    peerClosed: 'desconectado',
    dropHint: 'Arrastra un archivo aquí o haz clic para elegir',
    browse: 'Elegir archivo',
    stagedHeading: 'Listo para enviar',
    clearFile: 'Quitar',
    noFileHint: 'Elige un archivo arriba y envíalo a alguien de la sala.',
    send: 'Enviar',
    sendToAll: 'Enviar a todos',
    noPeers: 'Todavía no hay nadie más aquí',
    outgoingHeading: 'Enviados',
    noOutgoing: 'Aún no hay transferencias salientes',
    receivedHeading: 'Archivos recibidos',
    noReceived: 'Aún no se ha recibido ningún archivo',
    save: 'Guardar',
    statusConnecting: 'Conectando…',
    statusSending: 'Enviando…',
    statusDone: 'Listo',
    statusFailed: 'Error',
    statusReceiving: 'Recibiendo…',
    statusWaiting: 'Esperando…',
    retry: 'Reintentar',
    from: 'de',
    to: 'para',
    privacyHint:
      'Las transferencias van directamente entre navegadores por tu red local. Nada se sube al host ni a internet.',
    connectError: 'No se pudo conectar con {name}.',
    sizeMismatch: 'El archivo llegó incompleto — el tamaño no coincide.',
    langLabel: 'Idioma',
    webrtcUnsupported: 'Este navegador no admite WebRTC.',
  },
  ar: {
    title: 'مشاركة ملفات مباشرة',
    tagline: 'نقل مباشر بين المتصفحات. الملفات لا تمر عبر الخادم.',
    back: 'المكتبة',
    online: 'متصل',
    offline: 'غير متصل',
    offlineHint: 'شغّل مضيف الكمبيوتر (./start.sh) لمشاركة الملفات عبر الشبكة المحلية.',
    room: 'الغرفة',
    you: 'أنت',
    host: 'المضيف',
    peerIdle: 'خامل',
    peerConnecting: 'جارٍ الاتصال…',
    peerConnected: 'متصل',
    peerFailed: 'فشل الاتصال',
    peerClosed: 'منقطع',
    dropHint: 'اسحب ملفًا هنا، أو انقر للاختيار',
    browse: 'اختر ملفًا',
    stagedHeading: 'جاهز للإرسال',
    clearFile: 'إزالة',
    noFileHint: 'اختر ملفًا أعلاه، ثم أرسله إلى أحد في الغرفة.',
    send: 'إرسال',
    sendToAll: 'إرسال للجميع',
    noPeers: 'لا يوجد أحد آخر هنا بعد',
    outgoingHeading: 'الصادر',
    noOutgoing: 'لا توجد عمليات إرسال بعد',
    receivedHeading: 'الملفات المستلمة',
    noReceived: 'لم يتم استلام أي ملف بعد',
    save: 'حفظ',
    statusConnecting: 'جارٍ الاتصال…',
    statusSending: 'جارٍ الإرسال…',
    statusDone: 'تم',
    statusFailed: 'فشل',
    statusReceiving: 'جارٍ الاستلام…',
    statusWaiting: 'في الانتظار…',
    retry: 'إعادة المحاولة',
    from: 'من',
    to: 'إلى',
    privacyHint:
      'تتم عمليات النقل مباشرة بين المتصفحات عبر شبكتك المحلية. لا يتم رفع أي شيء إلى المضيف أو الإنترنت.',
    connectError: 'تعذر الاتصال بـ {name}.',
    sizeMismatch: 'وصل الملف غير مكتمل — الحجم غير متطابق.',
    langLabel: 'اللغة',
    webrtcUnsupported: 'هذا المتصفح لا يدعم WebRTC.',
  },
  fr: {
    title: 'Partage de fichiers P2P',
    tagline: 'Transfert direct entre navigateurs. Les fichiers ne passent pas par le serveur.',
    back: 'Bibliothèque',
    online: 'EN LIGNE',
    offline: 'HORS LIGNE',
    offlineHint: "Démarrez l'hôte PC (./start.sh) pour partager des fichiers sur le réseau local.",
    room: 'Salon',
    you: 'vous',
    host: 'hôte',
    peerIdle: 'inactif',
    peerConnecting: 'connexion…',
    peerConnected: 'connecté',
    peerFailed: 'échec',
    peerClosed: 'déconnecté',
    dropHint: 'Glissez un fichier ici, ou cliquez pour choisir',
    browse: 'Choisir un fichier',
    stagedHeading: 'Prêt à envoyer',
    clearFile: 'Retirer',
    noFileHint: "Choisissez un fichier ci-dessus, puis envoyez-le à quelqu'un dans le salon.",
    send: 'Envoyer',
    sendToAll: 'Envoyer à tous',
    noPeers: "Personne d'autre ici pour l'instant",
    outgoingHeading: 'Envois',
    noOutgoing: "Aucun envoi pour l'instant",
    receivedHeading: 'Fichiers reçus',
    noReceived: "Aucun fichier reçu pour l'instant",
    save: 'Enregistrer',
    statusConnecting: 'Connexion…',
    statusSending: 'Envoi…',
    statusDone: 'Terminé',
    statusFailed: 'Échec',
    statusReceiving: 'Réception…',
    statusWaiting: 'En attente…',
    retry: 'Réessayer',
    from: 'de',
    to: 'à',
    privacyHint:
      "Les transferts se font directement entre navigateurs sur votre réseau local. Rien n'est envoyé vers l'hôte ni vers internet.",
    connectError: 'Impossible de se connecter à {name}.',
    sizeMismatch: "Fichier incomplet à l'arrivée — la taille ne correspond pas.",
    langLabel: 'Langue',
    webrtcUnsupported: 'Ce navigateur ne prend pas en charge WebRTC.',
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
    const stored = localStorage.getItem('ogh_p2p_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_p2p_lang', lang);
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
