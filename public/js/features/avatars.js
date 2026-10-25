export const ANIMALS = ['cat', 'bear', 'fox', 'rabbit', 'penguin', 'otter'];
// Phong cách "chibi": đầu tròn, mắt to có ánh sáng, má hồng, miệng cười nhỏ; màu pastel dịu.
const EYES = (y = 52) => `<ellipse cx="36" cy="${y}" rx="6" ry="7" fill="#2a2238"/><ellipse cx="64" cy="${y}" rx="6" ry="7" fill="#2a2238"/><circle cx="38.3" cy="${y - 2.6}" r="2.4" fill="#fff"/><circle cx="66.3" cy="${y - 2.6}" r="2.4" fill="#fff"/><circle cx="34.4" cy="${y + 2.6}" r="1.1" fill="#fff" opacity=".85"/><circle cx="62.4" cy="${y + 2.6}" r="1.1" fill="#fff" opacity=".85"/>`;
const BLUSH = (y = 62) => `<ellipse cx="25" cy="${y}" rx="6.5" ry="4" fill="#ff8fab" opacity=".5"/><ellipse cx="75" cy="${y}" rx="6.5" ry="4" fill="#ff8fab" opacity=".5"/>`;
const SMILE = y => `<path d="M45.5 ${y} Q47.75 ${y + 3.4} 50 ${y} Q52.25 ${y + 3.4} 54.5 ${y}" fill="none" stroke="#5a3a3a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
const ear = (d, c) => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="4" stroke-linejoin="round"/>`;

