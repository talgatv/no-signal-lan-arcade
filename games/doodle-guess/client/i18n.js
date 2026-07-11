/**
 * i18n — UI-chrome string table for Doodle Guess.
 * Mirrors games/billiards/client/i18n.js and games/mini-golf/client/i18n.js
 * (same batch, same shape): a flat STRINGS table per UN-6 language,
 * detect/apply helpers, no framework.
 *
 * IMPORTANT: this table is ONLY the UI chrome (buttons, labels, banners,
 * timer). It is SEPARATE from the word bank the game draws from
 * (client/data/words.json), which has its own per-language noun lists. Do
 * not conflate the two.
 *
 * RTL (Arabic) flips text-bearing chrome (header, side panel, overlay cards,
 * guess feed) via document.dir. The drawing canvas itself is NEVER mirrored
 * — a drawing is spatial content, not text — so index.html hardcodes
 * dir="ltr" on the stage/canvas and app.js keeps ctx.direction = 'ltr'.
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
    title: 'Doodle Guess',
    blurb: 'A LAN draw-and-guess party game. One player draws on a live canvas everyone else watches in real time; the others race to type the word. First correct guess scores. Pick your own secret word, or let the game deal one from a bank of 100+ words.',
    modeWordBank: 'Word Bank',
    modeYourWord: 'Your Word',
    modeWordBankDesc: 'The game deals each drawer a random word — nobody picks.',
    modeYourWordDesc: 'Each drawer secretly types their own word to draw.',
    startGameBtn: 'Start Game',
    waitingPlayers: 'Waiting for players to join…',
    needTwo: 'Needs at least 2 players. Open this page on another device or tab in the same room.',
    waitingHostStart: 'Waiting for {name} to start the game…',
    netOnline: 'Online',
    netOffline: 'Offline — start the PC host (./start.sh) to play with others',
    roomTag: 'Room {room}',
    playersTag: '{n} online',
    yourTurnTitle: 'Your turn to draw',
    chooseBankTitle: 'Draw this word',
    typeSecretTitle: 'Choose your secret word',
    typeSecretLabel: 'Only you can see this — everyone else guesses from your drawing.',
    secretPlaceholder: 'Type a word to draw…',
    newWordBtn: 'New word',
    startDrawingBtn: 'Start drawing',
    choosingWord: '{name} is choosing a word…',
    youDrawingHint: "You're drawing — draw it clearly, no typing the word!",
    watchingHint: '{name} is drawing — type your guess below',
    wordLabel: 'Word',
    timeLabel: 'Time',
    guessPlaceholder: 'Type your guess…',
    guessSend: 'Guess',
    correctBanner: '{name} guessed it!',
    youGotIt: 'You got it! 🎉',
    revealTitle: 'Round over',
    wordWas: 'The word was',
    guessedIn: '{name} guessed it with {sec}s left',
    nobodyGuessed: 'Time! Nobody guessed it.',
    nextIn: 'Next round in {n}…',
    scoresTitle: 'Scores',
    ptsSuffix: 'pts',
    youTag: 'you',
    drawingTag: 'drawing',
    feedTitle: 'Guesses',
    joinedMsg: '{name} joined',
    clearBtn: 'Clear',
    eraserBtn: 'Eraser',
    brushLabel: 'Brush size',
    colorLabel: 'Color',
    langSwitchAria: 'Language',
  },
  ru: {
    back: 'Библиотека',
    title: 'Рисуй и угадывай',
    blurb: 'Party-игра «рисуй и угадывай» по локальной сети. Один игрок рисует на живом холсте, который все видят в реальном времени; остальные наперегонки печатают слово. Первый верный ответ приносит очки. Загадай своё тайное слово или получи случайное из банка на 100+ слов.',
    modeWordBank: 'Банк слов',
    modeYourWord: 'Своё слово',
    modeWordBankDesc: 'Игра сама выдаёт художнику случайное слово — никто не выбирает.',
    modeYourWordDesc: 'Каждый художник тайно печатает своё слово для рисунка.',
    startGameBtn: 'Начать игру',
    waitingPlayers: 'Ждём подключения игроков…',
    needTwo: 'Нужно минимум 2 игрока. Открой эту страницу на другом устройстве или вкладке в той же комнате.',
    waitingHostStart: 'Ждём, пока {name} начнёт игру…',
    netOnline: 'Онлайн',
    netOffline: 'Оффлайн — запусти PC-хост (./start.sh), чтобы играть с другими',
    roomTag: 'Комната {room}',
    playersTag: '{n} онлайн',
    yourTurnTitle: 'Твоя очередь рисовать',
    chooseBankTitle: 'Нарисуй это слово',
    typeSecretTitle: 'Выбери тайное слово',
    typeSecretLabel: 'Его видишь только ты — остальные угадывают по рисунку.',
    secretPlaceholder: 'Впиши слово для рисунка…',
    newWordBtn: 'Другое слово',
    startDrawingBtn: 'Начать рисовать',
    choosingWord: '{name} выбирает слово…',
    youDrawingHint: 'Ты рисуешь — рисуй понятно, не пиши само слово!',
    watchingHint: '{name} рисует — печатай свою догадку ниже',
    wordLabel: 'Слово',
    timeLabel: 'Время',
    guessPlaceholder: 'Впиши свою догадку…',
    guessSend: 'Ответ',
    correctBanner: '{name} угадал(а)!',
    youGotIt: 'Ты угадал(а)! 🎉',
    revealTitle: 'Раунд окончен',
    wordWas: 'Было загадано',
    guessedIn: '{name} угадал(а), когда оставалось {sec}с',
    nobodyGuessed: 'Время вышло! Никто не угадал.',
    nextIn: 'Следующий раунд через {n}…',
    scoresTitle: 'Счёт',
    ptsSuffix: 'очк.',
    youTag: 'ты',
    drawingTag: 'рисует',
    feedTitle: 'Догадки',
    joinedMsg: '{name} присоединился(ась)',
    clearBtn: 'Очистить',
    eraserBtn: 'Ластик',
    brushLabel: 'Толщина кисти',
    colorLabel: 'Цвет',
    langSwitchAria: 'Язык',
  },
  zh: {
    back: '资料库',
    title: '你画我猜',
    blurb: '局域网「你画我猜」派对游戏。一名玩家在实时画布上作画，其他人同步观看；大家争相打出正确词语。第一个猜对的人得分。可以自己想一个秘密词语，也可以让游戏从 100 多个词库中随机发一个。',
    modeWordBank: '词库',
    modeYourWord: '自定词语',
    modeWordBankDesc: '游戏为每位画者随机发一个词——谁都不用选。',
    modeYourWordDesc: '每位画者秘密输入自己要画的词语。',
    startGameBtn: '开始游戏',
    waitingPlayers: '正在等待玩家加入…',
    needTwo: '至少需要 2 名玩家。请在同一房间的另一台设备或标签页打开本页面。',
    waitingHostStart: '正在等待 {name} 开始游戏…',
    netOnline: '在线',
    netOffline: '离线——启动 PC 主机（./start.sh）即可与他人联机',
    roomTag: '房间 {room}',
    playersTag: '{n} 人在线',
    yourTurnTitle: '轮到你画了',
    chooseBankTitle: '画出这个词',
    typeSecretTitle: '选择你的秘密词语',
    typeSecretLabel: '只有你能看到——其他人靠你的画来猜。',
    secretPlaceholder: '输入要画的词语…',
    newWordBtn: '换一个词',
    startDrawingBtn: '开始作画',
    choosingWord: '{name} 正在选词…',
    youDrawingHint: '你在作画——画清楚点，别把词写出来！',
    watchingHint: '{name} 正在作画——在下方输入你的猜测',
    wordLabel: '词语',
    timeLabel: '时间',
    guessPlaceholder: '输入你的猜测…',
    guessSend: '猜',
    correctBanner: '{name} 猜对了！',
    youGotIt: '你猜对了！🎉',
    revealTitle: '本回合结束',
    wordWas: '答案是',
    guessedIn: '{name} 在剩余 {sec} 秒时猜对了',
    nobodyGuessed: '时间到！没人猜对。',
    nextIn: '{n} 秒后进入下一回合…',
    scoresTitle: '得分',
    ptsSuffix: '分',
    youTag: '你',
    drawingTag: '作画中',
    feedTitle: '猜测',
    joinedMsg: '{name} 加入了',
    clearBtn: '清空',
    eraserBtn: '橡皮擦',
    brushLabel: '笔刷粗细',
    colorLabel: '颜色',
    langSwitchAria: '语言',
  },
  es: {
    back: 'Biblioteca',
    title: 'Dibuja y Adivina',
    blurb: 'Un juego de fiesta de dibujar y adivinar por red local. Un jugador dibuja en un lienzo en vivo que todos ven en tiempo real; los demás compiten por escribir la palabra. El primer acierto puntúa. Elige tu propia palabra secreta o deja que el juego reparta una de un banco de más de 100 palabras.',
    modeWordBank: 'Banco de palabras',
    modeYourWord: 'Tu palabra',
    modeWordBankDesc: 'El juego reparte a cada dibujante una palabra al azar — nadie elige.',
    modeYourWordDesc: 'Cada dibujante escribe en secreto su propia palabra para dibujar.',
    startGameBtn: 'Empezar juego',
    waitingPlayers: 'Esperando a que se unan jugadores…',
    needTwo: 'Se necesitan al menos 2 jugadores. Abre esta página en otro dispositivo o pestaña de la misma sala.',
    waitingHostStart: 'Esperando a que {name} empiece la partida…',
    netOnline: 'En línea',
    netOffline: 'Sin conexión — inicia el host de PC (./start.sh) para jugar con otros',
    roomTag: 'Sala {room}',
    playersTag: '{n} en línea',
    yourTurnTitle: 'Te toca dibujar',
    chooseBankTitle: 'Dibuja esta palabra',
    typeSecretTitle: 'Elige tu palabra secreta',
    typeSecretLabel: 'Solo tú la ves — los demás adivinan por tu dibujo.',
    secretPlaceholder: 'Escribe una palabra para dibujar…',
    newWordBtn: 'Otra palabra',
    startDrawingBtn: 'Empezar a dibujar',
    choosingWord: '{name} está eligiendo una palabra…',
    youDrawingHint: 'Estás dibujando — ¡dibújalo claro, no escribas la palabra!',
    watchingHint: '{name} está dibujando — escribe tu respuesta abajo',
    wordLabel: 'Palabra',
    timeLabel: 'Tiempo',
    guessPlaceholder: 'Escribe tu respuesta…',
    guessSend: 'Adivinar',
    correctBanner: '¡{name} lo adivinó!',
    youGotIt: '¡Lo adivinaste! 🎉',
    revealTitle: 'Fin de la ronda',
    wordWas: 'La palabra era',
    guessedIn: '{name} lo adivinó con {sec}s restantes',
    nobodyGuessed: '¡Se acabó el tiempo! Nadie lo adivinó.',
    nextIn: 'Siguiente ronda en {n}…',
    scoresTitle: 'Puntuación',
    ptsSuffix: 'pts',
    youTag: 'tú',
    drawingTag: 'dibujando',
    feedTitle: 'Respuestas',
    joinedMsg: '{name} se unió',
    clearBtn: 'Borrar',
    eraserBtn: 'Goma',
    brushLabel: 'Grosor del pincel',
    colorLabel: 'Color',
    langSwitchAria: 'Idioma',
  },
  ar: {
    back: 'المكتبة',
    title: 'ارسم وخمّن',
    blurb: 'لعبة جماعية للرسم والتخمين عبر الشبكة المحلية. يرسم لاعب على لوحة حية يشاهدها الجميع مباشرة، ويتسابق الآخرون لكتابة الكلمة. أول تخمين صحيح يسجّل النقاط. اختر كلمتك السرية بنفسك، أو دع اللعبة توزّع كلمة من بنك يضم أكثر من 100 كلمة.',
    modeWordBank: 'بنك الكلمات',
    modeYourWord: 'كلمتك',
    modeWordBankDesc: 'توزّع اللعبة على كل راسم كلمة عشوائية — لا أحد يختار.',
    modeYourWordDesc: 'يكتب كل راسم كلمته الخاصة سرًّا ليرسمها.',
    startGameBtn: 'ابدأ اللعبة',
    waitingPlayers: 'بانتظار انضمام اللاعبين…',
    needTwo: 'تحتاج إلى لاعبين اثنين على الأقل. افتح هذه الصفحة على جهاز أو تبويب آخر في الغرفة نفسها.',
    waitingHostStart: 'بانتظار أن يبدأ {name} اللعبة…',
    netOnline: 'متصل',
    netOffline: 'غير متصل — شغّل مضيف الـPC (‎./start.sh‎) للعب مع الآخرين',
    roomTag: 'الغرفة {room}',
    playersTag: '{n} متصلون',
    yourTurnTitle: 'دورك في الرسم',
    chooseBankTitle: 'ارسم هذه الكلمة',
    typeSecretTitle: 'اختر كلمتك السرية',
    typeSecretLabel: 'تراها أنت فقط — يخمّن الآخرون من رسمتك.',
    secretPlaceholder: 'اكتب كلمة لترسمها…',
    newWordBtn: 'كلمة أخرى',
    startDrawingBtn: 'ابدأ الرسم',
    choosingWord: '{name} يختار كلمة…',
    youDrawingHint: 'أنت ترسم — ارسمها بوضوح ولا تكتب الكلمة!',
    watchingHint: '{name} يرسم — اكتب تخمينك بالأسفل',
    wordLabel: 'الكلمة',
    timeLabel: 'الوقت',
    guessPlaceholder: 'اكتب تخمينك…',
    guessSend: 'خمّن',
    correctBanner: '{name} خمّنها بشكل صحيح!',
    youGotIt: 'أصبتَ! 🎉',
    revealTitle: 'انتهت الجولة',
    wordWas: 'كانت الكلمة',
    guessedIn: 'خمّنها {name} مع تبقّي {sec} ثانية',
    nobodyGuessed: 'انتهى الوقت! لم يخمّنها أحد.',
    nextIn: 'الجولة التالية بعد {n}…',
    scoresTitle: 'النقاط',
    ptsSuffix: 'نقطة',
    youTag: 'أنت',
    drawingTag: 'يرسم',
    feedTitle: 'التخمينات',
    joinedMsg: 'انضمّ {name}',
    clearBtn: 'مسح',
    eraserBtn: 'ممحاة',
    brushLabel: 'حجم الفرشاة',
    colorLabel: 'اللون',
    langSwitchAria: 'اللغة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Dessine et Devine',
    blurb: "Un jeu festif de dessin et devinettes en réseau local. Un joueur dessine sur une toile en direct que tout le monde voit en temps réel ; les autres se dépêchent de taper le mot. La première bonne réponse marque. Choisis ton propre mot secret, ou laisse le jeu en piocher un dans une banque de plus de 100 mots.",
    modeWordBank: 'Banque de mots',
    modeYourWord: 'Ton mot',
    modeWordBankDesc: 'Le jeu distribue à chaque dessinateur un mot au hasard — personne ne choisit.',
    modeYourWordDesc: 'Chaque dessinateur tape en secret son propre mot à dessiner.',
    startGameBtn: 'Commencer',
    waitingPlayers: 'En attente de joueurs…',
    needTwo: 'Il faut au moins 2 joueurs. Ouvre cette page sur un autre appareil ou onglet dans le même salon.',
    waitingHostStart: 'En attente que {name} lance la partie…',
    netOnline: 'En ligne',
    netOffline: "Hors ligne — lance l'hôte PC (./start.sh) pour jouer à plusieurs",
    roomTag: 'Salon {room}',
    playersTag: '{n} en ligne',
    yourTurnTitle: 'À toi de dessiner',
    chooseBankTitle: 'Dessine ce mot',
    typeSecretTitle: 'Choisis ton mot secret',
    typeSecretLabel: 'Toi seul le vois — les autres devinent grâce à ton dessin.',
    secretPlaceholder: 'Tape un mot à dessiner…',
    newWordBtn: 'Autre mot',
    startDrawingBtn: 'Commencer à dessiner',
    choosingWord: '{name} choisit un mot…',
    youDrawingHint: "Tu dessines — dessine clairement, n'écris pas le mot !",
    watchingHint: '{name} dessine — tape ta réponse ci-dessous',
    wordLabel: 'Mot',
    timeLabel: 'Temps',
    guessPlaceholder: 'Tape ta réponse…',
    guessSend: 'Deviner',
    correctBanner: '{name} a deviné !',
    youGotIt: "Tu as trouvé ! 🎉",
    revealTitle: 'Fin de la manche',
    wordWas: 'Le mot était',
    guessedIn: '{name} a deviné avec {sec}s restantes',
    nobodyGuessed: 'Temps écoulé ! Personne n\'a deviné.',
    nextIn: 'Prochaine manche dans {n}…',
    scoresTitle: 'Scores',
    ptsSuffix: 'pts',
    youTag: 'toi',
    drawingTag: 'dessine',
    feedTitle: 'Réponses',
    joinedMsg: '{name} a rejoint',
    clearBtn: 'Effacer',
    eraserBtn: 'Gomme',
    brushLabel: 'Taille du pinceau',
    colorLabel: 'Couleur',
    langSwitchAria: 'Langue',
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
    const stored = localStorage.getItem('ogh_doodle_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_doodle_lang', lang);
  } catch { /* ignore */ }
}

/** Translate a key for a given language, with optional {placeholder} vars. */
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
    el.title = t(lang, el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-aria')));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    el.setAttribute('placeholder', t(lang, el.getAttribute('data-i18n-ph')));
  });
}
