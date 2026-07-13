/**
 * i18n — UI-chrome string table for Flags & Capitals.
 * Mirrors the pattern used by games/pop-the-bugs/client/i18n.js: a flat
 * STRINGS table per UN-6 language, detect/apply helpers, no framework.
 *
 * NOTE: this table is only the UI chrome (buttons, labels, prompts). The
 * per-country display names live in data/countries.json's `names` object and
 * are read directly by app.js for the current language — they are NOT
 * duplicated here.
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
    title: 'Flags & Capitals',
    tagline: 'A world quiz — every country, its flag, and its capital.',
    navQuiz: 'Quiz',
    navReference: 'Atlas',
    chooseMode: 'Choose a quiz mode',
    modeFlagCountry: 'Flag → Country',
    modeCountryCapital: 'Country → Capital',
    modeFlagCapital: 'Flag → Capital',
    modeFlagCountryDesc: 'See a flag, pick the country.',
    modeCountryCapitalDesc: 'See a country, pick its capital.',
    modeFlagCapitalDesc: 'See a flag, pick the capital. Hard!',
    regionLabel: 'Region',
    regionAll: 'All regions',
    startBtn: 'Start quiz',
    questionOf: 'Question {n} / {total}',
    scoreLabel: 'Score',
    promptFlagCountry: 'Which country does this flag belong to?',
    promptCountryCapital: 'What is the capital of {country}?',
    promptFlagCapital: 'What is the capital of this country?',
    nextBtn: 'Next',
    finishBtn: 'See results',
    answerWas: 'Answer: {answer}',
    roundOver: 'Round complete!',
    youScored: 'You scored',
    outOf: 'of {total}',
    accuracyLabel: 'Accuracy',
    bestLabel: 'Best',
    newBest: 'New best!',
    playAgainBtn: 'Play again',
    changeModeBtn: 'Change mode',
    searchPlaceholder: 'Search countries…',
    countriesShown: '{n} countries',
    capitalLabel: 'Capital',
    populationLabel: 'Population',
    areaLabel: 'Area',
    languagesLabel: 'Languages',
    currencyLabel: 'Currency',
    codeLabel: 'Code',
    areaUnit: 'km²',
    noResults: 'No countries match your search.',
    closeBtn: 'Close',
    simplifiedNote: 'Flag emblem shown simplified.',
    regionAfrica: 'Africa',
    regionAsia: 'Asia',
    regionEurope: 'Europe',
    'regionNorth America': 'North America',
    'regionSouth America': 'South America',
    regionOceania: 'Oceania',
    loading: 'Loading countries…',
  },
  ru: {
    back: 'Библиотека',
    title: 'Флаги и столицы',
    tagline: 'Мировая викторина — каждая страна, её флаг и столица.',
    navQuiz: 'Викторина',
    navReference: 'Атлас',
    chooseMode: 'Выберите режим',
    modeFlagCountry: 'Флаг → Страна',
    modeCountryCapital: 'Страна → Столица',
    modeFlagCapital: 'Флаг → Столица',
    modeFlagCountryDesc: 'Покажем флаг — выберите страну.',
    modeCountryCapitalDesc: 'Покажем страну — выберите столицу.',
    modeFlagCapitalDesc: 'Покажем флаг — выберите столицу. Сложно!',
    regionLabel: 'Регион',
    regionAll: 'Все регионы',
    startBtn: 'Начать',
    questionOf: 'Вопрос {n} / {total}',
    scoreLabel: 'Счёт',
    promptFlagCountry: 'Какой стране принадлежит этот флаг?',
    promptCountryCapital: 'Какая столица у страны {country}?',
    promptFlagCapital: 'Какая столица у этой страны?',
    nextBtn: 'Дальше',
    finishBtn: 'Итоги',
    answerWas: 'Ответ: {answer}',
    roundOver: 'Раунд завершён!',
    youScored: 'Ваш результат',
    outOf: 'из {total}',
    accuracyLabel: 'Точность',
    bestLabel: 'Рекорд',
    newBest: 'Новый рекорд!',
    playAgainBtn: 'Играть снова',
    changeModeBtn: 'Сменить режим',
    searchPlaceholder: 'Поиск стран…',
    countriesShown: 'Стран: {n}',
    capitalLabel: 'Столица',
    populationLabel: 'Население',
    areaLabel: 'Площадь',
    languagesLabel: 'Языки',
    currencyLabel: 'Валюта',
    codeLabel: 'Код',
    areaUnit: 'км²',
    noResults: 'Ничего не найдено.',
    closeBtn: 'Закрыть',
    simplifiedNote: 'Эмблема флага упрощена.',
    regionAfrica: 'Африка',
    regionAsia: 'Азия',
    regionEurope: 'Европа',
    'regionNorth America': 'Северная Америка',
    'regionSouth America': 'Южная Америка',
    regionOceania: 'Океания',
    loading: 'Загрузка стран…',
  },
  zh: {
    back: '资料库',
    title: '国旗与首都',
    tagline: '世界问答——每个国家、国旗和首都。',
    navQuiz: '问答',
    navReference: '图鉴',
    chooseMode: '选择模式',
    modeFlagCountry: '国旗 → 国家',
    modeCountryCapital: '国家 → 首都',
    modeFlagCapital: '国旗 → 首都',
    modeFlagCountryDesc: '看国旗，选国家。',
    modeCountryCapitalDesc: '看国家，选首都。',
    modeFlagCapitalDesc: '看国旗，选首都。较难！',
    regionLabel: '地区',
    regionAll: '所有地区',
    startBtn: '开始',
    questionOf: '第 {n} / {total} 题',
    scoreLabel: '得分',
    promptFlagCountry: '这面国旗属于哪个国家？',
    promptCountryCapital: '{country} 的首都是哪里？',
    promptFlagCapital: '这个国家的首都是哪里？',
    nextBtn: '下一题',
    finishBtn: '查看结果',
    answerWas: '答案：{answer}',
    roundOver: '本轮结束！',
    youScored: '你的得分',
    outOf: '共 {total}',
    accuracyLabel: '正确率',
    bestLabel: '最高分',
    newBest: '刷新最高分！',
    playAgainBtn: '再玩一次',
    changeModeBtn: '更换模式',
    searchPlaceholder: '搜索国家…',
    countriesShown: '{n} 个国家',
    capitalLabel: '首都',
    populationLabel: '人口',
    areaLabel: '面积',
    languagesLabel: '语言',
    currencyLabel: '货币',
    codeLabel: '代码',
    areaUnit: '平方公里',
    noResults: '没有找到匹配的国家。',
    closeBtn: '关闭',
    simplifiedNote: '国旗徽记已简化显示。',
    regionAfrica: '非洲',
    regionAsia: '亚洲',
    regionEurope: '欧洲',
    'regionNorth America': '北美洲',
    'regionSouth America': '南美洲',
    regionOceania: '大洋洲',
    loading: '正在加载国家…',
  },
  es: {
    back: 'Biblioteca',
    title: 'Banderas y capitales',
    tagline: 'Un concurso mundial: cada país, su bandera y su capital.',
    navQuiz: 'Concurso',
    navReference: 'Atlas',
    chooseMode: 'Elige un modo',
    modeFlagCountry: 'Bandera → País',
    modeCountryCapital: 'País → Capital',
    modeFlagCapital: 'Bandera → Capital',
    modeFlagCountryDesc: 'Mira una bandera, elige el país.',
    modeCountryCapitalDesc: 'Mira un país, elige su capital.',
    modeFlagCapitalDesc: 'Mira una bandera, elige la capital. ¡Difícil!',
    regionLabel: 'Región',
    regionAll: 'Todas las regiones',
    startBtn: 'Empezar',
    questionOf: 'Pregunta {n} / {total}',
    scoreLabel: 'Puntos',
    promptFlagCountry: '¿A qué país pertenece esta bandera?',
    promptCountryCapital: '¿Cuál es la capital de {country}?',
    promptFlagCapital: '¿Cuál es la capital de este país?',
    nextBtn: 'Siguiente',
    finishBtn: 'Ver resultados',
    answerWas: 'Respuesta: {answer}',
    roundOver: '¡Ronda completada!',
    youScored: 'Tu puntuación',
    outOf: 'de {total}',
    accuracyLabel: 'Precisión',
    bestLabel: 'Récord',
    newBest: '¡Nuevo récord!',
    playAgainBtn: 'Jugar de nuevo',
    changeModeBtn: 'Cambiar modo',
    searchPlaceholder: 'Buscar países…',
    countriesShown: '{n} países',
    capitalLabel: 'Capital',
    populationLabel: 'Población',
    areaLabel: 'Superficie',
    languagesLabel: 'Idiomas',
    currencyLabel: 'Moneda',
    codeLabel: 'Código',
    areaUnit: 'km²',
    noResults: 'Ningún país coincide con tu búsqueda.',
    closeBtn: 'Cerrar',
    simplifiedNote: 'Emblema de la bandera simplificado.',
    regionAfrica: 'África',
    regionAsia: 'Asia',
    regionEurope: 'Europa',
    'regionNorth America': 'América del Norte',
    'regionSouth America': 'América del Sur',
    regionOceania: 'Oceanía',
    loading: 'Cargando países…',
  },
  ar: {
    back: 'المكتبة',
    title: 'الأعلام والعواصم',
    tagline: 'مسابقة عالمية — كل دولة وعلمها وعاصمتها.',
    navQuiz: 'المسابقة',
    navReference: 'الأطلس',
    chooseMode: 'اختر نمطًا',
    modeFlagCountry: 'العلم ← الدولة',
    modeCountryCapital: 'الدولة ← العاصمة',
    modeFlagCapital: 'العلم ← العاصمة',
    modeFlagCountryDesc: 'شاهد علمًا واختر الدولة.',
    modeCountryCapitalDesc: 'شاهد دولة واختر عاصمتها.',
    modeFlagCapitalDesc: 'شاهد علمًا واختر العاصمة. صعب!',
    regionLabel: 'المنطقة',
    regionAll: 'كل المناطق',
    startBtn: 'ابدأ',
    questionOf: 'سؤال {n} / {total}',
    scoreLabel: 'النقاط',
    promptFlagCountry: 'لأي دولة ينتمي هذا العلم؟',
    promptCountryCapital: 'ما عاصمة {country}؟',
    promptFlagCapital: 'ما عاصمة هذه الدولة؟',
    nextBtn: 'التالي',
    finishBtn: 'النتائج',
    answerWas: 'الإجابة: {answer}',
    roundOver: 'انتهت الجولة!',
    youScored: 'نتيجتك',
    outOf: 'من {total}',
    accuracyLabel: 'الدقة',
    bestLabel: 'الأفضل',
    newBest: 'رقم قياسي جديد!',
    playAgainBtn: 'العب مرة أخرى',
    changeModeBtn: 'تغيير النمط',
    searchPlaceholder: 'ابحث عن دولة…',
    countriesShown: '{n} دولة',
    capitalLabel: 'العاصمة',
    populationLabel: 'السكان',
    areaLabel: 'المساحة',
    languagesLabel: 'اللغات',
    currencyLabel: 'العملة',
    codeLabel: 'الرمز',
    areaUnit: 'كم²',
    noResults: 'لا توجد دولة تطابق بحثك.',
    closeBtn: 'إغلاق',
    simplifiedNote: 'شعار العلم معروض بشكل مبسّط.',
    regionAfrica: 'أفريقيا',
    regionAsia: 'آسيا',
    regionEurope: 'أوروبا',
    'regionNorth America': 'أمريكا الشمالية',
    'regionSouth America': 'أمريكا الجنوبية',
    regionOceania: 'أوقيانوسيا',
    loading: 'جارٍ تحميل الدول…',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Drapeaux et capitales',
    tagline: 'Un quiz mondial — chaque pays, son drapeau et sa capitale.',
    navQuiz: 'Quiz',
    navReference: 'Atlas',
    chooseMode: 'Choisissez un mode',
    modeFlagCountry: 'Drapeau → Pays',
    modeCountryCapital: 'Pays → Capitale',
    modeFlagCapital: 'Drapeau → Capitale',
    modeFlagCountryDesc: 'Voyez un drapeau, choisissez le pays.',
    modeCountryCapitalDesc: 'Voyez un pays, choisissez sa capitale.',
    modeFlagCapitalDesc: 'Voyez un drapeau, choisissez la capitale. Difficile !',
    regionLabel: 'Région',
    regionAll: 'Toutes les régions',
    startBtn: 'Commencer',
    questionOf: 'Question {n} / {total}',
    scoreLabel: 'Score',
    promptFlagCountry: 'À quel pays appartient ce drapeau ?',
    promptCountryCapital: 'Quelle est la capitale de {country} ?',
    promptFlagCapital: 'Quelle est la capitale de ce pays ?',
    nextBtn: 'Suivant',
    finishBtn: 'Voir les résultats',
    answerWas: 'Réponse : {answer}',
    roundOver: 'Manche terminée !',
    youScored: 'Votre score',
    outOf: 'sur {total}',
    accuracyLabel: 'Précision',
    bestLabel: 'Record',
    newBest: 'Nouveau record !',
    playAgainBtn: 'Rejouer',
    changeModeBtn: 'Changer de mode',
    searchPlaceholder: 'Rechercher un pays…',
    countriesShown: '{n} pays',
    capitalLabel: 'Capitale',
    populationLabel: 'Population',
    areaLabel: 'Superficie',
    languagesLabel: 'Langues',
    currencyLabel: 'Monnaie',
    codeLabel: 'Code',
    areaUnit: 'km²',
    noResults: 'Aucun pays ne correspond à votre recherche.',
    closeBtn: 'Fermer',
    simplifiedNote: 'Emblème du drapeau simplifié.',
    regionAfrica: 'Afrique',
    regionAsia: 'Asie',
    regionEurope: 'Europe',
    'regionNorth America': 'Amérique du Nord',
    'regionSouth America': 'Amérique du Sud',
    regionOceania: 'Océanie',
    loading: 'Chargement des pays…',
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
    const stored = localStorage.getItem('ogh_flags_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch { /* storage may be unavailable */ }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_flags_lang', lang);
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
    el.textContent = t(lang, el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(lang, el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-aria')));
  });
}
