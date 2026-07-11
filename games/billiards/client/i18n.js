/**
 * i18n — small string table for Billiards.
 * Mirrors games/mini-golf/client/i18n.js (same batch, same shape): a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 * RTL (Arabic) flips text-bearing UI chrome only (HUD pills, overlay cards,
 * buttons) — the table itself (rail/pocket positions, ball layout, aim
 * direction) is a fixed spatial gameplay layout, not text, and is
 * deliberately kept un-mirrored: game.js hardcodes dir="ltr" on the canvas
 * regardless of document-level RTL, same precedent as games/mini-golf's and
 * games/penguin-fling's canvas.
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
    title: 'Billiards',
    blurb: 'Top-down 8-ball pool with real physics — drag back from the cue ball like a slingshot, let go to shoot, and pocket your balls before the 8-ball. Solo practice or pass-and-play 2-player.',
    modeSoloBtn: 'Solo Practice',
    mode8BallBtn: '2-Player 8-Ball',
    turnLabel: "Player {n}'s turn",
    groupSolid: 'Solids',
    groupStripe: 'Stripes',
    groupOpen: 'Open table',
    eightBallNext: '8-ball next!',
    remainingLabel: '{n} left',
    soloRemainingLabel: 'Balls left {n}/15',
    newRackBtn: 'New Rack',
    aimHint: 'Drag back from the cue ball, then let go to shoot',
    aimReadout: 'Power {power}%',
    shootingHint: 'Rolling…',
    placingHint: 'Ball in hand — tap the table to place the cue ball, then grab it to aim',
    foulScratch: 'Scratch! Ball in hand for Player {n}',
    foulNoContact: 'Foul — no ball hit. Ball in hand for Player {n}',
    foulWrongBall: 'Foul — wrong ball hit first. Ball in hand for Player {n}',
    groupAssignedMessage: 'Player {n} is now {group}',
    winTitle: 'Player {n} wins!',
    winEightLine: 'Cleared {group} and legally pocketed the 8-ball.',
    lossEightEarlyLine: 'Player {n} pocketed the 8-ball too early.',
    lossEightScratchLine: 'Player {n} pocketed the 8-ball on a scratch.',
    playAgainBtn: 'Play again',
    changeModeBtn: 'Change mode',
    rackClearedToast: 'Rack cleared!',
    langSwitchAria: 'Language',
  },
  ru: {
    back: 'Библиотека',
    title: 'Бильярд',
    blurb: 'Вид сверху на американский бильярд (8-ball) с настоящей физикой — оттяни биток назад, как рогатку, и отпусти для удара. Забивай свою группу шаров раньше восьмого. Соло-тренировка или игра вдвоём по очереди.',
    modeSoloBtn: 'Тренировка соло',
    mode8BallBtn: 'Двое игроков, 8-ball',
    turnLabel: 'Ход игрока {n}',
    groupSolid: 'Простые',
    groupStripe: 'Полосатые',
    groupOpen: 'Стол открыт',
    eightBallNext: 'Теперь восьмой шар!',
    remainingLabel: 'Осталось {n}',
    soloRemainingLabel: 'Осталось шаров {n}/15',
    newRackBtn: 'Новая расстановка',
    aimHint: 'Оттяни биток назад и отпусти для удара',
    aimReadout: 'Сила {power}%',
    shootingHint: 'Катятся…',
    placingHint: 'Биток в руке — коснись стола, чтобы поставить биток, затем возьми его для прицела',
    foulScratch: 'Свояк! Биток в руке игрока {n}',
    foulNoContact: 'Фол — ни один шар не задет. Биток в руке игрока {n}',
    foulWrongBall: 'Фол — задет чужой шар первым. Биток в руке игрока {n}',
    groupAssignedMessage: 'Игрок {n} теперь играет {group}',
    winTitle: 'Игрок {n} побеждает!',
    winEightLine: 'Забил всю группу «{group}» и затем восьмой шар по правилам.',
    lossEightEarlyLine: 'Игрок {n} забил восьмой шар слишком рано.',
    lossEightScratchLine: 'Игрок {n} забил восьмой шар со свояком.',
    playAgainBtn: 'Играть снова',
    changeModeBtn: 'Сменить режим',
    rackClearedToast: 'Стол очищен!',
    langSwitchAria: 'Язык',
  },
  zh: {
    back: '资料库',
    title: '桌球',
    blurb: '俯视角 8 号球桌球，真实物理效果——像弹弓一样把母球向后拉，松手即可击球。在打进 8 号球之前先清空自己的一组球。可单人练习，也可两人轮流对战。',
    modeSoloBtn: '单人练习',
    mode8BallBtn: '双人 8 号球',
    turnLabel: '玩家 {n} 的回合',
    groupSolid: '全色球',
    groupStripe: '花色球',
    groupOpen: '球局未定',
    eightBallNext: '该打 8 号球了！',
    remainingLabel: '剩余 {n} 个',
    soloRemainingLabel: '剩余球数 {n}/15',
    newRackBtn: '重新摆球',
    aimHint: '把母球向后拖拽，松手即可击球',
    aimReadout: '力度 {power}%',
    shootingHint: '滚动中…',
    placingHint: '母球在手——点击球桌放置母球，然后抓住它瞄准',
    foulScratch: '母球落袋！母球交给玩家 {n} 自由摆放',
    foulNoContact: '犯规——未击中任何球。母球交给玩家 {n} 自由摆放',
    foulWrongBall: '犯规——先击中了对方的球。母球交给玩家 {n} 自由摆放',
    groupAssignedMessage: '玩家 {n} 现在打{group}',
    winTitle: '玩家 {n} 获胜！',
    winEightLine: '清空{group}后合法打进 8 号球。',
    lossEightEarlyLine: '玩家 {n} 过早打进了 8 号球。',
    lossEightScratchLine: '玩家 {n} 打进 8 号球的同时母球落袋。',
    playAgainBtn: '再玩一次',
    changeModeBtn: '切换模式',
    rackClearedToast: '球桌已清空！',
    langSwitchAria: '语言',
  },
  es: {
    back: 'Biblioteca',
    title: 'Billar',
    blurb: 'Billar americano (8-ball) visto desde arriba con física real — arrastra hacia atrás desde la bola blanca como un tirachinas y suelta para golpear. Mete tus bolas antes que la 8. Práctica en solitario o dos jugadores por turnos.',
    modeSoloBtn: 'Práctica en solitario',
    mode8BallBtn: '2 jugadores, 8-ball',
    turnLabel: 'Turno del jugador {n}',
    groupSolid: 'Lisas',
    groupStripe: 'Rayadas',
    groupOpen: 'Mesa abierta',
    eightBallNext: '¡Ahora la bola 8!',
    remainingLabel: 'Quedan {n}',
    soloRemainingLabel: 'Bolas restantes {n}/15',
    newRackBtn: 'Nueva formación',
    aimHint: 'Arrastra hacia atrás desde la bola blanca y suelta para golpear',
    aimReadout: 'Potencia {power}%',
    shootingHint: 'Rodando…',
    placingHint: 'Bola en mano — toca la mesa para colocar la bola blanca y luego agárrala para apuntar',
    foulScratch: '¡Bola blanca embocada! Bola en mano para el jugador {n}',
    foulNoContact: 'Falta — no se tocó ninguna bola. Bola en mano para el jugador {n}',
    foulWrongBall: 'Falta — se tocó primero una bola equivocada. Bola en mano para el jugador {n}',
    groupAssignedMessage: 'El jugador {n} ahora juega {group}',
    winTitle: '¡El jugador {n} gana!',
    winEightLine: 'Despejó sus {group} y embocó la bola 8 legalmente.',
    lossEightEarlyLine: 'El jugador {n} embocó la bola 8 demasiado pronto.',
    lossEightScratchLine: 'El jugador {n} embocó la bola 8 junto con la blanca.',
    playAgainBtn: 'Jugar de nuevo',
    changeModeBtn: 'Cambiar modo',
    rackClearedToast: '¡Mesa despejada!',
    langSwitchAria: 'Idioma',
  },
  ar: {
    back: 'المكتبة',
    title: 'البلياردو',
    blurb: 'بلياردو 8-Ball من الأعلى بفيزياء حقيقية — اسحب الكرة البيضاء للخلف كالمقلاع ثم أفلتها لتضرب. سدّد كراتك قبل الكرة الثامنة. تدريب فردي أو لعب بالتناوب بين لاعبين.',
    modeSoloBtn: 'تدريب فردي',
    mode8BallBtn: 'لاعبان — 8-Ball',
    turnLabel: 'دور اللاعب {n}',
    groupSolid: 'الكرات الصلبة',
    groupStripe: 'الكرات المخططة',
    groupOpen: 'الطاولة مفتوحة',
    eightBallNext: 'الدور الآن على الكرة الثامنة!',
    remainingLabel: 'تبقّى {n}',
    soloRemainingLabel: 'الكرات المتبقية {n}/15',
    newRackBtn: 'إعادة التجميع',
    aimHint: 'اسحب الكرة البيضاء للخلف ثم أفلتها لضربها',
    aimReadout: 'القوة {power}%',
    shootingHint: 'تتدحرج…',
    placingHint: 'الكرة في اليد — المس الطاولة لوضع الكرة البيضاء ثم أمسكها للتصويب',
    foulScratch: 'سقطت الكرة البيضاء! الكرة في يد اللاعب {n}',
    foulNoContact: 'خطأ — لم تُلامس أي كرة. الكرة في يد اللاعب {n}',
    foulWrongBall: 'خطأ — لُمست الكرة الخطأ أولًا. الكرة في يد اللاعب {n}',
    groupAssignedMessage: 'اللاعب {n} يلعب الآن {group}',
    winTitle: 'اللاعب {n} يفوز!',
    winEightLine: 'أنهى كرات {group} ثم سدّد الكرة الثامنة بشكل قانوني.',
    lossEightEarlyLine: 'سدّد اللاعب {n} الكرة الثامنة مبكرًا جدًا.',
    lossEightScratchLine: 'سدّد اللاعب {n} الكرة الثامنة مع سقوط الكرة البيضاء.',
    playAgainBtn: 'العب مرة أخرى',
    changeModeBtn: 'تغيير الوضع',
    rackClearedToast: 'تم تفريغ الطاولة!',
    langSwitchAria: 'اللغة',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Billard',
    blurb: "Billard américain (8-ball) vu de dessus avec une vraie physique — tirez la bille blanche vers l'arrière comme une fronde, puis relâchez pour tirer. Rentrez vos billes avant la 8. Entraînement solo ou à deux joueurs en tour par tour.",
    modeSoloBtn: 'Entraînement solo',
    mode8BallBtn: '2 joueurs, 8-ball',
    turnLabel: 'Tour du joueur {n}',
    groupSolid: 'Pleines',
    groupStripe: 'Rayées',
    groupOpen: 'Table ouverte',
    eightBallNext: 'Place à la bille 8 !',
    remainingLabel: '{n} restantes',
    soloRemainingLabel: 'Billes restantes {n}/15',
    newRackBtn: 'Nouveau triangle',
    aimHint: "Tirez la bille blanche vers l'arrière puis relâchez pour tirer",
    aimReadout: 'Puissance {power}%',
    shootingHint: 'En mouvement…',
    placingHint: "Bille en main — touchez la table pour placer la bille blanche, puis saisissez-la pour viser",
    foulScratch: 'Bille blanche empochée ! Bille en main pour le joueur {n}',
    foulNoContact: "Faute — aucune bille touchée. Bille en main pour le joueur {n}",
    foulWrongBall: 'Faute — mauvaise bille touchée en premier. Bille en main pour le joueur {n}',
    groupAssignedMessage: 'Le joueur {n} joue maintenant les {group}',
    winTitle: 'Le joueur {n} gagne !',
    winEightLine: 'A dégagé ses {group} puis empoché la bille 8 régulièrement.',
    lossEightEarlyLine: 'Le joueur {n} a empoché la bille 8 trop tôt.',
    lossEightScratchLine: 'Le joueur {n} a empoché la bille 8 avec une bille blanche perdue.',
    playAgainBtn: 'Rejouer',
    changeModeBtn: 'Changer de mode',
    rackClearedToast: 'Table débarrassée !',
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
    const stored = localStorage.getItem('ogh_billiards_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_billiards_lang', lang);
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

/** Localized label for a ball group ('solid' | 'stripe' | null-> open). */
export function groupLabel(lang, group) {
  if (group === 'solid') return t(lang, 'groupSolid');
  if (group === 'stripe') return t(lang, 'groupStripe');
  return t(lang, 'groupOpen');
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
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    el.setAttribute('aria-label', t(lang, key));
  });
}
