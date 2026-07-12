/**
 * i18n — string table for Sled Lines. Same flat shape as
 * games/siege-break/client/i18n.js and the other siblings this batch: a
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link,
 * toolbar labels, hint, and the start card. It deliberately does NOT mirror
 * the canvas: the drawn track, the rider's physics rig, and the toolbar's
 * left-to-right tool order are a fixed spatial/gameplay convention, not
 * prose, and mirroring them would silently flip every drawn track and the
 * rider's nose/tail orientation for Arabic players — the exact mistake this
 * batch's earlier games (games/hill-rider, games/gem-swap, games/leap-quest,
 * games/siege-break) already caught and documented. The stage/canvas and the
 * toolbar are pinned dir="ltr" in the markup; game.js also forces
 * ctx.direction = 'ltr' for any canvas text as a second guard.
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN', ru: 'RU', zh: '中文', es: 'ES', ar: 'AR', fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    title: 'Sled Lines',
    blurb: 'Draw a track with your finger or mouse, then press Play and watch a physics sled ride it — a jointed rider, real gravity, and the path exactly as you drew it.',
    langSwitchAria: 'Language',
    toolsGroupAria: 'Drawing tools',
    toolTrackBtn: 'Track',
    toolTrackAria: 'Draw a track line',
    toolSceneryBtn: 'Scenery',
    toolSceneryAria: 'Draw a scenery line (decorative, no collision)',
    toolAccelBtn: 'Boost',
    toolAccelAria: 'Draw a boost line (speeds up the rider)',
    toolEraseBtn: 'Erase',
    toolEraseAria: 'Erase a line',
    undoBtn: 'Undo',
    undoAria: 'Undo the last line',
    clearBtn: 'Clear',
    clearAria: 'Clear all lines',
    playBtn: 'Play',
    playAria: 'Play — start the physics simulation',
    editBtn: 'Edit',
    editAria: 'Edit — stop and return to drawing',
    controlsNote: 'Touch or mouse (Pointer Events): press and drag to draw. Pick a line type below first. Keyboard: 1/2/3/4 pick a tool, U undo, Enter/Space toggles Play/Edit.',
    startBtn: 'Start drawing',
    hintTrack: 'Press and drag to draw a track line',
    hintScenery: 'Press and drag to draw a scenery line — the rider passes through it',
    hintAccel: 'Press and drag to draw a boost line — speeds the rider up when crossed',
    hintErase: 'Tap or drag near a line to erase it',
    hintPlaying: 'Watching the ride…',
    hintCrashed: 'Crashed! Press Edit to try again',
  },
  ru: {
    back: 'Библиотека',
    title: 'Санные линии',
    blurb: 'Нарисуй трассу пальцем или мышью, затем нажми «Играть» и смотри, как физические санки едут по ней — шарнирный райдер, настоящая гравитация и путь именно такой, какой ты нарисовал.',
    langSwitchAria: 'Язык',
    toolsGroupAria: 'Инструменты рисования',
    toolTrackBtn: 'Трасса',
    toolTrackAria: 'Нарисовать линию трассы',
    toolSceneryBtn: 'Пейзаж',
    toolSceneryAria: 'Нарисовать декоративную линию (без столкновений)',
    toolAccelBtn: 'Ускорение',
    toolAccelAria: 'Нарисовать линию ускорения (разгоняет райдера)',
    toolEraseBtn: 'Ластик',
    toolEraseAria: 'Стереть линию',
    undoBtn: 'Отменить',
    undoAria: 'Отменить последнюю линию',
    clearBtn: 'Очистить',
    clearAria: 'Очистить все линии',
    playBtn: 'Играть',
    playAria: 'Играть — запустить симуляцию физики',
    editBtn: 'Правка',
    editAria: 'Правка — остановить и вернуться к рисованию',
    controlsNote: 'Тач или мышь (Pointer Events): нажми и веди, чтобы рисовать. Сначала выбери тип линии внизу. Клавиатура: 1/2/3/4 — инструмент, U — отменить, Enter/Пробел — переключить Играть/Правка.',
    startBtn: 'Начать рисовать',
    hintTrack: 'Нажми и веди, чтобы нарисовать линию трассы',
    hintScenery: 'Нажми и веди, чтобы нарисовать декоративную линию — райдер проходит сквозь неё',
    hintAccel: 'Нажми и веди, чтобы нарисовать линию ускорения — разгоняет райдера при пересечении',
    hintErase: 'Нажми или веди рядом с линией, чтобы стереть её',
    hintPlaying: 'Смотрим заезд…',
    hintCrashed: 'Авария! Нажми «Правка», чтобы попробовать снова',
  },
  zh: {
    back: '资料库',
    title: '雪橇轨迹',
    blurb: '用手指或鼠标画一条轨迹，然后点击"开始"，看物理雪橇沿着你画的路线滑行、翻滚——关节玩偶乘客，真实重力，路线完全由你决定。',
    langSwitchAria: '语言',
    toolsGroupAria: '绘图工具',
    toolTrackBtn: '轨道',
    toolTrackAria: '绘制轨道线',
    toolSceneryBtn: '背景',
    toolSceneryAria: '绘制装饰线（不参与碰撞）',
    toolAccelBtn: '加速',
    toolAccelAria: '绘制加速线（让雪橇加速）',
    toolEraseBtn: '橡皮擦',
    toolEraseAria: '擦除一条线',
    undoBtn: '撤销',
    undoAria: '撤销最后一条线',
    clearBtn: '清空',
    clearAria: '清空所有线条',
    playBtn: '开始',
    playAria: '开始——启动物理模拟',
    editBtn: '编辑',
    editAria: '编辑——停止并返回绘图',
    controlsNote: '触屏或鼠标（指针事件）：按住并拖动即可绘制。请先在下方选择线条类型。键盘：1/2/3/4 选择工具，U 撤销，Enter/空格切换开始/编辑。',
    startBtn: '开始绘制',
    hintTrack: '按住并拖动以绘制轨道线',
    hintScenery: '按住并拖动以绘制装饰线——雪橇会穿过它',
    hintAccel: '按住并拖动以绘制加速线——经过时会加速',
    hintErase: '在线条附近点击或拖动即可擦除',
    hintPlaying: '正在观看滑行…',
    hintCrashed: '撞车了！点击"编辑"重试',
  },
  es: {
    back: 'Biblioteca',
    title: 'Líneas de Trineo',
    blurb: 'Dibuja una pista con el dedo o el ratón, luego pulsa Jugar y observa cómo un trineo físico la recorre: un jinete articulado, gravedad real, y el camino exactamente como tú lo dibujaste.',
    langSwitchAria: 'Idioma',
    toolsGroupAria: 'Herramientas de dibujo',
    toolTrackBtn: 'Pista',
    toolTrackAria: 'Dibujar una línea de pista',
    toolSceneryBtn: 'Decorado',
    toolSceneryAria: 'Dibujar una línea decorativa (sin colisión)',
    toolAccelBtn: 'Impulso',
    toolAccelAria: 'Dibujar una línea de impulso (acelera al jinete)',
    toolEraseBtn: 'Borrar',
    toolEraseAria: 'Borrar una línea',
    undoBtn: 'Deshacer',
    undoAria: 'Deshacer la última línea',
    clearBtn: 'Limpiar',
    clearAria: 'Borrar todas las líneas',
    playBtn: 'Jugar',
    playAria: 'Jugar — iniciar la simulación física',
    editBtn: 'Editar',
    editAria: 'Editar — detener y volver al dibujo',
    controlsNote: 'Táctil o ratón (Pointer Events): pulsa y arrastra para dibujar. Elige antes un tipo de línea abajo. Teclado: 1/2/3/4 elige herramienta, U deshace, Intro/Espacio alterna Jugar/Editar.',
    startBtn: 'Empezar a dibujar',
    hintTrack: 'Pulsa y arrastra para dibujar una línea de pista',
    hintScenery: 'Pulsa y arrastra para dibujar una línea decorativa — el jinete pasa a través de ella',
    hintAccel: 'Pulsa y arrastra para dibujar una línea de impulso — acelera al jinete al cruzarla',
    hintErase: 'Toca o arrastra cerca de una línea para borrarla',
    hintPlaying: 'Viendo el recorrido…',
    hintCrashed: '¡Choque! Pulsa Editar para volver a intentarlo',
  },
  ar: {
    back: 'المكتبة',
    title: 'خطوط الزحافة',
    blurb: 'ارسم مسارًا بإصبعك أو بالفأرة، ثم اضغط «ابدأ» وشاهد زحافة فيزيائية تنزلق وتتقلب فوق ما رسمته — راكب مفصلي، جاذبية حقيقية، والمسار تمامًا كما رسمته أنت.',
    langSwitchAria: 'اللغة',
    toolsGroupAria: 'أدوات الرسم',
    toolTrackBtn: 'مسار',
    toolTrackAria: 'ارسم خط مسار',
    toolSceneryBtn: 'خلفية',
    toolSceneryAria: 'ارسم خطًا زخرفيًا (بلا تصادم)',
    toolAccelBtn: 'تسريع',
    toolAccelAria: 'ارسم خط تسريع (يسرّع الراكب)',
    toolEraseBtn: 'ممحاة',
    toolEraseAria: 'امسح خطًا',
    undoBtn: 'تراجع',
    undoAria: 'تراجع عن آخر خط',
    clearBtn: 'مسح الكل',
    clearAria: 'امسح كل الخطوط',
    playBtn: 'ابدأ',
    playAria: 'ابدأ — شغّل محاكاة الفيزياء',
    editBtn: 'تحرير',
    editAria: 'تحرير — أوقف وعُد إلى الرسم',
    controlsNote: 'باللمس أو الفأرة (Pointer Events): اضغط واسحب للرسم. اختر نوع الخط أدناه أولاً. لوحة المفاتيح: 1/2/3/4 لاختيار الأداة، U للتراجع، Enter/مسافة للتبديل بين ابدأ/تحرير.',
    startBtn: 'ابدأ الرسم',
    hintTrack: 'اضغط واسحب لرسم خط مسار',
    hintScenery: 'اضغط واسحب لرسم خط زخرفي — يمر الراكب عبره',
    hintAccel: 'اضغط واسحب لرسم خط تسريع — يسرّع الراكب عند عبوره',
    hintErase: 'اضغط أو اسحب قرب خط لمسحه',
    hintPlaying: 'مشاهدة الرحلة…',
    hintCrashed: 'اصطدام! اضغط «تحرير» للمحاولة مجددًا',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Lignes de Luge',
    blurb: "Dessine une piste du doigt ou à la souris, puis appuie sur Jouer et regarde une luge physique glisser et culbuter sur ce que tu as dessiné — un pilote articulé, une vraie gravité, et le tracé exactement comme tu l'as dessiné.",
    langSwitchAria: 'Langue',
    toolsGroupAria: 'Outils de dessin',
    toolTrackBtn: 'Piste',
    toolTrackAria: 'Dessiner une ligne de piste',
    toolSceneryBtn: 'Décor',
    toolSceneryAria: 'Dessiner une ligne décorative (sans collision)',
    toolAccelBtn: 'Boost',
    toolAccelAria: 'Dessiner une ligne de boost (accélère le pilote)',
    toolEraseBtn: 'Gomme',
    toolEraseAria: 'Effacer une ligne',
    undoBtn: 'Annuler',
    undoAria: 'Annuler la dernière ligne',
    clearBtn: 'Effacer tout',
    clearAria: 'Effacer toutes les lignes',
    playBtn: 'Jouer',
    playAria: 'Jouer — démarrer la simulation physique',
    editBtn: 'Éditer',
    editAria: 'Éditer — arrêter et revenir au dessin',
    controlsNote: "Tactile ou souris (Pointer Events) : appuie et fais glisser pour dessiner. Choisis d'abord un type de ligne ci-dessous. Clavier : 1/2/3/4 choisissent un outil, U annule, Entrée/Espace bascule Jouer/Éditer.",
    startBtn: 'Commencer à dessiner',
    hintTrack: 'Appuie et fais glisser pour dessiner une ligne de piste',
    hintScenery: 'Appuie et fais glisser pour dessiner une ligne décorative — le pilote la traverse',
    hintAccel: 'Appuie et fais glisser pour dessiner une ligne de boost — accélère le pilote à son passage',
    hintErase: "Touche ou glisse près d'une ligne pour l'effacer",
    hintPlaying: 'Observation de la descente…',
    hintCrashed: 'Crash ! Appuie sur Éditer pour réessayer',
  },
};

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

export function detectLang() {
  const q = qs('lang');
  if (q && STRINGS[q]) return q;
  try {
    const stored = localStorage.getItem('ogh_sled_lines_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try { localStorage.setItem('ogh_sled_lines_lang', lang); } catch { /* ignore */ }
}

/** Translate a key, with optional {placeholder} substitution. */
export function t(lang, key, vars) {
  const dict = STRINGS[lang] || STRINGS.en;
  let s = dict[key] ?? STRINGS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function applyStaticStrings(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.has(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-aria')));
  });
}
