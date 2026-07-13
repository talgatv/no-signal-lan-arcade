/**
 * i18n — string table for Storm Warden. Same flat shape as
 * games/void-drift/client/i18n.js and the other siblings this batch: a
 * STRINGS table per UN-6 language plus detect/apply helpers, no framework.
 *
 * RTL (Arabic) flips the text-bearing UI chrome only — header/back link, HUD
 * pill labels, hint, overlay cards and aria-labels. It deliberately does
 * NOT mirror the storm scene: the village's building order (and therefore
 * which number key 1-6 casts on which building), the rain's wind direction
 * and the grounding spire's position are a fixed spatial arrangement, not
 * prose. Mirroring them would silently swap which building is "1" versus
 * "6" under Arabic while the visible left-to-right skyline stayed put — the
 * same mismatch this batch's earlier games (ray-maze, void-drift, ember-tide
 * among others) already hit and fixed by pinning the stage dir="ltr". Same
 * fix here: the stage is dir="ltr" in the markup and game.js forces
 * ctx.direction = 'ltr' for any canvas text as a second guard.
 */

export const LANGS = ['en', 'ru', 'zh', 'es', 'ar', 'fr'];

export const LANG_LABELS = {
  en: 'EN', ru: 'RU', zh: '中文', es: 'ES', ar: 'AR', fr: 'FR',
};

export const RTL_LANGS = new Set(['ar']);

