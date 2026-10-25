export const ANIMALS = ['cat', 'bear', 'fox', 'rabbit', 'penguin', 'otter'];
const C = { cat: ['#fbbf24', '#f59e0b'], bear: ['#a16207', '#78350f'], fox: ['#fb923c', '#ea580c'], rabbit: ['#f5f5f4', '#fbcfe8'], penguin: ['#1e293b', '#fff'], otter: ['#b45309', '#fde68a'] };
export function avatarSvg(a = 'cat', size = 40) {
  const [f, g] = C[a] || C.cat;
  const ears = a === 'rabbit' ? `<ellipse cx="34" cy="16" rx="8" ry="22" fill="${f}" stroke="#0003"/><ellipse cx="66" cy="16" rx="8" ry="22" fill="${f}" stroke="#0003"/><ellipse cx="34" cy="18" rx="4" ry="15" fill="${g}"/><ellipse cx="66" cy="18" rx="4" ry="15" fill="${g}"/>`
    : a === 'cat' || a === 'fox' ? `<path d="M18 40 L22 8 L44 28Z M82 40 L78 8 L56 28Z" fill="${f}" stroke="#0003"/>` : `<circle cx="24" cy="26" r="11" fill="${f}" stroke="#0003"/><circle cx="76" cy="26" r="11" fill="${f}" stroke="#0003"/>`;
  const face = a === 'penguin' ? `<ellipse cx="50" cy="60" rx="30" ry="32" fill="${g}"/><path d="M46 56 L54 56 L50 63Z" fill="#f59e0b"/>` : `<ellipse cx="50" cy="64" rx="22" ry="17" fill="${g}" opacity=".85"/><ellipse cx="50" cy="58" rx="6" ry="4.5" fill="#3b2f2f"/>`;
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 100 100" role="img" aria-label="avatar ${a}">${ears}<circle cx="50" cy="55" r="38" fill="${f}" stroke="#0003"/>${face}<circle cx="37" cy="46" r="5" fill="#111"/><circle cx="63" cy="46" r="5" fill="#111"/><circle cx="38.5" cy="44.5" r="1.8" fill="#fff"/><circle cx="64.5" cy="44.5" r="1.8" fill="#fff"/><path d="M44 72 Q50 78 56 72" stroke="#3b2f2f" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
}
