import { h, toast, busy } from '../services/ui.js';
import { signIn, signUp, validUser, S } from '../services/supa.js';
import { avatarSvg, ANIMALS } from './avatars.js';

export function welcome({ onEnter }) {
  const el = h('div', { class: 'wrap' });
  const openAuth = mode => { const f = authForm({ onEnter, mode, onBack: () => f.replaceWith(el) }); el.replaceWith(f); };
  el.append(h('div', { class: 'hero' },
    h('div', {}, h('div', { class: 'eyebrow' }, 'BEYOND THE KNOWN UNIVERSE'), h('h1', { class: 'big' }, 'Mỗi con số mở ra một bí ẩn'),
      h('p', {}, 'Bước vào hành trình chinh phục những quy luật ngẫu nhiên, khám phá bí ẩn của dữ liệu và mở ra những chân trời tri thức mới cùng AI.'),
      h('p', { style: 'font-weight:800;color:#7dd3fc' }, 'Learn. Play. Solve. Level Up.'),
      h('div', { class: 'row' }, h('button', { class: 'btn hot', onclick: () => openAuth('up') }, 'Bắt đầu khám phá'), h('button', { class: 'btn alt', onclick: () => openAuth('in') }, 'Tôi đã có tài khoản'), h('button', { class: 'btn alt', onclick: () => { S.guest = true; onEnter(); } }, 'Tài khoản khách'))),
    h('div', {}, h('div', { class: 'dice' }, h('div', {}, '⚀')), h('div', { class: 'row', style: 'justify-content:center;margin-top:24px' }, ['Interactive Learning', 'Step-by-step Solutions', 'Smart Practice'].map(t => h('span', { class: 'chip' }, t))))),
    h('p', { class: 'muted', style: 'text-align:center' }, '© Nhóm 3 - D01'));
  return el;
}
export function authForm({ onEnter, mode = 'in', onBack }) {
  let up = mode === 'up', avatar = 'cat';
  const box = h('div', { class: 'wrap' }); const draw = () => {
    box.innerHTML = '';
    const u = h('input', { placeholder: 'Tên người dùng (3–20 ký tự: chữ, số, _)', autocomplete: 'username' });
    const p = h('input', { type: 'password', placeholder: 'Mật khẩu (tối thiểu 6 ký tự)', autocomplete: up ? 'new-password' : 'current-password' });
    const p2 = h('input', { type: 'password', placeholder: 'Xác nhận mật khẩu', autocomplete: 'new-password' });
    const err = h('div', { class: 'err', role: 'alert' });
    const btn = h('button', { class: 'btn hot', style: 'width:100%;margin-top:12px' }, up ? 'Tạo tài khoản' : 'Đăng nhập');
    const show = h('button', { type: 'button', class: 'btn alt sm', onclick: () => { p.type = p.type === 'password' ? 'text' : 'password'; } }, '👁 Hiện/ẩn mật khẩu');
    const go = async () => {
      err.textContent = '';
      if (!validUser(u.value)) return err.textContent = 'Tên người dùng gồm 3–20 ký tự chữ, số hoặc dấu gạch dưới.';
      if (p.value.length < 6) return err.textContent = 'Mật khẩu cần tối thiểu 6 ký tự.';
      if (up && p.value !== p2.value) return err.textContent = 'Mật khẩu xác nhận chưa khớp.';
      busy(btn, true, up ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…');
      try { up ? await signUp(u.value, p.value, avatar) : await signIn(u.value, p.value); toast('Xin chào!', 'ok'); onEnter(); }
      catch (e) { err.textContent = e.message; } finally { busy(btn, false); }
    };
    btn.onclick = go; box.addEventListener('keydown', e => e.key === 'Enter' && go());
    box.append(h('div', { class: 'glass', style: 'max-width:460px;margin:8vh auto' },
      onBack ? h('button', { type: 'button', class: 'btn alt sm', onclick: onBack }, '← Quay lại') : null, h('h2', {}, '✨ AI Classroom'), h('p', { class: 'muted' }, 'Learn. Play. Solve. Level Up.'),
      h('label', {}, 'Tên người dùng'), u, h('label', {}, 'Mật khẩu'), p, up ? [h('label', {}, 'Xác nhận mật khẩu'), p2, h('label', {}, 'Chọn avatar'), h('div', { class: 'row' }, ANIMALS.map(a => h('button', { type: 'button', style: 'background:none;border:0;cursor:pointer;padding:2px;border-radius:50%;' + (a === avatar ? 'outline:3px solid #38bdf8' : ''), 'aria-label': a, onclick: () => { avatar = a; [...box.querySelectorAll('.pick')].forEach(x => x.style.outline = ''); draw(); } }, h('span', { class: 'pick', html: avatarSvg(a, 44) }))))] : null,
      show, err, btn,
      h('p', { style: 'text-align:center' }, h('a', { href: '#', onclick: e => { e.preventDefault(); up = !up; draw(); } }, up ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký')),
      h('p', { style: 'text-align:center' }, h('a', { href: '#', onclick: e => { e.preventDefault(); S.guest = true; onEnter(); } }, 'Dùng tài khoản khách (dữ liệu mất khi đóng trình duyệt)'))));
  }; draw(); return box;
}
