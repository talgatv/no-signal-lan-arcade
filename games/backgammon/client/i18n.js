/**
 * i18n — string table for Backgammon (UN-6 languages), mirroring
 * games/chess/client/i18n.js: a flat STRINGS table per language, detect/apply
 * helpers, {placeholder} substitution, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome (header, menu, result card,
 * hints) only. The 24-point board is a fixed, universal gameplay convention and
 * is deliberately NOT mirrored — see index.html's dir="ltr" on the board canvas.
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN', ru: 'RU', zh: '中文', es: 'ES', ar: 'AR', fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    menuBtn: 'Change mode',
    newGameBtn: 'New game',
    rollBtn: 'Roll dice',
    chooseModeTitle: 'Backgammon',
    chooseModeSub: 'Play against the computer, pass the device to a friend, or connect over LAN.',
    modeAiBtn: 'vs AI',
    modeLocalBtn: 'Pass & Play',
    modeLanBtn: 'LAN Multiplayer',
    difficultyLabel: 'Difficulty',
    diffEasyBtn: 'Easy',
    diffMediumBtn: 'Medium',
    diffHardBtn: 'Hard',
    backToModesBtn: '← Back',
    colorWhite: 'White',
    colorBlack: 'Black',
    turnToRoll: '{color} to roll',
    turnToMove: '{color} to move',
    turnYours: 'Your turn',
    turnOpp: "Opponent's turn",
    turnAiThinking: 'AI is thinking…',
    waitingOpponent: 'Waiting for a second player… room {room}',
    spectatorNote: 'Room is full — spectating',
    hintRoll: 'Tap the dice (or Roll) to roll.',
    hintMove: 'Tap a checker, then a highlighted point.',
    hintBar: 'Enter from the bar first — tap a highlighted entry point.',
    hintBearOff: 'All checkers home — bear off from your home board.',
    hintNoMoves: 'No legal moves — passing the turn.',
    barLabel: 'BAR',
    offLabel: 'OFF',
    winYou: 'You win — all 15 checkers borne off!',
    winAi: 'The AI wins this game.',
    winOpp: 'Your opponent wins.',
    winColor: '{color} bears off all 15 — wins!',
    winsLine: 'Wins — White {w} · Black {b}',
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    menuBtn: 'Сменить режим',
    newGameBtn: 'Новая игра',
    rollBtn: 'Бросить кости',
    chooseModeTitle: 'Нарды',
    chooseModeSub: 'Играйте против компьютера, передавайте устройство другу или подключитесь по локальной сети.',
    modeAiBtn: 'Против ИИ',
    modeLocalBtn: 'По очереди (2 игрока)',
    modeLanBtn: 'LAN мультиплеер',
    difficultyLabel: 'Сложность',
    diffEasyBtn: 'Легко',
    diffMediumBtn: 'Средне',
    diffHardBtn: 'Сложно',
    backToModesBtn: '← Назад',
    colorWhite: 'Белые',
    colorBlack: 'Чёрные',
    turnToRoll: 'Бросок: {color}',
    turnToMove: 'Ход: {color}',
    turnYours: 'Ваш ход',
    turnOpp: 'Ход соперника',
    turnAiThinking: 'ИИ думает…',
    waitingOpponent: 'Ожидание второго игрока… комната {room}',
    spectatorNote: 'Комната заполнена — вы наблюдатель',
    hintRoll: 'Коснитесь костей (или «Бросить»), чтобы бросить.',
    hintMove: 'Коснитесь шашки, затем подсвеченного пункта.',
    hintBar: 'Сначала введите с бара — коснитесь подсвеченного пункта входа.',
    hintBearOff: 'Все шашки дома — выводите их из своего дома.',
    hintNoMoves: 'Нет ходов — ход передаётся.',
    barLabel: 'БАР',
    offLabel: 'ВЫВОД',
    winYou: 'Вы выиграли — все 15 шашек выведены!',
    winAi: 'ИИ выиграл эту партию.',
    winOpp: 'Соперник выиграл.',
    winColor: '{color} вывели все 15 — победа!',
    winsLine: 'Победы — Белые {w} · Чёрные {b}',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    menuBtn: '切换模式',
    newGameBtn: '新对局',
    rollBtn: '掷骰',
    chooseModeTitle: '双陆棋',
    chooseModeSub: '与电脑对战、同设备轮流游玩，或通过局域网联机。',
    modeAiBtn: '人机对战',
    modeLocalBtn: '轮流游玩（双人）',
    modeLanBtn: '局域网联机',
    difficultyLabel: '难度',
    diffEasyBtn: '简单',
    diffMediumBtn: '中等',
    diffHardBtn: '困难',
    backToModesBtn: '← 返回',
    colorWhite: '白方',
    colorBlack: '黑方',
    turnToRoll: '轮到{color}掷骰',
    turnToMove: '轮到{color}走子',
    turnYours: '轮到你了',
    turnOpp: '对方回合',
    turnAiThinking: '电脑思考中…',
    waitingOpponent: '等待第二位玩家…房间 {room}',
    spectatorNote: '房间已满——你正在观战',
    hintRoll: '点击骰子（或“掷骰”）掷骰。',
    hintMove: '点击一枚棋子，再点击高亮的点位。',
    hintBar: '先从中条进场——点击高亮的进场点位。',
    hintBearOff: '所有棋子已归家——从你的内区起子。',
    hintNoMoves: '无合法着法——跳过回合。',
    barLabel: '中条',
    offLabel: '起子',
    winYou: '你赢了——15 枚棋子全部起出！',
    winAi: '电脑赢得本局。',
    winOpp: '对方赢了。',
    winColor: '{color}全部起出 15 枚——获胜！',
    winsLine: '胜场 — 白方 {w} · 黑方 {b}',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    menuBtn: 'Cambiar modo',
    newGameBtn: 'Nueva partida',
    rollBtn: 'Tirar dados',
    chooseModeTitle: 'Backgammon',
    chooseModeSub: 'Juega contra la computadora, pasa el dispositivo a un amigo, o conéctate por LAN.',
    modeAiBtn: 'Contra la IA',
    modeLocalBtn: 'Por turnos (2 jugadores)',
    modeLanBtn: 'Multijugador LAN',
    difficultyLabel: 'Dificultad',
    diffEasyBtn: 'Fácil',
    diffMediumBtn: 'Media',
    diffHardBtn: 'Difícil',
    backToModesBtn: '← Atrás',
    colorWhite: 'Blancas',
    colorBlack: 'Negras',
    turnToRoll: 'Tiran las {color}',
    turnToMove: 'Mueven las {color}',
    turnYours: 'Tu turno',
    turnOpp: 'Turno del rival',
    turnAiThinking: 'La IA está pensando…',
    waitingOpponent: 'Esperando a un segundo jugador… sala {room}',
    spectatorNote: 'Sala llena — estás como espectador',
    hintRoll: 'Toca los dados (o Tirar) para tirar.',
    hintMove: 'Toca una ficha y luego un punto resaltado.',
    hintBar: 'Entra primero desde la barra: toca un punto de entrada resaltado.',
    hintBearOff: 'Todas las fichas en casa: retíralas desde tu cuadro interior.',
    hintNoMoves: 'Sin jugadas legales — se pasa el turno.',
    barLabel: 'BARRA',
    offLabel: 'FUERA',
    winYou: '¡Ganas: retiraste las 15 fichas!',
    winAi: 'La IA gana esta partida.',
    winOpp: 'Gana tu rival.',
    winColor: '¡Las {color} retiran las 15: ganan!',
    winsLine: 'Victorias — Blancas {w} · Negras {b}',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    menuBtn: 'تغيير الوضع',
    newGameBtn: 'لعبة جديدة',
    rollBtn: 'رمي النرد',
    chooseModeTitle: 'الطاولة',
    chooseModeSub: 'العب ضد الكمبيوتر، مرر الجهاز لصديق، أو اتصل عبر الشبكة المحلية.',
    modeAiBtn: 'ضد الذكاء الاصطناعي',
    modeLocalBtn: 'بالتناوب (لاعبان)',
    modeLanBtn: 'لعب جماعي عبر LAN',
    difficultyLabel: 'مستوى الصعوبة',
    diffEasyBtn: 'سهل',
    diffMediumBtn: 'متوسط',
    diffHardBtn: 'صعب',
    backToModesBtn: '← رجوع',
    colorWhite: 'الأبيض',
    colorBlack: 'الأسود',
    turnToRoll: 'رمي النرد: {color}',
    turnToMove: 'دور {color}',
    turnYours: 'دورك',
    turnOpp: 'دور الخصم',
    turnAiThinking: 'الذكاء الاصطناعي يفكر…',
    waitingOpponent: 'بانتظار لاعب ثانٍ… الغرفة {room}',
    spectatorNote: 'الغرفة ممتلئة — أنت تشاهد فقط',
    hintRoll: 'انقر على النرد (أو رمي) للرمي.',
    hintMove: 'انقر على حجر ثم على نقطة مميّزة.',
    hintBar: 'ادخل أولًا من الحاجز — انقر على نقطة دخول مميّزة.',
    hintBearOff: 'كل الأحجار في البيت — أخرِجها من بيتك.',
    hintNoMoves: 'لا توجد نقلات — يُمرَّر الدور.',
    barLabel: 'الحاجز',
    offLabel: 'خارج',
    winYou: 'لقد فزت — أخرجتَ الأحجار الخمسة عشر كلها!',
    winAi: 'فاز الذكاء الاصطناعي بهذه اللعبة.',
    winOpp: 'فاز خصمك.',
    winColor: 'أخرج {color} الأحجار الخمسة عشر — الفوز!',
    winsLine: 'الانتصارات — الأبيض {w} · الأسود {b}',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    menuBtn: 'Changer de mode',
    newGameBtn: 'Nouvelle partie',
    rollBtn: 'Lancer les dés',
    chooseModeTitle: 'Backgammon',
    chooseModeSub: "Jouez contre l'IA, passez l'appareil à un ami, ou connectez-vous en LAN.",
    modeAiBtn: "Contre l'IA",
    modeLocalBtn: 'Chacun son tour (2 joueurs)',
    modeLanBtn: 'Multijoueur LAN',
    difficultyLabel: 'Difficulté',
    diffEasyBtn: 'Facile',
    diffMediumBtn: 'Moyen',
    diffHardBtn: 'Difficile',
    backToModesBtn: '← Retour',
    colorWhite: 'Blancs',
    colorBlack: 'Noirs',
    turnToRoll: 'Aux {color} de lancer',
    turnToMove: 'Aux {color} de jouer',
    turnYours: 'Votre tour',
    turnOpp: "Tour de l'adversaire",
    turnAiThinking: "L'IA réfléchit…",
    waitingOpponent: "En attente d'un second joueur… salon {room}",
    spectatorNote: 'Salon complet — vous êtes spectateur',
    hintRoll: 'Touchez les dés (ou Lancer) pour lancer.',
    hintMove: 'Touchez un pion, puis un point surligné.',
    hintBar: "Entrez d'abord depuis la barre — touchez un point d'entrée surligné.",
    hintBearOff: 'Tous les pions à la maison — sortez-les depuis votre jan intérieur.',
    hintNoMoves: 'Aucun coup légal — le tour est passé.',
    barLabel: 'BARRE',
    offLabel: 'SORTIE',
    winYou: 'Vous gagnez — vos 15 pions sont sortis !',
    winAi: "L'IA gagne cette partie.",
    winOpp: "L'adversaire gagne.",
    winColor: 'Les {color} sortent leurs 15 pions — gagné !',
    winsLine: 'Victoires — Blancs {w} · Noirs {b}',
    playAgainBtn: 'Rejouer',
  },
};

function qs(name) {
  try { return new URLSearchParams(location.search).get(name); } catch { return null; }
}

export function detectLang() {
  const q = qs('lang');
  if (q && STRINGS[q]) return q;
  try {
    const stored = localStorage.getItem('ogh_backgammon_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try { localStorage.setItem('ogh_backgammon_lang', lang); } catch { /* ignore */ }
}

/** Translate `key` for `lang`, with optional {placeholder} substitution. */
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
}
