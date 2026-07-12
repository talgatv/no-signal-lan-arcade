/**
 * i18n — string table for Void Drift. Mirrors games/ray-maze/client/i18n.js
 * and other siblings this batch (same shape): a flat STRINGS table per UN-6
 * language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link, HUD
 * pill labels, hint, overlay cards and touch-button aria-labels. It
 * deliberately does NOT mirror the play field or the rotate-button meanings.
 * A physics-simulated, screen-wrapping space has no "reading direction" to
 * flip, and mirroring rotate-left/rotate-right would invert muscle memory
 * against a control scheme that has nothing to do with text layout — the
 * same reasoning (and the same `dir="ltr"` stage guard) as ray-maze's
 * first-person view/minimap and fight-arena's fight stage.
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
    title: 'Void Drift',
    blurb:
      'Newtonian dogfighting in the vacuum: rotate and thrust a drifting ship, blast rocks into smaller rocks, and watch both edges of the screen — everything wraps. Clear each wave of asteroids (and the odd UFO looking for a fight) to push into a faster, denser one.',
    langSwitchAria: 'Language',
    startBtn: 'Launch',
    playAgainBtn: 'Fly again',
    scoreLabel: 'SCORE',
    livesLabel: 'SHIPS',
    waveLabel: 'WAVE',
    hudScoreAria: 'Score',
    hudLivesAria: 'Ships remaining',
    hudWaveAria: 'Wave',
    waveBanner: 'WAVE {n}',
    gameOverTitle: 'Ship Lost',
    gameOverSub: 'Your hull gave out in wave {wave}. The void keeps drifting without you.',
    finalScoreLabel: 'Final score',
    bestLabel: 'Best',
    newBestLine: 'New best score!',
    statsLine: 'Wave {wave} · Score {score}',
    controlsNote:
      'Touch: ◁ / ▷ rotate the ship, ▲ thrusts forward (momentum carries — the ship keeps drifting in its old direction until you thrust again), ● fires. Desktop: ← → (or A/D) rotate, ↑ (or W) thrusts, Space fires.',
    hint: 'Rotate ◁ ▷ · Thrust ▲ · Fire ● — momentum carries, so drift with it',
    legendLarge: 'Large rock — {n} pts, slow, big target',
    legendMedium: 'Medium rock — {n} pts, splits again',
    legendSmall: 'Small rock — {n} pts, fast, hard to hit',
    legendUfo: 'UFO — {n} pts, shoots back',
    btnRotateLeftAria: 'Rotate left',
    btnRotateRightAria: 'Rotate right',
    btnThrustAria: 'Thrust',
    btnFireAria: 'Fire',
  },
  ru: {
    back: 'Библиотека',
    title: 'Дрейф в пустоте',
    blurb:
      'Ньютоновский воздушный бой в вакууме: вращай и разгоняй дрейфующий корабль, дроби астероиды на осколки помельче и следи за обоими краями экрана — здесь всё оборачивается. Зачищай волну за волной астероидов (и редких НЛО, ищущих драки), чтобы шагнуть в следующую — быстрее и плотнее.',
    langSwitchAria: 'Язык',
    startBtn: 'Старт',
    playAgainBtn: 'Ещё полёт',
    scoreLabel: 'ОЧКИ',
    livesLabel: 'КОРАБЛИ',
    waveLabel: 'ВОЛНА',
    hudScoreAria: 'Очки',
    hudLivesAria: 'Осталось кораблей',
    hudWaveAria: 'Волна',
    waveBanner: 'ВОЛНА {n}',
    gameOverTitle: 'Корабль потерян',
    gameOverSub: 'Корпус не выдержал на волне {wave}. Пустота продолжает дрейфовать без тебя.',
    finalScoreLabel: 'Итоговый счёт',
    bestLabel: 'Рекорд',
    newBestLine: 'Новый рекорд!',
    statsLine: 'Волна {wave} · Очки {score}',
    controlsNote:
      'Сенсор: ◁ / ▷ — поворот корабля, ▲ — тяга вперёд (инерция сохраняется: корабль продолжает дрейфовать в прежнем направлении, пока не разгонишься снова), ● — огонь. ПК: ← → (или A/D) — поворот, ↑ (или W) — тяга, пробел — огонь.',
    hint: 'Поворот ◁ ▷ · Тяга ▲ · Огонь ● — инерция сохраняется, дрейфуй вместе с ней',
    legendLarge: 'Крупный астероид — {n} очк., медленный, крупная цель',
    legendMedium: 'Средний астероид — {n} очк., дробится ещё раз',
    legendSmall: 'Мелкий астероид — {n} очк., быстрый, трудно попасть',
    legendUfo: 'НЛО — {n} очк., стреляет в ответ',
    btnRotateLeftAria: 'Поворот влево',
    btnRotateRightAria: 'Поворот вправо',
    btnThrustAria: 'Тяга',
    btnFireAria: 'Огонь',
  },
  zh: {
    back: '资料库',
    title: '虚空漂移',
    blurb:
      '真空中的牛顿式空战：旋转并推进你那艘会漂移的飞船，把陨石轰成更小的碎块，并留意屏幕的两端——这里的一切都会穿屏而出。清空一波又一波的陨石（还有偶尔来寻衅的飞碟），进入更快、更密集的下一波。',
    langSwitchAria: '语言',
    startBtn: '发射',
    playAgainBtn: '再飞一次',
    scoreLabel: '得分',
    livesLabel: '飞船',
    waveLabel: '波次',
    hudScoreAria: '得分',
    hudLivesAria: '剩余飞船',
    hudWaveAria: '波次',
    waveBanner: '第 {n} 波',
    gameOverTitle: '飞船损毁',
    gameOverSub: '船体在第 {wave} 波解体。虚空还在无你继续漂移。',
    finalScoreLabel: '最终得分',
    bestLabel: '最高分',
    newBestLine: '创造新纪录！',
    statsLine: '第 {wave} 波 · 得分 {score}',
    controlsNote:
      '触屏：◁ / ▷ 旋转飞船，▲ 向前推进（惯性会保留——在你再次推进之前，飞船会继续沿原方向漂移），● 开火。桌面：← → (或 A/D) 旋转，↑ (或 W) 推进，空格开火。',
    hint: '旋转 ◁ ▷ · 推进 ▲ · 开火 ● —— 惯性会保留，顺势漂移',
    legendLarge: '大型陨石 — {n} 分，速度慢，目标大',
    legendMedium: '中型陨石 — {n} 分，会再次分裂',
    legendSmall: '小型陨石 — {n} 分，速度快，难以击中',
    legendUfo: '飞碟 — {n} 分，会反击',
    btnRotateLeftAria: '向左旋转',
    btnRotateRightAria: '向右旋转',
    btnThrustAria: '推进',
    btnFireAria: '开火',
  },
  es: {
    back: 'Biblioteca',
    title: 'Deriva del Vacío',
    blurb:
      'Combate newtoniano en el vacío: rota y propulsa una nave a la deriva, destroza rocas en fragmentos más pequeños y vigila ambos bordes de la pantalla: aquí todo da la vuelta. Despeja cada oleada de asteroides (y algún que otro OVNI buscando pelea) para avanzar a la siguiente, más rápida y más densa.',
    langSwitchAria: 'Idioma',
    startBtn: 'Despegar',
    playAgainBtn: 'Volar de nuevo',
    scoreLabel: 'PUNTOS',
    livesLabel: 'NAVES',
    waveLabel: 'OLEADA',
    hudScoreAria: 'Puntuación',
    hudLivesAria: 'Naves restantes',
    hudWaveAria: 'Oleada',
    waveBanner: 'OLEADA {n}',
    gameOverTitle: 'Nave Perdida',
    gameOverSub: 'El casco cedió en la oleada {wave}. El vacío sigue a la deriva sin ti.',
    finalScoreLabel: 'Puntuación final',
    bestLabel: 'Mejor puntuación',
    newBestLine: '¡Nueva mejor puntuación!',
    statsLine: 'Oleada {wave} · Puntuación {score}',
    controlsNote:
      'Táctil: ◁ / ▷ rotan la nave, ▲ propulsa hacia delante (el impulso se conserva: la nave sigue a la deriva en su dirección anterior hasta que vuelvas a propulsar), ● dispara. Escritorio: ← → (o A/D) rotan, ↑ (o W) propulsa, Espacio dispara.',
    hint: 'Rota ◁ ▷ · Propulsa ▲ · Dispara ● — el impulso se conserva, déjate llevar',
    legendLarge: 'Roca grande — {n} pts, lenta, blanco grande',
    legendMedium: 'Roca mediana — {n} pts, vuelve a dividirse',
    legendSmall: 'Roca pequeña — {n} pts, rápida, difícil de acertar',
    legendUfo: 'OVNI — {n} pts, dispara de vuelta',
    btnRotateLeftAria: 'Rotar a la izquierda',
    btnRotateRightAria: 'Rotar a la derecha',
    btnThrustAria: 'Propulsar',
    btnFireAria: 'Disparar',
  },
  ar: {
    back: 'المكتبة',
    title: 'انجراف الفراغ',
    blurb:
      'قتال جوي نيوتوني في الفراغ: أدر سفينتك المنجرفة وادفعها للأمام، فجّر الصخور إلى شظايا أصغر، وراقب حافتي الشاشة معًا — فكل شيء هنا يلتف حول الحواف. طهّر كل موجة من الكويكبات (وطبقًا طائرًا عرضيًا يبحث عن قتال) للتقدّم إلى موجة أسرع وأكثف.',
    langSwitchAria: 'اللغة',
    startBtn: 'انطلاق',
    playAgainBtn: 'طِر مجددًا',
    scoreLabel: 'النقاط',
    livesLabel: 'السفن',
    waveLabel: 'الموجة',
    hudScoreAria: 'النقاط',
    hudLivesAria: 'السفن المتبقية',
    hudWaveAria: 'الموجة',
    waveBanner: 'الموجة {n}',
    gameOverTitle: 'فقدان السفينة',
    gameOverSub: 'انهار هيكل السفينة في الموجة {wave}. يستمر الفراغ بالانجراف من دونك.',
    finalScoreLabel: 'النتيجة النهائية',
    bestLabel: 'الأفضل',
    newBestLine: 'رقم قياسي جديد!',
    statsLine: 'الموجة {wave} · النقاط {score}',
    controlsNote:
      'باللمس: ◁ / ▷ لتدوير السفينة، ▲ للدفع للأمام (يُحفظ الزخم: تستمر السفينة بالانجراف في اتجاهها السابق حتى تدفعها مجددًا)، ● لإطلاق النار. الحاسوب: ← → (أو A/D) للتدوير، ↑ (أو W) للدفع، مفتاح المسافة لإطلاق النار.',
    hint: 'تدوير ◁ ▷ · دفع ▲ · إطلاق ● — الزخم يُحفظ، فانجرف معه',
    legendLarge: 'صخرة كبيرة — {n} نقطة، بطيئة، هدف كبير',
    legendMedium: 'صخرة متوسطة — {n} نقطة، تنقسم مجددًا',
    legendSmall: 'صخرة صغيرة — {n} نقطة، سريعة، يصعب إصابتها',
    legendUfo: 'طبق طائر — {n} نقطة، يطلق النار مقابلة',
    btnRotateLeftAria: 'دوران لليسار',
    btnRotateRightAria: 'دوران لليمين',
    btnThrustAria: 'دفع',
    btnFireAria: 'إطلاق النار',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Dérive du Vide',
    blurb:
      "Combat aérien newtonien dans le vide : faites pivoter et propulsez un vaisseau à la dérive, réduisez les roches en fragments plus petits, et surveillez les deux bords de l'écran — ici, tout boucle. Nettoyez chaque vague d'astéroïdes (et l'occasionnel OVNI en quête de bagarre) pour passer à la suivante, plus rapide et plus dense.",
    langSwitchAria: 'Langue',
    startBtn: 'Décoller',
    playAgainBtn: 'Revoler',
    scoreLabel: 'SCORE',
    livesLabel: 'VAISSEAUX',
    waveLabel: 'VAGUE',
    hudScoreAria: 'Score',
    hudLivesAria: 'Vaisseaux restants',
    hudWaveAria: 'Vague',
    waveBanner: 'VAGUE {n}',
    gameOverTitle: 'Vaisseau Perdu',
    gameOverSub: "La coque a cédé à la vague {wave}. Le vide continue de dériver sans vous.",
    finalScoreLabel: 'Score final',
    bestLabel: 'Meilleur score',
    newBestLine: 'Nouveau meilleur score !',
    statsLine: 'Vague {wave} · Score {score}',
    controlsNote:
      "Tactile : ◁ / ▷ font pivoter le vaisseau, ▲ propulse vers l'avant (l'inertie se conserve : le vaisseau continue de dériver dans son ancienne direction tant que vous ne repropulsez pas), ● tire. Bureau : ← → (ou A/D) pour pivoter, ↑ (ou W) pour propulser, Espace pour tirer.",
    hint: "Pivoter ◁ ▷ · Propulser ▲ · Tirer ● — l'inertie se conserve, laissez-vous porter",
    legendLarge: 'Grosse roche — {n} pts, lente, grosse cible',
    legendMedium: 'Roche moyenne — {n} pts, se scinde encore',
    legendSmall: 'Petite roche — {n} pts, rapide, difficile à toucher',
    legendUfo: 'OVNI — {n} pts, riposte',
    btnRotateLeftAria: 'Pivoter à gauche',
    btnRotateRightAria: 'Pivoter à droite',
    btnThrustAria: 'Propulser',
    btnFireAria: 'Tirer',
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
    const stored = localStorage.getItem('ogh_void_drift_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_void_drift_lang', lang);
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
