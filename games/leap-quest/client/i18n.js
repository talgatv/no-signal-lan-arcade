/**
 * i18n — string table for Leap Quest. Mirrors games/gem-swap/client/i18n.js
 * and other siblings this batch (same shape): a flat STRINGS table per
 * UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link,
 * HUD pill labels, hint, legend and overlay cards. It deliberately does
 * NOT mirror the play field: the level layout, the camera, the direction
 * the player runs, and the LEFT/RIGHT/JUMP button positions are a fixed
 * spatial gameplay convention, not prose. Mirroring a scrolling platformer
 * for Arabic would silently invert every jump and every "run right toward
 * the flag" instinct — the exact mistake already caught and fixed in a few
 * earlier games this batch (see games/hill-rider and games/gem-swap notes).
 * The stage/canvas and the touch layer are pinned dir="ltr" in the markup,
 * and ctx.direction is forced 'ltr' in game.js.
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
    title: 'Leap Quest',
    blurb:
      'Run, leap, and stomp your way across five neon worlds. Bounce on foes from above, wall-jump up sheer shafts, dodge spikes and pits, grab every coin, and reach the flag.',
    langSwitchAria: 'Language',
    startBtn: 'Start quest',
    playAgainBtn: 'Play again',
    continueBtn: 'Continue',
    livesLabel: 'LIVES',
    coinsLabel: 'COINS',
    levelLabel: 'LEVEL',
    scoreLabel: 'SCORE',
    hudLivesAria: 'Lives remaining',
    hudCoinsAria: 'Coins collected',
    hudLevelAria: 'Current level',
    hudScoreAria: 'Score',
    controlsNote:
      'Touch: hold LEFT / RIGHT to run, tap JUMP to hop — hold JUMP longer to leap higher. Slide down a wall and tap JUMP to wall-jump off it. Desktop: arrow keys or A / D to move, Space / W / Up to jump.',
    abilityNote:
      'Wall-jump: press into a wall while falling to slide, then jump to kick off it — the only way up the tall shafts in later levels.',
    hint: 'Hold JUMP longer to leap higher · slide a wall + JUMP to wall-jump',
    levelClearTitle: 'Level clear!',
    levelClearSub: 'Nicely done — on to the next.',
    winTitle: 'Quest complete!',
    overTitle: 'Game over',
    winSub: 'You cleared every world. Legendary leaping.',
    overSub: 'Out of lives — the quest ends here.',
    finalScoreLabel: 'Score',
    levelsClearedLabel: 'Levels cleared',
    bestLabel: 'Best score',
    newBestLine: 'New best score!',
    legendCoin: 'Coin — collect for points',
    legendMush: 'Star shell — one extra hit',
    legendFlag: 'Flag — reach it to clear the level',
    legendCrawler: 'Crawler — patrols; stomp from above',
    legendStalker: 'Stalker — charges when it spots you',
    legendSpikes: 'Spikes & pits — avoid them',
    btnLeftAria: 'Move left',
    btnRightAria: 'Move right',
    btnJumpAria: 'Jump',
  },
  ru: {
    back: 'Библиотека',
    title: 'Прыжок-Квест',
    blurb:
      'Беги, прыгай и приземляйся на врагов в пяти неоновых мирах. Отскакивай от противников сверху, забирайся по стенам прыжками, уворачивайся от шипов и ям, собирай монеты и доберись до флага.',
    langSwitchAria: 'Язык',
    startBtn: 'Начать квест',
    playAgainBtn: 'Играть ещё',
    continueBtn: 'Дальше',
    livesLabel: 'ЖИЗНИ',
    coinsLabel: 'МОНЕТЫ',
    levelLabel: 'УРОВЕНЬ',
    scoreLabel: 'ОЧКИ',
    hudLivesAria: 'Осталось жизней',
    hudCoinsAria: 'Собрано монет',
    hudLevelAria: 'Текущий уровень',
    hudScoreAria: 'Очки',
    controlsNote:
      'Сенсор: удерживай ВЛЕВО / ВПРАВО для бега, нажми ПРЫЖОК для прыжка — держи ПРЫЖОК дольше, чтобы прыгнуть выше. Скользи по стене и нажми ПРЫЖОК, чтобы оттолкнуться от неё. ПК: стрелки или A / D — движение, Пробел / W / Вверх — прыжок.',
    abilityNote:
      'Прыжок от стены: прижмись к стене в падении, чтобы скользить, затем прыгни, чтобы оттолкнуться — единственный путь наверх по высоким шахтам на поздних уровнях.',
    hint: 'Держи ПРЫЖОК дольше — прыгнешь выше · скольжение по стене + ПРЫЖОК = прыжок от стены',
    levelClearTitle: 'Уровень пройден!',
    levelClearSub: 'Отлично — вперёд, к следующему.',
    winTitle: 'Квест пройден!',
    overTitle: 'Игра окончена',
    winSub: 'Ты прошёл все миры. Легендарные прыжки.',
    overSub: 'Жизни кончились — квест обрывается здесь.',
    finalScoreLabel: 'Очки',
    levelsClearedLabel: 'Пройдено уровней',
    bestLabel: 'Лучший результат',
    newBestLine: 'Новый рекорд!',
    legendCoin: 'Монета — очки за сбор',
    legendMush: 'Звёздный панцирь — один лишний удар',
    legendFlag: 'Флаг — дойди до него, чтобы пройти уровень',
    legendCrawler: 'Ползун — патрулирует; прыгай сверху',
    legendStalker: 'Преследователь — бросается, заметив тебя',
    legendSpikes: 'Шипы и ямы — избегай их',
    btnLeftAria: 'Влево',
    btnRightAria: 'Вправо',
    btnJumpAria: 'Прыжок',
  },
  zh: {
    back: '资料库',
    title: '跳跃征程',
    blurb:
      '在五个霓虹世界里奔跑、跳跃、踩踏。从上方踩扁敌人，蹬墙跳上高耸的竖井，躲开尖刺与深坑，收集金币，抵达终点旗帜。',
    langSwitchAria: '语言',
    startBtn: '开始征程',
    playAgainBtn: '再玩一次',
    continueBtn: '继续',
    livesLabel: '生命',
    coinsLabel: '金币',
    levelLabel: '关卡',
    scoreLabel: '分数',
    hudLivesAria: '剩余生命',
    hudCoinsAria: '已收集金币',
    hudLevelAria: '当前关卡',
    hudScoreAria: '分数',
    controlsNote:
      '触屏：按住 左 / 右 奔跑，点 跳跃 起跳——按得越久跳得越高。沿墙下滑时点 跳跃 即可蹬墙跳。桌面：方向键或 A / D 移动，空格 / W / 上 跳跃。',
    abilityNote:
      '蹬墙跳：下落时贴住墙面开始下滑，再按跳跃即可蹬墙弹起——这是后期关卡爬上高竖井的唯一办法。',
    hint: '按住跳跃更久跳得更高 · 贴墙下滑 + 跳跃 = 蹬墙跳',
    levelClearTitle: '过关！',
    levelClearSub: '干得漂亮——进入下一关。',
    winTitle: '征程完成！',
    overTitle: '游戏结束',
    winSub: '你通关了所有世界。传奇般的跳跃。',
    overSub: '生命耗尽——征程到此为止。',
    finalScoreLabel: '分数',
    levelsClearedLabel: '通过关卡',
    bestLabel: '最高分',
    newBestLine: '刷新最高分！',
    legendCoin: '金币——收集得分',
    legendMush: '星壳——多抵挡一次伤害',
    legendFlag: '旗帜——抵达即可过关',
    legendCrawler: '爬行怪——来回巡逻；从上方踩扁',
    legendStalker: '追击怪——发现你就冲过来',
    legendSpikes: '尖刺与深坑——务必避开',
    btnLeftAria: '向左移动',
    btnRightAria: '向右移动',
    btnJumpAria: '跳跃',
  },
  es: {
    back: 'Biblioteca',
    title: 'Salto Quest',
    blurb:
      'Corre, salta y aplasta a través de cinco mundos de neón. Rebota sobre los enemigos desde arriba, salta entre paredes por pozos verticales, esquiva pinchos y precipicios, reúne monedas y llega a la bandera.',
    langSwitchAria: 'Idioma',
    startBtn: 'Empezar',
    playAgainBtn: 'Jugar de nuevo',
    continueBtn: 'Continuar',
    livesLabel: 'VIDAS',
    coinsLabel: 'MONEDAS',
    levelLabel: 'NIVEL',
    scoreLabel: 'PUNTOS',
    hudLivesAria: 'Vidas restantes',
    hudCoinsAria: 'Monedas recogidas',
    hudLevelAria: 'Nivel actual',
    hudScoreAria: 'Puntuación',
    controlsNote:
      'Táctil: mantén IZQUIERDA / DERECHA para correr, toca SALTAR para brincar — mantén SALTAR más tiempo para saltar más alto. Deslízate por una pared y toca SALTAR para impulsarte. Escritorio: flechas o A / D para moverte, Espacio / W / Arriba para saltar.',
    abilityNote:
      'Salto de pared: pégate a una pared mientras caes para deslizarte, luego salta para impulsarte — la única forma de subir los pozos altos de los niveles posteriores.',
    hint: 'Mantén SALTAR para saltar más alto · deslízate por una pared + SALTAR para el salto de pared',
    levelClearTitle: '¡Nivel superado!',
    levelClearSub: 'Bien hecho — al siguiente.',
    winTitle: '¡Aventura completa!',
    overTitle: 'Fin de la partida',
    winSub: 'Superaste todos los mundos. Saltos legendarios.',
    overSub: 'Sin vidas — la aventura termina aquí.',
    finalScoreLabel: 'Puntos',
    levelsClearedLabel: 'Niveles superados',
    bestLabel: 'Mejor puntuación',
    newBestLine: '¡Nueva mejor puntuación!',
    legendCoin: 'Moneda — recógela por puntos',
    legendMush: 'Caparazón estelar — un golpe extra',
    legendFlag: 'Bandera — alcánzala para superar el nivel',
    legendCrawler: 'Reptador — patrulla; aplástalo desde arriba',
    legendStalker: 'Acechador — carga cuando te ve',
    legendSpikes: 'Pinchos y precipicios — evítalos',
    btnLeftAria: 'Mover a la izquierda',
    btnRightAria: 'Mover a la derecha',
    btnJumpAria: 'Saltar',
  },
  ar: {
    back: 'المكتبة',
    title: 'رحلة القفز',
    blurb:
      'اركض واقفز وادهس أعداءك عبر خمسة عوالم نيونية. اقفز فوق الأعداء من الأعلى، وتسلّق الأعمدة العالية بالقفز بين الجدران، وتفادَ الأشواك والحُفَر، واجمع كل العملات، وابلغ الراية.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ الرحلة',
    playAgainBtn: 'العب مجددًا',
    continueBtn: 'متابعة',
    livesLabel: 'الأرواح',
    coinsLabel: 'العملات',
    levelLabel: 'المرحلة',
    scoreLabel: 'النقاط',
    hudLivesAria: 'الأرواح المتبقية',
    hudCoinsAria: 'العملات المجموعة',
    hudLevelAria: 'المرحلة الحالية',
    hudScoreAria: 'النقاط',
    controlsNote:
      'باللمس: استمر بالضغط على يسار / يمين للجري، والمس القفز للوثب — أبقِ القفز مضغوطًا أطول لتقفز أعلى. انزلق على جدار والمس القفز للارتداد عنه. الحاسوب: الأسهم أو A / D للحركة، ومسافة / W / سهم أعلى للقفز.',
    abilityNote:
      'القفز الجداري: التصق بجدار أثناء السقوط لتنزلق، ثم اقفز لترتد عنه — وهو السبيل الوحيد لصعود الأعمدة العالية في المراحل المتأخرة.',
    hint: 'أبقِ القفز مضغوطًا لتقفز أعلى · انزلق على جدار + القفز = قفز جداري',
    levelClearTitle: 'اجتزت المرحلة!',
    levelClearSub: 'أحسنت — إلى التالية.',
    winTitle: 'اكتملت الرحلة!',
    overTitle: 'انتهت اللعبة',
    winSub: 'اجتزت كل العوالم. قفزٌ أسطوري.',
    overSub: 'نفدت الأرواح — تنتهي الرحلة هنا.',
    finalScoreLabel: 'النقاط',
    levelsClearedLabel: 'المراحل المجتازة',
    bestLabel: 'أفضل نتيجة',
    newBestLine: 'رقم قياسي جديد!',
    legendCoin: 'عملة — اجمعها للنقاط',
    legendMush: 'صدفة نجمية — ضربة إضافية واحدة',
    legendFlag: 'الراية — ابلغها لاجتياز المرحلة',
    legendCrawler: 'الزاحف — يتجول؛ ادهسه من الأعلى',
    legendStalker: 'المُطارِد — يندفع نحوك حين يراك',
    legendSpikes: 'الأشواك والحُفَر — تجنّبها',
    btnLeftAria: 'التحرك يسارًا',
    btnRightAria: 'التحرك يمينًا',
    btnJumpAria: 'القفز',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Quête de Saut',
    blurb:
      'Cours, saute et écrase tes ennemis à travers cinq mondes néon. Rebondis sur les adversaires par le haut, saute de mur en mur dans les puits verticaux, évite les pics et les gouffres, ramasse les pièces et atteins le drapeau.',
    langSwitchAria: 'Langue',
    startBtn: 'Commencer',
    playAgainBtn: 'Rejouer',
    continueBtn: 'Continuer',
    livesLabel: 'VIES',
    coinsLabel: 'PIÈCES',
    levelLabel: 'NIVEAU',
    scoreLabel: 'SCORE',
    hudLivesAria: 'Vies restantes',
    hudCoinsAria: 'Pièces ramassées',
    hudLevelAria: 'Niveau actuel',
    hudScoreAria: 'Score',
    controlsNote:
      'Tactile : maintiens GAUCHE / DROITE pour courir, touche SAUTER pour bondir — maintiens SAUTER plus longtemps pour sauter plus haut. Glisse le long d\'un mur et touche SAUTER pour t\'en propulser. Bureau : flèches ou A / D pour bouger, Espace / W / Haut pour sauter.',
    abilityNote:
      'Saut mural : colle-toi à un mur en tombant pour glisser, puis saute pour t\'en propulser — le seul moyen de gravir les puits élevés des niveaux avancés.',
    hint: 'Maintiens SAUTER pour sauter plus haut · glisse sur un mur + SAUTER pour le saut mural',
    levelClearTitle: 'Niveau réussi !',
    levelClearSub: 'Bien joué — au suivant.',
    winTitle: 'Quête terminée !',
    overTitle: 'Partie terminée',
    winSub: 'Tu as franchi tous les mondes. Des sauts légendaires.',
    overSub: 'Plus de vies — la quête s\'arrête ici.',
    finalScoreLabel: 'Score',
    levelsClearedLabel: 'Niveaux réussis',
    bestLabel: 'Meilleur score',
    newBestLine: 'Nouveau meilleur score !',
    legendCoin: 'Pièce — ramasse-la pour des points',
    legendMush: 'Coquille étoilée — un coup en plus',
    legendFlag: 'Drapeau — atteins-le pour finir le niveau',
    legendCrawler: 'Rampant — patrouille ; écrase-le par le haut',
    legendStalker: 'Traqueur — fonce sur toi quand il te repère',
    legendSpikes: 'Pics et gouffres — évite-les',
    btnLeftAria: 'Aller à gauche',
    btnRightAria: 'Aller à droite',
    btnJumpAria: 'Sauter',
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
    const stored = localStorage.getItem('ogh_leap_quest_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_leap_quest_lang', lang);
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