const ART = {
  cat: ['#ffe9d2', ear('M17 46 L20 12 L46 30Z', '#f2b472') + ear('M83 46 L80 12 L54 30Z', '#f2b472') + ear('M24 36 L25 22 L37 30Z', '#f5a3b5') + ear('M76 36 L75 22 L63 30Z', '#f5a3b5')
    + '<ellipse cx="50" cy="57" rx="35" ry="31" fill="#f6c48a"/><path d="M50 28 V36 M42 30 L43.5 37 M58 30 L56.5 37" stroke="#e39a5a" stroke-width="3" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="11" ry="7.5" fill="#fff3e3"/>'
    + EYES(50) + BLUSH(61) + '<path d="M47 59 H53 L50 62.6Z" fill="#f08aa0" stroke="#f08aa0" stroke-width="1.6" stroke-linejoin="round"/>' + SMILE(65)
    + '<g stroke="#c58a58" stroke-width="1.4" stroke-linecap="round" opacity=".7"><path d="M20 60 L8 57 M20 65 L9 68 M80 60 L92 57 M80 65 L91 68"/></g>'],
  bear: ['#efe3d3', '<circle cx="22" cy="29" r="12" fill="#a9784f"/><circle cx="22" cy="29" r="6.5" fill="#e3bb92"/><circle cx="78" cy="29" r="12" fill="#a9784f"/><circle cx="78" cy="29" r="6.5" fill="#e3bb92"/>'
    + '<ellipse cx="50" cy="57" rx="35" ry="32" fill="#bd8a5e"/><ellipse cx="50" cy="67" rx="14" ry="10.5" fill="#f3dfc3"/>'
    + EYES(49) + BLUSH(60) + '<ellipse cx="50" cy="61.5" rx="5" ry="3.6" fill="#4a3228"/><ellipse cx="48.6" cy="60.3" rx="1.5" ry="0.9" fill="#fff" opacity=".7"/><path d="M50 65 V67.5" stroke="#5a3a3a" stroke-width="1.6" stroke-linecap="round"/>'
    + '<path d="M43.5 67 Q47 71 50 67.5 Q53 71 56.5 67" fill="none" stroke="#5a3a3a" stroke-width="1.6" stroke-linecap="round"/>'],
  fox: ['#fde7da', ear('M16 48 L19 10 L46 30Z', '#f08a4b') + ear('M84 48 L81 10 L54 30Z', '#f08a4b') + ear('M23 38 L24 20 L37 30Z', '#6e4333') + ear('M77 38 L76 20 L63 30Z', '#6e4333')
    + '<ellipse cx="50" cy="56" rx="35" ry="30" fill="#f39a5a"/><path d="M15 62 Q30 56 50 78 Q70 56 85 62 Q80 85 50 87 Q20 85 15 62Z" fill="#fff6ee"/>'
    + EYES(50) + BLUSH(63) + '<ellipse cx="50" cy="66" rx="4.2" ry="3" fill="#3a2a2e"/><ellipse cx="49" cy="65" rx="1.3" ry=".8" fill="#fff" opacity=".7"/>' + SMILE(70)],
  rabbit: ['#e9e1f7', '<g transform="rotate(-7 36 44)"><ellipse cx="36" cy="22" rx="9" ry="21" fill="#fbf4f0"/><ellipse cx="36" cy="24" rx="4.6" ry="15" fill="#f8b9c9"/></g><g transform="rotate(7 64 44)"><ellipse cx="64" cy="22" rx="9" ry="21" fill="#fbf4f0"/><ellipse cx="64" cy="24" rx="4.6" ry="15" fill="#f8b9c9"/></g>'
    + '<ellipse cx="50" cy="60" rx="34" ry="29" fill="#fcf6f2"/>' + EYES(56) + BLUSH(66) + '<ellipse cx="50" cy="63" rx="3.2" ry="2.4" fill="#f59fb5"/>' + SMILE(66.5)
    + '<rect x="47.3" y="69" width="2.7" height="4.2" rx="1.1" fill="#fff" stroke="#e4d4cf" stroke-width=".8"/><rect x="50" y="69" width="2.7" height="4.2" rx="1.1" fill="#fff" stroke="#e4d4cf" stroke-width=".8"/>'],
  penguin: ['#d8edf8', '<ellipse cx="50" cy="56" rx="35" ry="32" fill="#3f4b6b"/><path d="M50 40 C42 30 20 38 22 58 C23 74 38 85 50 85 C62 85 77 74 78 58 C80 38 58 30 50 40Z" fill="#fbfbfd"/>'
    + EYES(53) + BLUSH(65) + '<path d="M43.5 61 Q50 57 56.5 61 Q54.5 68.5 50 69.5 Q45.5 68.5 43.5 61Z" fill="#f7a84f"/><path d="M45.5 63.2 Q50 65 54.5 63.2" fill="none" stroke="#d98a35" stroke-width="1.2" stroke-linecap="round"/>'
    + '<path d="M46 25 Q50 17 54 25" fill="none" stroke="#3f4b6b" stroke-width="3" stroke-linecap="round"/>'],
  otter: ['#dcefe8', '<circle cx="24" cy="31" r="8" fill="#8f6240"/><circle cx="24" cy="31" r="4" fill="#d9b48e"/><circle cx="76" cy="31" r="8" fill="#8f6240"/><circle cx="76" cy="31" r="4" fill="#d9b48e"/>'
    + '<ellipse cx="50" cy="57" rx="35" ry="31" fill="#a8754d"/><ellipse cx="50" cy="45" rx="22" ry="11" fill="#c39166" opacity=".55"/><ellipse cx="50" cy="66" rx="16" ry="11" fill="#f2dec3"/>'
    + EYES(50) + BLUSH(61) + '<ellipse cx="50" cy="60.5" rx="5.4" ry="3.7" fill="#3d2b27"/><ellipse cx="48.6" cy="59.3" rx="1.5" ry=".9" fill="#fff" opacity=".7"/>' + SMILE(66.5)
    + '<g fill="#b18c6b"><circle cx="41" cy="67" r=".9"/><circle cx="38.5" cy="70" r=".9"/><circle cx="59" cy="67" r=".9"/><circle cx="61.5" cy="70" r=".9"/></g>']
};
export function avatarSvg(a = 'cat', size = 40) {
  const [bg, art] = ART[a] || ART.cat;
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="avatar ${a}"><rect width="100" height="100" fill="${bg}"/>${art}</svg>`;
}
