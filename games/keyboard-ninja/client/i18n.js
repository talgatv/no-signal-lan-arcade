/**
 * i18n — UI-chrome string table for Keyboard Ninja.
 * Mirrors games/doodle-guess/client/i18n.js and games/blade-fruit/client/i18n.js
 * (same batch, same shape): a flat STRINGS table per UN-6 language, detect/apply
 * helpers, no framework.
 *
 * IMPORTANT — this table is ONLY the UI chrome (menus, HUD labels, results,
 * race lobby/leaderboard). It is SEPARATE from the actual typing-practice
 * CONTENT the player types (client/data/content.json), which has its own
 * per-language word/sentence banks. Do not conflate the two — in particular,
 * the `zh` UI chrome below is real, natural Chinese (读起来很自然), even
 * though the `zh` *typing content* in content.json is romanized Pinyin, not
 * hanzi (see content.json / README.md for why: real hanzi require an IME
 * composition step this game's 1-keystroke-per-character model can't
 * represent). `ar` UI chrome AND `ar` typing content are both real Arabic
 * script — Arabic doesn't need IME (a standard Arabic keyboard layout maps
 * one physical key to one Arabic letter directly, the same mechanism as a
 * Cyrillic layout for Russian), so it isn't romanized anywhere in this game.
 *
 * RTL (Arabic) flips text-bearing chrome (header, overlays, results, race
 * lobby/leaderboard) via document.dir, same as every sibling game. The race
 * mode's live progress track is the one exception, forced `dir="ltr"` in
 * style.css regardless of UI language — it's a spatial/comparative gameplay
 * element (how far along each racer is), not prose, same precedent as
 * games/tic-tac-toe's board and games/pop-the-bugs' grid both staying
 * un-mirrored for the same reason. The passage-display + typing input DO
 * mirror correctly under RTL (verified: a dir="rtl" span-per-character
 * overlay renders right-to-left while the underlying string index order —
 * and therefore all diff/accuracy logic — stays untouched, exactly like any
 * other RTL text input on the web).
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
    title: 'Keyboard Ninja',
    blurb: 'Type words and sentences as fast and accurately as you can. Practice solo against the clock, or race friends over LAN — everyone types the same passage at once, and the first to finish wins.',
    modePickerTitle: 'Choose a mode',
    modeSoloBtn: 'Solo Practice',
    modeSoloDesc: '60-second timed session. Live WPM and accuracy; your best score is saved on this device.',
    modeRaceBtn: 'LAN Race',
    modeRaceDesc: 'Everyone in the room types the same sentence at once. First to finish wins.',
    keyboardNote: 'Needs a physical keyboard — a typing test has no on-screen keyboard.',
    menuBtn: 'Menu',
    wpmLabel: 'WPM',
    accuracyLabel: 'Accuracy',
    timeLabel: 'Time',
    bestLabel: 'Best',
    readyHint: 'Start typing to begin — the timer starts on your first keystroke.',
    resultsTitle: "Time's up!",
    resultsWpmLine: '{wpm} WPM',
    resultsAccuracyLine: '{acc}% accuracy',
    resultsBestLine: 'Best: {best} WPM',
    newBestBadge: 'New best!',
    playAgainBtn: 'Play again',
    backToMenuBtn: 'Change mode',
    raceLobbyTitle: 'LAN Race',
    raceWaitingRoom: 'Room {room} · {n} online',
    raceWaitingHint: 'Press Start Race when ready. Racing alone still works — you race the clock.',
    startRaceBtn: 'Start Race',
    raceCountdownIn: 'Starting in {n}…',
    raceGo: 'GO!',
    raceYouTag: 'you',
    raceStatusRacing: 'racing…',
    raceStatusFinished: 'finished',
    raceStatusWaiting: 'waiting',
    raceWinnerBanner: '{name} wins the race!',
    raceYouWonBanner: 'You win! 🎉',
    raceTimeUpBanner: "Time's up — ranked by progress",
    youFinishedWaiting: 'You finished! Waiting on {n} more…',
    raceLeaderboardTitle: 'Results',
    raceRankCol: '#',
    raceNameCol: 'Player',
    raceWpmCol: 'WPM',
    raceAccCol: 'Acc',
    raceAgainBtn: 'Race again',
    netOnline: 'Online',
    netOffline: 'Offline — start the PC host (./start.sh) to race others',
    langSwitchAria: 'Language',
    soundOnLabel: 'Key sounds: on',
    soundOffLabel: 'Key sounds: off',
    zhRomanizedNote: 'Chinese text here is romanized Pinyin, not hanzi — see README for why.',
    typingHint: 'Correct letters glow blue, mistakes glow red — just backspace to fix them.',
  },
  ru: {
    back: 'Библиотека',
    title: 'Клавиатурный Ниндзя',
    blurb: 'Печатай слова и предложения как можно быстрее и точнее. Тренируйся один на время или устрой гонку с друзьями по локальной сети — все печатают один и тот же текст одновременно, и побеждает тот, кто закончит первым.',
    modePickerTitle: 'Выбери режим',
    modeSoloBtn: 'Одиночная тренировка',
    modeSoloDesc: 'Сессия на 60 секунд. Скорость и точность в реальном времени; лучший результат сохраняется на этом устройстве.',
    modeRaceBtn: 'Гонка по сети',
    modeRaceDesc: 'Все в комнате печатают одно и то же предложение одновременно. Побеждает тот, кто закончит первым.',
    keyboardNote: 'Нужна физическая клавиатура — у теста на скорость печати нет экранной клавиатуры.',
    menuBtn: 'Меню',
    wpmLabel: 'Знаков/мин',
    accuracyLabel: 'Точность',
    timeLabel: 'Время',
    bestLabel: 'Рекорд',
    readyHint: 'Начни печатать, чтобы стартовать — таймер запускается с первой нажатой клавиши.',
    resultsTitle: 'Время вышло!',
    resultsWpmLine: '{wpm} слов/мин',
    resultsAccuracyLine: 'Точность {acc}%',
    resultsBestLine: 'Рекорд: {best} слов/мин',
    newBestBadge: 'Новый рекорд!',
    playAgainBtn: 'Играть снова',
    backToMenuBtn: 'Сменить режим',
    raceLobbyTitle: 'Гонка по сети',
    raceWaitingRoom: 'Комната {room} · {n} онлайн',
    raceWaitingHint: 'Нажми «Старт гонки», когда будешь готов. Можно гоняться и одному — тогда ты соревнуешься с таймером.',
    startRaceBtn: 'Старт гонки',
    raceCountdownIn: 'Старт через {n}…',
    raceGo: 'СТАРТ!',
    raceYouTag: 'ты',
    raceStatusRacing: 'печатает…',
    raceStatusFinished: 'финиш',
    raceStatusWaiting: 'ждёт',
    raceWinnerBanner: '{name} побеждает в гонке!',
    raceYouWonBanner: 'Ты победил(а)! 🎉',
    raceTimeUpBanner: 'Время вышло — рейтинг по прогрессу',
    youFinishedWaiting: 'Ты финишировал(а)! Ждём ещё {n}…',
    raceLeaderboardTitle: 'Результаты',
    raceRankCol: '#',
    raceNameCol: 'Игрок',
    raceWpmCol: 'Слов/мин',
    raceAccCol: 'Точн.',
    raceAgainBtn: 'Гонка снова',
    netOnline: 'Онлайн',
    netOffline: 'Оффлайн — запусти PC-хост (./start.sh), чтобы гоняться с другими',
    langSwitchAria: 'Язык',
    soundOnLabel: 'Звук клавиш: вкл',
    soundOffLabel: 'Звук клавиш: выкл',
    zhRomanizedNote: 'Китайский текст здесь дан транслитерацией пиньинь, а не иероглифами — см. README.',
    typingHint: 'Верные буквы светятся синим, ошибки — красным. Просто исправь их через Backspace.',
  },
  zh: {
    back: '资料库',
    title: '键盘忍者',
    blurb: '尽可能快速、准确地打出单词和句子。可以独自练习、对抗计时器，也可以通过局域网和朋友比赛——房间里所有人同时打同一段文字，最先完成的获胜。',
    modePickerTitle: '选择模式',
    modeSoloBtn: '单人练习',
    modeSoloDesc: '60秒计时挑战。实时显示打字速度和准确率，最佳成绩会保存在本设备上。',
    modeRaceBtn: '局域网竞速',
    modeRaceDesc: '房间里所有人同时打同一个句子，最先完成的获胜。',
    keyboardNote: '需要实体键盘——打字测试没有屏幕键盘。',
    menuBtn: '菜单',
    wpmLabel: '每分钟字数',
    accuracyLabel: '准确率',
    timeLabel: '时间',
    bestLabel: '最佳',
    readyHint: '开始打字即可开始——计时器会在你按下第一个键时启动。',
    resultsTitle: '时间到！',
    resultsWpmLine: '{wpm} 字/分钟',
    resultsAccuracyLine: '准确率 {acc}%',
    resultsBestLine: '最佳：{best} 字/分钟',
    newBestBadge: '创造新纪录！',
    playAgainBtn: '再玩一次',
    backToMenuBtn: '切换模式',
    raceLobbyTitle: '局域网竞速',
    raceWaitingRoom: '房间 {room} · {n} 人在线',
    raceWaitingHint: '准备好后按下「开始比赛」。一个人也能玩——这时你是在和时间赛跑。',
    startRaceBtn: '开始比赛',
    raceCountdownIn: '{n} 秒后开始…',
    raceGo: '开始！',
    raceYouTag: '你',
    raceStatusRacing: '打字中…',
    raceStatusFinished: '已完成',
    raceStatusWaiting: '等待中',
    raceWinnerBanner: '{name} 赢得了比赛！',
    raceYouWonBanner: '你赢了！🎉',
    raceTimeUpBanner: '时间到——按进度排名',
    youFinishedWaiting: '你已完成！还有 {n} 人未完成…',
    raceLeaderboardTitle: '结果',
    raceRankCol: '名次',
    raceNameCol: '玩家',
    raceWpmCol: '字/分钟',
    raceAccCol: '准确率',
    raceAgainBtn: '再来一局',
    netOnline: '在线',
    netOffline: '离线——启动 PC 主机（./start.sh）即可与他人比赛',
    langSwitchAria: '语言',
    soundOnLabel: '按键音效：开',
    soundOffLabel: '按键音效：关',
    zhRomanizedNote: '这里的中文练习文字是罗马拼音，不是汉字——原因见 README。',
    typingHint: '打对的字母发蓝光，打错的发红光——按退格键改正即可。',
  },
  es: {
    back: 'Biblioteca',
    title: 'Ninja del Teclado',
    blurb: 'Escribe palabras y frases lo más rápido y preciso posible. Practica en solitario contra el reloj, o compite con amigos por red local — todos escriben el mismo texto a la vez, y gana quien termine primero.',
    modePickerTitle: 'Elige un modo',
    modeSoloBtn: 'Práctica en solitario',
    modeSoloDesc: 'Sesión cronometrada de 60 segundos. Velocidad y precisión en vivo; tu mejor marca se guarda en este dispositivo.',
    modeRaceBtn: 'Carrera LAN',
    modeRaceDesc: 'Todos en la sala escriben la misma frase a la vez. Gana quien termine primero.',
    keyboardNote: 'Necesita un teclado físico — una prueba de mecanografía no tiene teclado en pantalla.',
    menuBtn: 'Menú',
    wpmLabel: 'PPM',
    accuracyLabel: 'Precisión',
    timeLabel: 'Tiempo',
    bestLabel: 'Mejor',
    readyHint: 'Empieza a escribir para comenzar — el cronómetro arranca con tu primera tecla.',
    resultsTitle: '¡Se acabó el tiempo!',
    resultsWpmLine: '{wpm} PPM',
    resultsAccuracyLine: '{acc}% de precisión',
    resultsBestLine: 'Mejor: {best} PPM',
    newBestBadge: '¡Nueva mejor marca!',
    playAgainBtn: 'Jugar de nuevo',
    backToMenuBtn: 'Cambiar modo',
    raceLobbyTitle: 'Carrera LAN',
    raceWaitingRoom: 'Sala {room} · {n} en línea',
    raceWaitingHint: 'Pulsa Iniciar carrera cuando estés listo. También puedes correr solo — competirás contra el reloj.',
    startRaceBtn: 'Iniciar carrera',
    raceCountdownIn: 'Empieza en {n}…',
    raceGo: '¡YA!',
    raceYouTag: 'tú',
    raceStatusRacing: 'escribiendo…',
    raceStatusFinished: 'terminado',
    raceStatusWaiting: 'esperando',
    raceWinnerBanner: '¡{name} gana la carrera!',
    raceYouWonBanner: '¡Ganaste! 🎉',
    raceTimeUpBanner: 'Se acabó el tiempo — clasificación por progreso',
    youFinishedWaiting: '¡Terminaste! Esperando a {n} más…',
    raceLeaderboardTitle: 'Resultados',
    raceRankCol: '#',
    raceNameCol: 'Jugador',
    raceWpmCol: 'PPM',
    raceAccCol: 'Prec.',
    raceAgainBtn: 'Correr de nuevo',
    netOnline: 'En línea',
    netOffline: 'Sin conexión — inicia el host de PC (./start.sh) para competir con otros',
    langSwitchAria: 'Idioma',
    soundOnLabel: 'Sonido de teclas: activado',
    soundOffLabel: 'Sonido de teclas: desactivado',
    zhRomanizedNote: 'El texto en chino aquí es pinyin romanizado, no caracteres hanzi — ver el README.',
    typingHint: 'Las letras correctas brillan en azul, los errores en rojo — corrígelos con retroceso.',
  },
  ar: {
    back: 'المكتبة',
    title: 'نينجا لوحة المفاتيح',
    blurb: 'اكتب الكلمات والجمل بأقصى سرعة ودقة ممكنة. تدرّب منفردًا في تحدٍّ زمني، أو تسابق أصدقاءك عبر الشبكة المحلية — يكتب الجميع النص نفسه في الوقت نفسه، ويفوز أول من ينهي.',
    modePickerTitle: 'اختر نمطًا',
    modeSoloBtn: 'تدريب فردي',
    modeSoloDesc: 'جلسة محسوبة بالوقت مدتها 60 ثانية. سرعة الكتابة والدقة مباشرة، وأفضل نتيجة تُحفظ على هذا الجهاز.',
    modeRaceBtn: 'سباق عبر الشبكة',
    modeRaceDesc: 'يكتب الجميع في الغرفة الجملة نفسها في الوقت نفسه. يفوز أول من ينهي.',
    keyboardNote: 'يتطلب لوحة مفاتيح فعلية — اختبار الكتابة لا يحتوي على لوحة مفاتيح على الشاشة.',
    menuBtn: 'القائمة',
    wpmLabel: 'كلمة/دقيقة',
    accuracyLabel: 'الدقة',
    timeLabel: 'الوقت',
    bestLabel: 'الأفضل',
    readyHint: 'ابدأ الكتابة لتبدأ الجلسة — يبدأ العداد مع أول ضغطة مفتاح.',
    resultsTitle: 'انتهى الوقت!',
    resultsWpmLine: '{wpm} كلمة/دقيقة',
    resultsAccuracyLine: 'الدقة {acc}%',
    resultsBestLine: 'الأفضل: {best} كلمة/دقيقة',
    newBestBadge: 'رقم قياسي جديد!',
    playAgainBtn: 'العب مرة أخرى',
    backToMenuBtn: 'تغيير النمط',
    raceLobbyTitle: 'سباق عبر الشبكة',
    raceWaitingRoom: 'الغرفة {room} · {n} متصلون',
    raceWaitingHint: 'اضغط «ابدأ السباق» عند الجاهزية. يمكنك السباق منفردًا أيضًا — عندها تتسابق مع الساعة.',
    startRaceBtn: 'ابدأ السباق',
    raceCountdownIn: 'يبدأ خلال {n}…',
    raceGo: 'انطلق!',
    raceYouTag: 'أنت',
    raceStatusRacing: 'يكتب الآن…',
    raceStatusFinished: 'أنهى',
    raceStatusWaiting: 'ينتظر',
    raceWinnerBanner: '{name} يفوز بالسباق!',
    raceYouWonBanner: 'لقد فزت! 🎉',
    raceTimeUpBanner: 'انتهى الوقت — الترتيب حسب التقدّم',
    youFinishedWaiting: 'لقد أنهيت! بانتظار {n} آخرين…',
    raceLeaderboardTitle: 'النتائج',
    raceRankCol: '#',
    raceNameCol: 'اللاعب',
    raceWpmCol: 'كلمة/د',
    raceAccCol: 'الدقة',
    raceAgainBtn: 'سباق آخر',
    netOnline: 'متصل',
    netOffline: 'غير متصل — شغّل مضيف الـPC (./start.sh) للتسابق مع الآخرين',
    langSwitchAria: 'اللغة',
    soundOnLabel: 'صوت المفاتيح: مفعّل',
    soundOffLabel: 'صوت المفاتيح: معطّل',
    zhRomanizedNote: 'النص الصيني هنا مكتوب بالحروف اللاتينية (پينيين) وليس بالحروف الصينية — راجع README.',
    typingHint: 'الأحرف الصحيحة تتوهّج بالأزرق، والأخطاء بالأحمر — صحّحها بمفتاح الحذف للخلف.',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Ninja du Clavier',
    blurb: "Tapez des mots et des phrases aussi vite et précisément que possible. Entraînez-vous seul contre le chronomètre, ou affrontez vos amis en réseau local — tout le monde tape le même texte en même temps, et le premier à finir gagne.",
    modePickerTitle: 'Choisissez un mode',
    modeSoloBtn: 'Entraînement solo',
    modeSoloDesc: 'Session chronométrée de 60 secondes. Vitesse et précision en direct ; votre meilleur score est enregistré sur cet appareil.',
    modeRaceBtn: 'Course LAN',
    modeRaceDesc: 'Tout le monde dans le salon tape la même phrase en même temps. Le premier à finir gagne.',
    keyboardNote: "Nécessite un clavier physique — un test de vitesse de frappe n'a pas de clavier à l'écran.",
    menuBtn: 'Menu',
    wpmLabel: 'MPM',
    accuracyLabel: 'Précision',
    timeLabel: 'Temps',
    bestLabel: 'Record',
    readyHint: 'Commencez à taper pour démarrer — le chronomètre se lance à la première touche.',
    resultsTitle: 'Temps écoulé !',
    resultsWpmLine: '{wpm} MPM',
    resultsAccuracyLine: '{acc} % de précision',
    resultsBestLine: 'Record : {best} MPM',
    newBestBadge: 'Nouveau record !',
    playAgainBtn: 'Rejouer',
    backToMenuBtn: 'Changer de mode',
    raceLobbyTitle: 'Course LAN',
    raceWaitingRoom: 'Salon {room} · {n} en ligne',
    raceWaitingHint: 'Appuyez sur Démarrer la course quand vous êtes prêt. Courir seul fonctionne aussi — vous affrontez le chronomètre.',
    startRaceBtn: 'Démarrer la course',
    raceCountdownIn: 'Départ dans {n}…',
    raceGo: 'PARTEZ !',
    raceYouTag: 'toi',
    raceStatusRacing: 'en train de taper…',
    raceStatusFinished: 'terminé',
    raceStatusWaiting: 'en attente',
    raceWinnerBanner: '{name} remporte la course !',
    raceYouWonBanner: 'Tu as gagné ! 🎉',
    raceTimeUpBanner: 'Temps écoulé — classement par progression',
    youFinishedWaiting: 'Tu as terminé ! En attente de {n} autres…',
    raceLeaderboardTitle: 'Résultats',
    raceRankCol: '#',
    raceNameCol: 'Joueur',
    raceWpmCol: 'MPM',
    raceAccCol: 'Préc.',
    raceAgainBtn: 'Recourir',
    netOnline: 'En ligne',
    netOffline: "Hors ligne — lance l'hôte PC (./start.sh) pour courir avec d'autres",
    langSwitchAria: 'Langue',
    soundOnLabel: 'Sons des touches : activés',
    soundOffLabel: 'Sons des touches : désactivés',
    zhRomanizedNote: 'Le texte chinois ici est du pinyin romanisé, pas des sinogrammes — voir le README.',
    typingHint: 'Les lettres correctes brillent en bleu, les erreurs en rouge — corrige-les avec Retour arrière.',
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
    const stored = localStorage.getItem('ogh_keyboard_ninja_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_keyboard_ninja_lang', lang);
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
