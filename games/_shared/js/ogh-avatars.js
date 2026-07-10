/**
 * Built-in avatar presets (SVG data URLs — no external images).
 * Used by hub profile UI and games that want a face chip.
 */
function svgData(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function orb(bg, ring, eye = '#0a0c14') {
  return svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="45%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${ring}"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#g)"/>
  <circle cx="32" cy="32" r="30" fill="none" stroke="${ring}" stroke-width="2" opacity="0.85"/>
  <circle cx="24" cy="28" r="3.2" fill="${eye}"/>
  <circle cx="40" cy="28" r="3.2" fill="${eye}"/>
  <path d="M24 40 Q32 48 40 40" fill="none" stroke="${eye}" stroke-width="2.5" stroke-linecap="round"/>
</svg>`);
}

function rune(bg, fg, letter) {
  return svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="${bg}"/>
  <text x="32" y="42" text-anchor="middle" font-family="system-ui,sans-serif"
        font-size="28" font-weight="700" fill="${fg}">${letter}</text>
</svg>`);
}

function hex(bg, edge) {
  return svgData(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" fill="${bg}" stroke="${edge}" stroke-width="2"/>
  <circle cx="32" cy="32" r="10" fill="${edge}" opacity="0.35"/>
  <circle cx="32" cy="32" r="4" fill="#fff" opacity="0.9"/>
</svg>`);
}

/** @type {{ id: string, label: string, src: string }[]} */
export const OGH_AVATAR_PRESETS = [
  { id: 'cyan-orb', label: 'Cyan', src: orb('#5ce1ff', '#2a8aaa') },
  { id: 'pink-orb', label: 'Pink', src: orb('#ff6bcb', '#a04080') },
  { id: 'mint-orb', label: 'Mint', src: orb('#5cffb0', '#2a8a60') },
  { id: 'gold-orb', label: 'Gold', src: orb('#ffd166', '#a08030') },
  { id: 'violet-orb', label: 'Violet', src: orb('#c4a0ff', '#6040a0') },
  { id: 'coral-orb', label: 'Coral', src: orb('#ff5c7a', '#a03048') },
  { id: 'hex-cyan', label: 'Hex', src: hex('#12162a', '#5ce1ff') },
  { id: 'hex-pink', label: 'Pulse', src: hex('#1a1020', '#ff6bcb') },
  { id: 'rune-a', label: 'A', src: rune('#161a30', '#5ce1ff', 'A') },
  { id: 'rune-r', label: 'R', src: rune('#1a1420', '#ff6bcb', 'R') },
  { id: 'rune-x', label: 'X', src: rune('#101820', '#5cffb0', 'X') },
  { id: 'rune-o', label: 'O', src: rune('#181410', '#ffd166', 'O') },
];

export function getAvatarSrc(avatarId, customDataUrl = null) {
  if (avatarId === 'custom' && customDataUrl) return customDataUrl;
  const p = OGH_AVATAR_PRESETS.find((x) => x.id === avatarId);
  return p ? p.src : OGH_AVATAR_PRESETS[0].src;
}
