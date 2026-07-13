/**
 * i18n — one shared string table for the whole Brick Game collection: the
 * pick-a-game menu, the HUD labels, per-game start blurbs/controls, and the
 * game-over/results flow for Tanks, Snake and Breakout. Same shape as
 * games/void-drift/client/i18n.js and the other siblings this batch.
 *
 * RTL (Arabic) flips ONLY the surrounding HTML text chrome — the header/back
 * link, HUD readout, menu list, overlay cards, hint and the D-pad/button
 * aria-labels. It deliberately never mirrors the LCD dot field of any of the
 * three games: those are spatial grids where "up/down/left/right" is muscle
 * memory and movement, not reading order. The <canvas> stage is dir="ltr"
 * (and lcd.js forces ctx.direction='ltr'), exactly like void-drift's and
 * ray-maze's play fields. This mirroring mistake has bitten earlier games in
 * this batch, so the guard is deliberate.
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
    title: 'Brick Game',
    tagline: '3-in-1 handheld classics',
    langSwitchAria: 'Language',
    menuBtnAria: 'Back to menu',
    aBtnAria: 'Action button',
    bBtnAria: 'B button',
    dpadUpAria: 'Up',
    dpadDownAria: 'Down',
    dpadLeftAria: 'Left',
    dpadRightAria: 'Right',
    hudScore: 'SCORE',
    hudBest: 'HI',
    hudLives: 'LIVES',
    hudWave: 'WAVE',
    hudLevel: 'LEVEL',
    hudLen: 'LEN',
    hudEnemies: 'LEFT',
    menuHint: 'D-pad to choose · A to play',
    tanksName: 'Tanks',
    snakeName: 'Snake',
    arkanoidName: 'Breakout',
    tanksDesc: 'Defend the base',
    snakeDesc: 'Eat and grow',
    arkanoidDesc: 'Smash the wall',
    bestShort: 'Best',
    noScore: 'no score yet',
    startPrompt: 'Press A to start',
    gameOver: 'Game Over',
    win: 'Cleared!',
    finalScore: 'Score',
    newBest: 'New best!',
    playAgain: 'Play again',
    toMenu: 'Menu',
    wavePrefix: 'WAVE {n}',
    levelPrefix: 'LEVEL {n}',
    readyBanner: 'READY',
    tanksBlurb:
      'Steel walls block shots, brick walls crumble away. Wipe out every enemy tank wave after wave — but if they punch through to your base, the run is over even with lives to spare.',
    snakeBlurb:
      'Eat the blinking blips to grow longer, and every bite speeds you up. Bite your own tail or hit the wall and it ends.',
    arkanoidBlurb:
      'Bounce the ball to break every brick. Hit it with the edge of the paddle to send it off at a sharper angle than a dead-centre hit. Do not let it fall past you.',
    tanksControls: 'D-pad moves & aims · A fires',
    snakeControls: 'D-pad turns the snake',
    arkanoidControls: 'D-pad or drag moves the paddle · A launches',
    tanksOverSub: 'Your tanks are gone.',
    baseLost: 'Your base was destroyed!',
    snakeOverSub: 'The snake crashed.',
    arkanoidOverSub: 'The ball got past you.',
    allCleared: 'You cleared every wall!',
    hintMenu: 'Pick a game — D-pad to choose, A to play',
    hintTanks: 'Defend the base — D-pad moves, A fires',
    hintSnake: 'Turn with the D-pad — do not hit the wall or yourself',
    hintArkanoid: 'Move the paddle — A to launch the ball',
  },
  ru: {
    back: 'Библиотека',
    title: 'Брик-гейм',
    tagline: '3 карманные классики в одном',
    langSwitchAria: 'Язык',
    menuBtnAria: 'Назад в меню',
    aBtnAria: 'Кнопка действия',
    bBtnAria: 'Кнопка B',
    dpadUpAria: 'Вверх',
    dpadDownAria: 'Вниз',
    dpadLeftAria: 'Влево',
    dpadRightAria: 'Вправо',
    hudScore: 'ОЧКИ',
    hudBest: 'РЕК',
    hudLives: 'ЖИЗНИ',
    hudWave: 'ВОЛНА',
    hudLevel: 'УР',
    hudLen: 'ДЛ',
    hudEnemies: 'ОСТ',
    menuHint: 'Крестовина — выбор · A — играть',
    tanksName: 'Танки',
    snakeName: 'Змейка',
    arkanoidName: 'Арканоид',
    tanksDesc: 'Защити базу',
    snakeDesc: 'Ешь и расти',
    arkanoidDesc: 'Разбей стену',
    bestShort: 'Рекорд',
    noScore: 'ещё нет счёта',
    startPrompt: 'Нажмите A, чтобы начать',
    gameOver: 'Игра окончена',
    win: 'Пройдено!',
    finalScore: 'Очки',
    newBest: 'Новый рекорд!',
    playAgain: 'Ещё раз',
    toMenu: 'Меню',
    wavePrefix: 'ВОЛНА {n}',
    levelPrefix: 'УРОВЕНЬ {n}',
    readyBanner: 'ГОТОВЬСЯ',
    tanksBlurb:
      'Стальные стены не пробить, кирпичные — крошатся. Уничтожай вражеские танки волна за волной, но если они прорвутся к базе — конец, даже если остались жизни.',
    snakeBlurb:
      'Ешь мигающие точки, чтобы расти длиннее, и с каждым укусом скорость растёт. Укусишь свой хвост или врежешься в стену — конец.',
    arkanoidBlurb:
      'Отбивай мяч и разбей все кирпичи. Удар краем ракетки закручивает мяч под более острым углом, чем удар по центру. Не дай ему упасть.',
    tanksControls: 'Крестовина — движение и прицел · A — огонь',
    snakeControls: 'Крестовина поворачивает змейку',
    arkanoidControls: 'Крестовина или перетаскивание — ракетка · A — запуск',
    tanksOverSub: 'Твои танки уничтожены.',
    baseLost: 'Твоя база разрушена!',
    snakeOverSub: 'Змейка разбилась.',
    arkanoidOverSub: 'Мяч проскочил мимо.',
    allCleared: 'Ты разбил все стены!',
    hintMenu: 'Выбери игру — крестовина, A — играть',
    hintTanks: 'Защищай базу — крестовина двигает, A — огонь',
    hintSnake: 'Поворачивай крестовиной — не бей в стену и в себя',
    hintArkanoid: 'Двигай ракетку — A запускает мяч',
  },
  zh: {
    back: '游戏库',
    title: '砖块游戏机',
    tagline: '三合一掌机经典',
    langSwitchAria: '语言',
    menuBtnAria: '返回菜单',
    aBtnAria: '动作键',
    bBtnAria: 'B 键',
    dpadUpAria: '上',
    dpadDownAria: '下',
    dpadLeftAria: '左',
    dpadRightAria: '右',
    hudScore: '得分',
    hudBest: '最高',
    hudLives: '生命',
    hudWave: '波次',
    hudLevel: '关卡',
    hudLen: '长度',
    hudEnemies: '剩余',
    menuHint: '方向键选择 · A 开始',
    tanksName: '坦克',
    snakeName: '贪吃蛇',
    arkanoidName: '打砖块',
    tanksDesc: '保卫基地',
    snakeDesc: '进食成长',
    arkanoidDesc: '打碎砖墙',
    bestShort: '最高',
    noScore: '暂无分数',
    startPrompt: '按 A 开始',
    gameOver: '游戏结束',
    win: '过关！',
    finalScore: '得分',
    newBest: '新纪录！',
    playAgain: '再玩一次',
    toMenu: '菜单',
    wavePrefix: '第 {n} 波',
    levelPrefix: '第 {n} 关',
    readyBanner: '准备',
    tanksBlurb:
      '钢墙挡住子弹，砖墙会被打碎。一波波击毁所有敌方坦克——但若它们突破到你的基地，即使还有生命，游戏也就结束了。',
    snakeBlurb:
      '吃掉闪烁的光点让身体更长，每吃一口速度就更快。咬到自己的尾巴或撞墙就结束了。',
    arkanoidBlurb:
      '反弹小球打碎每一块砖。用挡板边缘击球，能打出比正中击球更大的角度。别让球从你身边掉下去。',
    tanksControls: '方向键移动与瞄准 · A 开火',
    snakeControls: '方向键控制转向',
    arkanoidControls: '方向键或拖动移动挡板 · A 发射',
    tanksOverSub: '你的坦克都没了。',
    baseLost: '你的基地被摧毁了！',
    snakeOverSub: '贪吃蛇撞毁了。',
    arkanoidOverSub: '小球从你身边溜走了。',
    allCleared: '你打通了所有砖墙！',
    hintMenu: '选择一个游戏——方向键选择，A 开始',
    hintTanks: '保卫基地——方向键移动，A 开火',
    hintSnake: '用方向键转向——别撞墙也别撞自己',
    hintArkanoid: '移动挡板——A 发射小球',
  },
  es: {
    back: 'Biblioteca',
    title: 'Brick Game',
    tagline: '3 clásicos de bolsillo en 1',
    langSwitchAria: 'Idioma',
    menuBtnAria: 'Volver al menú',
    aBtnAria: 'Botón de acción',
    bBtnAria: 'Botón B',
    dpadUpAria: 'Arriba',
    dpadDownAria: 'Abajo',
    dpadLeftAria: 'Izquierda',
    dpadRightAria: 'Derecha',
    hudScore: 'PUNTOS',
    hudBest: 'RÉCORD',
    hudLives: 'VIDAS',
    hudWave: 'OLEADA',
    hudLevel: 'NIVEL',
    hudLen: 'LONG',
    hudEnemies: 'QUEDAN',
    menuHint: 'Cruceta para elegir · A para jugar',
    tanksName: 'Tanques',
    snakeName: 'Serpiente',
    arkanoidName: 'Rompemuros',
    tanksDesc: 'Defiende la base',
    snakeDesc: 'Come y crece',
    arkanoidDesc: 'Rompe el muro',
    bestShort: 'Récord',
    noScore: 'sin puntuación',
    startPrompt: 'Pulsa A para empezar',
    gameOver: 'Fin del juego',
    win: '¡Superado!',
    finalScore: 'Puntos',
    newBest: '¡Nuevo récord!',
    playAgain: 'Jugar de nuevo',
    toMenu: 'Menú',
    wavePrefix: 'OLEADA {n}',
    levelPrefix: 'NIVEL {n}',
    readyBanner: 'LISTO',
    tanksBlurb:
      'Los muros de acero bloquean los disparos, los de ladrillo se desmoronan. Aniquila cada tanque enemigo oleada tras oleada, pero si llegan a tu base, se acabó aunque te queden vidas.',
    snakeBlurb:
      'Come los puntos parpadeantes para crecer, y cada bocado te acelera. Muerde tu propia cola o choca con el muro y se acaba.',
    arkanoidBlurb:
      'Rebota la bola para romper cada ladrillo. Golpéala con el borde de la pala para lanzarla en un ángulo más cerrado que un golpe centrado. No dejes que caiga.',
    tanksControls: 'La cruceta mueve y apunta · A dispara',
    snakeControls: 'La cruceta gira la serpiente',
    arkanoidControls: 'Cruceta o arrastre mueve la pala · A lanza',
    tanksOverSub: 'Tus tanques han caído.',
    baseLost: '¡Tu base fue destruida!',
    snakeOverSub: 'La serpiente se estrelló.',
    arkanoidOverSub: 'La bola te superó.',
    allCleared: '¡Rompiste todos los muros!',
    hintMenu: 'Elige un juego — cruceta, A para jugar',
    hintTanks: 'Defiende la base — cruceta mueve, A dispara',
    hintSnake: 'Gira con la cruceta — no choques con el muro ni contigo',
    hintArkanoid: 'Mueve la pala — A lanza la bola',
  },
  ar: {
    back: 'المكتبة',
    title: 'بريك جيم',
    tagline: '٣ ألعاب كلاسيكية في جهاز واحد',
    langSwitchAria: 'اللغة',
    menuBtnAria: 'العودة للقائمة',
    aBtnAria: 'زر الإجراء',
    bBtnAria: 'زر B',
    dpadUpAria: 'أعلى',
    dpadDownAria: 'أسفل',
    dpadLeftAria: 'يسار',
    dpadRightAria: 'يمين',
    hudScore: 'النقاط',
    hudBest: 'الأعلى',
    hudLives: 'الأرواح',
    hudWave: 'الموجة',
    hudLevel: 'المستوى',
    hudLen: 'الطول',
    hudEnemies: 'المتبقي',
    menuHint: 'لوحة الاتجاهات للاختيار · A للعب',
    tanksName: 'دبابات',
    snakeName: 'الثعبان',
    arkanoidName: 'كسر الطوب',
    tanksDesc: 'دافع عن القاعدة',
    snakeDesc: 'كُل وانمُ',
    arkanoidDesc: 'حطّم الجدار',
    bestShort: 'الأفضل',
    noScore: 'لا نتيجة بعد',
    startPrompt: 'اضغط A للبدء',
    gameOver: 'انتهت اللعبة',
    win: 'اجتزتها!',
    finalScore: 'النقاط',
    newBest: 'رقم قياسي جديد!',
    playAgain: 'العب مجددًا',
    toMenu: 'القائمة',
    wavePrefix: 'الموجة {n}',
    levelPrefix: 'المستوى {n}',
    readyBanner: 'استعد',
    tanksBlurb:
      'الجدران الفولاذية تصدّ الطلقات، والطوبية تتفتّت. أبِد كل دبابة معادية موجةً بعد موجة، لكن إن اخترقت إلى قاعدتك فقد انتهى الأمر حتى لو بقيت لك أرواح.',
    snakeBlurb:
      'كُل النقاط الوامضة لتطول، وكل لقمة تزيد سرعتك. إن عضضت ذيلك أو اصطدمت بالجدار فقد انتهى الأمر.',
    arkanoidBlurb:
      'اضرب الكرة لتحطيم كل قطعة طوب. اضربها بحافة المضرب لترسلها بزاوية أحدّ من ضربة المنتصف. لا تدعها تسقط خلفك.',
    tanksControls: 'لوحة الاتجاهات للتحرك والتصويب · A لإطلاق النار',
    snakeControls: 'لوحة الاتجاهات تُدير الثعبان',
    arkanoidControls: 'لوحة الاتجاهات أو السحب لتحريك المضرب · A للإطلاق',
    tanksOverSub: 'دُمّرت كل دباباتك.',
    baseLost: 'دُمّرت قاعدتك!',
    snakeOverSub: 'اصطدم الثعبان.',
    arkanoidOverSub: 'أفلتت الكرة من أمامك.',
    allCleared: 'حطّمت كل الجدران!',
    hintMenu: 'اختر لعبة — لوحة الاتجاهات، A للعب',
    hintTanks: 'دافع عن القاعدة — الاتجاهات للتحرك، A للنار',
    hintSnake: 'انعطف بلوحة الاتجاهات — لا تصطدم بالجدار أو بنفسك',
    hintArkanoid: 'حرّك المضرب — A يُطلق الكرة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Brick Game',
    tagline: '3 classiques de poche en 1',
    langSwitchAria: 'Langue',
    menuBtnAria: 'Retour au menu',
    aBtnAria: 'Bouton action',
    bBtnAria: 'Bouton B',
    dpadUpAria: 'Haut',
    dpadDownAria: 'Bas',
    dpadLeftAria: 'Gauche',
    dpadRightAria: 'Droite',
    hudScore: 'SCORE',
    hudBest: 'REC',
    hudLives: 'VIES',
    hudWave: 'VAGUE',
    hudLevel: 'NIVEAU',
    hudLen: 'LONG',
    hudEnemies: 'RESTE',
    menuHint: 'Croix directionnelle pour choisir · A pour jouer',
    tanksName: 'Chars',
    snakeName: 'Serpent',
    arkanoidName: 'Casse-briques',
    tanksDesc: 'Défendez la base',
    snakeDesc: 'Mangez et grandissez',
    arkanoidDesc: 'Cassez le mur',
    bestShort: 'Record',
    noScore: 'pas encore de score',
    startPrompt: 'Appuyez sur A pour commencer',
    gameOver: 'Partie terminée',
    win: 'Terminé !',
    finalScore: 'Score',
    newBest: 'Nouveau record !',
    playAgain: 'Rejouer',
    toMenu: 'Menu',
    wavePrefix: 'VAGUE {n}',
    levelPrefix: 'NIVEAU {n}',
    readyBanner: 'PRÊT',
    tanksBlurb:
      "Les murs d'acier bloquent les tirs, les murs de briques s'effritent. Anéantissez chaque char ennemi vague après vague, mais s'ils percent jusqu'à votre base, c'est fini même s'il vous reste des vies.",
    snakeBlurb:
      'Mangez les points clignotants pour grandir, et chaque bouchée vous accélère. Mordez votre propre queue ou heurtez le mur et c’est fini.',
    arkanoidBlurb:
      "Faites rebondir la balle pour casser chaque brique. Frappez-la avec le bord de la raquette pour l'envoyer sous un angle plus marqué qu'un coup centré. Ne la laissez pas tomber.",
    tanksControls: 'La croix déplace et vise · A tire',
    snakeControls: 'La croix fait tourner le serpent',
    arkanoidControls: 'La croix ou le glissement déplace la raquette · A lance',
    tanksOverSub: 'Vos chars sont détruits.',
    baseLost: 'Votre base a été détruite !',
    snakeOverSub: "Le serpent s'est écrasé.",
    arkanoidOverSub: 'La balle vous a échappé.',
    allCleared: 'Vous avez cassé tous les murs !',
    hintMenu: 'Choisissez un jeu — croix, A pour jouer',
    hintTanks: 'Défendez la base — la croix bouge, A tire',
    hintSnake: 'Tournez avec la croix — ne heurtez ni le mur ni vous-même',
    hintArkanoid: 'Déplacez la raquette — A lance la balle',
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
    const stored = localStorage.getItem('ogh_brick_game_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_brick_game_lang', lang);
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

export function isRtl(lang) {
  return RTL_LANGS.has(lang);
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
