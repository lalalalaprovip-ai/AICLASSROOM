import { h, debounce, toast } from './services/ui.js';
import { renderMath } from './services/math.js';
import { Listener, canListen, speak, stopSpeak } from './services/speech.js';
import { spokenToMath } from './services/math.js';

export const SYM_PAGES = [
  ['1 · Cơ bản', [['a/b', '\\frac{a}{b}'], ['√', '\\sqrt{x}'], ['x²', 'x^2'], ['xᵢ', 'x_i'], ['Σ', '\\sum_{i=1}^{n}x_i'], ['∫', '\\int_a^b f(x)\\,dx'], ['≤', '\\le '], ['≥', '\\ge '], ['≠', '\\ne '], ['≈', '\\approx '], ['±', '\\pm '], ['·', '\\cdot '], ['( )', '\\left( \\right)'], ['x̄', '\\bar{x}'], ['p̂', '\\hat{p}']]],
  ['2 · Hy Lạp', [['α', '\\alpha'], ['β', '\\beta'], ['γ', '\\gamma'], ['λ', '\\lambda'], ['μ', '\\mu'], ['σ', '\\sigma'], ['σ²', '\\sigma^2'], ['θ', '\\theta'], ['ρ', '\\rho'], ['χ²', '\\chi^2'], ['Φ', '\\Phi'], ['Φ₀', '\\Phi_0'], ['π', '\\pi'], ['Δ', '\\Delta'], ['ε', '\\varepsilon']]],
  ['3 · Xác suất', [['P(A)', 'P(A)'], ['P(A|B)', 'P(A\\mid B)'], ['A∩B', 'A\\cap B'], ['A∪B', 'A\\cup B'], ['Ā', '\\overline{A}'], ['E(X)', 'E(X)'], ['Var(X)', '\\operatorname{Var}(X)'], ['C(n,k)', '\\binom{n}{k}'], ['n!', 'n!'], ['X∼N', 'X\\sim N(\\mu,\\sigma^2)'], ['X∼B', 'X\\sim B(n,p)'], ['X∼P(λ)', 'X\\sim P(\\lambda)'], ['Z', 'Z=\\frac{X-\\mu}{\\sigma}'], ['Φ(z)', '\\Phi(z)=P(Z\\le z)']]],
  ['4 · Thống kê', [['x̄±', '\\bar{x}\\pm z_{\\alpha/2}\\frac{\\sigma}{\\sqrt{n}}'], ['s²', 's^2=\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i-\\bar{x})^2'], ['t', 't=\\frac{\\bar{x}-\\mu_0}{s/\\sqrt{n}}'], ['H₀', 'H_0:\\ \\mu=\\mu_0'], ['H₁', 'H_1:\\ \\mu\\ne\\mu_0'], ['p-value', 'p\\text{-value}'], ['zα/2', 'z_{\\alpha/2}'], ['tₙ₋₁', 't_{n-1,\\alpha/2}'], ['χ²ₙ₋₁', '\\chi^2_{n-1}'], ['μ₁−μ₂', '\\mu_1-\\mu_2'], ['p₁−p₂', 'p_1-p_2'], ['σ₁²/σ₂²', '\\frac{\\sigma_1^2}{\\sigma_2^2}']]]
];
export function insertAt(ta, text) {
  const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s;
  ta.value = ta.value.slice(0, s) + text + ta.value.slice(e); ta.focus(); const p = s + text.length; ta.setSelectionRange(p, p); ta.dispatchEvent(new Event('input'));
}
export function symbolBar(ta) {
  let page = 0; const box = h('div', { class: 'symbar' });
  const draw = () => {
    box.innerHTML = ''; box.append(h('select', { style: 'width:auto', 'aria-label': 'Trang ký hiệu', onchange: e => { page = +e.target.value; draw(); } }, SYM_PAGES.map((p, i) => h('option', { value: i, selected: i === page }, p[0]))));
    for (const [lab, tex] of SYM_PAGES[page][1]) box.append(h('button', { type: 'button', title: tex, onclick: () => insertAt(ta, `\\(${tex}\\)`) }, lab));
  }; draw(); return box;
}
// Ô nhập có thanh ký hiệu + xem trước KaTeX + micro liên tục
export function mathInput({ placeholder = 'Gõ hoặc dán đề bài…', value = '', rows = 5, mic = true, onChange } = {}) {
  const ta = h('textarea', { placeholder, rows, 'aria-label': 'Nội dung' }); ta.value = value;
  const prev = h('div', { class: 'read', 'aria-live': 'polite', style: 'min-height:48px;margin-top:8px' });
  const upd = debounce(() => { renderMath(prev, ta.value || '_Xem trước công thức sẽ hiện ở đây_'); onChange?.(ta.value); }, 200);
  ta.addEventListener('input', upd); upd();
  let lis = null; const status = h('span', { class: 'muted' });
  const micBtn = h('button', { type: 'button', class: 'btn alt sm', onclick: () => toggle() }, '🎤 Nói');
  function toggle() {
    if (lis?.active) { lis.stop(); return; }
    lis = new Listener({
      onText: (t, interim) => { ta.value = spokenToMath(t) + (interim ? spokenToMath(interim) : ''); ta.dispatchEvent(new Event('input')); },
      onState: s => { micBtn.classList.toggle('mic-on', s === 'listening'); micBtn.textContent = s === 'listening' ? '⏹ Đang nghe… bấm để tắt' : '🎤 Nói'; status.textContent = s === 'listening' ? 'Micro luôn bật cho tới khi bạn bấm tắt.' : ''; },
      onError: (c, m) => toast(m, 'error', 6000)
    });
    lis.start(ta.value);
  }
  const el = h('div', {}, symbolBar(ta), ta, h('div', { class: 'row', style: 'margin-top:6px' }, mic && canListen() ? micBtn : mic ? h('span', { class: 'muted' }, 'Trình duyệt này chưa hỗ trợ micro – hãy dùng Chrome/Edge.') : null, status), prev);
  return { el, ta, setValue: v => { ta.value = v; ta.dispatchEvent(new Event('input')); }, get value() { return ta.value; }, destroy: () => lis?.stop() };
}
export function listenBtn(getText) {
  let on = false; const b = h('button', { class: 'btn alt sm', type: 'button', 'aria-label': 'Nghe đọc' }, '🔊 Nghe');
  b.onclick = () => { if (on) { stopSpeak(); on = false; b.textContent = '🔊 Nghe'; return; } on = true; b.textContent = '⏹ Dừng'; speak(getText(), { onend: () => { on = false; b.textContent = '🔊 Nghe'; }, onWarn: m => toast(m, 'info', 6000) }); };
  return b;
}
