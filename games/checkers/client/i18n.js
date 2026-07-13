/**
 * i18n — string table for Checkers (UN-6 languages), mirroring
 * games/tic-tac-toe/client/i18n.js: a flat STRINGS table per language,
 * detect/apply helpers, {placeholder} substitution, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome (header, menu, result card,
 * hints) only. The 8x8 board's spatial layout is a fixed gameplay convention
 * and is deliberately NOT mirrored — see index.html's dir="ltr" on the board.
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
    chooseModeTitle: 'Checkers',
    chooseModeSub: 'Play against the computer, pass the device to a friend, or connect over LAN.',
    modeAiBtn: 'vs AI',
    modeLocalBtn: 'Pass & Play',
    modeLanBtn: 'LAN Multiplayer',
    difficultyLabel: 'Difficulty',
    diffEasyBtn: 'Easy',
    diffMediumBtn: 'Medium',
    diffHardBtn: 'Hard',
    backToModesBtn: '← Back',
    hint: 'Tap one of your pieces, then a highlighted square.',
    hintCapture: 'Capture is mandatory — you must take a jump.',
    hintChain: 'Keep jumping — finish the capture chain.',
    colorCyan: 'Cyan',
    colorPink: 'Pink',
    turnToMove: '{color} to move',
    turnYours: 'Your turn',
    turnOpp: "Opponent's turn",
    turnAiThinking: 'AI is thinking…',
    waitingOpponent: 'Waiting for a second player… room {room}',
    offlineLanNote: 'Offline — playing pass & play on this device',
    spectatorNote: 'Room is full — spectating',
    youWinTitle: 'You win!',
    aiWinTitle: 'AI wins!',
    oppWinTitle: 'Opponent wins!',
    colorWinsTitle: '{color} wins!',
    drawTitle: 'Draw',
    winsLine: 'Wins — Cyan {c} · Pink {p}',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    menuBtn: 'Сменить режим',
    newGameBtn: 'Новая игра',
    chooseModeTitle: 'Шашки',
    chooseModeSub: 'Играйте против компьютера, передавайте устройство другу или подключитесь по локальной сети.',
    modeAiBtn: 'Против ИИ',
    modeLocalBtn: 'По очереди (2 игрока)',
    modeLanBtn: 'LAN мультиплеер',
    difficultyLabel: 'Сложность',
    diffEasyBtn: 'Легко',
    diffMediumBtn: 'Средне',
    diffHardBtn: 'Сложно',
    backToModesBtn: '← Назад',
    hint: 'Коснись своей шашки, затем подсвеченной клетки.',
    hintCapture: 'Взятие обязательно — нужно бить.',
    hintChain: 'Продолжай бить — заверши серию взятий.',
    colorCyan: 'Голубые',
    colorPink: 'Розовые',
    turnToMove: 'Ходят {color}',
    turnYours: 'Ваш ход',
    turnOpp: 'Ход соперника',
    turnAiThinking: 'ИИ думает…',
    waitingOpponent: 'Ожидание второго игрока… комната {room}',
    offlineLanNote: 'Офлайн — игра по очереди на этом устройстве',
    spectatorNote: 'Комната заполнена — вы наблюдатель',
    youWinTitle: 'Вы выиграли!',
    aiWinTitle: 'ИИ выиграл!',
    oppWinTitle: 'Соперник выиграл!',
    colorWinsTitle: 'Победа: {color}!',
    drawTitle: 'Ничья',
    winsLine: 'Победы — Голубые {c} · Розовые {p}',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    menuBtn: '切换模式',
    newGameBtn: '新对局',
    chooseModeTitle: '西洋跳棋',
    chooseModeSub: '与电脑对战、同设备轮流游玩，或通过局域网联机。',
    modeAiBtn: '人机对战',
    modeLocalBtn: '轮流游玩（双人）',
    modeLanBtn: '局域网联机',
    difficultyLabel: '难度',
    diffEasyBtn: '简单',
    diffMediumBtn: '中等',
    diffHardBtn: '困难',
    backToModesBtn: '← 返回',
    hint: '点击你的一枚棋子，再点击高亮的格子。',
    hintCapture: '必须吃子——你得跳吃。',
    hintChain: '继续跳吃——完成连吃。',
    colorCyan: '青方',
    colorPink: '粉方',
    turnToMove: '轮到{color}',
    turnYours: '轮到你了',
    turnOpp: '对方回合',
    turnAiThinking: '电脑思考中…',
    waitingOpponent: '等待第二位玩家…房间 {room}',
    offlineLanNote: '离线——在本设备上轮流游玩',
    spectatorNote: '房间已满——你正在观战',
    youWinTitle: '你赢了！',
    aiWinTitle: '电脑赢了！',
    oppWinTitle: '对方赢了！',
    colorWinsTitle: '{color}获胜！',
    drawTitle: '平局',
    winsLine: '胜场 — 青方 {c} · 粉方 {p}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    menuBtn: 'Cambiar modo',
    newGameBtn: 'Nueva partida',
    chooseModeTitle: 'Damas',
    chooseModeSub: 'Juega contra la computadora, pasa el dispositivo a un amigo, o conéctate por LAN.',
    modeAiBtn: 'Contra la IA',
    modeLocalBtn: 'Por turnos (2 jugadores)',
    modeLanBtn: 'Multijugador LAN',
    difficultyLabel: 'Dificultad',
    diffEasyBtn: 'Fácil',
    diffMediumBtn: 'Media',
    diffHardBtn: 'Difícil',
    backToModesBtn: '← Atrás',
    hint: 'Toca una de tus fichas y luego una casilla resaltada.',
    hintCapture: 'La captura es obligatoria: debes saltar.',
    hintChain: 'Sigue saltando: completa la cadena de capturas.',
    colorCyan: 'Cian',
    colorPink: 'Rosa',
    turnToMove: 'Turno de {color}',
    turnYours: 'Tu turno',
    turnOpp: 'Turno del rival',
    turnAiThinking: 'La IA está pensando…',
    waitingOpponent: 'Esperando a un segundo jugador… sala {room}',
    offlineLanNote: 'Sin conexión — jugando por turnos en este dispositivo',
    spectatorNote: 'Sala llena — estás como espectador',
    youWinTitle: '¡Has ganado!',
    aiWinTitle: '¡Gana la IA!',
    oppWinTitle: '¡Gana el rival!',
    colorWinsTitle: '¡Ganan las {color}!',
    drawTitle: 'Empate',
    winsLine: 'Victorias — Cian {c} · Rosa {p}',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    menuBtn: 'تغيير الوضع',
    newGameBtn: 'لعبة جديدة',
    chooseModeTitle: 'الداما',
    chooseModeSub: 'العب ضد الكمبيوتر، مرر الجهاز لصديق، أو اتصل عبر الشبكة المحلية.',
    modeAiBtn: 'ضد الذكاء الاصطناعي',
    modeLocalBtn: 'بالتناوب (لاعبان)',
    modeLanBtn: 'لعب جماعي عبر LAN',
    difficultyLabel: 'مستوى الصعوبة',
    diffEasyBtn: 'سهل',
    diffMediumBtn: 'متوسط',
    diffHardBtn: 'صعب',
    backToModesBtn: '← رجوع',
    hint: 'اضغط على إحدى قطعك، ثم على مربع مميّز.',
    hintCapture: 'الأسر إجباري — يجب أن تقفز.',
    hintChain: 'واصل القفز — أكمل سلسلة الأسر.',
    colorCyan: 'السماوي',
    colorPink: 'الوردي',
    turnToMove: 'دور {color}',
    turnYours: 'دورك',
    turnOpp: 'دور الخصم',
    turnAiThinking: 'الذكاء الاصطناعي يفكر…',
    waitingOpponent: 'بانتظار لاعب ثانٍ… الغرفة {room}',
    offlineLanNote: 'غير متصل — يُلعب بالتناوب على هذا الجهاز',
    spectatorNote: 'الغرفة ممتلئة — أنت تشاهد فقط',
    youWinTitle: 'لقد فزت!',
    aiWinTitle: 'فاز الذكاء الاصطناعي!',
    oppWinTitle: 'فاز الخصم!',
    colorWinsTitle: 'فاز {color}!',
    drawTitle: 'تعادل',
    winsLine: 'الانتصارات — السماوي {c} · الوردي {p}',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    menuBtn: 'Changer de mode',
    newGameBtn: 'Nouvelle partie',
    chooseModeTitle: 'Dames',
    chooseModeSub: "Jouez contre l'IA, passez l'appareil à un ami, ou connectez-vous en LAN.",
    modeAiBtn: "Contre l'IA",
    modeLocalBtn: 'Chacun son tour (2 joueurs)',
    modeLanBtn: 'Multijoueur LAN',
    difficultyLabel: 'Difficulté',
    diffEasyBtn: 'Facile',
    diffMediumBtn: 'Moyen',
    diffHardBtn: 'Difficile',
    backToModesBtn: '← Retour',
    hint: 'Touchez un de vos pions, puis une case surlignée.',
    hintCapture: 'La prise est obligatoire — vous devez sauter.',
    hintChain: 'Continuez à sauter — terminez la série de prises.',
    colorCyan: 'Cyan',
    colorPink: 'Rose',
    turnToMove: 'Au tour des {color}',
    turnYours: 'Votre tour',
    turnOpp: "Tour de l'adversaire",
    turnAiThinking: "L'IA réfléchit…",
    waitingOpponent: "En attente d'un second joueur… salon {room}",
    offlineLanNote: 'Hors ligne — on joue à tour de rôle sur cet appareil',
    spectatorNote: 'Salon complet — vous êtes spectateur',
    youWinTitle: 'Vous avez gagné !',
    aiWinTitle: "L'IA gagne !",
    oppWinTitle: "L'adversaire gagne !",
    colorWinsTitle: 'Les {color} gagnent !',
    drawTitle: 'Match nul',
    winsLine: 'Victoires — Cyan {c} · Rose {p}',
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
    const stored = localStorage.getItem('ogh_checkers_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_checkers_lang', lang);
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
