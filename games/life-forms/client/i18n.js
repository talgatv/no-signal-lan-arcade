/**
 * i18n — string table for Life Forms. Mirrors games/hanoi-towers/client/i18n.js
 * and games/sliding-puzzle/client/i18n.js (same shape this whole batch uses): a
 * flat STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header, HUD pill labels,
 * hint, toolbar, pattern-library panel. It deliberately does NOT mirror the
 * cellular automaton grid itself: column 0 stays the visual-left column and
 * "up/down/left/right" neighbor relationships never flip regardless of
 * document direction (see index.html/app.js — the stage carries dir="ltr").
 * Mirroring the grid would silently change which cells are adjacent to which
 * for Arabic players even though the simulation math is direction-agnostic —
 * same fixed-spatial-convention precedent as games/gem-swap, games/hanoi-towers
 * and games/sliding-puzzle.
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
    title: 'Life Forms',
    langSwitchAria: 'Language',
    genLabel: 'GEN',
    aliveLabel: 'ALIVE',
    hudGenAria: 'Generation',
    hudAliveAria: 'Live cells',
    soundToggleAria: 'Sound',
    hint: 'Tap or drag to draw while paused · Play to watch it evolve',
    speedLabel: 'SPEED',
    patternsBtn: 'Patterns',
    randomizeBtn: 'Random',
    clearBtn: 'Clear',
    stepBtn: 'Step',
    playBtn: 'Play',
    pauseBtn: 'Pause',
    patternsTitle: 'Patterns',
    patternsSub: 'Tap a pattern to drop it onto the grid, centered.',
    closeBtn: 'Close',
    groupStillLife: 'Still lifes',
    groupOscillator: 'Oscillators',
    groupSpaceship: 'Spaceships',
    groupGun: 'Guns',
    patternBlock: 'Block',
    patternBeehive: 'Beehive',
    patternBlinker: 'Blinker',
    patternToad: 'Toad',
    patternBeacon: 'Beacon',
    patternPulsar: 'Pulsar',
    patternGlider: 'Glider',
    patternGosperGun: 'Glider Gun',
  },
  ru: {
    back: 'Библиотека',
    title: 'Формы жизни',
    langSwitchAria: 'Язык',
    genLabel: 'ПОК.',
    aliveLabel: 'ЖИВЫЕ',
    hudGenAria: 'Поколение',
    hudAliveAria: 'Живые клетки',
    soundToggleAria: 'Звук',
    hint: 'Тапни или проведи пальцем, чтобы рисовать на паузе · «Играть» запускает эволюцию',
    speedLabel: 'СКОРОСТЬ',
    patternsBtn: 'Паттерны',
    randomizeBtn: 'Случайно',
    clearBtn: 'Очистить',
    stepBtn: 'Шаг',
    playBtn: 'Играть',
    pauseBtn: 'Пауза',
    patternsTitle: 'Паттерны',
    patternsSub: 'Тапни по паттерну, чтобы поместить его в центр поля.',
    closeBtn: 'Закрыть',
    groupStillLife: 'Статичные фигуры',
    groupOscillator: 'Осцилляторы',
    groupSpaceship: 'Космические корабли',
    groupGun: 'Пушки',
    patternBlock: 'Блок',
    patternBeehive: 'Улей',
    patternBlinker: 'Мигалка',
    patternToad: 'Жаба',
    patternBeacon: 'Маяк',
    patternPulsar: 'Пульсар',
    patternGlider: 'Планер',
    patternGosperGun: 'Пушка Госпера',
  },
  zh: {
    back: '资料库',
    title: '生命形态',
    langSwitchAria: '语言',
    genLabel: '代数',
    aliveLabel: '存活',
    hudGenAria: '代数',
    hudAliveAria: '存活细胞数',
    soundToggleAria: '声音',
    hint: '暂停时点击或拖动以绘制 · 点击"播放"观看演化',
    speedLabel: '速度',
    patternsBtn: '图案',
    randomizeBtn: '随机',
    clearBtn: '清空',
    stepBtn: '单步',
    playBtn: '播放',
    pauseBtn: '暂停',
    patternsTitle: '图案库',
    patternsSub: '点击一个图案，将其放置在棋盘中央。',
    closeBtn: '关闭',
    groupStillLife: '静物',
    groupOscillator: '振荡器',
    groupSpaceship: '飞船',
    groupGun: '炮',
    patternBlock: '方块',
    patternBeehive: '蜂巢',
    patternBlinker: '闪烁器',
    patternToad: '蟾蜍',
    patternBeacon: '信标',
    patternPulsar: '脉冲星',
    patternGlider: '滑翔机',
    patternGosperGun: '高斯帕滑翔机枪',
  },
  es: {
    back: 'Biblioteca',
    title: 'Formas de Vida',
    langSwitchAria: 'Idioma',
    genLabel: 'GEN',
    aliveLabel: 'VIVAS',
    hudGenAria: 'Generación',
    hudAliveAria: 'Células vivas',
    soundToggleAria: 'Sonido',
    hint: 'Toca o arrastra para dibujar en pausa · Reproducir para verlo evolucionar',
    speedLabel: 'VELOCIDAD',
    patternsBtn: 'Patrones',
    randomizeBtn: 'Aleatorio',
    clearBtn: 'Borrar',
    stepBtn: 'Paso',
    playBtn: 'Reproducir',
    pauseBtn: 'Pausa',
    patternsTitle: 'Patrones',
    patternsSub: 'Toca un patrón para colocarlo centrado en la cuadrícula.',
    closeBtn: 'Cerrar',
    groupStillLife: 'Naturalezas muertas',
    groupOscillator: 'Osciladores',
    groupSpaceship: 'Naves espaciales',
    groupGun: 'Cañones',
    patternBlock: 'Bloque',
    patternBeehive: 'Colmena',
    patternBlinker: 'Parpadeador',
    patternToad: 'Sapo',
    patternBeacon: 'Faro',
    patternPulsar: 'Púlsar',
    patternGlider: 'Planeador',
    patternGosperGun: 'Cañón de Gosper',
  },
  ar: {
    back: 'المكتبة',
    title: 'أشكال الحياة',
    langSwitchAria: 'اللغة',
    genLabel: 'الجيل',
    aliveLabel: 'حيّة',
    hudGenAria: 'الجيل',
    hudAliveAria: 'الخلايا الحية',
    soundToggleAria: 'الصوت',
    hint: 'اضغط أو اسحب للرسم أثناء الإيقاف المؤقت · اضغط «تشغيل» لمشاهدة التطور',
    speedLabel: 'السرعة',
    patternsBtn: 'الأنماط',
    randomizeBtn: 'عشوائي',
    clearBtn: 'مسح',
    stepBtn: 'خطوة',
    playBtn: 'تشغيل',
    pauseBtn: 'إيقاف مؤقت',
    patternsTitle: 'الأنماط',
    patternsSub: 'اضغط على نمط لوضعه في منتصف الشبكة.',
    closeBtn: 'إغلاق',
    groupStillLife: 'أشكال ثابتة',
    groupOscillator: 'أشكال متذبذبة',
    groupSpaceship: 'مركبات فضائية',
    groupGun: 'مدافع',
    patternBlock: 'مربّع',
    patternBeehive: 'خلية النحل',
    patternBlinker: 'ومّاض',
    patternToad: 'ضفدع',
    patternBeacon: 'منارة',
    patternPulsar: 'نجم نابض',
    patternGlider: 'طائرة شراعية',
    patternGosperGun: 'مدفع غوسبر',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Formes de Vie',
    langSwitchAria: 'Langue',
    genLabel: 'GÉN',
    aliveLabel: 'VIVANTES',
    hudGenAria: 'Génération',
    hudAliveAria: 'Cellules vivantes',
    soundToggleAria: 'Son',
    hint: "Touchez ou glissez pour dessiner en pause · Lecture pour observer l'évolution",
    speedLabel: 'VITESSE',
    patternsBtn: 'Motifs',
    randomizeBtn: 'Aléatoire',
    clearBtn: 'Effacer',
    stepBtn: 'Étape',
    playBtn: 'Lecture',
    pauseBtn: 'Pause',
    patternsTitle: 'Motifs',
    patternsSub: 'Touchez un motif pour le déposer au centre de la grille.',
    closeBtn: 'Fermer',
    groupStillLife: 'Natures mortes',
    groupOscillator: 'Oscillateurs',
    groupSpaceship: 'Vaisseaux',
    groupGun: 'Canons',
    patternBlock: 'Bloc',
    patternBeehive: 'Ruche',
    patternBlinker: 'Clignotant',
    patternToad: 'Crapaud',
    patternBeacon: 'Phare',
    patternPulsar: 'Pulsar',
    patternGlider: 'Planeur',
    patternGosperGun: 'Canon de Gosper',
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
    const stored = localStorage.getItem('ogh_life_forms_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_life_forms_lang', lang);
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
