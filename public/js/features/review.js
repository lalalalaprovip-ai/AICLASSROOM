import { h, toast } from '../services/ui.js';
import { getLogs } from '../services/store.js';
import { CHAPTERS, ERROR_LABELS } from '../config.js';
import { gen, aiReady, friendly, PERSONA } from '../services/ai.js';
import { mathHtml } from '../services/math.js';
import { mathInput } from '../components.js';
import { addLog } from '../services/store.js';
import { S } from '../services/supa.js';

const cat = r => r === 'dung' ? 'ok' : r === 'sai' ? 'bad' : 'hint';
const day = d => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
export function reviewView(root, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); const charts = []; let period = '7', src = '', chap = '';
  const body = h('div');
  box.append(h('div', { class: 'glass' }, h('h2', {}, 'Ôn tập – Theo dõi hành trình học tập'), h('p', {}, 'Nhìn lại những gì bạn đã học, nhận biết lỗi sai và xác định kiến thức cần ôn tập tiếp theo.'),
    h('div', { class: 'row' }, sel([['1', 'Hôm nay'], ['7', '7 ngày'], ['30', '30 ngày'], ['all', 'Tất cả']], '7', v => { period = v; draw(); }), sel([['', 'Mọi nguồn'], ['bai_tap', 'Bài tập'], ['van_dap', 'Vấn đáp'], ['tu_luan', 'Tự luận'], ['tro_choi', 'Trò chơi']], '', v => { src = v; draw(); }), sel([['', 'Mọi chương'], ...CHAPTERS.map((c, i) => [String(i + 1), 'Chương ' + (i + 1)])], '', v => { chap = v; draw(); }),
      h('button', { class: 'btn', onclick: () => oral(body) }, '🎙 Vấn đáp lý thuyết'), h('button', { class: 'btn alt', onclick: () => go('/mindmap') }, '🗺 Bản đồ tư duy'), h('button', { class: 'btn alt', onclick: () => go('/home') }, 'Quay về trang chủ'))), body);
  function sel(opts, val, on) { return h('select', { style: 'width:auto', onchange: e => on(e.target.value) }, opts.map(([v, l]) => h('option', { value: v, selected: v === val }, l))); }
  async function draw() {
    charts.splice(0).forEach(c => c.destroy()); body.innerHTML = '<p class="muted">Đang tải…</p>';
    let logs = await getLogs();     const start = period === 'all' ? 0 : +period === 1 ? new Date().setHours(0, 0, 0, 0) : Date.now() - +period * 864e5;
    logs = logs.filter(l => new Date(l.created_at) >= start && (!src || l.source === src) && (!chap || String(l.chapter) === chap));
    body.innerHTML = '';
    if (S.guest) body.append(h('div', { class: 'solid', style: 'margin-top:12px' }, 'Bạn đang dùng tài khoản khách: nhật ký chỉ lưu trong phiên này và mất khi đóng trình duyệt.'));
    if (!logs.length) return body.append(h('div', { class: 'glass', style: 'margin-top:12px;text-align:center' }, h('h3', {}, 'Chưa có dữ liệu học tập'), h('p', {}, 'Hãy giải một bài, chơi một trò chơi hoặc làm vấn đáp – biểu đồ sẽ xuất hiện ở đây. Mình không bịa số liệu.'), h('button', { class: 'btn hot', onclick: () => go('/solve') }, 'Giải bài ngay')));
    const total = logs.length, ok = logs.filter(l => cat(l.result) === 'ok').length, bad = logs.filter(l => cat(l.result) === 'bad').length, hint = total - ok - bad;
    const byErr = {}; logs.forEach(l => l.error_label && (byErr[l.error_label] = (byErr[l.error_label] || 0) + 1));
    const byCh = {}; logs.forEach(l => { if (l.chapter) { const o = (byCh[l.chapter] ||= { ok: 0, n: 0 }); o.n++; if (cat(l.result) === 'ok') o.ok++; } });
    const weak = Object.entries(byCh).map(([c, o]) => [c, o.ok / o.n, o.n]).sort((a, b) => a[1] - b[1])[0]; const topErr = Object.entries(byErr).sort((a, b) => b[1] - a[1])[0];
    body.append(h('div', { class: 'grid g3', style: 'margin-top:12px' },
      h('div', { class: 'glass' }, h('h3', {}, '📅 Hôm nay bạn đã học gì?'), h('p', {}, `${total} hoạt động · ✅ ${ok} đúng · 💡 ${hint} cần gợi ý · ❌ ${bad} sai`), h('div', { class: 'muted' }, [...new Set(logs.slice(-5).map(l => l.topic).filter(Boolean))].join(' • '))),
      h('div', { class: 'glass' }, h('h3', {}, '🔍 Bạn thường sai ở đâu?'), topErr ? h('p', {}, `Nhiều nhất: ${topErr[0]} (${topErr[1]} lần).`) : h('p', { class: 'muted' }, 'Chưa ghi nhận lỗi sai nào.'), h('div', {}, Object.entries(byErr).map(([k, v]) => h('span', { class: 'chip' }, `${k}: ${v}`)))),
      h('div', { class: 'glass' }, h('h3', {}, '🎯 Bạn nên ôn tập gì?'), weak ? [h('p', {}, `Chương ${weak[0]}: ${CHAPTERS[weak[0] - 1]} (đúng ${Math.round(weak[1] * 100)}% trong ${weak[2]} bài).`), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => go('/solve') }, 'Làm bài ngay'), h('button', { class: 'btn alt sm', onclick: () => go('/games') }, 'Ôn qua trò chơi'))] : h('p', { class: 'muted' }, 'Cần thêm bài có gắn chương để đề xuất.'))));
    const mk = (title, sub) => { const c = h('canvas', { height: 220 }); body.lastChild.append(h('div', { class: 'glass' }, h('h3', {}, title), h('div', { class: 'muted' }, sub), c)); return c; };
    const grid = h('div', { class: 'grid g2', style: 'margin-top:12px' }); body.append(grid);
    const days = [...new Set(logs.map(l => day(l.created_at)))]; const per = d => logs.filter(l => day(l.created_at) === d);
    const add = (title, sub, cfg) => { const c = h('canvas', { height: 230 }); grid.append(h('div', { class: 'glass' }, h('h3', {}, title), h('div', { class: 'muted' }, sub), h('div', { style: 'position:relative;height:260px' }, c))); const ch = new Chart(c, { ...cfg, options: { maintainAspectRatio: false, responsive: true, color: '#E2E8F0', plugins: { legend: { labels: { color: '#E2E8F0' } } }, ...cfg.options } }); charts.push(ch); };
    const ax = t => ({ ticks: { color: '#E2E8F0' }, grid: { color: 'rgba(255,255,255,.12)' }, title: t ? { display: true, text: t, color: '#E2E8F0' } : undefined });
    add('Tỉ lệ đúng theo thời gian', 'Đơn vị: % số hoạt động đúng mỗi ngày', { type: 'line', data: { labels: days, datasets: [{ label: '% đúng', data: days.map(d => Math.round(100 * per(d).filter(l => cat(l.result) === 'ok').length / per(d).length)), borderColor: '#38bdf8', backgroundColor: '#38bdf855', tension: .3, fill: true }] }, options: { scales: { x: ax('Ngày'), y: { ...ax('%'), min: 0, max: 100 } } } });
    add('Đúng / cần gợi ý / sai', 'Đơn vị: số hoạt động mỗi ngày', { type: 'bar', data: { labels: days, datasets: [['Đúng', 'ok', '#34d399'], ['Cần gợi ý', 'hint', '#fbbf24'], ['Sai', 'bad', '#fb7185']].map(([n, k, c]) => ({ label: n, backgroundColor: c, data: days.map(d => per(d).filter(l => cat(l.result) === k).length) })) }, options: { scales: { x: { ...ax('Ngày'), stacked: true }, y: { ...ax('Số bài'), stacked: true } } } });
    const chs = Object.keys(byCh).sort(); if (chs.length) add('Kết quả theo chương', 'Đơn vị: % đúng theo chương', { type: 'bar', data: { labels: chs.map(c => 'Chương ' + c), datasets: [{ label: '% đúng', backgroundColor: '#8b5cf6', data: chs.map(c => Math.round(100 * byCh[c].ok / byCh[c].n)) }] }, options: { indexAxis: 'y', scales: { x: { ...ax('%'), min: 0, max: 100 }, y: ax() } } });
    if (Object.keys(byErr).length) add('Các loại lỗi sai', 'Tỉ trọng từng nhãn lỗi (tổng 100%)', { type: 'doughnut', data: { labels: Object.keys(byErr), datasets: [{ data: Object.values(byErr), backgroundColor: ['#38bdf8', '#e879f9', '#fbbf24', '#34d399', '#fb7185', '#a78bfa'] }] } });
    const vd = logs.filter(l => l.source === 'van_dap' && l.note); if (vd.length) add('Điểm vấn đáp theo thời gian', 'Đơn vị: điểm /10', { type: 'line', data: { labels: vd.map(l => day(l.created_at)), datasets: [{ label: 'Điểm', data: vd.map(l => +l.note), borderColor: '#e879f9', tension: .3 }] }, options: { scales: { x: ax('Ngày'), y: { ...ax('Điểm'), min: 0, max: 10 } } } });
    const lv = [0, 1, 2, 3].map(k => logs.filter(l => (l.hint_level || 0) === k).length); add('Mức độ tự lập', 'Số bài theo mức hỗ trợ đã dùng (0 = tự làm)', { type: 'bar', data: { labels: ['Tự làm', 'Gợi ý 1', 'Gợi ý 2', 'Xem lời giải'], datasets: [{ label: 'Số bài', backgroundColor: '#0ea5e9', data: lv }] }, options: { scales: { x: ax(), y: ax('Số bài') } } });
    body.append(h('div', { class: 'glass', style: 'margin-top:12px' }, h('h3', {}, 'Lịch sử gần đây'), h('div', { style: 'overflow:auto' }, h('table', { class: 'table' }, h('tr', {}, ['Thời gian', 'Nguồn', 'Chủ đề', 'Kết quả', 'Lỗi'].map(x => h('th', {}, x))), logs.slice(-15).reverse().map(l => h('tr', {}, h('td', {}, new Date(l.created_at).toLocaleString('vi-VN')), h('td', {}, l.source), h('td', {}, l.topic || ''), h('td', {}, { dung: '✅ Đúng', sai: '❌ Sai', can_goi_y: '💡 Cần gợi ý', xem_loi_giai: '📘 Xem lời giải' }[l.result] || l.result), h('td', {}, l.error_label || '')))))));
  }
  draw(); return () => charts.forEach(c => c.destroy());
}
// Vấn đáp lý thuyết: AI hỏi, người học trả lời (gõ hoặc nói), AI chấm
function oral(body) {
  body.innerHTML = ''; if (!aiReady()) return body.append(h('div', { class: 'glass', style: 'margin-top:12px' }, 'Vấn đáp cần AI. Hãy nhập khóa ở nút "🔑 Khóa AI" trên thanh điều hướng.'));
  const wrap = h('div', { class: 'glass', style: 'margin-top:12px' }); body.append(wrap); let n = 0, scores = [], q = '', ch = 1;
  const ask = async () => {
    wrap.innerHTML = '<p class="muted">⏳ AI đang chọn câu hỏi…</p>'; ch = 1 + Math.floor(Math.random() * 7);
    try { q = await gen({ system: PERSONA, user: `Hãy hỏi MỘT câu vấn đáp lý thuyết ngắn thuộc Chương ${ch} (${CHAPTERS[ch - 1]}) môn Xác suất Thống kê đại học. Chỉ viết câu hỏi, không kèm đáp án.`, temperature: .9 }); } catch (e) { wrap.innerHTML = ''; return wrap.append(h('span', { class: 'err' }, friendly(e))); }
    const mi = mathInput({ placeholder: 'Trả lời bằng chữ hoặc bấm 🎤 để nói…', rows: 4 }); const out = h('div');
    const btn = h('button', { class: 'btn hot', onclick: async () => { if (!mi.value.trim()) return; btn.disabled = true; out.innerHTML = '⏳ Đang chấm…'; try { const r = await gen({ system: PERSONA, user: `Câu hỏi: ${q}\nCâu trả lời của sinh viên: ${mi.value}\nChấm công bằng trên thang 10. Dòng đầu tiên chỉ ghi "ĐIỂM: x" (x từ 0 đến 10). Sau đó nhận xét: đúng gì, thiếu/sai gì (gắn nhãn lỗi trong ${ERROR_LABELS.join(', ')} nếu sai), và gợi ý ôn. Không nịnh.`, temperature: .2 }); const m = /ĐIỂM:\s*(\d+(?:[.,]\d+)?)/i.exec(r); const sc = m ? Math.min(10, +m[1].replace(',', '.')) : null; out.innerHTML = ''; out.append(h('div', { class: 'read', html: mathHtml(r.replace(/ĐIỂM:.*\n?/i, '')) }), h('div', { class: 'result' }, sc == null ? 'Không đọc được điểm.' : `Điểm: ${sc}/10`)); if (sc != null) { scores.push(sc); addLog({ source: 'van_dap', topic: q.slice(0, 80), chapter: ch, result: sc >= 7 ? 'dung' : sc >= 4 ? 'can_goi_y' : 'sai', note: String(sc) }); } out.append(h('div', { class: 'row', style: 'margin-top:8px' }, ++n < 5 ? h('button', { class: 'btn', onclick: ask }, 'Câu tiếp theo') : h('b', {}, `Hoàn thành 5 câu – điểm trung bình ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}/10`))); mi.destroy(); } catch (e) { out.innerHTML = ''; out.append(h('span', { class: 'err' }, friendly(e))); btn.disabled = false; } } }, 'Nộp câu trả lời');
    wrap.innerHTML = ''; wrap.append(h('h3', {}, `Câu ${n + 1}/5 – Chương ${ch}`), h('div', { class: 'read', html: mathHtml(q) }), mi.el, h('div', { class: 'row', style: 'margin-top:8px' }, btn), out);
  }; ask();
}
