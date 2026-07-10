/**
 * Solo template — replace this logic with your game.
 * Docs: docs/contributing/ADD_A_GAME.md
 */
import { createOghSfx } from '../../_shared/js/ogh-sfx.js';

const sfx = createOghSfx();
const scoreEl = document.getElementById('score');
const btn = document.getElementById('btn');

let score = 0;

btn.addEventListener('click', () => {
  sfx.unlock();
  sfx.play('tap');
  score += 1;
  scoreEl.textContent = String(score);
  if (score > 0 && score % 10 === 0) sfx.play('pickup');
});

// Keyboard optional
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    btn.click();
  }
});
