/**
 * i18n — string table for Ray Maze. Mirrors games/barrel-climb/client/i18n.js
 * and other siblings this batch (same shape): a flat STRINGS table per UN-6
 * language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — the header/back link,
 * HUD pill labels, the bottom hint, the overlay cards and touch-button
 * *aria-labels*. It deliberately does NOT mirror the first-person view, the
 * minimap, or the movement/turn directions. A raycast 3D scene and a top-down
 * minimap are fixed spatial renders (like a game board), not reading-order
 * text: mirroring them would silently invert every look/strafe direction
 * relative to the controls and flip the map east-for-west. The virtual stick
 * stays on the left and the look zone on the right in every language. Same
 * precedent as fight-arena's stage and barrel-climb's tower — see the
 * `dir="ltr"` on the stage/controls in index.html and the `ctx.direction =
 * 'ltr'` guard in game.js.
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
    title: 'Ray Maze',
    blurb:
      'Purge a corrupted neon data-vault of rogue security constructs. Stalk the corridors in first person, drop swarming Drones and sniping Sentries, then reach the exit once a sector is clear. A hand-built DDA raycasting engine — no textures, just glowing walls fading into the dark.',
    langSwitchAria: 'Language',
    startBtn: 'Enter the Vault',
    nextBtn: 'Next sector',
    playAgainBtn: 'Run again',
    healthLabel: 'HP',
    ammoLabel: 'AMMO',
    levelLabel: 'SECTOR',
    hudHealthAria: 'Health',
    hudAmmoAria: 'Ammunition',
    hudLevelAria: 'Sector',
    reloading: 'Reloading…',
    hint: 'Left stick moves · drag the right side to look · FIRE · ⟳ to reload',
    exitLocked: 'Exit locked · {n} constructs left',
    exitOpen: 'Exit online — reach it',
    levelClearBanner: 'Sector {n} cleared',
    levelClearSub: 'Every construct down. The exit is online — the next sector runs deeper and colder.',
    gameOverTitle: 'Flatlined',
    gameOverSub: 'The constructs overran you in sector {level}. Reboot and run it again.',
    victoryTitle: 'Vault Purged',
    victorySub: 'All sectors clear — every rogue construct is scrap. Clean run.',
    statsLine: 'Sector {level} · Constructs down {kills}',
    controlsNote:
      'Touch: left virtual stick to move/strafe, drag the right half to look around, FIRE and ⟳ (reload) buttons. Desktop: WASD/arrows to move, drag or ← → to look (double-click the view for pointer-lock mouse-look), click or Space to fire, R to reload.',
    legendDrone: 'Drone — melee swarmer',
    legendSentry: 'Sentry — ranged sniper',
    legendHealth: 'Repair cell — restores HP',
    legendExit: 'Exit — reach it once clear',
    btnFireAria: 'Fire',
    btnReloadAria: 'Reload',
  },
  ru: {
    back: 'Библиотека',
    title: 'Лучевой лабиринт',
    blurb:
      'Зачисти повреждённое неоновое хранилище данных от взбесившихся охранных конструктов. Крадись по коридорам от первого лица, уничтожай наседающих Дронов и стреляющих издалека Стражей, а затем доберись до выхода, когда сектор очищен. Движок DDA-рейкастинга написан вручную — без текстур, только светящиеся стены, тающие во тьме.',
    langSwitchAria: 'Язык',
    startBtn: 'Войти в хранилище',
    nextBtn: 'Следующий сектор',
    playAgainBtn: 'Ещё заход',
    healthLabel: 'ХП',
    ammoLabel: 'ПАТР',
    levelLabel: 'СЕКТОР',
    hudHealthAria: 'Здоровье',
    hudAmmoAria: 'Патроны',
    hudLevelAria: 'Сектор',
    reloading: 'Перезарядка…',
    hint: 'Левый стик — движение · тяни справа, чтобы осмотреться · ОГОНЬ · ⟳ — перезарядка',
    exitLocked: 'Выход закрыт · осталось конструктов: {n}',
    exitOpen: 'Выход открыт — доберись до него',
    levelClearBanner: 'Сектор {n} зачищен',
    levelClearSub: 'Все конструкты уничтожены. Выход открыт — следующий сектор глубже и холоднее.',
    gameOverTitle: 'Сигнал потерян',
    gameOverSub: 'Конструкты смяли тебя в секторе {level}. Перезагрузись и пройди заново.',
    victoryTitle: 'Хранилище очищено',
    victorySub: 'Все секторы зачищены — каждый взбесившийся конструкт стал металлоломом. Чистый забег.',
    statsLine: 'Сектор {level} · Уничтожено: {kills}',
    controlsNote:
      'Сенсор: левый виртуальный стик — движение/шаг вбок, тяни правую половину, чтобы осмотреться, кнопки ОГОНЬ и ⟳ (перезарядка). ПК: WASD/стрелки — движение, перетаскивание или ← → — обзор (двойной клик по виду — мышиный обзор с захватом), клик или пробел — огонь, R — перезарядка.',
    legendDrone: 'Дрон — ближний рой',
    legendSentry: 'Страж — дальний стрелок',
    legendHealth: 'Ремонтная ячейка — восстанавливает ХП',
    legendExit: 'Выход — дойди после зачистки',
    btnFireAria: 'Огонь',
    btnReloadAria: 'Перезарядка',
  },
  zh: {
    back: '资料库',
    title: '光线迷宫',
    blurb:
      '在第一人称视角下潜行走廊，清剿被入侵的霓虹数据库中失控的安保构造体。击倒成群扑来的「无人机」和远程狙击的「哨卫」，清空区块后抵达出口。这是一台手写的 DDA 光线投射引擎——没有贴图，只有在黑暗中渐隐的发光墙壁。',
    langSwitchAria: '语言',
    startBtn: '进入数据库',
    nextBtn: '下一区块',
    playAgainBtn: '再来一局',
    healthLabel: '生命',
    ammoLabel: '弹药',
    levelLabel: '区块',
    hudHealthAria: '生命值',
    hudAmmoAria: '弹药',
    hudLevelAria: '区块',
    reloading: '装填中…',
    hint: '左摇杆移动 · 拖动右半屏观察 · 开火 · ⟳ 装填',
    exitLocked: '出口锁定 · 剩余 {n} 个构造体',
    exitOpen: '出口已开启——快去抵达',
    levelClearBanner: '区块 {n} 已清空',
    levelClearSub: '所有构造体已被摧毁。出口已开启——下一区块更深、更冷。',
    gameOverTitle: '信号中断',
    gameOverSub: '你在区块 {level} 被构造体淹没。重启后再战。',
    victoryTitle: '数据库已肃清',
    victorySub: '所有区块清空——每个失控构造体都成了废铁。完美通关。',
    statsLine: '区块 {level} · 击毁 {kills}',
    controlsNote:
      '触屏：左侧虚拟摇杆移动/横移，拖动右半屏环视，开火与 ⟳（装填）按钮。桌面：WASD/方向键移动，拖动或 ← → 观察（双击画面启用指针锁定鼠标视角），点击或空格开火，R 装填。',
    legendDrone: '无人机——近战突袭',
    legendSentry: '哨卫——远程狙击',
    legendHealth: '维修单元——恢复生命',
    legendExit: '出口——清空后抵达',
    btnFireAria: '开火',
    btnReloadAria: '装填',
  },
  es: {
    back: 'Biblioteca',
    title: 'Laberinto de Rayos',
    blurb:
      'Purga una bóveda de datos de neón corrupta llena de constructos de seguridad descontrolados. Acecha los pasillos en primera persona, derriba a los Drones que se abalanzan y a los Centinelas que disparan a distancia, y alcanza la salida cuando el sector quede limpio. Un motor de raycasting DDA hecho a mano: sin texturas, solo muros brillantes que se desvanecen en la oscuridad.',
    langSwitchAria: 'Idioma',
    startBtn: 'Entrar a la bóveda',
    nextBtn: 'Siguiente sector',
    playAgainBtn: 'Jugar de nuevo',
    healthLabel: 'VIDA',
    ammoLabel: 'MUN',
    levelLabel: 'SECTOR',
    hudHealthAria: 'Salud',
    hudAmmoAria: 'Munición',
    hudLevelAria: 'Sector',
    reloading: 'Recargando…',
    hint: 'Joystick izquierdo para moverte · arrastra la mitad derecha para mirar · DISPARAR · ⟳ para recargar',
    exitLocked: 'Salida bloqueada · quedan {n} constructos',
    exitOpen: 'Salida activa — alcánzala',
    levelClearBanner: 'Sector {n} despejado',
    levelClearSub: 'Todos los constructos caídos. La salida está activa: el siguiente sector es más profundo y frío.',
    gameOverTitle: 'Sin señal',
    gameOverSub: 'Los constructos te desbordaron en el sector {level}. Reinicia y vuelve a intentarlo.',
    victoryTitle: 'Bóveda Purgada',
    victorySub: 'Todos los sectores despejados: cada constructo descontrolado es chatarra. Carrera limpia.',
    statsLine: 'Sector {level} · Constructos abatidos {kills}',
    controlsNote:
      'Táctil: joystick virtual izquierdo para moverte/desplazarte, arrastra la mitad derecha para mirar, botones DISPARAR y ⟳ (recargar). Escritorio: WASD/flechas para moverte, arrastra o ← → para mirar (doble clic en la vista para la visión con ratón y puntero bloqueado), clic o Espacio para disparar, R para recargar.',
    legendDrone: 'Dron — atacante cuerpo a cuerpo',
    legendSentry: 'Centinela — francotirador a distancia',
    legendHealth: 'Célula de reparación — restaura vida',
    legendExit: 'Salida — alcánzala al despejar',
    btnFireAria: 'Disparar',
    btnReloadAria: 'Recargar',
  },
  ar: {
    back: 'المكتبة',
    title: 'متاهة الأشعة',
    blurb:
      'طهّر خزنة بيانات نيونية مُخترَقة من مُركّبات الأمن المارقة. تسلّل في الممرات بمنظور الشخص الأول، وأسقِط الطائرات المسيّرة المندفعة والحُرّاس الذين يطلقون النار من بعيد، ثم اصل إلى المخرج بعد تطهير القطاع. محرك رسم بالأشعة DDA مكتوب يدويًا — بلا أنسجة، مجرد جدران متوهجة تتلاشى في الظلام.',
    langSwitchAria: 'اللغة',
    startBtn: 'ادخل الخزنة',
    nextBtn: 'القطاع التالي',
    playAgainBtn: 'العب مجددًا',
    healthLabel: 'صحة',
    ammoLabel: 'ذخيرة',
    levelLabel: 'قطاع',
    hudHealthAria: 'الصحة',
    hudAmmoAria: 'الذخيرة',
    hudLevelAria: 'القطاع',
    reloading: 'إعادة تلقيم…',
    hint: 'العصا اليسرى للحركة · اسحب النصف الأيمن للنظر · إطلاق · ⟳ لإعادة التلقيم',
    exitLocked: 'المخرج مقفل · تبقّى {n} مُركّبات',
    exitOpen: 'المخرج مُفعّل — اصل إليه',
    levelClearBanner: 'تم تطهير القطاع {n}',
    levelClearSub: 'سقطت كل المُركّبات. المخرج مُفعّل — القطاع التالي أعمق وأبرد.',
    gameOverTitle: 'انقطاع الإشارة',
    gameOverSub: 'اجتاحتك المُركّبات في القطاع {level}. أعد التشغيل وحاول مجددًا.',
    victoryTitle: 'تم تطهير الخزنة',
    victorySub: 'كل القطاعات نظيفة — كل مُركّب مارق صار خردة. جولة نظيفة.',
    statsLine: 'القطاع {level} · مُركّبات مُدمّرة {kills}',
    controlsNote:
      'باللمس: عصا افتراضية يسرى للحركة والتحرك الجانبي، اسحب النصف الأيمن للنظر حولك، زرّا إطلاق و⟳ (إعادة التلقيم). الحاسوب: WASD/الأسهم للحركة، السحب أو ← → للنظر (نقر مزدوج على العرض لتفعيل نظر الفأرة بقفل المؤشر)، النقر أو المسافة للإطلاق، R لإعادة التلقيم.',
    legendDrone: 'طائرة مسيّرة — مهاجم قريب',
    legendSentry: 'حارس — قنّاص من بعيد',
    legendHealth: 'خلية إصلاح — تستعيد الصحة',
    legendExit: 'المخرج — اصل إليه بعد التطهير',
    btnFireAria: 'إطلاق',
    btnReloadAria: 'إعادة تلقيم',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Labyrinthe de Rayons',
    blurb:
      'Purgez un coffre de données néon corrompu envahi de constructs de sécurité devenus fous. Rôdez dans les couloirs à la première personne, abattez les Drones qui foncent et les Sentinelles qui tirent à distance, puis atteignez la sortie une fois le secteur nettoyé. Un moteur de raycasting DDA fait main — sans textures, juste des murs lumineux qui se fondent dans le noir.',
    langSwitchAria: 'Langue',
    startBtn: 'Entrer dans le coffre',
    nextBtn: 'Secteur suivant',
    playAgainBtn: 'Rejouer',
    healthLabel: 'PV',
    ammoLabel: 'MUN',
    levelLabel: 'SECTEUR',
    hudHealthAria: 'Points de vie',
    hudAmmoAria: 'Munitions',
    hudLevelAria: 'Secteur',
    reloading: 'Rechargement…',
    hint: 'Joystick gauche pour bouger · glissez la moitié droite pour regarder · FEU · ⟳ pour recharger',
    exitLocked: 'Sortie verrouillée · {n} constructs restants',
    exitOpen: 'Sortie active — rejoignez-la',
    levelClearBanner: 'Secteur {n} nettoyé',
    levelClearSub: 'Tous les constructs sont tombés. La sortie est active — le secteur suivant est plus profond et plus froid.',
    gameOverTitle: 'Signal perdu',
    gameOverSub: 'Les constructs vous ont submergé au secteur {level}. Redémarrez et recommencez.',
    victoryTitle: 'Coffre Purgé',
    victorySub: 'Tous les secteurs nettoyés — chaque construct devenu fou est de la ferraille. Parcours net.',
    statsLine: 'Secteur {level} · Constructs abattus {kills}',
    controlsNote:
      'Tactile : joystick virtuel gauche pour bouger/vous déplacer latéralement, glissez la moitié droite pour regarder, boutons FEU et ⟳ (recharger). Bureau : WASD/flèches pour bouger, glissez ou ← → pour regarder (double-cliquez la vue pour la visée souris avec verrouillage du pointeur), clic ou Espace pour tirer, R pour recharger.',
    legendDrone: 'Drone — assaillant au corps à corps',
    legendSentry: 'Sentinelle — tireur à distance',
    legendHealth: 'Cellule de réparation — restaure les PV',
    legendExit: 'Sortie — rejoignez-la une fois nettoyé',
    btnFireAria: 'Tirer',
    btnReloadAria: 'Recharger',
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
    const stored = localStorage.getItem('ogh_ray_maze_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_ray_maze_lang', lang);
  } catch {
    /* ignore */
  }
}

/** Translate a key, with optional {placeholder} substitution. */
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
