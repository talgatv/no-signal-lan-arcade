/**
 * i18n — small string table for Paint XP.
 * Mirrors the pattern used by games/programs/video-convert/client/i18n.js and
 * games/music-synth/client/i18n.js.
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
    appName: 'Paint XP',
    titleBar: 'untitled - Paint',
    backAria: 'Back to library',

    menuFile: 'File',
    menuEdit: 'Edit',
    menuView: 'View',
    menuImage: 'Image',
    menuColors: 'Colors',
    menuHelp: 'Help',

    fileNew: 'New',
    fileOpen: 'Open...',
    fileSave: 'Save as PNG',
    fileExit: 'Exit',

    editUndo: 'Undo',
    editRedo: 'Redo',
    editSelectAll: 'Select All',
    editClearSelection: 'Clear Selection',
    editClearImage: 'Clear Image',

    viewToolbox: 'Tool Box',
    viewColorBox: 'Color Box',
    viewStatusBar: 'Status Bar',

    imageFlipH: 'Flip Horizontal',
    imageFlipV: 'Flip Vertical',
    imageRotate: 'Rotate 90°',
    imageInvert: 'Invert Colors',

    colorsEdit: 'Edit Colors...',

    helpAbout: 'About Paint XP',

    toolSelect: 'Select',
    toolEraser: 'Eraser',
    toolFill: 'Fill With Color',
    toolPicker: 'Pick Color',
    toolPencil: 'Pencil',
    toolBrush: 'Brush',
    toolText: 'Text',
    toolLine: 'Line',
    toolRect: 'Rectangle',
    toolEllipse: 'Ellipse',

    sizeLabel: 'Size',
    filledLabel: 'Filled',

    statusReady: 'Ready',
    statusDims: '{w} x {h} px',
    statusPos: '{x}, {y}',
    statusSaved: 'Saved as PNG',
    statusOpened: 'Image opened',
    statusUndo: 'Undo',
    statusRedo: 'Redo',
    statusFilled: 'Filled',
    statusOutline: 'Outline',

    aboutTitle: 'About Paint XP',
    aboutBody: 'A tiny tribute to classic Windows XP Paint — draw, fill, and save PNGs, fully offline. Part of the Offline Games Hub.',

    confirmNewTitle: 'New',
    confirmNewBody: 'Start a new picture? Unsaved changes will be lost.',
    confirmClearTitle: 'Clear Image',
    confirmClearBody: 'Clear the whole picture? Unsaved changes will be lost.',

    btnOk: 'OK',
    btnCancel: 'Cancel',

    langLabel: 'Language',
    primaryColorAria: 'Foreground color (left click draws)',
    secondaryColorAria: 'Background color (right click / long-press draws)',
  },
  ru: {
    appName: 'Пэйнт XP',
    titleBar: 'безымянный - Paint',
    backAria: 'Назад в библиотеку',

    menuFile: 'Файл',
    menuEdit: 'Правка',
    menuView: 'Вид',
    menuImage: 'Рисунок',
    menuColors: 'Палитра',
    menuHelp: 'Справка',

    fileNew: 'Создать',
    fileOpen: 'Открыть...',
    fileSave: 'Сохранить как PNG',
    fileExit: 'Выход',

    editUndo: 'Отменить',
    editRedo: 'Повторить',
    editSelectAll: 'Выделить всё',
    editClearSelection: 'Очистить выделение',
    editClearImage: 'Очистить рисунок',

    viewToolbox: 'Панель инструментов',
    viewColorBox: 'Палитра цветов',
    viewStatusBar: 'Строка состояния',

    imageFlipH: 'Отразить по горизонтали',
    imageFlipV: 'Отразить по вертикали',
    imageRotate: 'Повернуть на 90°',
    imageInvert: 'Инвертировать цвета',

    colorsEdit: 'Изменить палитру...',

    helpAbout: 'О программе Paint XP',

    toolSelect: 'Выделение',
    toolEraser: 'Ластик',
    toolFill: 'Заливка',
    toolPicker: 'Пипетка',
    toolPencil: 'Карандаш',
    toolBrush: 'Кисть',
    toolText: 'Текст',
    toolLine: 'Линия',
    toolRect: 'Прямоугольник',
    toolEllipse: 'Эллипс',

    sizeLabel: 'Размер',
    filledLabel: 'Заливка',

    statusReady: 'Готово',
    statusDims: '{w} x {h} пикс.',
    statusPos: '{x}, {y}',
    statusSaved: 'Сохранено как PNG',
    statusOpened: 'Изображение открыто',
    statusUndo: 'Отмена',
    statusRedo: 'Повтор',
    statusFilled: 'С заливкой',
    statusOutline: 'Контур',

    aboutTitle: 'О программе Paint XP',
    aboutBody: 'Маленькая дань классическому Paint из Windows XP — рисуйте, заливайте и сохраняйте PNG полностью офлайн. Часть Offline Games Hub.',

    confirmNewTitle: 'Создать',
    confirmNewBody: 'Начать новый рисунок? Несохранённые изменения будут потеряны.',
    confirmClearTitle: 'Очистить рисунок',
    confirmClearBody: 'Очистить весь рисунок? Несохранённые изменения будут потеряны.',

    btnOk: 'ОК',
    btnCancel: 'Отмена',

    langLabel: 'Язык',
    primaryColorAria: 'Основной цвет (рисует левая кнопка)',
    secondaryColorAria: 'Фоновый цвет (рисует правая кнопка / долгое нажатие)',
  },
  zh: {
    appName: '画图 XP',
    titleBar: '无标题 - 画图',
    backAria: '返回库',

    menuFile: '文件',
    menuEdit: '编辑',
    menuView: '查看',
    menuImage: '图像',
    menuColors: '颜色',
    menuHelp: '帮助',

    fileNew: '新建',
    fileOpen: '打开...',
    fileSave: '保存为 PNG',
    fileExit: '退出',

    editUndo: '撤销',
    editRedo: '重做',
    editSelectAll: '全选',
    editClearSelection: '清除选定内容',
    editClearImage: '清除图像',

    viewToolbox: '工具箱',
    viewColorBox: '调色板',
    viewStatusBar: '状态栏',

    imageFlipH: '水平翻转',
    imageFlipV: '垂直翻转',
    imageRotate: '旋转 90°',
    imageInvert: '反色',

    colorsEdit: '编辑颜色...',

    helpAbout: '关于画图 XP',

    toolSelect: '选定框',
    toolEraser: '橡皮擦',
    toolFill: '用颜色填充',
    toolPicker: '取色',
    toolPencil: '铅笔',
    toolBrush: '刷子',
    toolText: '文字',
    toolLine: '直线',
    toolRect: '矩形',
    toolEllipse: '椭圆',

    sizeLabel: '大小',
    filledLabel: '填充',

    statusReady: '就绪',
    statusDims: '{w} x {h} 像素',
    statusPos: '{x}, {y}',
    statusSaved: '已保存为 PNG',
    statusOpened: '图像已打开',
    statusUndo: '撤销',
    statusRedo: '重做',
    statusFilled: '已填充',
    statusOutline: '仅轮廓',

    aboutTitle: '关于画图 XP',
    aboutBody: '向经典 Windows XP 画图程序致敬的迷你版本——离线绘画、填色并保存 PNG，完全离线运行。属于 Offline Games Hub 的一部分。',

    confirmNewTitle: '新建',
    confirmNewBody: '创建新图片？未保存的更改将丢失。',
    confirmClearTitle: '清除图像',
    confirmClearBody: '清除整张图片？未保存的更改将丢失。',

    btnOk: '确定',
    btnCancel: '取消',

    langLabel: '语言',
    primaryColorAria: '前景色（左键绘制）',
    secondaryColorAria: '背景色（右键 / 长按绘制）',
  },
  es: {
    appName: 'Paint XP',
    titleBar: 'sin título - Paint',
    backAria: 'Volver a la biblioteca',

    menuFile: 'Archivo',
    menuEdit: 'Edición',
    menuView: 'Ver',
    menuImage: 'Imagen',
    menuColors: 'Colores',
    menuHelp: 'Ayuda',

    fileNew: 'Nuevo',
    fileOpen: 'Abrir...',
    fileSave: 'Guardar como PNG',
    fileExit: 'Salir',

    editUndo: 'Deshacer',
    editRedo: 'Rehacer',
    editSelectAll: 'Seleccionar todo',
    editClearSelection: 'Borrar selección',
    editClearImage: 'Borrar imagen',

    viewToolbox: 'Caja de herramientas',
    viewColorBox: 'Paleta de colores',
    viewStatusBar: 'Barra de estado',

    imageFlipH: 'Voltear horizontalmente',
    imageFlipV: 'Voltear verticalmente',
    imageRotate: 'Girar 90°',
    imageInvert: 'Invertir colores',

    colorsEdit: 'Editar colores...',

    helpAbout: 'Acerca de Paint XP',

    toolSelect: 'Selección',
    toolEraser: 'Borrador',
    toolFill: 'Rellenar con color',
    toolPicker: 'Selector de color',
    toolPencil: 'Lápiz',
    toolBrush: 'Pincel',
    toolText: 'Texto',
    toolLine: 'Línea',
    toolRect: 'Rectángulo',
    toolEllipse: 'Elipse',

    sizeLabel: 'Tamaño',
    filledLabel: 'Relleno',

    statusReady: 'Listo',
    statusDims: '{w} x {h} px',
    statusPos: '{x}, {y}',
    statusSaved: 'Guardado como PNG',
    statusOpened: 'Imagen abierta',
    statusUndo: 'Deshacer',
    statusRedo: 'Rehacer',
    statusFilled: 'Relleno',
    statusOutline: 'Contorno',

    aboutTitle: 'Acerca de Paint XP',
    aboutBody: 'Un pequeño homenaje al clásico Paint de Windows XP: dibuja, rellena y guarda PNG, totalmente sin conexión. Parte de Offline Games Hub.',

    confirmNewTitle: 'Nuevo',
    confirmNewBody: '¿Empezar una imagen nueva? Los cambios sin guardar se perderán.',
    confirmClearTitle: 'Borrar imagen',
    confirmClearBody: '¿Borrar toda la imagen? Los cambios sin guardar se perderán.',

    btnOk: 'Aceptar',
    btnCancel: 'Cancelar',

    langLabel: 'Idioma',
    primaryColorAria: 'Color de primer plano (clic izquierdo dibuja)',
    secondaryColorAria: 'Color de fondo (clic derecho / pulsación larga dibuja)',
  },
  ar: {
    appName: 'الرسام XP',
    titleBar: 'بدون عنوان - Paint',
    backAria: 'العودة إلى المكتبة',

    menuFile: 'ملف',
    menuEdit: 'تحرير',
    menuView: 'عرض',
    menuImage: 'صورة',
    menuColors: 'ألوان',
    menuHelp: 'مساعدة',

    fileNew: 'جديد',
    fileOpen: 'فتح...',
    fileSave: 'حفظ كـ PNG',
    fileExit: 'خروج',

    editUndo: 'تراجع',
    editRedo: 'إعادة',
    editSelectAll: 'تحديد الكل',
    editClearSelection: 'مسح التحديد',
    editClearImage: 'مسح الصورة',

    viewToolbox: 'صندوق الأدوات',
    viewColorBox: 'صندوق الألوان',
    viewStatusBar: 'شريط الحالة',

    imageFlipH: 'اقلب أفقيًا',
    imageFlipV: 'اقلب رأسيًا',
    imageRotate: 'تدوير 90°',
    imageInvert: 'عكس الألوان',

    colorsEdit: 'تحرير الألوان...',

    helpAbout: 'حول الرسام XP',

    toolSelect: 'تحديد',
    toolEraser: 'ممحاة',
    toolFill: 'تعبئة بالألوان',
    toolPicker: 'اختيار الألوان',
    toolPencil: 'قلم رصاص',
    toolBrush: 'فرشاة',
    toolText: 'نص',
    toolLine: 'خط',
    toolRect: 'مستطيل',
    toolEllipse: 'بيضاوي',

    sizeLabel: 'الحجم',
    filledLabel: 'تعبئة',

    statusReady: 'جاهز',
    statusDims: '{w} x {h} بكسل',
    statusPos: '{x}, {y}',
    statusSaved: 'تم الحفظ كـ PNG',
    statusOpened: 'تم فتح الصورة',
    statusUndo: 'تراجع',
    statusRedo: 'إعادة',
    statusFilled: 'معبأ',
    statusOutline: 'إطار فقط',

    aboutTitle: 'حول الرسام XP',
    aboutBody: 'تحية صغيرة لبرنامج الرسام الكلاسيكي من Windows XP — ارسم واملأ واحفظ صور PNG بدون اتصال بالإنترنت تمامًا. جزء من Offline Games Hub.',

    confirmNewTitle: 'جديد',
    confirmNewBody: 'بدء صورة جديدة؟ ستُفقد التغييرات غير المحفوظة.',
    confirmClearTitle: 'مسح الصورة',
    confirmClearBody: 'مسح الصورة بالكامل؟ ستُفقد التغييرات غير المحفوظة.',

    btnOk: 'موافق',
    btnCancel: 'إلغاء',

    langLabel: 'اللغة',
    primaryColorAria: 'لون المقدمة (النقر بزر الفأرة الأيسر يرسم به)',
    secondaryColorAria: 'لون الخلفية (النقر بزر الفأرة الأيمن أو الضغط المطول يرسم به)',
  },
  fr: {
    appName: 'Paint XP',
    titleBar: 'sans titre - Paint',
    backAria: 'Retour à la bibliothèque',

    menuFile: 'Fichier',
    menuEdit: 'Édition',
    menuView: 'Affichage',
    menuImage: 'Image',
    menuColors: 'Couleurs',
    menuHelp: 'Aide',

    fileNew: 'Nouveau',
    fileOpen: 'Ouvrir...',
    fileSave: 'Enregistrer en PNG',
    fileExit: 'Quitter',

    editUndo: 'Annuler',
    editRedo: 'Rétablir',
    editSelectAll: 'Tout sélectionner',
    editClearSelection: 'Effacer la sélection',
    editClearImage: "Effacer l'image",

    viewToolbox: 'Boîte à outils',
    viewColorBox: 'Palette de couleurs',
    viewStatusBar: "Barre d'état",

    imageFlipH: 'Retourner horizontalement',
    imageFlipV: 'Retourner verticalement',
    imageRotate: 'Pivoter à 90°',
    imageInvert: 'Inverser les couleurs',

    colorsEdit: 'Modifier les couleurs...',

    helpAbout: 'À propos de Paint XP',

    toolSelect: 'Sélection',
    toolEraser: 'Gomme',
    toolFill: 'Remplir de couleur',
    toolPicker: 'Pipette',
    toolPencil: 'Crayon',
    toolBrush: 'Pinceau',
    toolText: 'Texte',
    toolLine: 'Ligne',
    toolRect: 'Rectangle',
    toolEllipse: 'Ellipse',

    sizeLabel: 'Taille',
    filledLabel: 'Rempli',

    statusReady: 'Prêt',
    statusDims: '{w} x {h} px',
    statusPos: '{x}, {y}',
    statusSaved: 'Enregistré en PNG',
    statusOpened: 'Image ouverte',
    statusUndo: 'Annuler',
    statusRedo: 'Rétablir',
    statusFilled: 'Rempli',
    statusOutline: 'Contour',

    aboutTitle: 'À propos de Paint XP',
    aboutBody: "Un petit hommage au Paint classique de Windows XP — dessinez, remplissez et enregistrez des PNG, entièrement hors ligne. Fait partie d'Offline Games Hub.",

    confirmNewTitle: 'Nouveau',
    confirmNewBody: 'Commencer une nouvelle image ? Les modifications non enregistrées seront perdues.',
    confirmClearTitle: "Effacer l'image",
    confirmClearBody: "Effacer toute l'image ? Les modifications non enregistrées seront perdues.",

    btnOk: 'OK',
    btnCancel: 'Annuler',

    langLabel: 'Langue',
    primaryColorAria: 'Couleur de premier plan (le clic gauche dessine)',
    secondaryColorAria: 'Couleur de fond (le clic droit / appui long dessine)',
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
    const stored = localStorage.getItem('ogh_paintxp_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_paintxp_lang', lang);
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

/**
 * Applies translated text to [data-i18n] etc., and sets the *document's*
 * lang/dir. NOTE: the simulated XP window chrome (title bar, menu bar,
 * toolbox, palette, canvas, status bar) deliberately forces `direction: ltr`
 * back via CSS regardless of document dir — see the big comment on
 * `.xp-window` in style.css. That mirrors games/music-synth's `.pk-piano
 * { direction: ltr }` precedent: translate every string, but never let RTL
 * mirror a layout whose *positions* carry meaning (tool grid order, palette
 * swatch order, the canvas itself). Free-running prose (dialog bodies) is
 * re-flipped to rtl explicitly in app.js where it's safe to do so.
 */
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
    el.setAttribute('aria-label', t(lang, key));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(lang, key);
  });
}
