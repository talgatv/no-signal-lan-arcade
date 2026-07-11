/**
 * cards.js — deck model + DOM card element builder for Klondike Solitaire.
 *
 * No bundled art: card faces are plain DOM with the actual Unicode suit
 * glyphs (U+2660/2665/2666/2663) styled red/black, same "no sample files"
 * philosophy as games/_shared/js/ogh-sfx.js. Card backs are a pure-CSS
 * repeating pattern (see style.css .sol-card.is-facedown).
 */

export const SUITS = ['S', 'H', 'D', 'C'];

export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_COLOR = { S: 'black', H: 'red', D: 'red', C: 'black' };

export const RANK_LABEL = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

/** @typedef {{id:string, suit:string, rank:number, color:'red'|'black', label:string}} Card */

/** Build a fresh, unshuffled 52-card deck. */
export function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        id: `${suit}${rank}`,
        suit,
        rank,
        color: SUIT_COLOR[suit],
        label: RANK_LABEL[rank],
      });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle, returns a new array (does not mutate input). */
export function shuffle(deck) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isRed(suit) {
  return SUIT_COLOR[suit] === 'red';
}

/**
 * Build the (static) DOM element for one card. Built once per card and
 * reused for the whole session — face-up/face-down and position are all
 * toggled afterwards via CSS classes + inline left/top, never rebuilt, so
 * the CSS position transition animates every move (including the deal)
 * for free. See app.js render().
 */
export function buildCardElement(card) {
  const el = document.createElement('div');
  el.className = `sol-card is-${card.color}`;
  el.dataset.cardId = card.id;
  el.dataset.suit = card.suit;
  el.dataset.rank = String(card.rank);
  el.style.touchAction = 'none'; // belt-and-suspenders alongside the CSS rule — a drag must never start a page pan
  el.setAttribute('aria-label', `${card.label} ${SUIT_GLYPH[card.suit]}`);

  const glyph = SUIT_GLYPH[card.suit];
  const corner = () => {
    const c = document.createElement('div');
    c.className = 'sol-corner';
    const rank = document.createElement('span');
    rank.className = 'sol-rank';
    rank.textContent = card.label;
    const suit = document.createElement('span');
    suit.className = 'sol-suit';
    suit.textContent = glyph;
    c.append(rank, suit);
    return c;
  };

  const tl = corner();
  tl.classList.add('sol-corner-tl');
  const br = corner();
  br.classList.add('sol-corner-br');

  const center = document.createElement('div');
  center.className = 'sol-center';
  center.setAttribute('aria-hidden', 'true');
  center.textContent = glyph;

  el.append(tl, center, br);
  return el;
}
