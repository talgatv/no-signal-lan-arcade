/**
 * i18n — small string table for Speech Tools.
 * Mirrors the pattern used by programs/video-convert/client/i18n.js,
 * scoped to this program's own UI strings.
 *
 * Note: this table only covers UI chrome (labels, buttons, hints, error
 * messages). The TTS voice language and the STT recognition language are
 * separate, independently user-controllable settings — see app.js's
 * UI_LANG_TO_BCP47 map, which only supplies a sensible *default* for each
 * based on the current UI language.
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
    title: 'Speech Tools',
    tagline: 'Text-to-speech & speech-to-text · built into your browser',
    langLabel: 'Language',

    // tabs
    tabTts: 'Text → Speech',
    tabStt: 'Speech → Text',

    // TTS panel
    textareaLabel: 'Text',
    textareaPlaceholder: 'Type or paste text to speak…',
    emptyTextHint: 'Type some text above to enable playback.',
    voiceLabel: 'Voice',
    voiceLoading: 'Loading voices…',
    noVoicesMsg: 'No speech voices are installed in this browser or OS. Text-to-speech needs at least one voice — try a different browser, or install system text-to-speech voices.',
    voiceGroupMatching: 'Matching this language',
    voiceGroupOther: 'Other voices',
    rateLabel: 'Rate',
    pitchLabel: 'Pitch',
    volumeLabel: 'Volume',
    playBtn: 'Play',
    pauseBtn: 'Pause',
    resumeBtn: 'Resume',
    stopBtn: 'Stop',
    ttsUnsupportedMsg: 'This browser does not support speech synthesis (the SpeechSynthesis API). Try a recent Chrome, Edge, Firefox or Safari.',
    ttsStatusIdle: 'Idle',
    ttsStatusSpeaking: 'Speaking…',
    ttsStatusPaused: 'Paused',

    // STT panel
    transcriptLabel: 'Transcript',
    transcriptPlaceholder: 'Your speech will appear here…',
    sttLangLabel: 'Recognition language',
    startBtn: 'Start listening',
    stopListeningBtn: 'Stop listening',
    sttIdle: 'Not listening',
    sttListening: 'Listening — speak now',
    copyBtn: 'Copy to clipboard',
    saveBtn: 'Save as .txt',
    clearBtn: 'Clear',
    copiedToast: 'Copied to clipboard.',
    copyFailedToast: "Couldn't copy automatically — select the text and copy it manually.",
    savedToast: 'Transcript saved.',
    sttUnsupportedMsg: "This browser doesn't support speech recognition (the SpeechRecognition API). Firefox in particular has inconsistent or absent support — try a recent Chrome or Edge on desktop or Android.",
    insecureMsg: "Speech-to-text needs a secure connection. This page is loaded over plain HTTP on your LAN, so the browser blocks the microphone. Ask the host to run with HTTPS enabled (<code>pc/host.py --https</code>, or the Android host's HTTPS toggle), or open this page directly on the host device (<code>localhost</code>).",
    notFullyOfflineNote: "Unlike the rest of this offline-first hub, speech-to-text isn't guaranteed to work fully offline: most browsers send your audio to a cloud recognition service (e.g. Chrome uses Google's) for many languages. A few newer Chrome versions support on-device recognition for some locales, but it isn't universal — with no internet connection, speech-to-text may simply fail. The Text → Speech tab, by contrast, uses voices installed on this device and always works fully offline.",

    errNoSpeech: 'No speech detected. Check that your microphone is working and try speaking again.',
    errNetwork: "Network error. This browser's speech recognition needs an internet connection to reach its cloud recognition service, and that request failed — check your connection.",
    errNotAllowed: "Microphone access was denied. Allow microphone access for this page in your browser's site settings, then try again.",
    errServiceNotAllowed: 'The speech recognition service refused this request — your browser or OS may be blocking cloud speech services. Try a different browser, e.g. a recent desktop Chrome.',
    errAudioCapture: "No microphone was found, or it's already in use by another app. Check your mic and try again.",
    errOther: 'Speech recognition error: {error}',

    recLang_en: 'English (US)',
    recLang_ru: 'Russian',
    recLang_zh: 'Chinese (Mandarin)',
    recLang_es: 'Spanish',
    recLang_ar: 'Arabic',
    recLang_fr: 'French',
  },
  ru: {
    back: 'Библиотека',
    title: 'Речевые инструменты',
    tagline: 'Синтез и распознавание речи · прямо в браузере',
    langLabel: 'Язык',

    tabTts: 'Текст → Речь',
    tabStt: 'Речь → Текст',

    textareaLabel: 'Текст',
    textareaPlaceholder: 'Введите или вставьте текст для озвучивания…',
    emptyTextHint: 'Введите текст выше, чтобы включить воспроизведение.',
    voiceLabel: 'Голос',
    voiceLoading: 'Загрузка голосов…',
    noVoicesMsg: 'В этом браузере или ОС не установлено ни одного голоса. Синтезу речи нужен хотя бы один голос — попробуйте другой браузер или установите системные голоса синтеза речи.',
    voiceGroupMatching: 'Соответствуют этому языку',
    voiceGroupOther: 'Остальные голоса',
    rateLabel: 'Скорость',
    pitchLabel: 'Высота тона',
    volumeLabel: 'Громкость',
    playBtn: 'Играть',
    pauseBtn: 'Пауза',
    resumeBtn: 'Продолжить',
    stopBtn: 'Стоп',
    ttsUnsupportedMsg: 'Этот браузер не поддерживает синтез речи (API SpeechSynthesis). Используйте свежий Chrome, Edge, Firefox или Safari.',
    ttsStatusIdle: 'Ожидание',
    ttsStatusSpeaking: 'Говорит…',
    ttsStatusPaused: 'Пауза',

    transcriptLabel: 'Расшифровка',
    transcriptPlaceholder: 'Здесь появится распознанная речь…',
    sttLangLabel: 'Язык распознавания',
    startBtn: 'Начать прослушивание',
    stopListeningBtn: 'Остановить прослушивание',
    sttIdle: 'Не слушает',
    sttListening: 'Слушает — говорите',
    copyBtn: 'Скопировать в буфер обмена',
    saveBtn: 'Сохранить как .txt',
    clearBtn: 'Очистить',
    copiedToast: 'Скопировано в буфер обмена.',
    copyFailedToast: 'Не удалось скопировать автоматически — выделите текст и скопируйте вручную.',
    savedToast: 'Расшифровка сохранена.',
    sttUnsupportedMsg: 'Этот браузер не поддерживает распознавание речи (API SpeechRecognition). Особенно нестабильна или отсутствует поддержка в Firefox — попробуйте свежий Chrome или Edge на компьютере или Android.',
    insecureMsg: 'Распознаванию речи нужно защищённое соединение. Эта страница открыта по обычному HTTP в локальной сети, поэтому браузер блокирует микрофон. Попросите включить HTTPS на хосте (<code>pc/host.py --https</code>, либо переключатель HTTPS в Android-хосте) или откройте эту страницу прямо на хост-устройстве (<code>localhost</code>).',
    notFullyOfflineNote: 'В отличие от остальной части этого офлайн-хаба, распознавание речи не гарантированно работает полностью офлайн: большинство браузеров отправляют звук в облачный сервис распознавания (например, Chrome использует сервис Google) для многих языков. В некоторых новых версиях Chrome есть локальное распознавание для отдельных языков, но не повсеместно — без интернета распознавание речи может просто не работать. Вкладка «Текст → Речь», напротив, использует голоса, установленные на этом устройстве, и всегда работает полностью офлайн.',

    errNoSpeech: 'Речь не обнаружена. Проверьте микрофон и попробуйте сказать что-нибудь ещё раз.',
    errNetwork: 'Ошибка сети. Распознаванию речи в этом браузере нужен интернет для обращения к облачному сервису распознавания, и этот запрос не удался — проверьте соединение.',
    errNotAllowed: 'Доступ к микрофону запрещён. Разрешите доступ к микрофону для этой страницы в настройках сайта браузера и попробуйте снова.',
    errServiceNotAllowed: 'Сервис распознавания речи отклонил запрос — возможно, браузер или ОС блокирует облачные речевые сервисы. Попробуйте другой браузер, например свежий Chrome на компьютере.',
    errAudioCapture: 'Микрофон не найден или уже используется другим приложением. Проверьте микрофон и попробуйте снова.',
    errOther: 'Ошибка распознавания речи: {error}',

    recLang_en: 'Английский (США)',
    recLang_ru: 'Русский',
    recLang_zh: 'Китайский (путунхуа)',
    recLang_es: 'Испанский',
    recLang_ar: 'Арабский',
    recLang_fr: 'Французский',
  },
  zh: {
    back: '资料库',
    title: '语音工具',
    tagline: '文字转语音与语音转文字 · 浏览器内置',
    langLabel: '语言',

    tabTts: '文字 → 语音',
    tabStt: '语音 → 文字',

    textareaLabel: '文本',
    textareaPlaceholder: '输入或粘贴要朗读的文本…',
    emptyTextHint: '请先在上方输入文本以启用播放。',
    voiceLabel: '语音',
    voiceLoading: '正在加载语音…',
    noVoicesMsg: '此浏览器或操作系统未安装任何语音。文字转语音至少需要一个语音——请尝试其他浏览器，或安装系统语音合成声音。',
    voiceGroupMatching: '匹配当前语言',
    voiceGroupOther: '其他语音',
    rateLabel: '语速',
    pitchLabel: '音调',
    volumeLabel: '音量',
    playBtn: '播放',
    pauseBtn: '暂停',
    resumeBtn: '继续',
    stopBtn: '停止',
    ttsUnsupportedMsg: '此浏览器不支持语音合成（SpeechSynthesis API）。请尝试较新版本的 Chrome、Edge、Firefox 或 Safari。',
    ttsStatusIdle: '空闲',
    ttsStatusSpeaking: '朗读中…',
    ttsStatusPaused: '已暂停',

    transcriptLabel: '转录文本',
    transcriptPlaceholder: '识别出的语音会显示在这里…',
    sttLangLabel: '识别语言',
    startBtn: '开始聆听',
    stopListeningBtn: '停止聆听',
    sttIdle: '未在聆听',
    sttListening: '正在聆听——请说话',
    copyBtn: '复制到剪贴板',
    saveBtn: '保存为 .txt',
    clearBtn: '清除',
    copiedToast: '已复制到剪贴板。',
    copyFailedToast: '自动复制失败——请手动选中文本并复制。',
    savedToast: '转录文本已保存。',
    sttUnsupportedMsg: '此浏览器不支持语音识别（SpeechRecognition API）。Firefox 的支持尤其不稳定或缺失——请在桌面或 Android 上尝试较新版本的 Chrome 或 Edge。',
    insecureMsg: '语音转文字需要安全连接。此页面通过局域网上的普通 HTTP 加载，因此浏览器会阻止麦克风访问。请让主机启用 HTTPS（<code>pc/host.py --https</code>，或 Android 主机的 HTTPS 开关），或直接在主机设备上（<code>localhost</code>）打开此页面。',
    notFullyOfflineNote: '与本离线优先应用集的其他部分不同，语音转文字不保证完全离线工作：大多数浏览器会将音频发送到云端识别服务（例如 Chrome 使用 Google 的服务）以支持多种语言。部分较新版本的 Chrome 对某些语言支持设备端识别，但并不普遍——没有网络连接时，语音转文字可能根本无法工作。相比之下，"文字 → 语音"标签页使用本设备上安装的语音，始终可以完全离线工作。',

    errNoSpeech: '未检测到语音。请检查麦克风是否正常工作，然后再试一次。',
    errNetwork: '网络错误。此浏览器的语音识别需要联网以访问其云端识别服务，但该请求失败了——请检查你的网络连接。',
    errNotAllowed: '麦克风访问被拒绝。请在浏览器的网站设置中允许此页面访问麦克风，然后重试。',
    errServiceNotAllowed: '语音识别服务拒绝了此请求——你的浏览器或系统可能屏蔽了云端语音服务。请尝试其他浏览器，例如较新版本的桌面版 Chrome。',
    errAudioCapture: '未找到麦克风，或麦克风正被其他应用占用。请检查麦克风后重试。',
    errOther: '语音识别错误：{error}',

    recLang_en: '英语（美国）',
    recLang_ru: '俄语',
    recLang_zh: '中文（普通话）',
    recLang_es: '西班牙语',
    recLang_ar: '阿拉伯语',
    recLang_fr: '法语',
  },
  es: {
    back: 'Biblioteca',
    title: 'Herramientas de voz',
    tagline: 'Texto a voz y voz a texto · integrados en tu navegador',
    langLabel: 'Idioma',

    tabTts: 'Texto → Voz',
    tabStt: 'Voz → Texto',

    textareaLabel: 'Texto',
    textareaPlaceholder: 'Escribe o pega el texto que quieres escuchar…',
    emptyTextHint: 'Escribe algo de texto arriba para activar la reproducción.',
    voiceLabel: 'Voz',
    voiceLoading: 'Cargando voces…',
    noVoicesMsg: 'Este navegador o sistema operativo no tiene ninguna voz instalada. El texto a voz necesita al menos una voz — prueba otro navegador o instala voces de síntesis de voz del sistema.',
    voiceGroupMatching: 'Coinciden con este idioma',
    voiceGroupOther: 'Otras voces',
    rateLabel: 'Velocidad',
    pitchLabel: 'Tono',
    volumeLabel: 'Volumen',
    playBtn: 'Reproducir',
    pauseBtn: 'Pausar',
    resumeBtn: 'Reanudar',
    stopBtn: 'Detener',
    ttsUnsupportedMsg: 'Este navegador no admite síntesis de voz (la API SpeechSynthesis). Prueba un Chrome, Edge, Firefox o Safari reciente.',
    ttsStatusIdle: 'Inactivo',
    ttsStatusSpeaking: 'Hablando…',
    ttsStatusPaused: 'En pausa',

    transcriptLabel: 'Transcripción',
    transcriptPlaceholder: 'Aquí aparecerá lo que digas…',
    sttLangLabel: 'Idioma de reconocimiento',
    startBtn: 'Empezar a escuchar',
    stopListeningBtn: 'Dejar de escuchar',
    sttIdle: 'No está escuchando',
    sttListening: 'Escuchando — habla ahora',
    copyBtn: 'Copiar al portapapeles',
    saveBtn: 'Guardar como .txt',
    clearBtn: 'Borrar',
    copiedToast: 'Copiado al portapapeles.',
    copyFailedToast: 'No se pudo copiar automáticamente — selecciona el texto y cópialo manualmente.',
    savedToast: 'Transcripción guardada.',
    sttUnsupportedMsg: 'Este navegador no admite reconocimiento de voz (la API SpeechRecognition). Firefox en particular tiene soporte inconsistente o inexistente — prueba un Chrome o Edge reciente en escritorio o Android.',
    insecureMsg: 'La conversión de voz a texto necesita una conexión segura. Esta página se cargó por HTTP normal en tu red local, así que el navegador bloquea el micrófono. Pide que el host se ejecute con HTTPS activado (<code>pc/host.py --https</code>, o el interruptor de HTTPS del host de Android), o abre esta página directamente en el dispositivo host (<code>localhost</code>).',
    notFullyOfflineNote: 'A diferencia del resto de este hub sin conexión, la conversión de voz a texto no está garantizada para funcionar completamente sin conexión: la mayoría de los navegadores envían tu audio a un servicio de reconocimiento en la nube (por ejemplo, Chrome usa el de Google) para muchos idiomas. Algunas versiones recientes de Chrome admiten reconocimiento en el dispositivo para ciertos idiomas, pero no es universal — sin conexión a internet, la voz a texto simplemente puede no funcionar. La pestaña Texto → Voz, en cambio, usa voces instaladas en este dispositivo y siempre funciona completamente sin conexión.',

    errNoSpeech: 'No se detectó voz. Comprueba que tu micrófono funciona e inténtalo de nuevo.',
    errNetwork: 'Error de red. El reconocimiento de voz de este navegador necesita conexión a internet para llegar a su servicio de reconocimiento en la nube, y esa solicitud falló — comprueba tu conexión.',
    errNotAllowed: 'Se denegó el acceso al micrófono. Permite el acceso al micrófono para esta página en la configuración del sitio de tu navegador e inténtalo de nuevo.',
    errServiceNotAllowed: 'El servicio de reconocimiento de voz rechazó esta solicitud — tu navegador o sistema operativo podría estar bloqueando los servicios de voz en la nube. Prueba otro navegador, por ejemplo un Chrome de escritorio reciente.',
    errAudioCapture: 'No se encontró ningún micrófono, o ya está en uso por otra aplicación. Comprueba tu micrófono e inténtalo de nuevo.',
    errOther: 'Error de reconocimiento de voz: {error}',

    recLang_en: 'Inglés (EE. UU.)',
    recLang_ru: 'Ruso',
    recLang_zh: 'Chino (mandarín)',
    recLang_es: 'Español',
    recLang_ar: 'Árabe',
    recLang_fr: 'Francés',
  },
  ar: {
    back: 'المكتبة',
    title: 'أدوات الصوت',
    tagline: 'تحويل النص إلى كلام والكلام إلى نص · داخل المتصفح',
    langLabel: 'اللغة',

    tabTts: 'نص → كلام',
    tabStt: 'كلام → نص',

    textareaLabel: 'النص',
    textareaPlaceholder: 'اكتب أو الصق نصًا لنطقه…',
    emptyTextHint: 'اكتب نصًا في الأعلى لتفعيل التشغيل.',
    voiceLabel: 'الصوت',
    voiceLoading: 'جارٍ تحميل الأصوات…',
    noVoicesMsg: 'لا توجد أصوات مثبَّتة في هذا المتصفح أو نظام التشغيل. يحتاج تحويل النص إلى كلام صوتًا واحدًا على الأقل — جرّب متصفحًا آخر أو ثبّت أصوات تحويل نص إلى كلام على النظام.',
    voiceGroupMatching: 'مطابقة لهذه اللغة',
    voiceGroupOther: 'أصوات أخرى',
    rateLabel: 'السرعة',
    pitchLabel: 'حدة الصوت',
    volumeLabel: 'مستوى الصوت',
    playBtn: 'تشغيل',
    pauseBtn: 'إيقاف مؤقت',
    resumeBtn: 'استئناف',
    stopBtn: 'إيقاف',
    ttsUnsupportedMsg: 'هذا المتصفح لا يدعم تحويل النص إلى كلام (واجهة SpeechSynthesis). جرّب إصدارًا حديثًا من Chrome أو Edge أو Firefox أو Safari.',
    ttsStatusIdle: 'خامل',
    ttsStatusSpeaking: 'يتحدث…',
    ttsStatusPaused: 'متوقف مؤقتًا',

    transcriptLabel: 'النص المُفرَّغ',
    transcriptPlaceholder: 'سيظهر كلامك هنا…',
    sttLangLabel: 'لغة التعرف على الكلام',
    startBtn: 'ابدأ الاستماع',
    stopListeningBtn: 'أوقف الاستماع',
    sttIdle: 'لا يستمع',
    sttListening: 'يستمع — تحدّث الآن',
    copyBtn: 'نسخ إلى الحافظة',
    saveBtn: 'حفظ كملف ‎.txt',
    clearBtn: 'مسح',
    copiedToast: 'تم النسخ إلى الحافظة.',
    copyFailedToast: 'تعذّر النسخ تلقائيًا — حدّد النص وانسخه يدويًا.',
    savedToast: 'تم حفظ النص المُفرَّغ.',
    sttUnsupportedMsg: 'هذا المتصفح لا يدعم التعرف على الكلام (واجهة SpeechRecognition). دعم Firefox لها غير مستقر أو غير موجود تحديدًا — جرّب إصدارًا حديثًا من Chrome أو Edge على الحاسوب أو أندرويد.',
    insecureMsg: 'يحتاج تحويل الكلام إلى نص اتصالًا آمنًا. تم تحميل هذه الصفحة عبر HTTP عادي على شبكتك المحلية، لذا يمنع المتصفح الوصول إلى الميكروفون. اطلب من المضيف التشغيل بتفعيل HTTPS (<code>pc/host.py --https</code>، أو مفتاح HTTPS في مضيف أندرويد)، أو افتح هذه الصفحة مباشرة على جهاز المضيف (<code>localhost</code>).',
    notFullyOfflineNote: 'خلافًا لبقية أجزاء هذا المجمّع الذي يعمل دون اتصال بالأساس، لا يُضمَن أن يعمل تحويل الكلام إلى نص دون اتصال بالكامل: ترسل معظم المتصفحات الصوت إلى خدمة تعرّف سحابية (يستخدم Chrome مثلًا خدمة Google) لدعم لغات كثيرة. تدعم بعض إصدارات Chrome الأحدث التعرف على الجهاز نفسه لبعض اللغات، لكن ذلك ليس شاملاً — فبدون اتصال بالإنترنت، قد لا يعمل تحويل الكلام إلى نص إطلاقًا. أما تبويب «نص → كلام» فيستخدم أصواتًا مثبَّتة على هذا الجهاز ويعمل دائمًا دون اتصال بالكامل.',

    errNoSpeech: 'لم يُكتشف أي كلام. تحقق من أن الميكروفون يعمل وحاول التحدث مجددًا.',
    errNetwork: 'خطأ في الشبكة. يحتاج التعرف على الكلام في هذا المتصفح إلى اتصال بالإنترنت للوصول إلى خدمة التعرف السحابية، وقد فشل هذا الطلب — تحقق من اتصالك.',
    errNotAllowed: 'تم رفض الوصول إلى الميكروفون. اسمح بالوصول إلى الميكروفون لهذه الصفحة من إعدادات الموقع في متصفحك، ثم حاول مجددًا.',
    errServiceNotAllowed: 'رفضت خدمة التعرف على الكلام هذا الطلب — قد يكون متصفحك أو نظامك يحظر خدمات الكلام السحابية. جرّب متصفحًا آخر، مثل نسخة حديثة من Chrome على الحاسوب.',
    errAudioCapture: 'لم يُعثر على ميكروفون، أو أنه قيد الاستخدام من تطبيق آخر. تحقق من الميكروفون وحاول مجددًا.',
    errOther: 'خطأ في التعرف على الكلام: {error}',

    recLang_en: 'الإنجليزية (الولايات المتحدة)',
    recLang_ru: 'الروسية',
    recLang_zh: 'الصينية (الماندرين)',
    recLang_es: 'الإسبانية',
    recLang_ar: 'العربية',
    recLang_fr: 'الفرنسية',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Outils vocaux',
    tagline: 'Synthèse et reconnaissance vocale · intégrées au navigateur',
    langLabel: 'Langue',

    tabTts: 'Texte → Voix',
    tabStt: 'Voix → Texte',

    textareaLabel: 'Texte',
    textareaPlaceholder: 'Saisissez ou collez le texte à lire à voix haute…',
    emptyTextHint: 'Saisissez du texte ci-dessus pour activer la lecture.',
    voiceLabel: 'Voix',
    voiceLoading: 'Chargement des voix…',
    noVoicesMsg: "Aucune voix n'est installée dans ce navigateur ou ce système. La synthèse vocale nécessite au moins une voix — essayez un autre navigateur ou installez des voix de synthèse vocale système.",
    voiceGroupMatching: 'Correspondant à cette langue',
    voiceGroupOther: 'Autres voix',
    rateLabel: 'Débit',
    pitchLabel: 'Hauteur',
    volumeLabel: 'Volume',
    playBtn: 'Lire',
    pauseBtn: 'Pause',
    resumeBtn: 'Reprendre',
    stopBtn: 'Arrêter',
    ttsUnsupportedMsg: "Ce navigateur ne prend pas en charge la synthèse vocale (l'API SpeechSynthesis). Essayez une version récente de Chrome, Edge, Firefox ou Safari.",
    ttsStatusIdle: 'Inactif',
    ttsStatusSpeaking: 'Lecture en cours…',
    ttsStatusPaused: 'En pause',

    transcriptLabel: 'Transcription',
    transcriptPlaceholder: 'Ce que vous dites apparaîtra ici…',
    sttLangLabel: 'Langue de reconnaissance',
    startBtn: "Démarrer l'écoute",
    stopListeningBtn: "Arrêter l'écoute",
    sttIdle: 'En attente',
    sttListening: "À l'écoute — parlez maintenant",
    copyBtn: 'Copier dans le presse-papiers',
    saveBtn: 'Enregistrer en .txt',
    clearBtn: 'Effacer',
    copiedToast: 'Copié dans le presse-papiers.',
    copyFailedToast: 'Impossible de copier automatiquement — sélectionnez le texte et copiez-le manuellement.',
    savedToast: 'Transcription enregistrée.',
    sttUnsupportedMsg: "Ce navigateur ne prend pas en charge la reconnaissance vocale (l'API SpeechRecognition). Le support de Firefox est notamment incohérent ou absent — essayez une version récente de Chrome ou Edge sur ordinateur ou Android.",
    insecureMsg: "La reconnaissance vocale nécessite une connexion sécurisée. Cette page est chargée en HTTP simple sur votre réseau local, donc le navigateur bloque le microphone. Demandez à ce que l'hôte soit lancé avec HTTPS activé (<code>pc/host.py --https</code>, ou le commutateur HTTPS de l'hôte Android), ou ouvrez cette page directement sur l'appareil hôte (<code>localhost</code>).",
    notFullyOfflineNote: "Contrairement au reste de ce hub conçu pour fonctionner hors ligne, la reconnaissance vocale n'est pas garantie de fonctionner entièrement hors ligne : la plupart des navigateurs envoient votre audio à un service de reconnaissance dans le cloud (Chrome utilise celui de Google, par exemple) pour de nombreuses langues. Certaines versions récentes de Chrome prennent en charge la reconnaissance sur l'appareil pour quelques langues, mais ce n'est pas généralisé — sans connexion internet, la reconnaissance vocale peut simplement ne pas fonctionner. L'onglet Texte → Voix, en revanche, utilise des voix installées sur cet appareil et fonctionne toujours entièrement hors ligne.",

    errNoSpeech: 'Aucune parole détectée. Vérifiez que votre microphone fonctionne et réessayez.',
    errNetwork: "Erreur réseau. La reconnaissance vocale de ce navigateur nécessite une connexion internet pour joindre son service de reconnaissance dans le cloud, et cette requête a échoué — vérifiez votre connexion.",
    errNotAllowed: "L'accès au microphone a été refusé. Autorisez l'accès au microphone pour cette page dans les paramètres du site de votre navigateur, puis réessayez.",
    errServiceNotAllowed: "Le service de reconnaissance vocale a refusé cette requête — votre navigateur ou système bloque peut-être les services vocaux cloud. Essayez un autre navigateur, par exemple une version récente de Chrome sur ordinateur.",
    errAudioCapture: "Aucun microphone n'a été détecté, ou il est déjà utilisé par une autre application. Vérifiez votre microphone et réessayez.",
    errOther: 'Erreur de reconnaissance vocale : {error}',

    recLang_en: 'Anglais (É.-U.)',
    recLang_ru: 'Russe',
    recLang_zh: 'Chinois (mandarin)',
    recLang_es: 'Espagnol',
    recLang_ar: 'Arabe',
    recLang_fr: 'Français',
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
    const stored = localStorage.getItem('ogh_st_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_st_lang', lang);
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
