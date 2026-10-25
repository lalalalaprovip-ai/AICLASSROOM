import { h, toast } from '../services/ui.js';
import { dice3d } from '../dice3d.js';
import { getStars, setStars, lsGet, lsSet } from '../services/store.js';
import { addLog } from '../services/store.js';
import { mathHtml } from '../services/math.js';
import { binomPmf, Phi, phiPdf } from '../services/stats.js';

const PLANETS = [
  { id: 'dice', name: 'Cosmic Dice Rush', ch: 1, kind: 'Tung xúc xắc', lvl: 'Dễ', col: 'linear-gradient(135deg,#6366f1,#22d3ee)', ico: '🎲', goal: 'Dự đoán tổng hai xúc xắc để nạp đủ nhiên liệu.' },
  { id: 'vault', name: 'Lucky Vault', ch: 1, kind: 'Rút bóng', lvl: 'Dễ', col: 'linear-gradient(135deg,#f59e0b,#ec4899)', ico: '🔮', goal: 'Rút đủ bóng vàng để mở két.' },
  { id: 'arch', name: 'Distribution Architect', ch: 3, kind: 'Phân phối nhị thức', lvl: 'Vừa', col: 'linear-gradient(135deg,#10b981,#3b82f6)', ico: '📊', goal: 'Chỉnh n, p cho khớp kỳ vọng và phương sai mục tiêu.' },
  { id: 'detective', name: 'Stat Detective', ch: 1, kind: 'Công thức Bayes', lvl: 'Vừa', col: 'linear-gradient(135deg,#7c3aed,#0ea5e9)', ico: '🕵️', goal: 'Thu thập bằng chứng, cập nhật xác suất hậu nghiệm và buộc tội đúng người.' },
  { id: 'colony', name: 'Colony Survival', ch: 5, kind: 'Khoảng tin cậy', lvl: 'Khó', col: 'linear-gradient(135deg,#059669,#facc15)', ico: '🪐', goal: 'Lấy mẫu có ngân sách và quyết định có lập khu định cư hay không.' },
  { id: 'reactor', name: 'Reactor Crisis', ch: 6, kind: 'Kiểm định giả thiết', lvl: 'Khó', col: 'linear-gradient(135deg,#dc2626,#f97316)', ico: '☢️', goal: 'Đặt mức ý nghĩa, đọc miền bác bỏ và quyết định có dừng lò không.' }
];
export function gamesView(root, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); let cleanup = null;
  const starEl = h('b', {}); const upd = () => starEl.textContent = '⭐ ' + getStars();
  function map() {
    cleanup?.(); cleanup = null; box.innerHTML = ''; upd();
    box.append(h('div', { class: 'glass' }, h('div', { class: 'row' }, h('h2', { class: 'sp' }, 'AI Classroom – ÔN TẬP: Bản đồ vũ trụ'), h('span', { class: 'chip' }, starEl), h('button', { class: 'btn alt', onclick: () => go('/home') }, 'Trang chủ')), h('p', {}, 'Chọn một hành tinh để bắt đầu nhiệm vụ. Nhiệm vụ nào xong sẽ nhận sao để mua gợi ý.')),
      h('div', { class: 'grid g3', style: 'margin-top:14px' }, PLANETS.map(p => h('div', { class: 'planet hover-lift' + (p.lock ? ' lock' : ''), style: `background:${p.col}`, tabindex: 0, role: 'button', onclick: () => p.lock ? toast(p.name + ' ' + p.goal.toLowerCase(), 'info') : play(p) }, h('div', { style: 'font-size:2.4rem' }, p.ico), h('h3', {}, p.name), h('div', {}, p.goal), h('div', { class: 'row', style: 'margin-top:8px' }, h('span', { class: 'chip' }, 'Chương ' + p.ch), h('span', { class: 'chip' }, p.kind), h('span', { class: 'chip' }, p.lock ? '🔒 Sắp mở' : p.lvl))))));
  }
  function play(p) {
    const ctx = { stars: getStars, spend: n => { setStars(getStars() - n); upd(); }, win: s => { setStars(getStars() + s); upd(); addLog({ source: 'tro_choi', topic: p.name, chapter: p.ch, result: 'dung' }); }, lose: () => addLog({ source: 'tro_choi', topic: p.name, chapter: p.ch, result: 'sai', error_label: 'Khái niệm' }), back: map, redo: () => play(p) };
    cleanup?.(); box.innerHTML = ''; const g = { dice, vault, arch, detective, colony, reactor }[p.id](ctx); box.append(h('div', { class: 'glass' }, h('div', { class: 'row' }, h('h2', { class: 'sp' }, p.ico + ' ' + p.name), h('span', { class: 'chip' }, starEl), h('button', { class: 'btn alt', onclick: map }, '← Bản đồ')), g.el)); cleanup = g.destroy;
  }
  map(); return () => cleanup?.();
}
// ---- Gợi ý theo cấp: cấp 1 miễn phí 1 lần, cấp 2 = 1 sao, cấp 3 = 2 sao; không trừ hai lần ----
function hintBox(ctx, hints) {
  let lv = 0, busy = false; const out = h('div', { class: 'solid', style: 'display:none;margin-top:8px' }); const btn = h('button', { class: 'btn alt sm' }, '💡 Gợi ý');
  const refresh = () => btn.textContent = lv >= 3 ? '💡 Hết gợi ý' : `💡 Gợi ý cấp ${lv + 1}` + (lv === 0 ? ' (miễn phí)' : lv === 1 ? ' (1 ⭐)' : ' (2 ⭐)');
  btn.onclick = () => { if (busy || lv >= 3) return; busy = true; const cost = [0, 1, 2][lv]; if (cost && ctx.stars() < cost) { busy = false; return toast('Chưa đủ năng lượng vũ trụ! Hoàn thành nhiệm vụ để nhận thêm sao.', 'error'); } if (cost && !confirm(`Dùng ${cost} ⭐ để mở gợi ý cấp ${lv + 1}?`)) { busy = false; return; } if (cost) ctx.spend(cost); out.style.display = ''; out.innerHTML = ''; out.append(h('div', { html: mathHtml(`**Gợi ý cấp ${lv + 1}:** ${hints[lv]}`) }), h('button', { class: 'btn alt sm', onclick: () => out.style.display = 'none' }, 'Ẩn gợi ý')); lv++; refresh(); busy = false; };
  refresh(); return h('div', {}, btn, out);
}
const end = (ctx, win, text, stars) => { win ? ctx.win(stars) : ctx.lose(); return h('div', { class: 'result', style: win ? '' : 'background:rgba(251,113,133,.2);border-color:#fb7185' }, h('h3', {}, win ? '🎉 Nhiệm vụ hoàn thành! +' + stars + ' ⭐' : '💥 Nhiệm vụ thất bại'), h('div', { html: mathHtml(text) }), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: ctx.redo }, 'Chơi lại'), h('button', { class: 'btn alt', onclick: ctx.back }, 'Về bản đồ'))); };
// ---------------- Cosmic Dice Rush ----------------
function dice(ctx) {
  let turn = 0, fuel = 0, over = false; const MAX = 10, NEED = 5, counts = Array(13).fill(0); let rolls = 0, chart = null, timer = null;
  const dEl = [dice3d({ size: 56, inline: true }), dice3d({ size: 56, inline: true })]; const info = h('div'); const sel = h('select', { style: 'width:auto' }, Array.from({ length: 11 }, (_, i) => h('option', { value: i + 2 }, 'Tổng = ' + (i + 2)))); const msg = h('div', { class: 'muted' }); const fin = h('div');
  const face = n => '⚀⚁⚂⚃⚄⚅'[n - 1]; const bar = h('div', { style: 'height:16px;border-radius:8px;background:rgba(255,255,255,.2);overflow:hidden' }, h('div', { style: 'height:100%;width:0;background:linear-gradient(90deg,#38bdf8,#e879f9);transition:width .4s' }));
  const ways = s => 6 - Math.abs(s - 7);
  const roll = h('button', { class: 'btn hot', onclick: () => {
    if (over || timer) return; const guess = +sel.value; let k = 0; roll.disabled = true;
    timer = setInterval(() => { dEl.forEach(d => d.set(1 + Math.floor(Math.random() * 6), 70)); if (++k > 9) { clearInterval(timer); timer = null; const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); dEl[0].set(a, 450); dEl[1].set(b, 450); const s = a + b; counts[s]++; rolls++; turn++; const hit = s === guess; if (hit) fuel++; bar.firstChild.style.width = 100 * fuel / NEED + '%'; msg.innerHTML = mathHtml(`Ra tổng **${s}**. Bạn dự đoán ${guess}: ${hit ? '✅ trúng (+1 nhiên liệu)' : '❌ trượt'}. Xác suất lý thuyết của tổng ${guess} là \\(\\frac{${ways(guess)}}{36}\\approx ${(ways(guess) / 36).toFixed(3).replace('.', ',')}\\).`); info.textContent = `Lượt ${turn}/${MAX} · Nhiên liệu ${fuel}/${NEED}`; draw(); roll.disabled = false;
      if (fuel >= NEED) { over = true; roll.disabled = true; fin.append(end(ctx, true, `Bạn nạp đủ nhiên liệu sau ${turn} lượt. Nhớ: tổng 7 có 6 cách trong 36 kết quả nên \\(P=\\frac{6}{36}=\\frac{1}{6}\\) là cao nhất; tổng 2 và 12 chỉ \\(\\frac{1}{36}\\). Tần suất thực nghiệm sẽ tiến gần lý thuyết khi tung nhiều lần (luật số lớn).`, 3)); } else if (turn >= MAX) { over = true; roll.disabled = true; fin.append(end(ctx, false, 'Hết lượt mà chưa đủ nhiên liệu. Gợi ý: hãy chọn tổng có nhiều cách xảy ra nhất (tổng 7 có \\(\\frac{6}{36}\\)).')); } } }, 70);
  } }, '🎲 Tung xúc xắc');
  const cv = h('canvas', { height: 200 }); function draw() { const labels = Array.from({ length: 11 }, (_, i) => i + 2); const data = { labels, datasets: [{ label: 'Lý thuyết', data: labels.map(s => ways(s) / 36), backgroundColor: '#38bdf8aa' }, { label: `Thực nghiệm (${rolls} lần)`, data: labels.map(s => counts[s] / (rolls || 1)), backgroundColor: '#e879f9aa' }] }; if (!chart) chart = new Chart(cv, { type: 'bar', data, options: { color: '#E2E8F0', maintainAspectRatio: false, plugins: { legend: { labels: { color: '#E2E8F0' } } }, scales: { x: { ticks: { color: '#E2E8F0' }, title: { display: true, text: 'Tổng hai xúc xắc', color: '#E2E8F0' } }, y: { ticks: { color: '#E2E8F0' }, title: { display: true, text: 'Tần suất', color: '#E2E8F0' } } } } }); else { chart.data = data; chart.update(); } }
  info.textContent = `Lượt 0/${MAX} · Nhiên liệu 0/${NEED}`;
  const el = h('div', {}, h('p', {}, `Mỗi lượt hãy DỰ ĐOÁN tổng hai xúc xắc trước khi tung. Đoán trúng ${NEED} lần trong ${MAX} lượt để nạp đủ nhiên liệu cho tàu.`), h('div', { class: 'row' }, 'Dự đoán:', sel, roll, info), bar, h('div', { style: 'margin:10px 0' }, dEl), msg, h('div', { style: 'position:relative;height:220px' }, cv), hintBox(ctx, ['Mỗi xúc xắc có 6 mặt nên có 36 cặp kết quả đồng khả năng. Hãy đếm xem mỗi tổng có bao nhiêu cặp.', 'Tổng 7 có 6 cặp: (1,6),(2,5),(3,4),(4,3),(5,2),(6,1); tổng 2 chỉ có (1,1). Xác suất = số cặp / 36.', 'Hãy chọn tổng 7 ở mọi lượt: \\(P=\\frac{6}{36}=\\frac{1}{6}\\), cao nhất trong các tổng.']), fin); draw();
  return { el, destroy: () => { clearInterval(timer); chart?.destroy(); } };
}
// ---------------- Lucky Vault ----------------
function vault(ctx) {
  const COL = { do: ['Đỏ', '#ef4444'], xanh: ['Xanh', '#3b82f6'], vang: ['Vàng', '#fbbf24'] }; let bag = { do: 5, xanh: 3, vang: 2 }, replace = false, left = 6, gold = 0, over = false, showP = true; const NEED = 2;
  const info = h('div'), bagEl = h('div'), pEl = h('div', { class: 'read' }), log = h('div', { class: 'muted' }), fin = h('div');
  const tot = () => bag.do + bag.xanh + bag.vang;
  const draw = () => { bagEl.innerHTML = ''; for (const k in bag) for (let i = 0; i < bag[k]; i++) bagEl.append(h('span', { class: 'ball', style: `background:${COL[k][1]}`, title: COL[k][0] })); info.textContent = `Còn ${left} lượt rút · Bóng vàng: ${gold}/${NEED} · Trong hộp: ${tot()} bóng`; pEl.style.display = showP ? '' : 'none'; pEl.innerHTML = mathHtml(`Xác suất lần rút kế tiếp: \\(P(\\text{vàng})=\\frac{${bag.vang}}{${tot()}}\\approx ${(bag.vang / tot()).toFixed(3).replace('.', ',')}\\), \\(P(\\text{đỏ})=\\frac{${bag.do}}{${tot()}}\\)`); };
  const btn = h('button', { class: 'btn hot', onclick: () => {
    if (over || !tot()) return; let r = Math.random() * tot(), c = 'do'; for (const k of ['do', 'xanh', 'vang']) { if (r < bag[k]) { c = k; break; } r -= bag[k]; }
    const before = tot(); if (!replace) bag[c]--; left--; if (c === 'vang') gold++; log.innerHTML = mathHtml(`Bạn rút được bóng **${COL[c][0]}**. Trước lúc rút có ${before} bóng trong hộp; \\(P(\\text{vàng})\\) lúc đó là \\(\\frac{${(c === 'vang' && !replace) ? bag.vang + 1 : bag.vang}}{${before}}\\).`); draw();
    if (gold >= NEED) { over = true; btn.disabled = true; fin.append(end(ctx, true, replace ? 'Rút **có hoàn lại**: các lần rút độc lập, thành phần hộp không đổi nên \\(P(\\text{vàng})=\\frac{2}{10}\\) mọi lần.' : 'Rút **không hoàn lại**: mỗi lần rút làm thay đổi thành phần hộp nên xác suất các lần sau phụ thuộc lần trước.', 3)); }
    else if (left <= 0) { over = true; btn.disabled = true; fin.append(end(ctx, false, `Hết lượt mà mới có ${gold}/${NEED} bóng vàng. Hãy thử đổi giữa rút có hoàn lại và không hoàn lại để xem xác suất thay đổi thế nào.`)); } } }, '🖐 Rút một bóng');
  const mode = h('select', { style: 'width:auto', onchange: e => { if (over || left < 6) { toast('Chỉ đổi chế độ trước khi rút.', 'info'); e.target.value = replace ? '1' : '0'; return; } replace = e.target.value === '1'; } }, h('option', { value: '0' }, 'Không hoàn lại'), h('option', { value: '1' }, 'Có hoàn lại'));
  const el = h('div', {}, h('p', {}, `Hộp có 5 bóng đỏ, 3 xanh, 2 vàng. Rút đủ ${NEED} bóng vàng trong 6 lượt để mở két.`), h('div', { class: 'row' }, mode, btn, h('label', { style: 'margin:0;font-weight:400' }, h('input', { type: 'checkbox', checked: true, style: 'width:auto', onchange: e => { showP = e.target.checked; draw(); } }), ' Hiện xác suất')), info, h('div', { style: 'margin:10px 0;min-height:40px' }, bagEl), pEl, log, hintBox(ctx, ['Xác suất rút vàng ở mỗi lần bằng số bóng vàng còn lại chia tổng số bóng còn lại.', 'Không hoàn lại: sau khi rút bóng khác vàng, tỉ lệ vàng trong hộp TĂNG lên. Có hoàn lại: tỉ lệ luôn là 2/10.', 'Thử rút không hoàn lại: \\(P(\\text{2 vàng liên tiếp})=\\frac{2}{10}\\cdot\\frac{1}{9}\\). Tính xác suất rút đủ 2 vàng trong 6 lần bằng biến cố đối.']), fin); draw();
  return { el, destroy() { } };
}
// ---------------- Distribution Architect ----------------
function arch(ctx) {
  const n0 = 6 + Math.floor(Math.random() * 20), p0 = [.2, .25, .3, .4, .5, .6, .7][Math.floor(Math.random() * 7)]; const tm = n0 * p0, tv = n0 * p0 * (1 - p0); let n = 10, p = .5, over = false, chart = null, sim = null;
  const nI = h('input', { type: 'range', min: 1, max: 50, value: n, 'aria-label': 'n' }), pI = h('input', { type: 'range', min: 5, max: 95, value: 50, 'aria-label': 'p' }); const cur = h('div', { class: 'read' }), fin = h('div'); const cv = h('canvas', { height: 220 });
  const f2 = x => x.toFixed(2).replace('.', ',');
  function upd() { n = +nI.value; p = +pI.value / 100; const m = n * p, v = n * p * (1 - p); const ks = Array.from({ length: n + 1 }, (_, i) => i); const data = { labels: ks, datasets: [{ label: 'Lý thuyết B(n,p)', data: ks.map(k => binomPmf(n, p, k)), backgroundColor: '#38bdf8aa' }, ...(sim ? [{ label: `Mô phỏng ${sim.t} lần`, data: ks.map(k => (sim.c[k] || 0) / sim.t), backgroundColor: '#e879f9aa' }] : [])] };
    if (!chart) chart = new Chart(cv, { type: 'bar', data, options: { color: '#E2E8F0', maintainAspectRatio: false, plugins: { legend: { labels: { color: '#E2E8F0' } } }, scales: { x: { ticks: { color: '#E2E8F0' }, title: { display: true, text: 'k (số lần thành công)', color: '#E2E8F0' } }, y: { ticks: { color: '#E2E8F0' }, title: { display: true, text: 'P(X = k)', color: '#E2E8F0' } } } } }); else { chart.data = data; chart.update(); }
    cur.innerHTML = mathHtml(`\\(n=${n},\\ p=${f2(p)}\\) → \\(E(X)=np=${f2(m)}\\), \\(\\operatorname{Var}(X)=np(1-p)=${f2(v)}\\)\n**Mục tiêu:** \\(E(X)\\approx ${f2(tm)}\\) và \\(\\operatorname{Var}(X)\\approx ${f2(tv)}\\) (sai số ≤ 0,3).`);
    if (!over && Math.abs(m - tm) <= .3 && Math.abs(v - tv) <= .3) { over = true; fin.append(end(ctx, true, `Đúng rồi! Với \\(E(X)=np\\) và \\(\\operatorname{Var}(X)=np(1-p)\\), ta có \\(1-p=\\frac{\\operatorname{Var}}{E}\\) rồi \\(n=\\frac{E}{p}\\). Phân phối gốc là \\(B(${n0};${f2(p0)})\\).`, 3)); } }
  nI.oninput = pI.oninput = upd;
  const simBtn = h('button', { class: 'btn alt', onclick: () => { const c = {}; for (let i = 0; i < 1000; i++) { let k = 0; for (let j = 0; j < n; j++) if (Math.random() < p) k++; c[k] = (c[k] || 0) + 1; } sim = { c, t: 1000 }; upd(); } }, 'Mô phỏng 1000 lần');
  const el = h('div', {}, h('p', {}, 'Kéo thanh trượt để chỉnh phân phối nhị thức sao cho kỳ vọng và phương sai khớp mục tiêu.'), h('div', { class: 'grid g2' }, h('div', {}, h('label', {}, 'n (số phép thử)'), nI), h('div', {}, h('label', {}, 'p (xác suất thành công)'), pI)), simBtn, cur, h('div', { style: 'position:relative;height:240px;margin-top:8px' }, cv), hintBox(ctx, ['Với \\(X\\sim B(n,p)\\): \\(E(X)=np\\) và \\(\\operatorname{Var}(X)=np(1-p)\\).', 'Chia phương sai cho kỳ vọng: \\(\\frac{\\operatorname{Var}}{E}=1-p\\), từ đó suy ra p.', `Tính \\(p=1-\\frac{${f2(tv)}}{${f2(tm)}}\\) rồi \\(n=\\frac{${f2(tm)}}{p}\\) (làm tròn tới số nguyên gần nhất).`]), fin); setTimeout(upd, 0);
  return { el, destroy: () => chart?.destroy() };
}

