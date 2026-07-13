/**
 * i18n — small string table for Video Convert.
 * Mirrors the pattern used by games/programs/p2p-share/client/i18n.js,
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
    // header
    back: 'Library',
    title: 'Video Convert',
    tagline: 'Private · in-browser · no uploads',
    langLabel: 'Language',

    // drop zone
    pickBtn: 'Choose a video',
    dropHint: 'or drag & drop here',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv — processed locally, never uploaded',
    noRecorderWarn: 'This browser lacks MediaRecorder / canvas.captureStream.<br>Use a recent Chrome, Edge, Firefox or Safari.',
    recorderUnsupportedToast: "This browser can't record video — try a recent Chrome, Edge, Firefox or Safari.",

    // meta
    metaSizeLabel: 'Size',
    metaFrameLabel: 'Frame',
    metaTimeLabel: 'Time',
    metaTypeLabel: 'Type',

    // trim
    trimHeading: 'Trim (optional)',
    trimStartLabel: 'Start (s)',
    trimEndLabel: 'End (s)',
    setStartBtn: 'Set start to playhead',
    setEndBtn: 'Set end to playhead',

    // operation
    operationHeading: 'Operation',
    toolLabel: 'Tool',
    op_convert: 'Convert / Re-encode',
    op_compress: 'Compress',
    op_trim: 'Trim / Cut',
    op_audio: 'Extract audio',
    op_gif: 'Make GIF',
    op_frames: 'Grab frames',
    op_rotate: 'Rotate / Flip',
    op_speed: 'Change speed',

    // field labels
    fld_format: 'Format',
    fld_resolution: 'Resolution',
    fld_fps: 'Frame rate',
    fld_bitrate: 'Quality',
    fld_mute: 'Remove audio track',
    fld_preset: 'Target',
    fld_width: 'Width',
    fld_quality: 'Colors',
    fld_count: 'How many',
    fld_rotation: 'Rotate',
    fld_flipH: 'Flip horizontal',
    fld_flipV: 'Flip vertical',
    fld_rate: 'Speed',

    // field help
    help_format: 'Auto picks the best your browser supports.',
    help_preset: 'Smaller targets = lower resolution + bitrate.',

    // option words (technical tokens like webm/mp4/png/720p/fps numbers stay as-is)
    opt_auto: 'Auto',
    opt_original: 'Original',
    opt_high: 'High',
    opt_medium: 'Medium',
    opt_low: 'Low',
    opt_light: 'Light',
    opt_strong: 'Strong',
    opt_tiny: 'Tiny',

    // notes
    noteReencodeNeeds: 'Re-encode needs MediaRecorder + captureStream (recent browser).',

    // actions
    runBtn: 'Run',
    resetBtn: 'New video',

    // progress
    progressStarting: 'Starting…',
    progressEncoding: 'Encoding…',
    progressDone: 'Done',
    progressError: 'Error',
    progressFrame: 'Frame {i}/{count}',
    progressSampling: 'Sampling frame {i}/{count}',
    progressEncodingGif: 'Encoding GIF…',
    progressZipping: 'Zipping frames…',

    // result
    resultHeading: 'Result',
    downloadBtn: 'Download',
    downloadAllZip: 'Download all as .zip ({count})',

    // toasts
    toastPickVideo: 'Please choose a video file.',
    toastConvertFailed: 'Conversion failed.',
    toastZipFailed: 'Zip failed — downloading individually.',

    // iPhone-compatible preset
    iphonePresetBtn: '📱 Make iPhone-compatible',
    iphonePresetHelp: 'One tap: MP4 (H.264/AAC), capped at 1080p — plays directly in iPhone Photos, Messages and Mail.',
    iphoneUnsupported: "This browser can't record MP4/H.264 — only WebM is available here. Open this tool in Safari (iPhone/Mac) or a Chrome build with MP4 recording support (many Android phones) to get an iPhone-ready file.",
    iphonePresetDone: 'iPhone-compatible MP4 ready.',
  },
  ru: {
    back: 'Библиотека',
    title: 'Конвертер видео',
    tagline: 'Приватно · прямо в браузере · без загрузок',
    langLabel: 'Язык',

    pickBtn: 'Выбрать видео',
    dropHint: 'или перетащите сюда',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv — обработка локально, без загрузки на сервер',
    noRecorderWarn: 'В этом браузере нет MediaRecorder / canvas.captureStream.<br>Используйте свежий Chrome, Edge, Firefox или Safari.',
    recorderUnsupportedToast: 'Этот браузер не умеет записывать видео — попробуйте свежий Chrome, Edge, Firefox или Safari.',

    metaSizeLabel: 'Размер',
    metaFrameLabel: 'Кадр',
    metaTimeLabel: 'Время',
    metaTypeLabel: 'Тип',

    trimHeading: 'Обрезка (опционально)',
    trimStartLabel: 'Начало (с)',
    trimEndLabel: 'Конец (с)',
    setStartBtn: 'Начало = текущий момент',
    setEndBtn: 'Конец = текущий момент',

    operationHeading: 'Операция',
    toolLabel: 'Инструмент',
    op_convert: 'Конвертация / перекодирование',
    op_compress: 'Сжатие',
    op_trim: 'Обрезка',
    op_audio: 'Извлечь звук',
    op_gif: 'Сделать GIF',
    op_frames: 'Сохранить кадры',
    op_rotate: 'Поворот / отражение',
    op_speed: 'Изменить скорость',

    fld_format: 'Формат',
    fld_resolution: 'Разрешение',
    fld_fps: 'Частота кадров',
    fld_bitrate: 'Качество',
    fld_mute: 'Убрать звуковую дорожку',
    fld_preset: 'Цель',
    fld_width: 'Ширина',
    fld_quality: 'Цвета',
    fld_count: 'Сколько',
    fld_rotation: 'Поворот',
    fld_flipH: 'Отразить по горизонтали',
    fld_flipV: 'Отразить по вертикали',
    fld_rate: 'Скорость',

    help_format: 'Auto выбирает лучший вариант из поддерживаемых браузером.',
    help_preset: 'Меньшая цель = ниже разрешение и битрейт.',

    opt_auto: 'Авто',
    opt_original: 'Оригинал',
    opt_high: 'Высокое',
    opt_medium: 'Среднее',
    opt_low: 'Низкое',
    opt_light: 'Лёгкое',
    opt_strong: 'Сильное',
    opt_tiny: 'Минимальное',

    noteReencodeNeeds: 'Перекодирование требует MediaRecorder + captureStream (современный браузер).',

    runBtn: 'Запустить',
    resetBtn: 'Новое видео',

    progressStarting: 'Запуск…',
    progressEncoding: 'Кодирование…',
    progressDone: 'Готово',
    progressError: 'Ошибка',
    progressFrame: 'Кадр {i}/{count}',
    progressSampling: 'Сэмплирование кадра {i}/{count}',
    progressEncodingGif: 'Кодирование GIF…',
    progressZipping: 'Упаковка кадров в zip…',

    resultHeading: 'Результат',
    downloadBtn: 'Скачать',
    downloadAllZip: 'Скачать всё в .zip ({count})',

    toastPickVideo: 'Выберите видеофайл.',
    toastConvertFailed: 'Не удалось выполнить конвертацию.',
    toastZipFailed: 'Не удалось создать zip — файлы скачиваются по отдельности.',

    iphonePresetBtn: '📱 Сделать совместимым с iPhone',
    iphonePresetHelp: 'Один тап: MP4 (H.264/AAC), максимум 1080p — сразу откроется в Фото, Сообщениях и Почте iPhone.',
    iphoneUnsupported: 'Этот браузер не умеет записывать MP4/H.264 — здесь доступен только WebM. Откройте этот инструмент в Safari (iPhone/Mac) или в Chrome с поддержкой записи MP4 (многие Android-телефоны), чтобы получить файл, готовый для iPhone.',
    iphonePresetDone: 'MP4 для iPhone готов.',
  },
  zh: {
    back: '库',
    title: '视频转换',
    tagline: '隐私 · 浏览器本地处理 · 无需上传',
    langLabel: '语言',

    pickBtn: '选择视频',
    dropHint: '或将文件拖到此处',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv——本地处理，绝不上传',
    noRecorderWarn: '此浏览器不支持 MediaRecorder / canvas.captureStream。<br>请使用较新版本的 Chrome、Edge、Firefox 或 Safari。',
    recorderUnsupportedToast: '此浏览器无法录制视频——请尝试新版 Chrome、Edge、Firefox 或 Safari。',

    metaSizeLabel: '大小',
    metaFrameLabel: '画幅',
    metaTimeLabel: '时长',
    metaTypeLabel: '类型',

    trimHeading: '剪辑（可选）',
    trimStartLabel: '起点（秒）',
    trimEndLabel: '终点（秒）',
    setStartBtn: '将当前位置设为起点',
    setEndBtn: '将当前位置设为终点',

    operationHeading: '操作',
    toolLabel: '工具',
    op_convert: '转换 / 重新编码',
    op_compress: '压缩',
    op_trim: '剪辑',
    op_audio: '提取音频',
    op_gif: '制作 GIF',
    op_frames: '截取帧',
    op_rotate: '旋转 / 翻转',
    op_speed: '调整速度',

    fld_format: '格式',
    fld_resolution: '分辨率',
    fld_fps: '帧率',
    fld_bitrate: '质量',
    fld_mute: '移除音轨',
    fld_preset: '目标',
    fld_width: '宽度',
    fld_quality: '颜色数',
    fld_count: '数量',
    fld_rotation: '旋转',
    fld_flipH: '水平翻转',
    fld_flipV: '垂直翻转',
    fld_rate: '速度',

    help_format: '"自动"会选择浏览器支持的最佳格式。',
    help_preset: '目标越小，分辨率和码率越低。',

    opt_auto: '自动',
    opt_original: '原始',
    opt_high: '高',
    opt_medium: '中',
    opt_low: '低',
    opt_light: '轻度',
    opt_strong: '强力',
    opt_tiny: '极小',

    noteReencodeNeeds: '重新编码需要 MediaRecorder + captureStream（较新的浏览器）。',

    runBtn: '运行',
    resetBtn: '新视频',

    progressStarting: '正在开始…',
    progressEncoding: '正在编码…',
    progressDone: '完成',
    progressError: '出错',
    progressFrame: '第 {i}/{count} 帧',
    progressSampling: '正在采样第 {i}/{count} 帧',
    progressEncodingGif: '正在编码 GIF…',
    progressZipping: '正在打包为 zip…',

    resultHeading: '结果',
    downloadBtn: '下载',
    downloadAllZip: '全部下载为 .zip（{count}）',

    toastPickVideo: '请选择一个视频文件。',
    toastConvertFailed: '转换失败。',
    toastZipFailed: '打包失败——将单独下载文件。',

    iphonePresetBtn: '📱 转为 iPhone 兼容格式',
    iphonePresetHelp: '一键生成 MP4（H.264/AAC），最高 1080p——可直接在 iPhone 的照片、信息和邮件中播放。',
    iphoneUnsupported: '此浏览器无法录制 MP4/H.264——这里只能生成 WebM。请在 Safari（iPhone/Mac）或支持 MP4 录制的 Chrome（多数 Android 手机）中打开此工具，以获得可在 iPhone 上使用的文件。',
    iphonePresetDone: 'iPhone 兼容的 MP4 已生成。',
  },
  es: {
    back: 'Biblioteca',
    title: 'Convertidor de vídeo',
    tagline: 'Privado · en el navegador · sin subidas',
    langLabel: 'Idioma',

    pickBtn: 'Elegir un vídeo',
    dropHint: 'o arrástralo aquí',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv — procesado localmente, nunca se sube',
    noRecorderWarn: 'Este navegador no tiene MediaRecorder / canvas.captureStream.<br>Usa un Chrome, Edge, Firefox o Safari reciente.',
    recorderUnsupportedToast: 'Este navegador no puede grabar vídeo — prueba con un Chrome, Edge, Firefox o Safari reciente.',

    metaSizeLabel: 'Tamaño',
    metaFrameLabel: 'Fotograma',
    metaTimeLabel: 'Duración',
    metaTypeLabel: 'Tipo',

    trimHeading: 'Recorte (opcional)',
    trimStartLabel: 'Inicio (s)',
    trimEndLabel: 'Fin (s)',
    setStartBtn: 'Fijar inicio en el punto actual',
    setEndBtn: 'Fijar fin en el punto actual',

    operationHeading: 'Operación',
    toolLabel: 'Herramienta',
    op_convert: 'Convertir / Recodificar',
    op_compress: 'Comprimir',
    op_trim: 'Recortar',
    op_audio: 'Extraer audio',
    op_gif: 'Crear GIF',
    op_frames: 'Capturar fotogramas',
    op_rotate: 'Rotar / Voltear',
    op_speed: 'Cambiar velocidad',

    fld_format: 'Formato',
    fld_resolution: 'Resolución',
    fld_fps: 'Fotogramas por segundo',
    fld_bitrate: 'Calidad',
    fld_mute: 'Quitar pista de audio',
    fld_preset: 'Objetivo',
    fld_width: 'Ancho',
    fld_quality: 'Colores',
    fld_count: 'Cuántos',
    fld_rotation: 'Rotar',
    fld_flipH: 'Voltear horizontal',
    fld_flipV: 'Voltear vertical',
    fld_rate: 'Velocidad',

    help_format: 'Auto elige lo mejor que admite tu navegador.',
    help_preset: 'Objetivos más pequeños = menor resolución y bitrate.',

    opt_auto: 'Auto',
    opt_original: 'Original',
    opt_high: 'Alta',
    opt_medium: 'Media',
    opt_low: 'Baja',
    opt_light: 'Ligero',
    opt_strong: 'Fuerte',
    opt_tiny: 'Mínimo',

    noteReencodeNeeds: 'Recodificar necesita MediaRecorder + captureStream (navegador reciente).',

    runBtn: 'Ejecutar',
    resetBtn: 'Nuevo vídeo',

    progressStarting: 'Iniciando…',
    progressEncoding: 'Codificando…',
    progressDone: 'Listo',
    progressError: 'Error',
    progressFrame: 'Fotograma {i}/{count}',
    progressSampling: 'Muestreando fotograma {i}/{count}',
    progressEncodingGif: 'Codificando GIF…',
    progressZipping: 'Comprimiendo fotogramas en zip…',

    resultHeading: 'Resultado',
    downloadBtn: 'Descargar',
    downloadAllZip: 'Descargar todo como .zip ({count})',

    toastPickVideo: 'Elige un archivo de vídeo.',
    toastConvertFailed: 'La conversión falló.',
    toastZipFailed: 'Error al crear el zip — se descargará cada archivo por separado.',

    iphonePresetBtn: '📱 Hacer compatible con iPhone',
    iphonePresetHelp: 'Un toque: MP4 (H.264/AAC), máximo 1080p — se reproduce directamente en Fotos, Mensajes y Mail del iPhone.',
    iphoneUnsupported: 'Este navegador no puede grabar MP4/H.264 — aquí solo está disponible WebM. Abre esta herramienta en Safari (iPhone/Mac) o en una versión de Chrome con grabación MP4 (muchos teléfonos Android) para obtener un archivo listo para iPhone.',
    iphonePresetDone: 'MP4 compatible con iPhone listo.',
  },
  ar: {
    back: 'المكتبة',
    title: 'محول الفيديو',
    tagline: 'خاص · داخل المتصفح · بلا رفع ملفات',
    langLabel: 'اللغة',

    pickBtn: 'اختر فيديو',
    dropHint: 'أو اسحبه وأفلته هنا',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv — معالجة محلية بالكامل، بلا رفع أبدًا',
    noRecorderWarn: 'هذا المتصفح لا يملك MediaRecorder / canvas.captureStream.<br>استخدم إصدارًا حديثًا من Chrome أو Edge أو Firefox أو Safari.',
    recorderUnsupportedToast: 'هذا المتصفح لا يمكنه تسجيل الفيديو — جرّب إصدارًا حديثًا من Chrome أو Edge أو Firefox أو Safari.',

    metaSizeLabel: 'الحجم',
    metaFrameLabel: 'الإطار',
    metaTimeLabel: 'المدة',
    metaTypeLabel: 'النوع',

    trimHeading: 'قص (اختياري)',
    trimStartLabel: 'البداية (ث)',
    trimEndLabel: 'النهاية (ث)',
    setStartBtn: 'اجعل البداية عند موضع التشغيل',
    setEndBtn: 'اجعل النهاية عند موضع التشغيل',

    operationHeading: 'العملية',
    toolLabel: 'الأداة',
    op_convert: 'تحويل / إعادة ترميز',
    op_compress: 'ضغط',
    op_trim: 'قص',
    op_audio: 'استخراج الصوت',
    op_gif: 'إنشاء GIF',
    op_frames: 'التقاط إطارات',
    op_rotate: 'تدوير / قلب',
    op_speed: 'تغيير السرعة',

    fld_format: 'الصيغة',
    fld_resolution: 'الدقة',
    fld_fps: 'معدل الإطارات',
    fld_bitrate: 'الجودة',
    fld_mute: 'إزالة المسار الصوتي',
    fld_preset: 'الهدف',
    fld_width: 'العرض',
    fld_quality: 'الألوان',
    fld_count: 'العدد',
    fld_rotation: 'تدوير',
    fld_flipH: 'قلب أفقي',
    fld_flipV: 'قلب رأسي',
    fld_rate: 'السرعة',

    help_format: '"تلقائي" يختار أفضل خيار يدعمه متصفحك.',
    help_preset: 'الهدف الأصغر = دقة وبت ريت أقل.',

    opt_auto: 'تلقائي',
    opt_original: 'الأصلي',
    opt_high: 'عالية',
    opt_medium: 'متوسطة',
    opt_low: 'منخفضة',
    opt_light: 'خفيف',
    opt_strong: 'قوي',
    opt_tiny: 'صغير جدًا',

    noteReencodeNeeds: 'إعادة الترميز تتطلب MediaRecorder + captureStream (متصفح حديث).',

    runBtn: 'تشغيل',
    resetBtn: 'فيديو جديد',

    progressStarting: 'جارٍ البدء…',
    progressEncoding: 'جارٍ الترميز…',
    progressDone: 'تم',
    progressError: 'خطأ',
    progressFrame: 'الإطار {i}/{count}',
    progressSampling: 'أخذ عيّنة من الإطار {i}/{count}',
    progressEncodingGif: 'جارٍ ترميز GIF…',
    progressZipping: 'جارٍ ضغط الإطارات في zip…',

    resultHeading: 'النتيجة',
    downloadBtn: 'تنزيل',
    downloadAllZip: 'تنزيل الكل كملف .zip ({count})',

    toastPickVideo: 'الرجاء اختيار ملف فيديو.',
    toastConvertFailed: 'فشل التحويل.',
    toastZipFailed: 'فشل إنشاء ملف zip — سيتم تنزيل الملفات كل على حدة.',

    iphonePresetBtn: '📱 اجعله متوافقًا مع آيفون',
    iphonePresetHelp: 'نقرة واحدة: MP4 (H.264/AAC)، بحد أقصى 1080p — يعمل مباشرة في تطبيقات الصور والرسائل والبريد على آيفون.',
    iphoneUnsupported: 'هذا المتصفح لا يستطيع تسجيل MP4/H.264 — المتاح هنا هو WebM فقط. افتح هذه الأداة في Safari (آيفون/Mac) أو في متصفح Chrome يدعم تسجيل MP4 (كثير من هواتف أندرويد) للحصول على ملف جاهز لآيفون.',
    iphonePresetDone: 'ملف MP4 المتوافق مع آيفون جاهز.',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Convertisseur vidéo',
    tagline: 'Privé · dans le navigateur · aucun envoi',
    langLabel: 'Langue',

    pickBtn: 'Choisir une vidéo',
    dropHint: 'ou glissez-déposez ici',
    dropSub: 'mp4 · webm · mov · mkv · m4v · ogv — traitement local, jamais envoyé',
    noRecorderWarn: "Ce navigateur n'a pas MediaRecorder / canvas.captureStream.<br>Utilisez une version récente de Chrome, Edge, Firefox ou Safari.",
    recorderUnsupportedToast: 'Ce navigateur ne peut pas enregistrer de vidéo — essayez une version récente de Chrome, Edge, Firefox ou Safari.',

    metaSizeLabel: 'Taille',
    metaFrameLabel: 'Image',
    metaTimeLabel: 'Durée',
    metaTypeLabel: 'Type',

    trimHeading: 'Découpe (optionnel)',
    trimStartLabel: 'Début (s)',
    trimEndLabel: 'Fin (s)',
    setStartBtn: 'Régler le début sur la position actuelle',
    setEndBtn: 'Régler la fin sur la position actuelle',

    operationHeading: 'Opération',
    toolLabel: 'Outil',
    op_convert: 'Convertir / Réencoder',
    op_compress: 'Compresser',
    op_trim: 'Découper',
    op_audio: "Extraire l'audio",
    op_gif: 'Créer un GIF',
    op_frames: 'Extraire des images',
    op_rotate: 'Rotation / Miroir',
    op_speed: 'Changer la vitesse',

    fld_format: 'Format',
    fld_resolution: 'Résolution',
    fld_fps: "Fréquence d'images",
    fld_bitrate: 'Qualité',
    fld_mute: 'Supprimer la piste audio',
    fld_preset: 'Objectif',
    fld_width: 'Largeur',
    fld_quality: 'Couleurs',
    fld_count: 'Combien',
    fld_rotation: 'Rotation',
    fld_flipH: 'Miroir horizontal',
    fld_flipV: 'Miroir vertical',
    fld_rate: 'Vitesse',

    help_format: 'Auto choisit le meilleur format pris en charge par votre navigateur.',
    help_preset: 'Cible plus petite = résolution et débit plus faibles.',

    opt_auto: 'Auto',
    opt_original: 'Original',
    opt_high: 'Élevée',
    opt_medium: 'Moyenne',
    opt_low: 'Faible',
    opt_light: 'Léger',
    opt_strong: 'Fort',
    opt_tiny: 'Minuscule',

    noteReencodeNeeds: 'Le réencodage nécessite MediaRecorder + captureStream (navigateur récent).',

    runBtn: 'Lancer',
    resetBtn: 'Nouvelle vidéo',

    progressStarting: 'Démarrage…',
    progressEncoding: 'Encodage…',
    progressDone: 'Terminé',
    progressError: 'Erreur',
    progressFrame: 'Image {i}/{count}',
    progressSampling: 'Échantillonnage image {i}/{count}',
    progressEncodingGif: 'Encodage du GIF…',
    progressZipping: 'Compression des images en zip…',

    resultHeading: 'Résultat',
    downloadBtn: 'Télécharger',
    downloadAllZip: 'Tout télécharger en .zip ({count})',

    toastPickVideo: 'Veuillez choisir un fichier vidéo.',
    toastConvertFailed: 'Échec de la conversion.',
    toastZipFailed: 'Échec de la compression zip — téléchargement individuel des fichiers.',

    iphonePresetBtn: '📱 Rendre compatible iPhone',
    iphonePresetHelp: 'En un geste : MP4 (H.264/AAC), plafonné à 1080p — se lit directement dans Photos, Messages et Mail sur iPhone.',
    iphoneUnsupported: "Ce navigateur ne peut pas enregistrer en MP4/H.264 — seul le WebM est disponible ici. Ouvrez cet outil dans Safari (iPhone/Mac) ou une version de Chrome avec l'enregistrement MP4 (beaucoup de téléphones Android) pour obtenir un fichier prêt pour iPhone.",
    iphonePresetDone: 'MP4 compatible iPhone prêt.',
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
    const stored = localStorage.getItem('ogh_vc_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_vc_lang', lang);
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
