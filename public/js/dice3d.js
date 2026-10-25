// Xúc xắc 3D bằng CSS: đủ 6 mặt, đúng chấm, mặt đối diện cộng lại bằng 7.
// dice3d({size, inline})  -> xúc xắc nhỏ dùng trong trò chơi, gọi .set(mặt, ms)
// diceHero()              -> xúc xắc lớn: tự xoay, kéo để xoay tự do, chạm để tung
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const ANG = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };      // góc xoay để đưa mặt n ra phía trước
const FACE = { 1: '', 6: 'rotateY(180deg)', 2: 'rotateY(90deg)', 5: 'rotateY(-90deg)', 3: 'rotateX(90deg)', 4: 'rotateX(-90deg)' };
const TILT = 'rotateX(-20deg) rotateY(-26deg)';
const div = (cls, tag = 'div') => { const e = document.createElement(tag); e.className = cls; return e; };

export function dice3d({ size = 150, interactive = false, inline = false, onRoll } = {}) {
  const scene = div('d3-scene' + (interactive ? ' d3-live' : '') + (inline ? ' d3-inline' : ''));
  scene.style.setProperty('--s', size + 'px'); scene.setAttribute('role', 'img'); scene.setAttribute('aria-label', 'Xúc xắc 6 mặt');
  const cube = div('d3-cube'); scene.append(cube);
  for (let n = 1; n <= 6; n++) {
    const f = div('d3-face d3-f' + n); f.style.transform = `${FACE[n]} translateZ(calc(var(--s) / 2 - 1px))`;
    for (let i = 1; i <= 9; i++) f.append(div('d3-c' + (PIPS[n].includes(i) ? ' pip' : ''), 'span'));
    cube.append(f);
  }
  let rx = 0, ry = 0, auto = false, dragging = false, rolling = false, seen = false, resume = 0;
  const apply = ms => { cube.style.transition = ms ? `transform ${ms}ms cubic-bezier(.2,.75,.25,1)` : 'none'; cube.style.transform = `${TILT} rotateX(${rx}deg) rotateY(${ry}deg)`; };
  scene.set = (n, ms = 0) => { [rx, ry] = ANG[n]; apply(ms); };
  scene.roll = () => {
    if (rolling) return; rolling = true; auto = false; clearTimeout(resume);
    const n = 1 + Math.floor(Math.random() * 6), [a, b] = ANG[n];
    rx = Math.round(rx / 360) * 360 + 720 + a; ry = Math.round(ry / 360) * 360 + 1080 + b; apply(1500); onRoll?.(n);
    setTimeout(() => { rolling = false; resume = setTimeout(() => { if (!dragging) auto = true; }, 3000); }, 1550);
  };
  scene.set(1);
  if (interactive) {
    rx = -24; ry = 30; apply(0);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; auto = !reduce;
    let last = 0;
    const tick = t => {
      if (scene.isConnected) seen = true; else if (seen) return;
      const dt = Math.min(48, t - last || 16); last = t;
      if (auto && !dragging && !rolling && !document.hidden) { ry += .32 * dt / 16; rx += .17 * dt / 16; apply(0); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    let px = 0, py = 0, moved = false;
    scene.addEventListener('pointerdown', e => { if (rolling) return; dragging = true; moved = false; auto = false; clearTimeout(resume); px = e.clientX; py = e.clientY; scene.setPointerCapture(e.pointerId); });
    scene.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - px, dy = e.clientY - py; if (Math.abs(dx) + Math.abs(dy) > 3) moved = true; ry += dx * .6; rx -= dy * .6; px = e.clientX; py = e.clientY; apply(0); });
    const up = () => { if (!dragging) return; dragging = false; if (!moved) scene.roll(); else resume = setTimeout(() => { auto = !reduce; }, 2500); };
    scene.addEventListener('pointerup', up); scene.addEventListener('pointercancel', up);
    scene.tabIndex = 0; scene.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scene.roll(); } });
  }
  return scene;
}
export function diceHero() {
  const cap = div('muted d3-cap', 'p'); cap.textContent = 'Kéo để xoay · chạm để tung xúc xắc';
  const d = dice3d({ size: 150, interactive: true, onRoll: n => { cap.textContent = 'Bạn vừa tung được mặt ' + n; } });
  const box = div('d3-hero'); box.append(d, cap); return box;
}