const vi = (x, d = 2) => Number(x).toFixed(d).replace('.', ',');
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
// ---------------- Stat Detective (Bayes) ----------------
function detective(ctx) {
  const SUS = [['Anh Alpha', .5], ['Chị Beta', .3], ['Cậu Gamma', .2]];
  const EV = [['👟 Dấu giày cỡ 42 ở hiện trường', [.2, .8, .3]], ['🧤 Tìm thấy chiếc găng tay da', [.3, .7, .2]], ['📹 Camera ghi người dáng gầy lúc 22h', [.6, .5, .1]], ['🖐 Vân tay một phần trên cửa sổ', [.1, .6, .2]]];
  let got = [], over = false;
  const post = () => { const w = SUS.map(([, p], i) => got.reduce((a, k) => a * EV[k][1][i], p)); const t = w.reduce((a, b) => a + b, 0); return w.map(x => x / t); };
  const board = h('div', { class: 'solid', style: 'min-height:70px;border-style:dashed', 'aria-label': 'Bảng bằng chứng' }, 'Kéo thả (hoặc bấm) các bằng chứng vào đây'); const bars = h('div'), tbl = h('div'), fin = h('div');
  const take = k => { if (over || got.includes(k)) return; got.push(k); draw(); };
  const box = h('div', { class: 'row' }, EV.map((e, k) => h('div', { class: 'chip', draggable: 'true', tabindex: 0, role: 'button', style: 'padding:8px 12px;cursor:grab', ondragstart: ev => ev.dataTransfer.setData('text', k), onclick: () => take(k), onkeydown: ev => ev.key === 'Enter' && take(k) }, e[0])));
  board.ondragover = ev => ev.preventDefault(); board.ondrop = ev => { ev.preventDefault(); take(+ev.dataTransfer.getData('text')); };
  function draw() {
    const p = post(); bars.innerHTML = ''; SUS.forEach(([n], i) => bars.append(h('div', { style: 'margin:6px 0' }, h('div', { class: 'row' }, h('b', {}, n), h('span', { class: 'sp' }), h('span', { class: 'mono' }, vi(100 * p[i], 1) + '%')), h('div', { style: 'height:14px;border-radius:8px;background:rgba(255,255,255,.18);overflow:hidden' }, h('div', { style: `height:100%;width:${100 * p[i]}%;background:linear-gradient(90deg,#38bdf8,#e879f9);transition:width .4s` })))));
    tbl.innerHTML = mathHtml(got.length ? `Đã dùng: ${got.map(k => EV[k][0]).join('; ')}.\n\\[P(S_i\\mid E_1,\\dots,E_${got.length})=\\frac{P(S_i)\\prod_j P(E_j\\mid S_i)}{\\sum_k P(S_k)\\prod_j P(E_j\\mid S_k)}\\]` : 'Chưa có bằng chứng: bạn đang dùng **xác suất tiên nghiệm** (50%, 30%, 20%).');
    board.querySelectorAll('.ev').forEach(x => x.remove()); got.forEach(k => board.append(h('div', { class: 'ev muted' }, `${EV[k][0]} → P(E|S) = ${EV[k][1].map(vi).join(' | ')}`)));
  }
  const accuse = i => { if (over) return; const p = post(), top = p.indexOf(Math.max(...p)); over = true;
    if (i === top && p[i] >= .7995) fin.append(end(ctx, true, `Kết luận có cơ sở: hậu nghiệm của **${SUS[i][0]}** là ${vi(100 * p[i], 1)}% sau ${got.length} bằng chứng. Mỗi bằng chứng làm thay đổi xác suất theo công thức Bayes; kết luận chỉ nên đưa ra khi dữ liệu đủ mạnh.`, 3));
    else fin.append(end(ctx, false, i === top ? `**${SUS[i][0]}** có xác suất cao nhất nhưng mới ${vi(100 * p[i], 1)}% (< 80%). Kết luận khi dữ liệu chưa đủ là liều lĩnh – hãy thu thập thêm bằng chứng.` : `**${SUS[top][0]}** mới là người có xác suất hậu nghiệm cao nhất (${vi(100 * p[top], 1)}%), không phải ${SUS[i][0]} (${vi(100 * p[i], 1)}%).`)); };
  const el = h('div', {}, h('p', {}, 'Vụ trộm ở trạm vũ trụ có 3 nghi phạm. Hãy thu thập bằng chứng, theo dõi xác suất hậu nghiệm và chỉ buộc tội khi đủ chắc chắn (≥ 80%).'), box, board, h('div', { class: 'read', style: 'margin:8px 0' }, tbl), bars, h('div', { class: 'row', style: 'margin-top:8px' }, SUS.map(([n], i) => h('button', { class: 'btn hot', onclick: () => accuse(i) }, '⚖️ Buộc tội ' + n))), hintBox(ctx, ['Mỗi bằng chứng nhân thêm \\(P(E\\mid S_i)\\) vào xác suất của từng nghi phạm, rồi chia cho tổng để chuẩn hóa.', 'Hậu nghiệm ∝ tiên nghiệm × tích các khả năng. Bằng chứng nào có \\(P(E\\mid S)\\) chênh nhau lớn giữa các nghi phạm thì có giá trị phân biệt cao.', 'Thử dùng dấu giày và găng tay: Chị Beta đạt khoảng 80%. Thêm vân tay còn tăng cao hơn nữa.']), fin); draw();
  return { el, destroy() { } };
}
// ---------------- Colony Survival (khoảng tin cậy) ----------------
function colony(ctx) {
  let mu; do { mu = +(36 + Math.random() * 18).toFixed(1); } while (Math.abs(mu - 45) < 2); const SIG = 8, T = 45; let budget = 40, data = [], conf = .95, over = false; const Z = { .9: 1.645, .95: 1.96, .99: 2.576 };
  const svg = h('div'), info = h('div', { class: 'read' }), fin = h('div'); const mean = () => data.reduce((a, b) => a + b, 0) / data.length;
  const X = v => 20 + (v - 28) / 32 * 560;
  function draw(reveal) {
    let body = `<svg viewBox="0 0 600 90" width="100%" role="img" aria-label="Khoảng tin cậy so với ngưỡng 45"><line x1="20" y1="55" x2="580" y2="55" stroke="#94a3b8"/>`;
    for (let v = 30; v <= 60; v += 5) body += `<line x1="${X(v)}" y1="50" x2="${X(v)}" y2="60" stroke="#94a3b8"/><text x="${X(v)}" y="78" fill="#E2E8F0" font-size="12" text-anchor="middle">${v}</text>`;
    body += `<line x1="${X(T)}" y1="10" x2="${X(T)}" y2="62" stroke="#fb7185" stroke-dasharray="5 4" stroke-width="2"/><text x="${X(T) + 4}" y="14" fill="#fb7185" font-size="12">ngưỡng 45</text>`;
    if (data.length) { const m = mean(), hw = Z[conf] * SIG / Math.sqrt(data.length), lo = m - hw, hi = m + hw, ok = lo > T || hi < T; body += `<rect x="${X(lo)}" y="46" width="${Math.max(2, X(hi) - X(lo))}" height="18" rx="6" fill="${ok ? '#34d399' : '#fbbf24'}" opacity=".85"/><circle cx="${X(m)}" cy="55" r="6" fill="#fff"/>`; }
    if (reveal) body += `<circle cx="${X(mu)}" cy="55" r="7" fill="none" stroke="#e879f9" stroke-width="3"/><text x="${X(mu)}" y="34" fill="#e879f9" font-size="12" text-anchor="middle">μ thật = ${vi(mu, 1)}</text>`;
    svg.innerHTML = body + '</svg>';
    const n = data.length; if (!n) info.innerHTML = mathHtml(`Ngân sách còn **${budget}** đơn vị (mỗi lần lấy mẫu 5 phần tử tốn 5). Độ lệch chuẩn tổng thể đã biết \\(\\sigma=${SIG}\\). Khu định cư an toàn nếu \\(\\mu\\ge ${T}\\).`);
    else { const m = mean(), hw = Z[conf] * SIG / Math.sqrt(n); info.innerHTML = mathHtml(`\\(n=${n}\\), \\(\\bar{x}=${vi(m)}\\). Khoảng tin cậy ${conf * 100}%:\n\\[\\bar{x}\\pm z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}=${vi(m)}\\pm ${Z[conf]}\\cdot\\frac{${SIG}}{\\sqrt{${n}}}=(${vi(m - hw)};\\ ${vi(m + hw)})\\]\nNgân sách còn **${budget}**.`); }
  }
  const sample = h('button', { class: 'btn', onclick: () => { if (over) return; if (budget < 5) return toast('Hết ngân sách lấy mẫu – hãy ra quyết định.', 'error'); for (let i = 0; i < 5; i++) data.push(+(mu + SIG * gauss()).toFixed(1)); budget -= 5; draw(); if (budget < 5) sample.disabled = true; } }, '🧪 Lấy thêm 5 mẫu (−5)');
  const sel = h('select', { style: 'width:auto', onchange: e => { conf = +e.target.value; draw(); } }, [.9, .95, .99].map(c => h('option', { value: c, selected: c === .95 }, 'Độ tin cậy ' + c * 100 + '%')));
  const decide = safe => { if (over) return; if (!data.length) return toast('Hãy lấy ít nhất một mẫu trước khi quyết định.', 'error'); const m = mean(), hw = Z[conf] * SIG / Math.sqrt(data.length), lo = m - hw, hi = m + hw; const truthSafe = mu >= T, justified = safe ? lo > T : hi < T; over = true; sample.disabled = true; draw(true);
    if (safe === truthSafe && justified) fin.append(end(ctx, true, `Quyết định đúng **và có cơ sở**: khoảng tin cậy (${vi(lo)}; ${vi(hi)}) nằm hẳn ${safe ? 'trên' : 'dưới'} ngưỡng ${T}. Bạn còn dư ngân sách ${budget}. Cỡ mẫu càng lớn thì độ rộng \\(2z\\frac{\\sigma}{\\sqrt{n}}\\) càng nhỏ.`, 3));
    else if (safe === truthSafe) { ctx.win(1); fin.append(h('div', { class: 'result' }, h('h3', {}, '🍀 Đúng nhưng liều (+1 ⭐)'), h('div', { html: mathHtml(`Khoảng tin cậy (${vi(lo)}; ${vi(hi)}) vẫn chứa ngưỡng ${T}, tức dữ liệu chưa đủ để kết luận. Bạn may mắn đúng; ngoài đời đây là rủi ro lớn.`) }), h('div', { class: 'row' }, h('button', { class: 'btn', onclick: ctx.redo }, 'Chơi lại'), h('button', { class: 'btn alt', onclick: ctx.back }, 'Về bản đồ')))); }
    else fin.append(end(ctx, false, `Quyết định sai: μ thật là ${vi(mu, 1)} (${truthSafe ? '≥' : '<'} ${T}). ${justified ? 'Dù khoảng tin cậy đã nằm một phía, vẫn có xác suất ' + (100 - conf * 100) + '% khoảng không chứa μ thật.' : 'Khoảng tin cậy khi đó còn chứa ngưỡng nên chưa đủ cơ sở – hãy lấy thêm mẫu hoặc chấp nhận độ tin cậy cao hơn.'}`)); };
  const el = h('div', {}, h('p', {}, 'Hãy ước lượng mức tài nguyên trung bình μ của hành tinh bằng cách lấy mẫu có ngân sách. Chỉ quyết định khi khoảng tin cậy nằm hẳn một phía của ngưỡng 45.'), h('div', { class: 'row' }, sample, sel, h('button', { class: 'btn hot', onclick: () => decide(true) }, '✅ Lập khu định cư (μ ≥ 45)'), h('button', { class: 'btn alt', onclick: () => decide(false) }, '🚫 Hủy (μ < 45)')), h('div', { class: 'solid', style: 'margin:8px 0' }, svg), info, hintBox(ctx, ['Khoảng tin cậy khi biết σ: \\(\\bar{x}\\pm z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}\\). Lấy thêm mẫu làm khoảng hẹp lại.', 'Đổi độ tin cậy từ 90% lên 99% làm khoảng RỘNG hơn (z lớn hơn) nhưng đáng tin hơn. Hãy cân bằng giữa chi phí và rủi ro.', 'Chỉ quyết định khi cả hai đầu mút cùng lớn hơn 45 (an toàn) hoặc cùng nhỏ hơn 45 (hủy).']), fin); draw();
  return { el, destroy() { } };
}
// ---------------- Reactor Crisis (kiểm định giả thiết) ----------------
function reactor(ctx) {
  const MU0 = 100, SG = 10, N = 25, SE = SG / Math.sqrt(N), ALPHAS = [.05, .01, .1, .05, .01], ZC = { .1: 1.645, .05: 1.96, .01: 2.576 }; let round = 0, good = 0, over = false, timer = null, left = 30, decided = false, rd, alpha = .05;
  const panel = h('div'), fin = h('div'), tbar = h('div', { style: 'height:8px;border-radius:6px;background:linear-gradient(90deg,#34d399,#fb7185);transform-origin:left' });
  const sx = v => 20 + (v - 92) / 16 * 560;
  function curve() { const lim = ZC[alpha] * SE; let pts = '', L = '', R = ''; for (let v = 92; v <= 108.01; v += .2) { const y = 100 - 780 * phiPdf(v, MU0, SE) * 1; const pt = `${sx(v).toFixed(1)},${(110 - 250 * phiPdf(v, MU0, SE) * 1).toFixed(1)} `; pts += pt; if (v <= MU0 - lim) L += pt; if (v >= MU0 + lim) R += pt; }
    const clip = Math.min(108, Math.max(92, rd.xbar)); return `<svg viewBox="0 0 600 130" width="100%" role="img" aria-label="Miền bác bỏ"><polygon points="${L}${sx(MU0 - lim)},110 ${sx(92)},110" fill="#fb7185" opacity=".6"/><polygon points="${R}${sx(108)},110 ${sx(MU0 + lim)},110" fill="#fb7185" opacity=".6"/><polyline points="${pts}" fill="none" stroke="#38bdf8" stroke-width="2.5"/><line x1="20" y1="110" x2="580" y2="110" stroke="#94a3b8"/><line x1="${sx(clip)}" y1="8" x2="${sx(clip)}" y2="110" stroke="#fbbf24" stroke-width="3"/><text x="${sx(clip)}" y="124" fill="#fbbf24" font-size="12" text-anchor="middle">x̄ = ${vi(rd.xbar)}</text><text x="${sx(MU0 - lim) - 4}" y="30" fill="#fecdd3" font-size="11" text-anchor="end">${vi(MU0 - lim)}</text><text x="${sx(MU0 + lim) + 4}" y="30" fill="#fecdd3" font-size="11">${vi(MU0 + lim)}</text></svg>`; }
  function newRound() {
    decided = false; fin.innerHTML = ''; const faulty = Math.random() < .5; const tm = faulty ? MU0 + (Math.random() < .5 ? 1 : -1) * (4 + Math.random() * 4) : MU0; rd = { faulty, xbar: +(tm + SE * gauss()).toFixed(2), need: ALPHAS[round] }; alpha = .05; left = 30; draw(); clearInterval(timer); timer = setInterval(() => { left = Math.max(0, left - 1); tbar.style.transform = `scaleX(${left / 30})`; if (left === 0 && !decided) { tbar.style.animation = 'pulse 1s infinite'; clearInterval(timer); toast('⚠️ Áp suất lò tăng! Hãy quyết định (không bị trừ điểm).', 'error', 4000); } }, 1000); }
  function draw() {
    panel.innerHTML = ''; const z = (rd.xbar - MU0) / SE, zc = ZC[alpha], p = 2 * (1 - Phi(Math.abs(z)));
    const sl = h('div', { class: 'row' }, h('b', {}, 'Mức ý nghĩa α:'), [.01, .05, .1].map(a => h('button', { class: 'tab' + (alpha === a ? ' on' : ''), disabled: decided, onclick: () => { alpha = a; draw(); } }, 'α = ' + vi(a))));
    panel.append(h('div', { class: 'row' }, h('b', {}, `Vòng ${round + 1}/5`), h('span', { class: 'chip' }, `Quy định vòng này: α = ${vi(rd.need)}`), h('span', { class: 'chip' }, `Đúng: ${good}`)), tbar, h('div', { class: 'read', style: 'margin:8px 0', html: mathHtml(`Giả thiết \\(H_0:\\mu=${MU0}\\) (lò bình thường), \\(H_1:\\mu\\ne ${MU0}\\). Biết \\(\\sigma=${SG}\\), \\(n=${N}\\) nên \\(\\sigma_{\\bar{x}}=\\frac{${SG}}{\\sqrt{${N}}}=${SE}\\). Đo được \\(\\bar{x}=${vi(rd.xbar)}\\).`) }), sl, h('div', { class: 'solid', style: 'margin:8px 0', html: curve() }),
      h('div', { class: 'read', html: mathHtml(`Thống kê: \\(z=\\frac{\\bar{x}-\\mu_0}{\\sigma/\\sqrt{n}}=${vi(z)}\\). Miền bác bỏ: \\(|z|>z_{\\alpha/2}=${ZC[alpha]}\\). Giá trị p \\(=${p < .0001 ? '<0{,}0001' : vi(p, 4)}\\).`) }),
      h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn hot', disabled: decided, onclick: () => decide(true) }, '🛑 Bác bỏ H₀ – dừng lò'), h('button', { class: 'btn', disabled: decided, onclick: () => decide(false) }, '▶️ Không bác bỏ H₀ – tiếp tục chạy')));
  }
  function decide(reject) {
    decided = true; clearInterval(timer); const z = (rd.xbar - MU0) / SE, ruleReject = Math.abs(z) > ZC[rd.need]; const okAlpha = alpha === rd.need, ok = okAlpha && reject === ruleReject; if (ok) good++; draw();
    const truth = rd.faulty ? 'lò THỰC SỰ đang lệch' : 'lò THỰC SỰ bình thường'; const err = reject && !rd.faulty ? ' → đây là **sai lầm loại I** (bác bỏ H₀ đúng).' : !reject && rd.faulty ? ' → đây là **sai lầm loại II** (không bác bỏ H₀ sai).' : '';
    const m = h('div', { class: 'result' }, h('div', { html: mathHtml(`${ok ? '✅ Bạn áp dụng đúng quy tắc.' : !okAlpha ? `❌ Bạn chưa đặt đúng α = ${vi(rd.need)} theo quy định.` : '❌ Quyết định không khớp quy tắc miền bác bỏ.'} Với \\(\\alpha=${vi(rd.need)}\\): \\(|z|=${vi(Math.abs(z))}\\) ${ruleReject ? '>' : '≤'} \\(${ZC[rd.need]}\\) nên ${ruleReject ? '**bác bỏ**' : '**không bác bỏ**'} \\(H_0\\). Thực tế: ${truth}${err}`) }));
    round++; if (round >= 5) { over = true; m.append(end(ctx, good >= 4, `Bạn áp dụng đúng quy tắc ở ${good}/5 vòng. Lưu ý: dù làm đúng quy tắc vẫn có thể mắc sai lầm loại I hoặc II vì mẫu ngẫu nhiên; giảm α làm giảm sai lầm loại I nhưng tăng nguy cơ loại II.`, 3)); } else m.append(h('div', { class: 'row' }, h('button', { class: 'btn', onclick: newRound }, 'Vòng tiếp theo →'))); fin.append(m);
  }
  const el = h('div', {}, h('p', {}, 'Lò phản ứng cần kiểm tra mỗi vòng: đặt đúng mức ý nghĩa theo quy định, đọc miền bác bỏ rồi quyết định. Đồng hồ chỉ tạo áp lực, không trừ điểm.'), panel, fin, hintBox(ctx, ['Tính \\(z=\\frac{\\bar{x}-\\mu_0}{\\sigma/\\sqrt{n}}\\) rồi so với giá trị tới hạn \\(z_{\\alpha/2}\\).', 'α nhỏ thì \\(z_{\\alpha/2}\\) lớn: α = 0,10 → 1,645; α = 0,05 → 1,96; α = 0,01 → 2,576, miền bác bỏ thu hẹp.', 'Bác bỏ \\(H_0\\) khi \\(|z|>z_{\\alpha/2}\\) (hoặc khi giá trị p < α).'])); newRound();
  return { el, destroy: () => clearInterval(timer) };
}
