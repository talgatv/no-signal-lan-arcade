/**
 * Flags & Capitals — world quiz + country atlas.
 *
 * Two features share one dataset (data/countries.json, 195 countries):
 *   1. Quiz  — 3 multiple-choice modes, region-plausible distractors, scored
 *              15-question rounds with a results screen (best score via OGHProfile).
 *   2. Atlas — searchable/region-filterable reference of every country with an
 *              info card (flag, name, capital, population, area, languages…).
 *
 * Country display names come from countries.json's per-country `names` object
 * for the current UI language; capitals are English (see README). The UI chrome
 * i18n is a separate table in i18n.js.
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';
import {
  LANGS, LANG_LABELS, RTL_LANGS, detectLang, rememberLang, t, applyStaticStrings,
} from './i18n.js';

const GAME_ID = 'flags-quiz';
const ROUND_LEN = 15;
const REGION_ORDER = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

const sfx = createOghSfx();
const $ = (id) => document.getElementById(id);

let lang = detectLang();
let COUNTRIES = [];
let byCode = new Map();

/* ------------------------------------------------------------------------ *
 * Utilities
 * ------------------------------------------------------------------------ */
const nameOf = (c) => (c.names[lang] || c.names.en);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = (arr, n) => shuffle(arr).slice(0, n);
const fmtNum = (n) => {
  try { return Number(n).toLocaleString(lang === 'ar' ? 'ar-EG' : lang); }
  catch { return String(n); }
};

/* ------------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------------ */
async function boot() {
  buildLangSwitch();
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  try {
    const res = await fetch('./data/countries.json');
    const data = await res.json();
    COUNTRIES = data.countries;
    byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
  } catch (e) {
    $('main').innerHTML = `<p class="fq-error">Failed to load country data.</p>`;
    return;
  }
  populateRegionSelects();
  wireNav();
  wireQuiz();
  wireReference();
  renderSetupTexts();
}

/* ------------------------------------------------------------------------ *
 * i18n wiring
 * ------------------------------------------------------------------------ */
function buildLangSwitch() {
  const wrap = $('langSwitch');
  wrap.innerHTML = '';
  LANGS.forEach((l) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `lang-btn${l === lang ? ' is-on' : ''}`;
    b.textContent = LANG_LABELS[l];
    b.addEventListener('click', () => applyLang(l));
    wrap.appendChild(b);
  });
}

function applyLang(l) {
  lang = l;
  rememberLang(l);
  applyStaticStrings(lang);
  document.title = `${t(lang, 'title')} — OGH`;
  buildLangSwitch();
  populateRegionSelects();
  renderSetupTexts();
  // Re-render whatever is live so country names/labels follow the language.
  if (quiz.phase === 'play') renderQuestion();
  if (quiz.phase === 'results') renderResults();
  if (currentView === 'reference') renderReference();
  if (!$('detailOverlay').hidden && detailCode) showDetail(detailCode);
}

function regionLabel(r) { return t(lang, `region${r}`); }

function populateRegionSelects() {
  [$('setupRegion'), $('refRegion')].forEach((sel) => {
    const prev = sel.value;
    sel.innerHTML = '';
    const all = document.createElement('option');
    all.value = '';
    all.textContent = t(lang, 'regionAll');
    sel.appendChild(all);
    REGION_ORDER.forEach((r) => {
      const o = document.createElement('option');
      o.value = r;
      o.textContent = regionLabel(r);
      sel.appendChild(o);
    });
    if (prev) sel.value = prev;
  });
}

/* ------------------------------------------------------------------------ *
 * View switching
 * ------------------------------------------------------------------------ */
