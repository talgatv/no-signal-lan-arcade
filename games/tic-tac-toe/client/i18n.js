/**
 * i18n — small string table for Tic-Tac-Toe.
 * Mirrors games/solitaire/client/i18n.js and games/mahjong/client/i18n.js:
 * a flat STRINGS table per UN-6 language, detect/apply helpers, no
 * framework. RTL (Arabic) flips text-bearing UI chrome only — the 3x3
 * board's spatial layout is a fixed gameplay convention and is
 * deliberately kept un-mirrored (see index.html's dir="ltr" on #board).
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
    newRoundBtn: 'New round',
    chooseModeTitle: 'Choose a mode',
    chooseModeSub: 'Play against the computer, pass the device to a friend, or connect over LAN.',
    modeAiBtn: 'vs AI',
    modeLocalBtn: 'Pass & Play',
    modeLanBtn: 'LAN Multiplayer',
    difficultyLabel: 'Difficulty',
    diffEasyBtn: 'Easy',
    diffMediumBtn: 'Medium',
    diffUnbeatableBtn: 'Unbeatable',
    backToModesBtn: '← Back',
    hint: 'Tap an empty square to place your mark.',
    turnYours: 'Your turn ({mark})',
    turnTheirs: "Opponent's turn ({mark})",
    turnMark: 'Turn: {mark}',
    turnAiThinking: 'AI is thinking…',
    waitingOpponent: 'Waiting for a second player… room {room}',
    offlineLanNote: 'Offline — playing pass & play on this device',
    spectatorNote: 'Room is full — spectating',
    scoreLine: 'X {x} · O {o} · Draws {d}',
    youWinTitle: 'You win!',
    aiWinTitle: 'AI wins!',
    oppWinTitle: 'Opponent wins!',
    drawTitle: 'Draw!',
    markWinTitle: '{mark} wins!',
    resultStats: 'Round score — X {x} · O {o} · Draws {d}',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    menuBtn: 'Сменить режим',
    newRoundBtn: 'Новый раунд',
    chooseModeTitle: 'Выберите режим',
    chooseModeSub: 'Играйте против компьютера, передавайте устройство другу или подключитесь по локальной сети.',
    modeAiBtn: 'Против ИИ',
    modeLocalBtn: 'По очереди (2 игрока)',
    modeLanBtn: 'LAN мультиплеер',
    difficultyLabel: 'Сложность',
    diffEasyBtn: 'Легко',
    diffMediumBtn: 'Средне',
    diffUnbeatableBtn: 'Непобедимый',
    backToModesBtn: '← Назад',
    hint: 'Тапни по пустой клетке, чтобы поставить метку.',
    turnYours: 'Ваш ход ({mark})',
    turnTheirs: 'Ход соперника ({mark})',
    turnMark: 'Ход: {mark}',
    turnAiThinking: 'ИИ думает…',
    waitingOpponent: 'Ожидание второго игрока… комната {room}',
    offlineLanNote: 'Офлайн — игра по очереди на этом устройстве',
    spectatorNote: 'Комната заполнена — вы наблюдатель',
    scoreLine: 'X {x} · O {o} · Ничьи {d}',
    youWinTitle: 'Вы выиграли!',
    aiWinTitle: 'ИИ выиграл!',
    oppWinTitle: 'Соперник выиграл!',
    drawTitle: 'Ничья!',
    markWinTitle: 'Победа: {mark}',
    resultStats: 'Счёт раунда — X {x} · O {o} · Ничьи {d}',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    menuBtn: '切换模式',
    newRoundBtn: '新一局',
    chooseModeTitle: '选择模式',
    chooseModeSub: '与电脑对战、同设备轮流游玩，或通过局域网联机。',
    modeAiBtn: '人机对战',
    modeLocalBtn: '轮流游玩（双人）',
    modeLanBtn: '局域网联机',
    difficultyLabel: '难度',
    diffEasyBtn: '简单',
    diffMediumBtn: '中等',
    diffUnbeatableBtn: '无敌',
    backToModesBtn: '← 返回',
    hint: '点击空格放置你的棋子。',
    turnYours: '轮到你了（{mark}）',
    turnTheirs: '对方回合（{mark}）',
    turnMark: '当前回合：{mark}',
    turnAiThinking: '电脑思考中…',
    waitingOpponent: '等待第二位玩家…房间 {room}',
    offlineLanNote: '离线——在本设备上轮流游玩',
    spectatorNote: '房间已满——你正在观战',
    scoreLine: 'X {x} · O {o} · 平局 {d}',
    youWinTitle: '你赢了！',
    aiWinTitle: '电脑赢了！',
    oppWinTitle: '对方赢了！',
    drawTitle: '平局！',
    markWinTitle: '{mark} 获胜！',
    resultStats: '本局比分 — X {x} · O {o} · 平局 {d}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    menuBtn: 'Cambiar modo',
    newRoundBtn: 'Nueva ronda',
    chooseModeTitle: 'Elige un modo',
    chooseModeSub: 'Juega contra la computadora, pasa el dispositivo a un amigo, o conéctate por LAN.',
    modeAiBtn: 'Contra la IA',
    modeLocalBtn: 'Por turnos (2 jugadores)',
    modeLanBtn: 'Multijugador LAN',
    difficultyLabel: 'Dificultad',
    diffEasyBtn: 'Fácil',
    diffMediumBtn: 'Media',
    diffUnbeatableBtn: 'Invencible',
    backToModesBtn: '← Atrás',
    hint: 'Toca una casilla vacía para colocar tu marca.',
    turnYours: 'Tu turno ({mark})',
    turnTheirs: 'Turno del rival ({mark})',
    turnMark: 'Turno: {mark}',
    turnAiThinking: 'La IA está pensando…',
    waitingOpponent: 'Esperando a un segundo jugador… sala {room}',
    offlineLanNote: 'Sin conexión — jugando por turnos en este dispositivo',
    spectatorNote: 'Sala llena — estás como espectador',
    scoreLine: 'X {x} · O {o} · Empates {d}',
    youWinTitle: '¡Has ganado!',
    aiWinTitle: '¡Gana la IA!',
    oppWinTitle: '¡Gana el rival!',
    drawTitle: '¡Empate!',
    markWinTitle: '¡Gana {mark}!',
    resultStats: 'Marcador de la ronda — X {x} · O {o} · Empates {d}',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    menuBtn: 'تغيير الوضع',
    newRoundBtn: 'جولة جديدة',
    chooseModeTitle: 'اختر وضعًا',
    chooseModeSub: 'العب ضد الكمبيوتر، مرر الجهاز لصديق، أو اتصل عبر الشبكة المحلية.',
    modeAiBtn: 'ضد الذكاء الاصطناعي',
    modeLocalBtn: 'بالتناوب (لاعبان)',
    modeLanBtn: 'لعب جماعي عبر LAN',
    difficultyLabel: 'مستوى الصعوبة',
    diffEasyBtn: 'سهل',
    diffMediumBtn: 'متوسط',
    diffUnbeatableBtn: 'لا يُقهر',
    backToModesBtn: '← رجوع',
    hint: 'اضغط على مربع فارغ لوضع علامتك.',
    turnYours: 'دورك ({mark})',
    turnTheirs: 'دور الخصم ({mark})',
    turnMark: 'الدور: {mark}',
    turnAiThinking: 'الذكاء الاصطناعي يفكر…',
    waitingOpponent: 'بانتظار لاعب ثانٍ… الغرفة {room}',
    offlineLanNote: 'غير متصل — يُلعب بالتناوب على هذا الجهاز',
    spectatorNote: 'الغرفة ممتلئة — أنت تشاهد فقط',
    scoreLine: 'X {x} · O {o} · تعادل {d}',
    youWinTitle: 'لقد فزت!',
    aiWinTitle: 'فاز الذكاء الاصطناعي!',
    oppWinTitle: 'فاز الخصم!',
    drawTitle: 'تعادل!',
    markWinTitle: 'فاز {mark}!',
    resultStats: 'نتيجة الجولة — X {x} · O {o} · تعادل {d}',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    menuBtn: 'Changer de mode',
    newRoundBtn: 'Nouvelle manche',
    chooseModeTitle: 'Choisissez un mode',
    chooseModeSub: "Jouez contre l'IA, passez l'appareil à un ami, ou connectez-vous en LAN.",
    modeAiBtn: "Contre l'IA",
    modeLocalBtn: 'Chacun son tour (2 joueurs)',
    modeLanBtn: 'Multijoueur LAN',
    difficultyLabel: 'Difficulté',
    diffEasyBtn: 'Facile',
    diffMediumBtn: 'Moyen',
    diffUnbeatableBtn: 'Invincible',
    backToModesBtn: '← Retour',
    hint: 'Touchez une case vide pour placer votre marque.',
    turnYours: 'Votre tour ({mark})',
    turnTheirs: "Tour de l'adversaire ({mark})",
    turnMark: 'Tour : {mark}',
    turnAiThinking: "L'IA réfléchit…",
    waitingOpponent: "En attente d'un second joueur… salon {room}",
    offlineLanNote: 'Hors ligne — on joue à tour de rôle sur cet appareil',
    spectatorNote: 'Salon complet — vous êtes spectateur',
    scoreLine: 'X {x} · O {o} · Nuls {d}',
    youWinTitle: 'Vous avez gagné !',
    aiWinTitle: "L'IA gagne !",
    oppWinTitle: "L'adversaire gagne !",
    drawTitle: 'Match nul !',
    markWinTitle: '{mark} gagne !',
    resultStats: 'Score de la manche — X {x} · O {o} · Nuls {d}',
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
    const stored = localStorage.getItem('ogh_tictactoe_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_tictactoe_lang', lang);
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
}