export const STRINGS = {
  en: {
    back: 'Library',
    title: 'Storm Warden',
    blurb: 'A wild storm circles the sleeping village below. Watch the sky, catch each charge as it builds over a rooftop, and cast a controlled bolt at the right moment to ground it safely — too early wastes the strike, too late and the roof takes it.',
    langSwitchAria: 'Language',
    startBtn: 'Begin the Watch',
    playAgainBtn: 'Watch Again',
    controlsNote: 'Tap or click the building where a charge is flickering, right up until it peaks. On desktop you can also press 1-6 for the matching building, left to right. Every charge caught in time arcs safely to the grounding spire; one left untouched strikes home.',
    hint: 'Tap the flickering roof before the charge peaks — the spire grounds every bolt you catch in time',
    scoreLabel: 'SCORE',
    savedLabel: 'SAVED',
    timeLabel: 'TO DAWN',
    hudScoreAria: 'Score',
    hudSavedAria: 'Buildings saved',
    hudTimeAria: 'Time until dawn',
    legendEarlyTxt: 'Early — safe, modest points',
    legendGoodTxt: 'Good — solid timing, solid points',
    legendPerfectTxt: 'Perfect — cast right before peak for the most points',
    ratingEarly: 'Early',
    ratingGood: 'Good',
    ratingPerfect: 'Perfect',
    struckFloater: 'Struck!',
    resultWinTitle: 'Dawn Breaks',
    resultLoseTitle: 'The Storm Wins',
    resultWinSub: 'You held the line through the night — {saved}/{total} homes still stand.',
    resultLoseSub: 'The storm broke through — only {saved}/{total} homes held on.',
    finalScoreLabel: 'Final score',
    bestLabel: 'Best',
    newBestLine: 'New best score!',
    savedLine: '{saved}/{total} buildings saved',
  },
  ru: {
    back: 'Библиотека',
    title: 'Страж Бури',
    blurb: 'Дикая буря кружит над спящей деревней внизу. Следи за небом, лови каждый заряд, пока он копится над крышей, и выпускай направленный разряд в нужный миг, чтобы безопасно заземлить его — рано ударишь — потратишь разряд впустую, поздно — крыша примет удар на себя.',
    langSwitchAria: 'Язык',
    startBtn: 'Заступить на стражу',
    playAgainBtn: 'Снова на стражу',
    controlsNote: 'Коснись или щёлкни по дому, над которым мерцает заряд, пока он не достиг пика. На ПК можно нажимать 1-6 — дома слева направо. Каждый пойманный вовремя разряд уходит дугой в громоотвод; нетронутый заряд бьёт по дому.',
    hint: 'Коснись мерцающей крыши до пика заряда — шпиль заземлит разряд, если поймать вовремя',
    scoreLabel: 'ОЧКИ',
    savedLabel: 'СПАСЕНО',
    timeLabel: 'ДО РАССВЕТА',
    hudScoreAria: 'Очки',
    hudSavedAria: 'Спасено домов',
    hudTimeAria: 'Время до рассвета',
    legendEarlyTxt: 'Рано — безопасно, немного очков',
    legendGoodTxt: 'Хорошо — точный расчёт, хорошие очки',
    legendPerfectTxt: 'Идеально — лови у самого пика ради максимума очков',
    ratingEarly: 'Рано',
    ratingGood: 'Хорошо',
    ratingPerfect: 'Идеально',
    struckFloater: 'Удар!',
    resultWinTitle: 'Рассвет наступил',
    resultLoseTitle: 'Буря победила',
    resultWinSub: 'Ты продержался всю ночь — {saved}/{total} домов уцелело.',
    resultLoseSub: 'Буря прорвалась — уцелело только {saved}/{total} домов.',
    finalScoreLabel: 'Итоговый счёт',
    bestLabel: 'Рекорд',
    newBestLine: 'Новый рекорд!',
    savedLine: 'Спасено домов: {saved}/{total}',
  },
  zh: {
    back: '资料库',
    title: '风暴守护者',
    blurb: '一场狂暴的风暴在沉睡的村庄上空盘旋。留意天空，在每一道电荷于屋顶上方积聚时抓住时机，在正确的瞬间引导受控的闪电将其安全导入地下——太早会浪费这一击，太晚屋顶就会遭殃。',
    langSwitchAria: '语言',
    startBtn: '开始守夜',
    playAgainBtn: '再次守夜',
    controlsNote: '点击或轻触电荷正在闪烁的房屋，趁它还未到达顶峰。在电脑上也可以按 1-6 键，对应从左到右的房屋。及时接住的闪电都会弧线导向避雷塔；无人理会的电荷会直接击中房屋。',
    hint: '在电荷到达顶峰前点击闪烁的屋顶——避雷塔会导走你及时接住的每一道闪电',
    scoreLabel: '得分',
    savedLabel: '已保护',
    timeLabel: '距黎明',
    hudScoreAria: '得分',
    hudSavedAria: '已保护的房屋数',
    hudTimeAria: '距黎明的时间',
    legendEarlyTxt: '过早——安全，得分较少',
    legendGoodTxt: '不错——时机把握得当，得分可观',
    legendPerfectTxt: '完美——在顶峰前一刻出手，得分最高',
    ratingEarly: '过早',
    ratingGood: '不错',
    ratingPerfect: '完美',
    struckFloater: '被击中！',
    resultWinTitle: '黎明降临',
    resultLoseTitle: '风暴获胜',
    resultWinSub: '你守住了整夜——{saved}/{total} 栋房屋依然屹立。',
    resultLoseSub: '风暴还是攻破了防线——只有 {saved}/{total} 栋房屋幸存。',
    finalScoreLabel: '最终得分',
    bestLabel: '最高分',
    newBestLine: '创造新纪录！',
    savedLine: '已保护 {saved}/{total} 栋房屋',
  },
  es: {
    back: 'Biblioteca',
    title: 'Guardián de la Tormenta',
    blurb: 'Una tormenta salvaje ronda sobre el pueblo dormido. Vigila el cielo, atrapa cada carga mientras se forma sobre un tejado y lanza un rayo controlado en el momento justo para conducirla a tierra sin peligro: muy pronto y desperdicias el golpe, muy tarde y el tejado lo recibe.',
    langSwitchAria: 'Idioma',
    startBtn: 'Iniciar la Guardia',
    playAgainBtn: 'Otra Guardia',
    controlsNote: 'Toca o haz clic en el edificio donde parpadea una carga, antes de que alcance su punto máximo. En escritorio también puedes pulsar 1-6 para el edificio correspondiente, de izquierda a derecha. Cada rayo atrapado a tiempo se desvía en arco hacia el pararrayos; una carga ignorada golpea el tejado.',
    hint: 'Toca el tejado que parpadea antes de que la carga alcance su pico — la torre conduce a tierra todo rayo que atrapes a tiempo',
    scoreLabel: 'PUNTOS',
    savedLabel: 'A SALVO',
    timeLabel: 'PARA EL ALBA',
    hudScoreAria: 'Puntuación',
    hudSavedAria: 'Edificios a salvo',
    hudTimeAria: 'Tiempo hasta el alba',
    legendEarlyTxt: 'Pronto — seguro, pocos puntos',
    legendGoodTxt: 'Bien — buen ritmo, buenos puntos',
    legendPerfectTxt: 'Perfecto — lanza justo antes del pico para el máximo de puntos',
    ratingEarly: 'Pronto',
    ratingGood: 'Bien',
    ratingPerfect: 'Perfecto',
    struckFloater: '¡Impacto!',
    resultWinTitle: 'Amanece',
    resultLoseTitle: 'Gana la Tormenta',
    resultWinSub: 'Resististe toda la noche — {saved}/{total} casas siguen en pie.',
    resultLoseSub: 'La tormenta rompió la defensa — solo {saved}/{total} casas resistieron.',
    finalScoreLabel: 'Puntuación final',
    bestLabel: 'Mejor puntuación',
    newBestLine: '¡Nueva mejor puntuación!',
    savedLine: '{saved}/{total} edificios a salvo',
  },
  ar: {
    back: 'المكتبة',
    title: 'حارس العاصفة',
    blurb: 'تدور عاصفة هائجة فوق القرية النائمة. راقب السماء، وأمسك بكل شحنة أثناء تشكّلها فوق أحد الأسطح، ثم أطلق صاعقة موجَّهة في اللحظة المناسبة لتصريفها بأمان — التبكير يهدر الضربة، والتأخير يجعل السقف يتلقاها.',
    langSwitchAria: 'اللغة',
    startBtn: 'ابدأ الحراسة',
    playAgainBtn: 'حراسة أخرى',
    controlsNote: 'اضغط أو انقر على المبنى الذي تومض فوقه شحنة، قبل أن تبلغ ذروتها. على الحاسوب يمكنك أيضًا الضغط على 1-6 للمبنى المطابق من اليسار إلى اليمين. كل صاعقة يتم التقاطها في الوقت المناسب تنحني نحو برج التأريض؛ أما الشحنة المُهملة فتضرب المبنى مباشرة.',
    hint: 'اضغط على السطح الوامض قبل ذروة الشحنة — يُصرّف البرج كل صاعقة تلتقطها في الوقت المناسب',
    scoreLabel: 'النقاط',
    savedLabel: 'أُنقذ',
    timeLabel: 'حتى الفجر',
    hudScoreAria: 'النقاط',
    hudSavedAria: 'عدد المباني المُنقذة',
    hudTimeAria: 'الوقت المتبقي حتى الفجر',
    legendEarlyTxt: 'مبكر — آمن، نقاط قليلة',
    legendGoodTxt: 'جيد — توقيت سليم، نقاط جيدة',
    legendPerfectTxt: 'ممتاز — التقط الشحنة قبيل ذروتها مباشرة لأعلى نقاط',
    ratingEarly: 'مبكر',
    ratingGood: 'جيد',
    ratingPerfect: 'ممتاز',
    struckFloater: 'ضربة!',
    resultWinTitle: 'يبزغ الفجر',
    resultLoseTitle: 'تفوز العاصفة',
    resultWinSub: 'صمدتَ طوال الليل — لا يزال {saved}/{total} من المنازل قائمًا.',
    resultLoseSub: 'اخترقت العاصفة الدفاع — لم يصمد سوى {saved}/{total} من المنازل.',
    finalScoreLabel: 'النتيجة النهائية',
    bestLabel: 'الأفضل',
    newBestLine: 'رقم قياسي جديد!',
    savedLine: 'تم إنقاذ {saved}/{total} من المباني',
  },
  fr: {
    back: 'Bibliothèque',
    title: 'Gardien de la Tempête',
    blurb: "Une tempête sauvage tourne au-dessus du village endormi. Surveillez le ciel, saisissez chaque charge pendant qu'elle s'accumule au-dessus d'un toit, et lancez un éclair maîtrisé au bon moment pour la mettre à la terre en sécurité — trop tôt gaspille le tir, trop tard et le toit encaisse le coup.",
    langSwitchAria: 'Langue',
    startBtn: 'Prendre la Garde',
    playAgainBtn: 'Reprendre la Garde',
    controlsNote: "Touchez ou cliquez sur le bâtiment où une charge scintille, avant qu'elle n'atteigne son pic. Sur ordinateur, vous pouvez aussi appuyer sur 1-6 pour le bâtiment correspondant, de gauche à droite. Tout éclair capté à temps s'arque vers le paratonnerre ; une charge ignorée frappe le bâtiment.",
    hint: "Touchez le toit qui scintille avant le pic de la charge — le paratonnerre met à la terre tout éclair capté à temps",
    scoreLabel: 'SCORE',
    savedLabel: 'SAUVÉS',
    timeLabel: "AVANT L'AUBE",
    hudScoreAria: 'Score',
    hudSavedAria: 'Bâtiments sauvés',
    hudTimeAria: "Temps avant l'aube",
    legendEarlyTxt: 'Tôt — sûr, peu de points',
    legendGoodTxt: 'Bien — bon timing, bons points',
    legendPerfectTxt: 'Parfait — lancez juste avant le pic pour le maximum de points',
    ratingEarly: 'Tôt',
    ratingGood: 'Bien',
    ratingPerfect: 'Parfait',
    struckFloater: 'Touché !',
    resultWinTitle: "L'Aube Se Lève",
    resultLoseTitle: 'La Tempête Gagne',
    resultWinSub: "Vous avez tenu toute la nuit — {saved}/{total} maisons sont encore debout.",
    resultLoseSub: "La tempête a percé — seules {saved}/{total} maisons ont tenu.",
    finalScoreLabel: 'Score final',
    bestLabel: 'Meilleur score',
    newBestLine: 'Nouveau meilleur score !',
    savedLine: '{saved}/{total} bâtiments sauvés',
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
    const stored = localStorage.getItem('ogh_storm_warden_lang');
    if (stored && STRINGS[stored]) return stored;
  } catch {
    /* storage may be unavailable */
  }
  const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return STRINGS[nav] ? nav : 'en';
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('ogh_storm_warden_lang', lang);
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
