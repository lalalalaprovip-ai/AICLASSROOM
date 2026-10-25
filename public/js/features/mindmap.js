// Bản đồ tư duy: AI sinh sơ đồ (JSON) hoặc dùng sơ đồ có sẵn theo 7 chương; lưu cho tài khoản đã đăng nhập.
import { h, toast, busy } from '../services/ui.js';
import { mathHtml } from '../services/math.js';
import { gen, parseJSON, aiReady, friendly, PERSONA } from '../services/ai.js';
import { sb, S } from '../services/supa.js';
import { CHAPTERS } from '../config.js';

const T = (t, ...c) => ({ t, c });
const BUILTIN = [
  T('Chương 1: Xác suất', T('Biến cố', T('Giao, hợp, đối \\(A\\cap B,\\ A\\cup B,\\ \\overline{A}\\)'), T('Xung khắc, độc lập, đầy đủ')), T('Định nghĩa xác suất', T('Cổ điển \\(P(A)=\\frac{m}{n}\\)'), T('Thống kê (tần suất)')), T('Công thức', T('Cộng \\(P(A\\cup B)=P(A)+P(B)-P(AB)\\)'), T('Nhân và xác suất có điều kiện'), T('Xác suất toàn phần'), T('Bayes \\(P(A_i\\mid B)\\)')), T('Giải tích tổ hợp', T('Hoán vị, chỉnh hợp, tổ hợp'))),
  T('Chương 2: Biến ngẫu nhiên', T('Rời rạc', T('Bảng phân phối xác suất'), T('Hàm phân phối \\(F(x)=P(X\\le x)\\)')), T('Liên tục', T('Hàm mật độ \\(f(x)\\ge 0,\\ \\int f=1\\)'), T('Hàm phân phối \\(F(x)\\)')), T('Đặc trưng số', T('Kỳ vọng \\(E(X)\\)'), T('Phương sai \\(\\operatorname{Var}(X)=E(X^2)-[E(X)]^2\\)'), T('Độ lệch chuẩn, mốt, trung vị'))),
  T('Chương 3: Phân phối thông dụng', T('Nhị thức \\(B(n,p)\\)', T('\\(E=np,\\ \\operatorname{Var}=np(1-p)\\)')), T('Poisson \\(P(\\lambda)\\)', T('\\(E=\\operatorname{Var}=\\lambda\\)')), T('Siêu bội'), T('Chuẩn \\(N(\\mu,\\sigma^2)\\)', T('Chuẩn hóa \\(Z=\\frac{X-\\mu}{\\sigma}\\)'), T('Hàm \\(\\Phi(z)\\), Laplace \\(\\Phi_0(z)\\)')), T('Khi bình phương, Student, Fisher')),
  T('Chương 4: Mẫu ngẫu nhiên', T('Mẫu và tổng thể'), T('Trung bình mẫu \\(\\bar{x}\\)'), T('Phương sai mẫu hiệu chỉnh \\(s^2\\)', T('\\(s^2=\\frac{1}{n-1}\\sum(x_i-\\bar{x})^2\\)')), T('Tỉ lệ mẫu \\(\\hat{p}\\)'), T('Phân phối của các thống kê mẫu')),
  T('Chương 5: Ước lượng khoảng', T('Trung bình', T('Biết \\(\\sigma\\): dùng \\(z_{\\alpha/2}\\)'), T('Chưa biết \\(\\sigma\\): dùng \\(t_{n-1,\\alpha/2}\\)')), T('Tỉ lệ \\(\\hat{p}\\pm z_{\\alpha/2}\\sqrt{\\frac{\\hat{p}(1-\\hat{p})}{n}}\\)'), T('Phương sai (\\(\\chi^2\\))'), T('Xác định cỡ mẫu \\(n\\)')),
  T('Chương 6: Kiểm định giả thiết', T('Cặp giả thiết \\(H_0,\\ H_1\\)'), T('Sai lầm loại I (\\(\\alpha\\)) và loại II (\\(\\beta\\))'), T('Thống kê kiểm định và miền bác bỏ'), T('Giá trị p: bác bỏ khi \\(p<\\alpha\\)'), T('Các dạng: trung bình, tỉ lệ, phương sai')),
  T('Chương 7: So sánh 2 tham số', T('Hai trung bình', T('Biết hai \\(\\sigma\\)'), T('Chưa biết: Student')), T('Hai tỉ lệ \\(p_1-p_2\\)'), T('Hai phương sai (Fisher \\(F\\))'), T('Mẫu ghép cặp'))
];
const norm = (n, d = 0) => ({ t: String(n?.t ?? n?.title ?? '').slice(0, 140), c: d >= 3 ? [] : (Array.isArray(n?.c) ? n.c : Array.isArray(n?.children) ? n.children : []).slice(0, 8).map(x => norm(x, d + 1)) });
function tree(n, d = 0) {
  const kids = h('ul', { class: 'mm-ul' }); n.c.forEach(c => kids.append(tree(c, d + 1)));
  const box = h('div', { class: 'mm-node d' + Math.min(d, 3), role: n.c.length ? 'button' : null, tabindex: n.c.length ? 0 : null, 'aria-expanded': n.c.length ? 'true' : null, html: mathHtml(n.t) });
  const toggle = () => { const open = kids.style.display !== 'none'; kids.style.display = open ? 'none' : ''; box.setAttribute('aria-expanded', !open); box.dataset.closed = open ? '1' : ''; };
  if (n.c.length) { box.onclick = toggle; box.onkeydown = e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle()); }
  return h('li', {}, box, n.c.length ? kids : null);
}
const asText = (n, d = 0) => '  '.repeat(d) + '- ' + n.t + '\n' + n.c.map(c => asText(c, d + 1)).join('');
export function mindmapView(root, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); let cur = null; const out = h('div', { class: 'read', style: 'margin-top:12px;display:none' }); const saved = h('div');
  const topic = h('input', { placeholder: 'Chủ đề, ví dụ: Kiểm định giả thiết về trung bình', value: sessionStorage.getItem('sv_mm_topic') || '' }); sessionStorage.removeItem('sv_mm_topic');
  const chap = h('select', { style: 'width:auto' }, h('option', { value: '' }, 'Sơ đồ có sẵn theo chương…'), CHAPTERS.map((c, i) => h('option', { value: i }, `Chương ${i + 1}: ${c}`)));
  const show = n => { cur = n; out.style.display = ''; out.innerHTML = ''; out.append(h('ul', { class: 'mm-ul mm-root' }, tree(n))); };
  chap.onchange = () => { if (chap.value !== '') { show(BUILTIN[+chap.value]); topic.value = ''; } };
  const gbtn = h('button', { class: 'btn hot', onclick: async () => {
    const q = topic.value.trim(); if (!q) return toast('Hãy nhập chủ đề hoặc chọn một chương có sẵn.', 'error'); if (!aiReady()) return toast('Chưa kết nối AI nên chưa sinh được. Bạn vẫn dùng được sơ đồ có sẵn theo chương.', 'error', 5000);
    busy(gbtn, true, 'AI đang vẽ…');
    try { const j = parseJSON(await gen({ system: PERSONA + '\nChỉ dùng kiến thức Xác suất Thống kê đại học.', user: `Tạo bản đồ tư duy cho chủ đề: "${q}".\nTrả về DUY NHẤT JSON hợp lệ dạng {"t":"tên nút gốc","c":[{"t":"...","c":[...]}]}; tối đa 3 cấp con, mỗi nút tối đa 6 nút con, nhãn ngắn gọn. Công thức đặt trong \\\\( ... \\\\) (nhớ nhân đôi dấu \\ trong JSON). Không bịa kiến thức.`, json: true, temperature: .4 })); const n = norm(j); if (!n.t || !n.c.length) throw new Error('Sơ đồ rỗng'); show(n); } catch (e) { toast(friendly(e), 'error', 6000); } finally { busy(gbtn, false); } } }, '✨ AI vẽ bản đồ');
  const save = async () => { if (!cur) return toast('Chưa có sơ đồ để lưu.', 'error'); if (!S.user) return toast('Khách không lưu được bản đồ tư duy. Hãy đăng nhập.', 'error'); const { error } = await sb.from('mindmaps').insert({ user_id: S.user.id, title: cur.t.slice(0, 120), data: cur }); toast(error ? 'Không lưu được: ' + error.message : 'Đã lưu bản đồ tư duy', error ? 'error' : 'ok'); if (!error) list(); };
  async function list() { saved.innerHTML = ''; if (!S.user) return saved.append(h('p', { class: 'muted' }, 'Đăng nhập để lưu và xem lại bản đồ của bạn.')); const { data } = await sb.from('mindmaps').select('id,title,data,created_at').order('created_at', { ascending: false }).limit(20); if (!data?.length) return saved.append(h('p', { class: 'muted' }, 'Chưa có bản đồ nào được lưu.')); data.forEach(m => saved.append(h('div', { class: 'row solid', style: 'margin:4px 0' }, h('span', { class: 'sp', html: mathHtml(m.title) }), h('button', { class: 'btn sm', onclick: () => show(m.data) }, 'Mở'), h('button', { class: 'btn alt sm', onclick: async () => { await sb.from('mindmaps').delete().eq('id', m.id); list(); } }, 'Xóa')))); }
  box.append(h('div', { class: 'glass' }, h('div', { class: 'row' }, h('h2', { class: 'sp' }, '🗺 Bản đồ tư duy'), h('button', { class: 'btn alt', onclick: () => go('/home') }, 'Trang chủ')), h('p', {}, 'Hệ thống hóa kiến thức: chọn chương có sẵn (không cần AI) hoặc nhập chủ đề để AI vẽ. Bấm vào nút để thu gọn/mở rộng nhánh.'), topic, h('div', { class: 'row', style: 'margin-top:8px' }, gbtn, chap, h('button', { class: 'btn alt', onclick: save }, '💾 Lưu'), h('button', { class: 'btn alt', onclick: () => { if (cur) { navigator.clipboard?.writeText(asText(cur)); toast('Đã sao chép dạng văn bản', 'ok'); } } }, 'Sao chép')), out), h('div', { class: 'glass', style: 'margin-top:12px' }, h('h3', {}, 'Bản đồ đã lưu'), saved));
  show(BUILTIN[0]); list(); return () => { };
}
