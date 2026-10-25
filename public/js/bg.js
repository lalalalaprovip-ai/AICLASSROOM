// Nền vũ trụ nhiều lớp: một vòng rAF duy nhất, lớp tĩnh vẽ sẵn offscreen, tạm dừng khi tab ẩn.
export function initBg() {
  const cv = document.getElementById('bg'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 800;
  let W, H, dpr, stat, stars = [], shooters = [], mx = 0, my = 0, raf = 0, t = 0;
  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    stat = document.createElement('canvas'); stat.width = cv.width; stat.height = cv.height;
    const s = stat.getContext('2d'); s.scale(dpr, dpr);
    const neb = (x, y, r, c) => { const g = s.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); s.fillStyle = g; s.fillRect(x - r, y - r, 2 * r, 2 * r); };
    neb(W * .2, H * .25, 480, 'rgba(110,100,200,.28)'); neb(W * .8, H * .3, 520, 'rgba(170,120,200,.20)');
    neb(W * .5, H * .8, 600, 'rgba(60,140,190,.22)'); neb(W * .9, H * .85, 300, 'rgba(220,180,100,.10)');
    // dải Ngân Hà
    s.save(); s.translate(W / 2, H / 2); s.rotate(-.5);
    for (let i = 0; i < (mobile ? 500 : 1400); i++) { const x = (Math.random() - .5) * W * 1.6, y = (Math.random() + Math.random() + Math.random() - 1.5) * H * .18; s.fillStyle = `rgba(200,220,255,${Math.random() * .5})`; s.fillRect(x, y, 1.2, 1.2); }
    s.restore();
    // hành tinh
    const pl = (x, y, r, a, b) => { const g = s.createRadialGradient(x - r * .4, y - r * .4, r * .1, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); s.fillStyle = g; s.beginPath(); s.arc(x, y, r, 0, 7); s.fill(); };
    pl(W * .86, H * .2, 46, '#8fc3de', '#27407f'); pl(W * .1, H * .78, 70, '#d3a6dc', '#4f3a96');
    s.strokeStyle = 'rgba(255,230,255,.3)'; s.lineWidth = 3; s.beginPath(); s.ellipse(W * .1, H * .78, 115, 22, -.3, 0, 7); s.stroke();
    const n = Math.round((mobile ? 260 : 650)); stars = [];
    for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), r: Math.random() * 1.6 + .3, p: Math.random() * 7, c: ['#fff', '#bae6fd', '#e9d5ff', '#fde68a'][i % 4] });
    draw();
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(stat, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const st of stars) {
      const a = reduce ? .8 : .45 + .55 * Math.abs(Math.sin(t * .001 * (.5 + st.z) + st.p));
      ctx.globalAlpha = a; ctx.fillStyle = st.c; ctx.beginPath(); ctx.arc(st.x + mx * st.z * 18, st.y + my * st.z * 18, st.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const m of shooters) { const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 12, m.y - m.vy * 12); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(56,189,248,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 12, m.y - m.vy * 12); ctx.stroke(); }
  }
  function loop(ts) {
    t = ts; if (Math.random() < .012 && shooters.length < 3) shooters.push({ x: Math.random() * W, y: Math.random() * H * .5, vx: 8 + Math.random() * 8, vy: 3 + Math.random() * 5, life: 60 });
    shooters = shooters.filter(m => (m.x += m.vx, m.y += m.vy, --m.life > 0));
    draw(); raf = requestAnimationFrame(loop);
  }
  build(); addEventListener('resize', build);
  if (!reduce) {
    addEventListener('mousemove', e => { mx = e.clientX / W - .5; my = e.clientY / H - .5; });
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); });
  }
}
