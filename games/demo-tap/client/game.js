/**
 * Demo Tap — also demos OGHProfile local progress saves.
 * Docs: docs/contributing/SAVE_PROGRESS.md
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';
import { OGHProfile } from '../../_shared/js/ogh-profile.js';

const GAME_ID = 'demo-tap';
const sfx = createOghSfx();
const scoreEl = document.getElementById('score');
const btn = document.getElementById('btn');

const saved = OGHProfile.getProgress(GAME_ID) || {};
let score = Number(saved.score) || 0;
let best = Number(saved.best) || score;
scoreEl.textContent = String(score);

btn.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  score += 1;
  if (score > best) best = score;
  scoreEl.textContent = String(score);
  if (score > 0 && score % 10 === 0) sfx.play('pickup');
  OGHProfile.saveProgress(
    GAME_ID,
    { score, best },
    { label: 'Demo Tap', summary: `Score ${score} · Best ${best}` }
  );
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    btn.click();
  }
});
