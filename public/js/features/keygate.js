import { h, toast, busy, $ } from '../services/ui.js';
import { getKey, setKey, getModel, setModel, clearKey, listModels, testModel, friendly } from '../services/ai.js';

export function keyGate({ onDone, canSkip = true, closable = false }) {
  let models = [], chosen = getModel();
  const key = h('input', { type: 'password', placeholder: 'Dán khóa API từ Google AI Studio (bắt đầu bằng AIza…)', autocomplete: 'off', value: getKey() });
  const list = h('div', { style: 'max-height:240px;overflow:auto;margin-top:8px' });
  const msg = h('div', { class: 'muted', style: 'margin-top:6px' });
  const loadBtn = h('button', { class: 'btn', onclick: load }, 'Tải danh sách model');
  const saveBtn = h('button', { class: 'btn hot', disabled: true, onclick: save }, 'Kiểm tra & kết nối');
  const search = h('input', { placeholder: 'Lọc model (ví dụ: flash)…', style: 'margin-top:8px', oninput: draw });
  async function load() {
    const k = key.value.trim(); if (!k) return toast('Hãy dán khóa API trước.', 'error');
    busy(loadBtn, true, 'Đang tải…'); msg.textContent = '';
    try { models = await listModels(k); if (!models.length) throw new Error('Khóa hợp lệ nhưng không có model dùng được.'); if (!chosen || !models.some(m => m.id === chosen)) chosen = (models.find(m => /flash/.test(m.id) && !/lite|preview|exp/.test(m.id)) || models[0]).id; draw(); msg.textContent = `Tìm thấy ${models.length} model. Chọn một model rồi bấm "Kiểm tra & kết nối". Model "flash" thường nhanh và đủ dùng cho khóa miễn phí.`; saveBtn.disabled = false; }
    catch (e) { msg.innerHTML = ''; msg.append(h('span', { class: 'err' }, friendly(e))); } finally { busy(loadBtn, false); }
  }
  function draw() {
    const q = search.value.toLowerCase(); list.innerHTML = '';
    for (const m of models.filter(m => m.id.includes(q) || m.name.toLowerCase().includes(q)))
      list.append(h('label', { class: 'solid', style: 'display:flex;gap:10px;align-items:flex-start;margin:4px 0;cursor:pointer' },
        h('input', { type: 'radio', name: 'mdl', style: 'width:auto;margin-top:6px', checked: m.id === chosen, onchange: () => { chosen = m.id; } }),
        h('span', {}, h('b', {}, m.name), h('span', { class: 'muted mono' }, ' · ' + m.id), h('div', { class: 'muted' }, (m.desc || '').slice(0, 110)))));
  }
  async function save() {
    busy(saveBtn, true, 'Đang kiểm tra…');
    try { await testModel(key.value.trim(), chosen); setKey(key.value); setModel(chosen); toast('Đã kết nối AI với ' + chosen, 'ok'); onDone(true); }
    catch (e) { msg.innerHTML = ''; msg.append(h('span', { class: 'err' }, friendly(e))); } finally { busy(saveBtn, false); }
  }
  const el = h('div', { class: 'glass', style: 'max-width:640px;margin:auto' },
    h('h2', {}, '🔑 Kết nối AI của bạn'),
    h('p', {}, 'AI Classroom dùng khóa Gemini của riêng bạn nên mỗi người có hạn mức riêng. Lấy khóa miễn phí tại ', h('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener' }, 'Google AI Studio'), ' → "Create API key".'),
    h('p', { class: 'muted' }, 'Khóa chỉ được lưu trong trình duyệt của bạn và chỉ gửi tới Google; không gửi tới máy chủ AI Classroom. Bạn có thể xóa khóa bất cứ lúc nào.'),
    key, h('div', { class: 'row', style: 'margin-top:10px' }, loadBtn, saveBtn), search, list, msg,
    h('div', { class: 'row', style: 'margin-top:14px' },
      canSkip ? h('button', { class: 'btn alt sm', onclick: () => onDone(false) }, closable ? 'Đóng' : 'Bỏ qua (dùng không có AI)') : null,
      getKey() ? h('button', { class: 'btn alt sm', onclick: () => { clearKey(); key.value = ''; models = []; draw(); toast('Đã xóa khóa khỏi trình duyệt.', 'ok'); } }, 'Xóa khóa') : null));
  if (getKey()) load();
  return el;
}
