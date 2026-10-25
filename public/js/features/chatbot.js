import { h, toast } from '../services/ui.js';
import { mathHtml } from '../services/math.js';
import { Listener, canListen, speak, stopSpeak } from '../services/speech.js';
import { gen, aiReady, friendly, PERSONA } from '../services/ai.js';
import { SITE_GUIDE, findGuide, CHIPS } from '../data/siteGuide.js';

const hist = []; // lịch sử trong phiên
let lis = null, panel, log, input, fab, nav = () => { }, chipBox, hidden = false;
const SYS = () => PERSONA + `
Bạn là chatbot nổi ở góc phải của AI Classroom. Bạn trò chuyện tự nhiên, thân thiện và trả lời MỌI câu hỏi liên quan đến TOÁN HỌC (đại số, giải tích, hình học, xác suất, thống kê, toán rời rạc…) kể cả giải thích khái niệm, giải bài tập và cách học toán. Câu hỏi không liên quan toán hoặc cách dùng website thì từ chối lịch sự và mời quay lại toán.
Mặc định trả lời NGẮN (tối đa khoảng 4 câu, nêu ý chính, công thức chính, điều kiện áp dụng); nếu người dùng nhờ giải bài hoặc "giải thích kỹ hơn" thì trình bày từng bước đầy đủ (tối đa khoảng 10 câu giải thích hoặc các bước cần thiết).
Hướng dẫn dùng website CHỈ dựa trên bảng sau, không bịa tính năng: ${JSON.stringify(SITE_GUIDE.map(g => ({ name: g.name, steps: g.steps, available: g.available })))}`;

export function mountChatbot(go) {
  nav = go; const root = document.getElementById('chatbot-root');
  fab = h('button', { id: 'cb-fab', 'aria-label': 'Mở chatbot hỏi nhanh', onclick: toggle }, '💬');
  log = h('div', { id: 'cb-log', role: 'log', 'aria-live': 'polite' });
  input = h('textarea', { maxlength: 500, rows: 1, placeholder: 'Hỏi về toán hoặc cách dùng web…', style: 'min-height:44px;resize:none', onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } } });
  chipBox = h('div');
  const micBtn = h('button', { class: 'btn alt sm', title: 'Nói bằng micro (không tự tắt)', onclick: () => micToggle(micBtn) }, '🎤');
  panel = h('div', { id: 'cb-panel', class: 'glass', role: 'dialog', 'aria-label': 'Chatbot hỏi nhanh' },
    h('div', { class: 'row' }, h('b', { class: 'sp' }, 'Hỏi nhanh'), h('button', { class: 'btn alt sm', onclick: () => { hist.length = 0; log.innerHTML = ''; greet(); } }, 'Xóa'), h('button', { class: 'btn alt sm', onclick: toggle, 'aria-label': 'Đóng' }, '✕')),
    log, chipBox, h('div', { class: 'row', style: 'flex-wrap:nowrap' }, input, canListen() ? micBtn : null, h('button', { class: 'btn sm', onclick: send }, 'Gửi')));
  root.append(fab, panel); greet(); chips('default');
}
export const chatbotVisible = v => { hidden = !v; if (fab) fab.style.display = v ? '' : 'none'; if (!v) panel?.classList.remove('open'); };
export function chatbotRoute(path) { chips(CHIPS[path] ? path : 'default'); }
function toggle() { panel.classList.toggle('open'); if (!panel.classList.contains('open')) { lis?.stop(); stopSpeak(); } else input.focus(); }
function chips(k) { chipBox.innerHTML = ''; (CHIPS[k] || CHIPS.default).forEach(c => chipBox.append(h('span', { class: 'chip', onclick: () => { input.value = c; send(); } }, c))); }
function bubble(txt, me, extra) { const b = h('div', { class: 'cb-m' + (me ? ' me' : '') }); if (me) b.textContent = txt; else b.innerHTML = mathHtml(txt); if (extra) b.append(extra); log.append(b); log.scrollTop = log.scrollHeight; return b; }
function greet() { bubble('Chào bạn! Mình trả lời nhanh mọi câu hỏi về toán và hướng dẫn dùng AI Classroom. Bạn muốn hỏi gì?'); }
function micToggle(b) {
  if (lis?.active) { lis.stop(); return; }
  lis = new Listener({ onText: (t, i) => { input.value = (t + i).slice(0, 500); }, onState: s => { b.classList.toggle('mic-on', s === 'listening'); b.textContent = s === 'listening' ? '⏹' : '🎤'; }, onError: (c, m) => toast(m, 'error', 5000) }); lis.start(input.value);
}
async function send() {
  const q = input.value.trim(); if (!q) return; lis?.stop(); input.value = ''; bubble(q, true);
  const guides = findGuide(q).filter(g => /ở đâu|cách|làm sao|hướng dẫn|dùng|mở|chức năng|bấm/i.test(q) || q.length < 30);
  if (guides.length && /ở đâu|cách|làm sao|hướng dẫn|dùng|mở|bấm|chức năng/i.test(q)) {
    const g = guides[0];
    const body = g.available ? `**${g.name}** – ${g.purpose}.\n` + g.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : `Chức năng **${g.name}** hiện chưa khả dụng.`;
    return bubble(body, false, g.available ? h('div', { class: 'row', style: 'margin-top:6px' }, h('button', { class: 'btn sm', onclick: () => { nav(g.route); toggle(); } }, 'Mở ' + g.name)) : null);
  }
  if (!aiReady()) return bubble('Mình chưa trả lời được câu này vì chưa kết nối AI. Hãy bấm "🔑 Khóa AI" trên thanh điều hướng để nhập khóa nhé. Phần hướng dẫn dùng web vẫn hoạt động (ví dụ hỏi "Giải bài ở đâu?").');
  const wait = bubble('⏳ Đang trả lời…');
  try {
    hist.push({ role: 'user', parts: [{ text: q }] }); const ctx = hist.slice(-20);
    const t = await gen({ system: SYS(), contents: ctx, temperature: .4 }); hist.push({ role: 'model', parts: [{ text: t }] }); wait.remove();
    const row = h('div', { class: 'row', style: 'margin-top:6px' }, h('button', { class: 'btn alt sm', onclick: () => speak(t, { onWarn: m => toast(m, 'info', 6000) }) }, '🔊 Nghe'), h('button', { class: 'btn alt sm', onclick: () => { input.value = 'Giải thích kỹ hơn, từng bước, có ví dụ số.'; send(); } }, 'Giải thích kỹ hơn'), h('button', { class: 'btn alt sm', onclick: () => { input.value = 'Cho mình một ví dụ số đơn giản.'; send(); } }, 'Cho ví dụ'));
    if (q.length > 220) row.append(h('button', { class: 'btn alt sm', onclick: () => { nav('/solve'); toggle(); } }, 'Mở Giải bài'));
    bubble(t, false, row);
  } catch (e) { wait.remove(); bubble('⚠️ ' + friendly(e), false, h('button', { class: 'btn sm', onclick: () => { input.value = q; send(); } }, 'Thử lại')); hist.pop(); }
}
