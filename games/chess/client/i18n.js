/**
 * i18n — string table for Chess (UN-6 languages), mirroring
 * games/checkers/client/i18n.js: a flat STRINGS table per language,
 * detect/apply helpers, {placeholder} substitution, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome (header, menu, promotion and
 * result cards, hints) only. The 8x8 board's a1-h8 layout is a fixed, universal
 * gameplay convention and is deliberately NOT mirrored — see index.html's
 * dir="ltr" on the board.
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
    menuBtn: 'Change mode',
    newGameBtn: 'New game',
    chooseModeTitle: 'Chess',
    chooseModeSub: 'Play against the computer, pass the device to a friend, or connect over LAN.',
    modeAiBtn: 'vs AI',
    modeLocalBtn: 'Pass & Play',
    modeLanBtn: 'LAN Multiplayer',
    difficultyLabel: 'Difficulty',
    diffEasyBtn: 'Easy',
    diffMediumBtn: 'Medium',
    diffHardBtn: 'Hard',
    backToModesBtn: '← Back',
    hint: 'Tap a piece, then tap a highlighted square.',
    hintCheck: 'Your king is in check — you must respond.',
    checkPill: 'Check',
    colorWhite: 'White',
    colorBlack: 'Black',
    turnToMove: '{color} to move',
    turnYours: 'Your turn',
    turnOpp: "Opponent's turn",
    turnAiThinking: 'AI is thinking…',
    waitingOpponent: 'Waiting for a second player… room {room}',
    offlineLanNote: 'Offline — playing pass & play on this device',
    spectatorNote: 'Room is full — spectating',
    promoteTitle: 'Promote to…',
    pieceQueen: 'Queen',
    pieceRook: 'Rook',
    pieceBishop: 'Bishop',
    pieceKnight: 'Knight',
    winCheckmateYou: 'Checkmate — you win!',
    winCheckmateAi: 'Checkmate — the AI wins.',
    winCheckmateOpp: 'Checkmate — your opponent wins.',
    winCheckmateColor: 'Checkmate — {color} wins!',
    drawStalemate: 'Stalemate — a draw.',
    drawRepetition: 'Draw — threefold repetition.',
    drawFifty: 'Draw — the 50-move rule.',
    drawMaterial: 'Draw — insufficient material.',
    winsLine: 'Wins — White {w} · Black {b}',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    menuBtn: 'Сменить режим',
    newGameBtn: 'Новая игра',
    chooseModeTitle: 'Шахматы',
    chooseModeSub: 'Играйте против компьютера, передавайте устройство другу или подключитесь по локальной сети.',
    modeAiBtn: 'Против ИИ',
    modeLocalBtn: 'По очереди (2 игрока)',
    modeLanBtn: 'LAN мультиплеер',
    difficultyLabel: 'Сложность',
    diffEasyBtn: 'Легко',
    diffMediumBtn: 'Средне',
    diffHardBtn: 'Сложно',
    backToModesBtn: '← Назад',
    hint: 'Коснись фигуры, затем подсвеченной клетки.',
    hintCheck: 'Вашему королю шах — нужно защититься.',
    checkPill: 'Шах',
    colorWhite: 'Белые',
    colorBlack: 'Чёрные',
    turnToMove: 'Ход: {color}',
    turnYours: 'Ваш ход',
    turnOpp: 'Ход соперника',
    turnAiThinking: 'ИИ думает…',
    waitingOpponent: 'Ожидание второго игрока… комната {room}',
    offlineLanNote: 'Офлайн — игра по очереди на этом устройстве',
    spectatorNote: 'Комната заполнена — вы наблюдатель',
    promoteTitle: 'Превратить в…',
    pieceQueen: 'Ферзь',
    pieceRook: 'Ладья',
    pieceBishop: 'Слон',
    pieceKnight: 'Конь',
    winCheckmateYou: 'Мат — вы выиграли!',
    winCheckmateAi: 'Мат — ИИ выиграл.',
    winCheckmateOpp: 'Мат — соперник выиграл.',
    winCheckmateColor: 'Мат — победа: {color}!',
    drawStalemate: 'Пат — ничья.',
    drawRepetition: 'Ничья — троекратное повторение.',
    drawFifty: 'Ничья — правило 50 ходов.',
    drawMaterial: 'Ничья — недостаточно материала.',
    winsLine: 'Победы — Белые {w} · Чёрные {b}',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    menuBtn: '切换模式',
    newGameBtn: '新对局',
    chooseModeTitle: '国际象棋',
    chooseModeSub: '与电脑对战、同设备轮流游玩，或通过局域网联机。',
    modeAiBtn: '人机对战',
    modeLocalBtn: '轮流游玩（双人）',
    modeLanBtn: '局域网联机',
    difficultyLabel: '难度',
    diffEasyBtn: '简单',
    diffMediumBtn: '中等',
    diffHardBtn: '困难',
    backToModesBtn: '← 返回',
    hint: '点击一枚棋子，再点击高亮的格子。',
    hintCheck: '你的王被将军——必须应将。',
    checkPill: '将军',
    colorWhite: '白方',
    colorBlack: '黑方',
    turnToMove: '轮到{color}',
    turnYours: '轮到你了',
    turnOpp: '对方回合',
    turnAiThinking: '电脑思考中…',
    waitingOpponent: '等待第二位玩家…房间 {room}',
    offlineLanNote: '离线——在本设备上轮流游玩',
    spectatorNote: '房间已满——你正在观战',
    promoteTitle: '升变为…',
    pieceQueen: '后',
    pieceRook: '车',
    pieceBishop: '象',
    pieceKnight: '马',
    winCheckmateYou: '将死——你赢了！',
    winCheckmateAi: '将死——电脑赢了。',
    winCheckmateOpp: '将死——对方赢了。',
    winCheckmateColor: '将死——{color}获胜！',
    drawStalemate: '逼和——平局。',
    drawRepetition: '平局——三次重复局面。',
    drawFifty: '平局——50回合规则。',
    drawMaterial: '平局——子力不足。',
    winsLine: '胜场 — 白方 {w} · 黑方 {b}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    menuBtn: 'Cambiar modo',
    newGameBtn: 'Nueva partida',
    chooseModeTitle: 'Ajedrez',
    chooseModeSub: 'Juega contra la computadora, pasa el dispositivo a un amigo, o conéctate por LAN.',
    modeAiBtn: 'Contra la IA',
    modeLocalBtn: 'Por turnos (2 jugadores)',
    modeLanBtn: 'Multijugador LAN',
    difficultyLabel: 'Dificultad',
    diffEasyBtn: 'Fácil',
    diffMediumBtn: 'Media',
    diffHardBtn: 'Difícil',
    backToModesBtn: '← Atrás',
    hint: 'Toca una pieza y luego una casilla resaltada.',
    hintCheck: 'Tu rey está en jaque: debes responder.',
    checkPill: 'Jaque',
    colorWhite: 'Blancas',
    colorBlack: 'Negras',
    turnToMove: 'Juegan {color}',
    turnYours: 'Tu turno',
    turnOpp: 'Turno del rival',
    turnAiThinking: 'La IA está pensando…',
    waitingOpponent: 'Esperando a un segundo jugador… sala {room}',
    offlineLanNote: 'Sin conexión — jugando por turnos en este dispositivo',
    spectatorNote: 'Sala llena — estás como espectador',
    promoteTitle: 'Promocionar a…',
    pieceQueen: 'Dama',
    pieceRook: 'Torre',
    pieceBishop: 'Alfil',
    pieceKnight: 'Caballo',
    winCheckmateYou: '¡Jaque mate: has ganado!',
    winCheckmateAi: 'Jaque mate: gana la IA.',
    winCheckmateOpp: 'Jaque mate: gana el rival.',
    winCheckmateColor: '¡Jaque mate: ganan las {color}!',
    drawStalemate: 'Ahogado: tablas.',
    drawRepetition: 'Tablas: triple repetición.',
    drawFifty: 'Tablas: regla de las 50 jugadas.',
    drawMaterial: 'Tablas: material insuficiente.',
    winsLine: 'Victorias — Blancas {w} · Negras {b}',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    menuBtn: 'تغيير الوضع',
    newGameBtn: 'لعبة جديدة',
    chooseModeTitle: 'الشطرنج',
    chooseModeSub: 'العب ضد الكمبيوتر، مرر الجهاز لصديق، أو اتصل عبر الشبكة المحلية.',
    modeAiBtn: 'ضد الذكاء الاصطناعي',
    modeLocalBtn: 'بالتناوب (لاعبان)',
    modeLanBtn: 'لعب جماعي عبر LAN',
    difficultyLabel: 'مستوى الصعوبة',
    diffEasyBtn: 'سهل',
    diffMediumBtn: 'متوسط',
    diffHardBtn: 'صعب',
    backToModesBtn: '← رجوع',
    hint: 'اضغط على قطعة، ثم على مربع مميّز.',
    hintCheck: 'ملكك في كش — يجب أن ترد.',
    checkPill: 'كش',
    colorWhite: 'الأبيض',
    colorBlack: 'الأسود',
    turnToMove: 'دور {color}',
    turnYours: 'دورك',
    turnOpp: 'دور الخصم',
    turnAiThinking: 'الذكاء الاصطناعي يفكر…',
    waitingOpponent: 'بانتظار لاعب ثانٍ… الغرفة {room}',
    offlineLanNote: 'غير متصل — يُلعب بالتناوب على هذا الجهاز',
    spectatorNote: 'الغرفة ممتلئة — أنت تشاهد فقط',
    promoteTitle: 'الترقية إلى…',
    pieceQueen: 'الوزير',
    pieceRook: 'الرخ',
    pieceBishop: 'الفيل',
    pieceKnight: 'الحصان',
    winCheckmateYou: 'كش مات — لقد فزت!',
    winCheckmateAi: 'كش مات — فاز الذكاء الاصطناعي.',
    winCheckmateOpp: 'كش مات — فاز الخصم.',
    winCheckmateColor: 'كش مات — فاز {color}!',
    drawStalemate: 'تعادل بالجمود — تعادل.',
    drawRepetition: 'تعادل — تكرار الوضع ثلاث مرات.',
    drawFifty: 'تعادل — قاعدة الخمسين نقلة.',
    drawMaterial: 'تعادل — عدم كفاية القطع.',
    winsLine: 'الانتصارات — الأبيض {w} · الأسود {b}',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    menuBtn: 'Changer de mode',
    newGameBtn: 'Nouvelle partie',
    chooseModeTitle: 'Échecs',
    chooseModeSub: "Jouez contre l'IA, passez l'appareil à un ami, ou connectez-vous en LAN.",
    modeAiBtn: "Contre l'IA",
    modeLocalBtn: 'Chacun son tour (2 joueurs)',
    modeLanBtn: 'Multijoueur LAN',
    difficultyLabel: 'Difficulté',
    diffEasyBtn: 'Facile',
    diffMediumBtn: 'Moyen',
    diffHardBtn: 'Difficile',
    backToModesBtn: '← Retour',
    hint: 'Touchez une pièce, puis une case surlignée.',
    hintCheck: 'Votre roi est en échec — vous devez réagir.',
    checkPill: 'Échec',
    colorWhite: 'Blancs',
    colorBlack: 'Noirs',
    turnToMove: 'Au tour des {color}',
    turnYours: 'Votre tour',
    turnOpp: "Tour de l'adversaire",
    turnAiThinking: "L'IA réfléchit…",
    waitingOpponent: "En attente d'un second joueur… salon {room}",
    offlineLanNote: 'Hors ligne — on joue à tour de rôle sur cet appareil',
    spectatorNote: 'Salon complet — vous êtes spectateur',
    promoteTitle: 'Promouvoir en…',
    pieceQueen: 'Dame',
    pieceRook: 'Tour',
    pieceBishop: 'Fou',
    pieceKnight: 'Cavalier',
    winCheckmateYou: 'Échec et mat — vous gagnez !',
    winCheckmateAi: "Échec et mat — l'IA gagne.",
    winCheckmateOpp: "Échec et mat — l'adversaire gagne.",
    winCheckmateColor: 'Échec et mat — les {color} gagnent !',
    drawStalemate: 'Pat — partie nulle.',
    drawRepetition: 'Nulle — triple répétition.',
    drawFifty: 'Nulle — règle des 50 coups.',
    drawMaterial: 'Nulle — matériel insuffisant.',
    winsLine: 'Victoires — Blancs {w} · Noirs {b}',
    playAgainBtn: 'Rejouer',
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
    const stored = localStorage.getItem('ogh_chess_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_chess_lang', lang);
  } catch { /* ignore */ }
}

/** Translate `key` for `lang`, with optional {placeholder} substitution. */
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
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(lang, el.getAttribute('data-i18n-title'));
  });
}