let currentView = 'quiz';
function wireNav() {
  $('nav').addEventListener('click', (e) => {
    const btn = e.target.closest('.fq-nav-btn');
    if (!btn) return;
    sfx.unlock(); sfx.play('tap');
    setView(btn.dataset.view);
  });
}
function setView(view) {
  currentView = view;
  $('viewQuiz').hidden = view !== 'quiz';
  $('viewReference').hidden = view !== 'reference';
  document.querySelectorAll('.fq-nav-btn').forEach((b) => {
    b.classList.toggle('is-on', b.dataset.view === view);
    b.setAttribute('aria-selected', b.dataset.view === view ? 'true' : 'false');
  });
  if (view === 'reference' && !refRendered) renderReference();
  $('main').scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------------------ *
 * QUIZ
 * ------------------------------------------------------------------------ */
const quiz = {
  phase: 'setup',      // setup | play | results
  mode: 'flag-country',
  region: '',
  questions: [],
  index: 0,
  score: 0,
  answered: false,
};

function wireQuiz() {
  $('modeList').addEventListener('click', (e) => {
    const btn = e.target.closest('.fq-mode');
    if (!btn) return;
    sfx.unlock(); sfx.play('tap');
    quiz.mode = btn.dataset.mode;
    document.querySelectorAll('.fq-mode').forEach((m) => m.classList.toggle('is-on', m === btn));
  });
  $('btnStart').addEventListener('click', () => { sfx.unlock(); sfx.play('tap'); startRound(); });
  $('btnNext').addEventListener('click', () => { sfx.play('tap'); nextQuestion(); });
  $('btnAgain').addEventListener('click', () => { sfx.play('tap'); startRound(); });
  $('btnChangeMode').addEventListener('click', () => { sfx.play('tap'); showQuizPhase('setup'); });
  $('qOptions').addEventListener('click', onOptionClick);
}

function renderSetupTexts() {
  // mode descriptions are data-i18n-driven via applyStaticStrings already.
  document.querySelectorAll('.fq-mode').forEach((m) => {
    m.classList.toggle('is-on', m.dataset.mode === quiz.mode);
  });
}

function poolForRegion(region) {
  return region ? COUNTRIES.filter((c) => c.region === region) : COUNTRIES;
}

/** Distractors from the same subregion first, then region, then anywhere. */
function pickOptions(answer, pool, valueFn) {
  const answerVal = valueFn(answer);
  const tiers = [
    pool.filter((c) => c.subregion === answer.subregion && c.code !== answer.code),
    pool.filter((c) => c.region === answer.region && c.code !== answer.code),
    COUNTRIES.filter((c) => c.code !== answer.code),
  ];
  const chosen = [];
  const usedVals = new Set([answerVal]);
  for (const tier of tiers) {
    for (const c of shuffle(tier)) {
      const v = valueFn(c);
      if (usedVals.has(v)) continue;
      usedVals.add(v);
      chosen.push(c);
      if (chosen.length >= 3) break;
    }
    if (chosen.length >= 3) break;
  }
  return shuffle([answer, ...chosen]);
}

function startRound() {
  quiz.region = $('setupRegion').value;
  const pool = poolForRegion(quiz.region);
  const answers = sample(pool, Math.min(ROUND_LEN, pool.length));
  quiz.questions = answers.map((answer) => {
    const valueFn = quiz.mode === 'flag-country' ? nameOf : (c) => c.capital;
    const options = pickOptions(answer, pool, valueFn);
    return { answer, options, chosen: null };
  });
  quiz.index = 0;
  quiz.score = 0;
  quiz.answered = false;
  showQuizPhase('play');
  renderQuestion();
}

function showQuizPhase(phase) {
  quiz.phase = phase;
  $('quizSetup').hidden = phase !== 'setup';
  $('quizPlay').hidden = phase !== 'play';
  $('quizResults').hidden = phase !== 'results';
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const q = quiz.questions[quiz.index];
  quiz.answered = q.chosen != null;
  $('qProgress').textContent = t(lang, 'questionOf', { n: quiz.index + 1, total: quiz.questions.length });
  $('qScore').textContent = `★ ${quiz.score}`;

  const showFlag = quiz.mode === 'flag-country' || quiz.mode === 'flag-capital';
  $('qFlagStage').hidden = !showFlag;
  $('qCountryStage').hidden = showFlag;
  if (showFlag) {
    $('qFlagStage').innerHTML = q.answer.flag;
  } else {
    $('qCountryStage').textContent = nameOf(q.answer);
  }

  if (quiz.mode === 'flag-country') $('qPrompt').textContent = t(lang, 'promptFlagCountry');
  else if (quiz.mode === 'country-capital') $('qPrompt').textContent = t(lang, 'promptCountryCapital', { country: nameOf(q.answer) });
  else $('qPrompt').textContent = t(lang, 'promptFlagCapital');

  const valueFn = quiz.mode === 'flag-country' ? nameOf : (c) => c.capital;
  const optWrap = $('qOptions');
  optWrap.innerHTML = '';
  q.options.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fq-option';
    b.textContent = valueFn(c);
    b.dataset.code = c.code;
    optWrap.appendChild(b);
  });

  $('qFeedback').textContent = '';
  $('qFeedback').className = 'fq-feedback';
  $('btnNext').hidden = true;
  $('btnNext').textContent = t(lang, quiz.index === quiz.questions.length - 1 ? 'finishBtn' : 'nextBtn');

  if (quiz.answered) revealAnswer(q); // re-render of an already-answered question (e.g. language switch)
}

function onOptionClick(e) {
  const btn = e.target.closest('.fq-option');
  if (!btn || quiz.answered) return;
  const q = quiz.questions[quiz.index];
  q.chosen = btn.dataset.code;
  quiz.answered = true;
  const correct = q.chosen === q.answer.code;
  if (correct) { quiz.score++; sfx.play('pickup'); }
  else { sfx.play('die'); }
  $('qScore').textContent = `★ ${quiz.score}`;
  revealAnswer(q);
}

function revealAnswer(q) {
  const valueFn = quiz.mode === 'flag-country' ? nameOf : (c) => c.capital;
  document.querySelectorAll('.fq-option').forEach((b) => {
    b.disabled = true;
    if (b.dataset.code === q.answer.code) b.classList.add('is-correct');
    else if (b.dataset.code === q.chosen) b.classList.add('is-wrong');
  });
  const correct = q.chosen === q.answer.code;
  const fb = $('qFeedback');
  if (correct) {
    fb.textContent = '✓';
    fb.className = 'fq-feedback is-pos';
  } else {
    fb.textContent = t(lang, 'answerWas', { answer: valueFn(q.answer) });
    fb.className = 'fq-feedback is-neg';
  }
  $('btnNext').hidden = false;
}

