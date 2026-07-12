/**
 * i18n — string table for Dominoes (UN-6 languages), mirroring
 * games/tic-tac-toe/client/i18n.js: a flat STRINGS table per language,
 * detect/apply helpers, {placeholder} substitution, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only. The domino LINE and the
 * hands are a fixed spatial layout (a line grows left/right; pips read in a
 * fixed order) and are deliberately NOT mirrored — see the dir="ltr" pins in
 * index.html.
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
    chooseModeTitle: 'Dominoes',
    chooseModeSub: 'Double-six block dominoes. Play the computer, pass the device to a friend, or connect over LAN.',
    modeAiBtn: 'vs AI',
    modeLocalBtn: 'Pass & Play',
    modeLanBtn: 'LAN Multiplayer',
    hint: 'Tap a playable tile, then choose an end if needed.',
    hintOpener: 'You start — play any tile to open the line.',
    hintChooseEnd: 'Choose which end to play on.',
    hintDraw: 'No move — draw from the boneyard.',
    hintPass: 'No move and the boneyard is empty — pass.',
    turnYours: 'Your turn',
    turnOpp: "Opponent's turn",
    turnAiThinking: 'AI is thinking…',
    turnPlayer: 'Player {n} to move',
    waitingOpponent: 'Waiting for a second player… room {room}',
    offlineLanNote: 'Offline — playing pass & play on this device',
    spectatorNote: 'Room is full — spectating',
    dealingNote: 'Dealing…',
    drawBtn: 'Draw',
    passBtn: 'Pass',
    boneyardLabel: 'Boneyard',
    youWinTitle: 'You win!',
    oppWinTitle: 'Opponent wins!',
    aiWinTitle: 'AI wins!',
    playerWinTitle: 'Player {n} wins!',
    drawTitle: "It's a draw!",
    resultEmptied: 'Played the last tile!',
    resultBlocked: 'Blocked game — fewest pips wins.',
    resultPips: 'Pips left — You {you} · Opponent {opp}',
    resultPipsPlayers: 'Pips left — Player 1: {a} · Player 2: {b}',
    winsLineVs: 'Wins — You {a} · Them {b}',
    winsLineLocal: 'Wins — Player 1: {a} · Player 2: {b}',
    passDeviceTitle: 'Pass the device',
    passDeviceSub: "Hand the device to Player {n}, then tap when you're ready.",
    passDeviceBtn: "I'm ready",
    playAgainBtn: 'Play again',
  },
  ru: {
    back: 'Библиотека',
    menuBtn: 'Сменить режим',
    newGameBtn: 'Новая игра',
    chooseModeTitle: 'Домино',
    chooseModeSub: 'Домино «дубль-шесть», глухой вариант. Играйте против компьютера, передавайте устройство другу или подключитесь по локальной сети.',
    modeAiBtn: 'Против ИИ',
    modeLocalBtn: 'По очереди (2 игрока)',
    modeLanBtn: 'LAN мультиплеер',
    hint: 'Коснись подходящей кости, при необходимости выбери конец.',
    hintOpener: 'Вы начинаете — выложите любую кость.',
    hintChooseEnd: 'Выберите, к какому концу приложить.',
    hintDraw: 'Хода нет — возьмите кость из базара.',
    hintPass: 'Хода нет и базар пуст — пропуск.',
    turnYours: 'Ваш ход',
    turnOpp: 'Ход соперника',
    turnAiThinking: 'ИИ думает…',
    turnPlayer: 'Ходит игрок {n}',
    waitingOpponent: 'Ожидание второго игрока… комната {room}',
    offlineLanNote: 'Офлайн — игра по очереди на этом устройстве',
    spectatorNote: 'Комната заполнена — вы наблюдатель',
    dealingNote: 'Раздача…',
    drawBtn: 'Взять',
    passBtn: 'Пропуск',
    boneyardLabel: 'Базар',
    youWinTitle: 'Вы выиграли!',
    oppWinTitle: 'Соперник выиграл!',
    aiWinTitle: 'ИИ выиграл!',
    playerWinTitle: 'Победил игрок {n}!',
    drawTitle: 'Ничья!',
    resultEmptied: 'Выложена последняя кость!',
    resultBlocked: 'Игра заблокирована — побеждает меньшая сумма очков.',
    resultPips: 'Очки на руках — Вы {you} · Соперник {opp}',
    resultPipsPlayers: 'Очки на руках — Игрок 1: {a} · Игрок 2: {b}',
    winsLineVs: 'Победы — Вы {a} · Соперник {b}',
    winsLineLocal: 'Победы — Игрок 1: {a} · Игрок 2: {b}',
    passDeviceTitle: 'Передайте устройство',
    passDeviceSub: 'Передайте устройство игроку {n} и нажмите, когда будете готовы.',
    passDeviceBtn: 'Я готов',
    playAgainBtn: 'Играть снова',
  },
  zh: {
    back: '资料库',
    menuBtn: '切换模式',
    newGameBtn: '新对局',
    chooseModeTitle: '多米诺骨牌',
    chooseModeSub: '双六「闷牌」多米诺。与电脑对战、同设备轮流游玩，或通过局域网联机。',
    modeAiBtn: '人机对战',
    modeLocalBtn: '轮流游玩（双人）',
    modeLanBtn: '局域网联机',
    hint: '点击可出的骨牌，需要时再选择一端。',
    hintOpener: '你先手——出任意一张骨牌开局。',
    hintChooseEnd: '选择要接在哪一端。',
    hintDraw: '无牌可出——从牌堆摸牌。',
    hintPass: '无牌可出且牌堆已空——过牌。',
    turnYours: '轮到你了',
    turnOpp: '对方回合',
    turnAiThinking: '电脑思考中…',
    turnPlayer: '轮到玩家 {n}',
    waitingOpponent: '等待第二位玩家…房间 {room}',
    offlineLanNote: '离线——在本设备上轮流游玩',
    spectatorNote: '房间已满——你正在观战',
    dealingNote: '发牌中…',
    drawBtn: '摸牌',
    passBtn: '过牌',
    boneyardLabel: '牌堆',
    youWinTitle: '你赢了！',
    oppWinTitle: '对方赢了！',
    aiWinTitle: '电脑赢了！',
    playerWinTitle: '玩家 {n} 获胜！',
    drawTitle: '平局！',
    resultEmptied: '打出了最后一张骨牌！',
    resultBlocked: '牌局封死——剩余点数最少者获胜。',
    resultPips: '手中点数 — 你 {you} · 对手 {opp}',
    resultPipsPlayers: '手中点数 — 玩家1：{a} · 玩家2：{b}',
    winsLineVs: '胜场 — 你 {a} · 对手 {b}',
    winsLineLocal: '胜场 — 玩家1：{a} · 玩家2：{b}',
    passDeviceTitle: '传递设备',
    passDeviceSub: '把设备交给玩家 {n}，准备好后点击继续。',
    passDeviceBtn: '我准备好了',
    playAgainBtn: '再玩一次',
  },
  es: {
    back: 'Biblioteca',
    menuBtn: 'Cambiar modo',
    newGameBtn: 'Nueva partida',
    chooseModeTitle: 'Dominó',
    chooseModeSub: 'Dominó doble-seis (variante cerrada). Juega contra la computadora, pasa el dispositivo a un amigo, o conéctate por LAN.',
    modeAiBtn: 'Contra la IA',
    modeLocalBtn: 'Por turnos (2 jugadores)',
    modeLanBtn: 'Multijugador LAN',
    hint: 'Toca una ficha jugable y elige un extremo si hace falta.',
    hintOpener: 'Empiezas tú — juega cualquier ficha para abrir.',
    hintChooseEnd: 'Elige en qué extremo jugar.',
    hintDraw: 'Sin jugada — roba del pozo.',
    hintPass: 'Sin jugada y el pozo está vacío — pasa.',
    turnYours: 'Tu turno',
    turnOpp: 'Turno del rival',
    turnAiThinking: 'La IA está pensando…',
    turnPlayer: 'Turno del jugador {n}',
    waitingOpponent: 'Esperando a un segundo jugador… sala {room}',
    offlineLanNote: 'Sin conexión — jugando por turnos en este dispositivo',
    spectatorNote: 'Sala llena — estás como espectador',
    dealingNote: 'Repartiendo…',
    drawBtn: 'Robar',
    passBtn: 'Pasar',
    boneyardLabel: 'Pozo',
    youWinTitle: '¡Has ganado!',
    oppWinTitle: '¡Gana el rival!',
    aiWinTitle: '¡Gana la IA!',
    playerWinTitle: '¡Gana el jugador {n}!',
    drawTitle: '¡Empate!',
    resultEmptied: '¡Jugó su última ficha!',
    resultBlocked: 'Partida cerrada — gana el de menos puntos.',
    resultPips: 'Puntos en mano — Tú {you} · Rival {opp}',
    resultPipsPlayers: 'Puntos en mano — Jugador 1: {a} · Jugador 2: {b}',
    winsLineVs: 'Victorias — Tú {a} · Rival {b}',
    winsLineLocal: 'Victorias — Jugador 1: {a} · Jugador 2: {b}',
    passDeviceTitle: 'Pasa el dispositivo',
    passDeviceSub: 'Entrega el dispositivo al jugador {n} y toca cuando estés listo.',
    passDeviceBtn: 'Estoy listo',
    playAgainBtn: 'Jugar de nuevo',
  },
  ar: {
    back: 'المكتبة',
    menuBtn: 'تغيير الوضع',
    newGameBtn: 'لعبة جديدة',
    chooseModeTitle: 'الدومينو',
    chooseModeSub: 'دومينو دبل-ستة (اللعب المغلق). العب ضد الكمبيوتر، مرر الجهاز لصديق، أو اتصل عبر الشبكة المحلية.',
    modeAiBtn: 'ضد الذكاء الاصطناعي',
    modeLocalBtn: 'بالتناوب (لاعبان)',
    modeLanBtn: 'لعب جماعي عبر LAN',
    hint: 'اضغط على حجر قابل للعب، ثم اختر طرفًا إذا لزم.',
    hintOpener: 'تبدأ أنت — العب أي حجر لفتح الخط.',
    hintChooseEnd: 'اختر أي طرف تلعب عليه.',
    hintDraw: 'لا حركة — اسحب من المخزن.',
    hintPass: 'لا حركة والمخزن فارغ — مرِّر الدور.',
    turnYours: 'دورك',
    turnOpp: 'دور الخصم',
    turnAiThinking: 'الذكاء الاصطناعي يفكر…',
    turnPlayer: 'دور اللاعب {n}',
    waitingOpponent: 'بانتظار لاعب ثانٍ… الغرفة {room}',
    offlineLanNote: 'غير متصل — يُلعب بالتناوب على هذا الجهاز',
    spectatorNote: 'الغرفة ممتلئة — أنت تشاهد فقط',
    dealingNote: 'جارٍ التوزيع…',
    drawBtn: 'اسحب',
    passBtn: 'مرِّر',
    boneyardLabel: 'المخزن',
    youWinTitle: 'لقد فزت!',
    oppWinTitle: 'فاز الخصم!',
    aiWinTitle: 'فاز الذكاء الاصطناعي!',
    playerWinTitle: 'فاز اللاعب {n}!',
    drawTitle: 'تعادل!',
    resultEmptied: 'لعب آخر حجر!',
    resultBlocked: 'لعبة مغلقة — يفوز صاحب أقل نقاط.',
    resultPips: 'النقاط في اليد — أنت {you} · الخصم {opp}',
    resultPipsPlayers: 'النقاط في اليد — اللاعب 1: {a} · اللاعب 2: {b}',
    winsLineVs: 'الانتصارات — أنت {a} · الخصم {b}',
    winsLineLocal: 'الانتصارات — اللاعب 1: {a} · اللاعب 2: {b}',
    passDeviceTitle: 'مرّر الجهاز',
    passDeviceSub: 'سلّم الجهاز للاعب {n}، ثم اضغط عندما تكون جاهزًا.',
    passDeviceBtn: 'أنا جاهز',
    playAgainBtn: 'العب مرة أخرى',
  },
  fr: {
    back: 'Bibliothèque',
    menuBtn: 'Changer de mode',
    newGameBtn: 'Nouvelle partie',
    chooseModeTitle: 'Dominos',
    chooseModeSub: 'Dominos double-six (jeu bloqué). Jouez contre l\'IA, passez l\'appareil à un ami, ou connectez-vous en LAN.',
    modeAiBtn: "Contre l'IA",
    modeLocalBtn: 'Chacun son tour (2 joueurs)',
    modeLanBtn: 'Multijoueur LAN',
    hint: 'Touchez une tuile jouable, puis choisissez un bout si besoin.',
    hintOpener: "Vous commencez — jouez n'importe quelle tuile pour ouvrir.",
    hintChooseEnd: 'Choisissez sur quel bout jouer.',
    hintDraw: 'Aucun coup — piochez dans la pioche.',
    hintPass: 'Aucun coup et la pioche est vide — passez.',
    turnYours: 'Votre tour',
    turnOpp: "Tour de l'adversaire",
    turnAiThinking: "L'IA réfléchit…",
    turnPlayer: 'Au tour du joueur {n}',
    waitingOpponent: "En attente d'un second joueur… salon {room}",
    offlineLanNote: 'Hors ligne — on joue à tour de rôle sur cet appareil',
    spectatorNote: 'Salon complet — vous êtes spectateur',
    dealingNote: 'Distribution…',
    drawBtn: 'Piocher',
    passBtn: 'Passer',
    boneyardLabel: 'Pioche',
    youWinTitle: 'Vous avez gagné !',
    oppWinTitle: "L'adversaire gagne !",
    aiWinTitle: "L'IA gagne !",
    playerWinTitle: 'Le joueur {n} gagne !',
    drawTitle: 'Match nul !',
    resultEmptied: 'A joué sa dernière tuile !',
    resultBlocked: 'Partie bloquée — le moins de points gagne.',
    resultPips: 'Points en main — Vous {you} · Adversaire {opp}',
    resultPipsPlayers: 'Points en main — Joueur 1 : {a} · Joueur 2 : {b}',
    winsLineVs: 'Victoires — Vous {a} · Adversaire {b}',
    winsLineLocal: 'Victoires — Joueur 1 : {a} · Joueur 2 : {b}',
    passDeviceTitle: "Passez l'appareil",
    passDeviceSub: "Donnez l'appareil au joueur {n}, puis touchez quand vous êtes prêt.",
    passDeviceBtn: 'Je suis prêt',
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
    const stored = localStorage.getItem('ogh_domino_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try { localStorage.setItem('ogh_domino_lang', lang); } catch { /* ignore */ }
}

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
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(lang, el.getAttribute('data-i18n-title'));
  });
}
