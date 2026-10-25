export const $ = (s, r = document) => r.querySelector(s);
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
export function toast(msg, type = 'info', ms = 3500) {
  const t = h('div', { class: 'toast ' + type }, msg); document.getElementById('toasts').append(t); setTimeout(() => t.remove(), ms);
}
export function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.textContent = label || 'Đang xử lý…'; } else { btn.disabled = false; btn.textContent = btn.dataset.l || btn.textContent; } }
export function modal(content, { onClose } = {}) {
  const m = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'glass' }, content));
  const close = () => { m.remove(); onClose && onClose(); };
  m.addEventListener('mousedown', e => { if (e.target === m) close(); });
  document.body.append(m); return { close, el: m };
}
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const ago = d => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? 'vừa xong' : s < 3600 ? Math.floor(s / 60) + ' phút trước' : s < 86400 ? Math.floor(s / 3600) + ' giờ trước' : new Date(d).toLocaleDateString('vi-VN'); };
export const loadScript = (() => { const c = {}; return u => c[u] || (c[u] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = () => no(new Error('Không tải được thư viện: ' + u)); document.head.append(s); })); })();