function nextQuestion() {
  if (quiz.index < quiz.questions.length - 1) {
    quiz.index++;
    renderQuestion();
  } else {
    finishRound();
  }
}

function finishRound() {
  const total = quiz.questions.length;
  const saved = OGHProfile.getProgress(GAME_ID) || {};
  const key = `best_${quiz.mode}`;
  const prevBest = saved[key] || 0;
  const isNewBest = quiz.score > prevBest;
  if (isNewBest) {
    OGHProfile.saveProgress(GAME_ID, { ...saved, [key]: quiz.score },
      { name: t('en', 'title') });
  }
  quiz._lastNewBest = isNewBest;
  quiz._lastBest = Math.max(prevBest, quiz.score);
  showQuizPhase('results');
  renderResults();
  sfx.play('win');
}

function renderResults() {
  const total = quiz.questions.length;
  const pct = Math.round((quiz.score / total) * 100);
  $('rScore').textContent = `${quiz.score}`;
  $('rSub').textContent = `${t(lang, 'outOf', { total })} · ${t(lang, 'accuracyLabel')} ${pct}%`;
  $('rNewBest').hidden = !quiz._lastNewBest;
  $('rBest').textContent = `${t(lang, 'bestLabel')}: ${quiz._lastBest} / ${total}`;
}

/* ------------------------------------------------------------------------ *
 * ATLAS / REFERENCE
 * ------------------------------------------------------------------------ */
let refRendered = false;
let detailCode = null;

function wireReference() {
  $('refSearch').addEventListener('input', renderReference);
  $('refRegion').addEventListener('change', renderReference);
  $('refGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.fq-ref-card');
    if (!card) return;
    sfx.unlock(); sfx.play('tap');
    showDetail(card.dataset.code);
  });
  $('btnCloseDetail').addEventListener('click', closeDetail);
  $('detailOverlay').addEventListener('click', (e) => {
    if (e.target === $('detailOverlay')) closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('detailOverlay').hidden) closeDetail();
  });
}

function matchesSearch(c, q) {
  if (!q) return true;
  const hay = [nameOf(c), c.names.en, c.capital, c.code].join(' ').toLowerCase();
  return hay.includes(q);
}

function renderReference() {
  refRendered = true;
  const q = $('refSearch').value.trim().toLowerCase();
  const region = $('refRegion').value;
  const list = COUNTRIES
    .filter((c) => (!region || c.region === region) && matchesSearch(c, q))
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b), lang === 'ar' ? 'ar' : lang));

  $('refCount').textContent = t(lang, 'countriesShown', { n: list.length });
  const grid = $('refGrid');
  grid.innerHTML = '';
  $('refNoResults').hidden = list.length > 0;

  // Group by region (headers) so the 195-country list stays navigable.
  const groups = new Map();
  REGION_ORDER.forEach((r) => groups.set(r, []));
  list.forEach((c) => groups.get(c.region).push(c));

  REGION_ORDER.forEach((r) => {
    const items = groups.get(r);
    if (!items.length) return;
    const header = document.createElement('h3');
    header.className = 'fq-ref-header';
    header.textContent = `${regionLabel(r)} · ${items.length}`;
    grid.appendChild(header);
    const row = document.createElement('div');
    row.className = 'fq-ref-row';
    items.forEach((c) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'fq-ref-card';
      card.dataset.code = c.code;
      card.innerHTML =
        `<span class="fq-ref-flag">${c.flag}</span>` +
        `<span class="fq-ref-name">${nameOf(c)}</span>`;
      row.appendChild(card);
    });
    grid.appendChild(row);
  });
}

function factRow(labelKey, value) {
  return `<div class="fq-fact"><dt>${t(lang, labelKey)}</dt><dd>${value}</dd></div>`;
}

function showDetail(code) {
  const c = byCode.get(code);
  if (!c) return;
  detailCode = code;
  $('detailFlag').innerHTML = c.flag;
  $('detailName').textContent = nameOf(c);
  $('detailNative').textContent = lang === 'en' ? '' : c.names.en;
  const areaTxt = `${fmtNum(c.area)} ${t(lang, 'areaUnit')}`;
  $('detailFacts').innerHTML =
    factRow('capitalLabel', c.capital) +
    factRow('regionLabel', regionLabel(c.region)) +
    factRow('populationLabel', fmtNum(c.population)) +
    factRow('areaLabel', areaTxt) +
    factRow('languagesLabel', c.languages) +
    factRow('currencyLabel', c.currency) +
    factRow('codeLabel', c.code);
  const note = $('detailNote');
  if (c.detail === 'simplified') {
    note.hidden = false;
    note.textContent = t(lang, 'simplifiedNote');
  } else {
    note.hidden = true;
  }
  $('detailOverlay').hidden = false;
}

function closeDetail() {
  $('detailOverlay').hidden = true;
  detailCode = null;
}

boot();
