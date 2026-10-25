// AI BUDDY – SOLVE: 5 bước + dấu "=" (máy tính). Nhập đề: gõ / camera / tệp / micro, luôn qua màn hình xác nhận.
import { h, toast, busy, modal } from '../services/ui.js';
import { mathInput, listenBtn } from '../components.js';
import { renderMath, mathHtml } from '../services/math.js';
import * as M from '../services/media.js';
import { gen, aiReady, friendly, PERSONA, SOLVE_RULES, MODES, LEVELS } from '../services/ai.js';
import { evalExpr, fmt } from '../services/stats.js';
import { addLog } from '../services/store.js';
import { CHAPTERS, ERROR_LABELS } from '../config.js';

const st = { step: 1, problem: '', images: [], level: 3, mode: 'full', hint: 0, parts: '', work: '', out: '', tab: 'type' };

export function solveView(root, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); let cleanup = [];
  const clean = () => { cleanup.forEach(f => f()); cleanup = []; };
  const bar = () => h('div', { class: 'steps', 'aria-label': `Bước ${st.step}/5` }, [1, 2, 3, 4, 5].map(i => h('i', { class: i <= st.step ? 'on' : '' })));
  const frame = (...kids) => { clean(); box.innerHTML = ''; box.append(h('div', { class: 'glass' }, h('div', { class: 'row' }, h('h2', { class: 'sp' }, '🧠 AI BUDDY – SOLVE'), h('span', { class: 'badge' }, `Bước ${st.step}/5`), aiReady() ? null : h('span', { class: 'badge' }, 'Chưa kết nối AI')), bar(), ...kids)); };

  // ---------- Bước 1: nhập đề ----------
  function step1() {
    st.step = 1; const tabs = [['type', '✍️ Gõ đề'], ['cam', '📷 Camera'], ['file', '📎 Tải tệp'], ['calc', '＝ Tính nhanh']];
    const panel = h('div');
    frame(h('p', {}, 'Chào bạn! Hãy gửi bài tập Xác suất Thống kê mà bạn cần hỗ trợ nhé.'),
      h('div', { class: 'tabs' }, tabs.map(([k, l]) => h('button', { class: 'tab' + (st.tab === k ? ' on' : ''), onclick: () => { st.tab = k; step1(); } }, l))), panel,
      h('p', { class: 'muted' }, '🔒 Chỉ chụp bài tập, tránh chụp thông tin cá nhân (tên, số điện thoại, khuôn mặt).'));
    ({ type: tabType, cam: tabCam, file: tabFile, calc: tabCalc })[st.tab](panel);
  }
  function tabType(p) {
    const mi = mathInput({ value: st.problem, placeholder: 'Gõ hoặc dán đề bài. Bấm 🎤 để nói – micro sẽ không tự tắt cho đến khi bạn bấm tắt.' }); cleanup.push(mi.destroy);
    p.append(mi.el, h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn alt', onclick: () => mi.setValue('') }, 'Xóa'), h('button', { class: 'btn', onclick: () => { mi.destroy(); if (!mi.value.trim()) return toast('Hãy nhập đề bài trước.', 'error'); st.problem = mi.value.trim(); st.images = []; step2(); } }, 'Tiếp tục →')));
  }
  function tabFile(p) {
    const status = h('div', { class: 'muted' }); const inp = h('input', { type: 'file', accept: 'image/*,.pdf,.docx', multiple: true, style: 'display:none' });
    const drop = h('div', { class: 'solid', tabindex: 0, style: 'text-align:center;padding:30px;cursor:pointer;border-style:dashed' }, '📎 Kéo thả, chọn tệp (ảnh JPG/PNG/WEBP, PDF, Word .docx) hoặc dán ảnh bằng Ctrl+V / Cmd+V');
    drop.onclick = () => inp.click();
    const run = async files => { try { await ingest([...files], status); } catch (e) { status.innerHTML = ''; status.append(h('span', { class: 'err' }, e.message)); } };
    inp.onchange = () => run(inp.files);
    drop.ondragover = e => e.preventDefault(); drop.ondrop = e => { e.preventDefault(); run(e.dataTransfer.files); };
    const onPaste = e => { const f = [...(e.clipboardData?.files || [])].filter(x => x.type.startsWith('image/')); if (f.length) { e.preventDefault(); run(f); } };
    document.addEventListener('paste', onPaste); cleanup.push(() => document.removeEventListener('paste', onPaste));
    p.append(drop, inp, status);
  }
  function tabCam(p) {
    const v = h('video', { class: 'cam', playsinline: true, muted: true }); let stream = null, facing = 'environment'; const msg = h('div', { class: 'muted' });
    const start = async () => { M.stopCamera(stream); try { stream = await M.openCamera(v, facing); msg.textContent = ''; } catch (e) { msg.innerHTML = ''; msg.append(h('span', { class: 'err' }, e.message), ' ', h('label', { class: 'btn alt sm' }, 'Chọn ảnh từ thiết bị', h('input', { type: 'file', accept: 'image/*', capture: 'environment', style: 'display:none', onchange: ev => ingest([...ev.target.files], msg).catch(x => toast(x.message, 'error')) }))); } };
    cleanup.push(() => M.stopCamera(stream));
    p.append(v, h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn', onclick: async () => { if (!stream) return; const b = await M.snap(v); M.stopCamera(stream); stream = null; ingest([new File([b], 'camera.jpg', { type: 'image/jpeg' })], msg).catch(x => toast(x.message, 'error')); } }, '📸 Chụp'), h('button', { class: 'btn alt', onclick: () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); } }, '🔄 Đổi camera')), msg); start();
  }
  async function ingest(files, status) {
    let images = [], hint = '', warn = [], typed = '';
    for (const f of files) {
      M.checkFile(f);
      if (f.type === 'application/pdf') { const r = await M.pdfToImages(f, (a, b) => status.textContent = `Đang đọc PDF: trang ${a}/${b}…`); images.push(...r.images); hint += r.hint; if (r.total > M.LIMITS.maxPdfPages) warn.push(`PDF có ${r.total} trang, chỉ đọc ${M.LIMITS.maxPdfPages} trang đầu.`); }
      else if (/\.docx$/i.test(f.name)) { const r = await M.docxRead(f); typed += r.text + '\n'; images.push(...r.images.map(x => x)); warn.push(r.warn); }
      else { const r = await M.prepImage(f); images.push(r.dataUrl); warn.push(...r.warn); }
    }
    images = images.slice(0, M.LIMITS.maxImages); if (!images.length && !typed) throw new M.MediaError('FILE_INVALID', 'Không có nội dung để đọc.');
    status.textContent = 'Đang nhận diện đề…';
    let res;
    if (aiReady() && images.length) {
      try { res = await M.extractProblem(images, { hint, onStage: s => status.textContent = s }); }
      catch (e) { toast(friendly(e), 'error', 6000); res = null; }
    }
    if (!res) { // dự phòng: Tesseract (chỉ chữ) hoặc văn bản từ Word
      let txt = typed;
      if (images.length) { try { status.textContent = 'Đang đọc chữ bằng OCR dự phòng…'; txt += await M.tesseractRead(images, p => status.textContent = `OCR dự phòng… ${p}%`); warn.push('OCR dự phòng chỉ đọc chữ, KHÔNG đọc chuẩn công thức. Hãy kết nối AI để nhận diện công thức chính xác và kiểm tra kỹ bên dưới.'); } catch { warn.push('Không đọc được ảnh bằng OCR dự phòng.'); } }
      res = { content_type: 'problem', is_relevant: true, items: [{ id: 'p1', label: '', text: txt.trim(), confidence: .5, uncertain_spans: [] }], given_numbers: [], missing_info: [], warnings: [] };
    } else if (typed) res.items.unshift({ id: 'w0', label: 'Word', text: typed.trim(), confidence: .9, uncertain_spans: [] });
    if (res.content_type === 'not_math' || res.is_relevant === false) return toast('Ảnh này không phải bài Xác suất Thống kê. Hãy mời quay lại môn học nhé.', 'error', 6000);
    confirmView(res, images, warn);
  }
  // ---------- Màn hình xác nhận ----------
  function confirmView(res, images, warn) {
    const text0 = res.items.map(i => (i.label ? i.label + ': ' : '') + i.text).join('\n\n');
    const spans = res.items.flatMap(i => i.uncertain_spans || []); const resolved = new Set();
    const mi = mathInput({ value: text0, mic: false }); const left = h('div', { class: 'solid' }, images.length ? images.map(s => h('img', { src: s, class: 'preview-img', alt: 'Ảnh gốc' })) : h('p', { class: 'muted' }, 'Không có ảnh gốc.'));
    const spBox = h('div'); const count = h('b', { class: 'okc' });
    const upd = () => { const n = spans.filter(s => !resolved.has(s)).length; count.textContent = n ? `Còn ${n} chỗ cần xác nhận` : 'Đã xử lý hết chỗ không chắc'; ok.disabled = n > 0 && !keepAll.checked; };
    spans.forEach(s => spBox.append(h('div', { class: 'solid', style: 'margin:4px 0' }, h('span', { class: 'hl-y' }, s.text), ' – ' + (s.reason || 'không chắc'), h('div', {}, (s.candidates?.length ? s.candidates : [s.text]).map(c => h('span', { class: 'chip y', onclick: ev => { if (s.text && c !== s.text) mi.setValue(mi.value.replace(s.text, c)); resolved.add(s); ev.target.parentElement.parentElement.style.opacity = .5; upd(); } }, c)), h('span', { class: 'chip', onclick: ev => { resolved.add(s); ev.target.parentElement.parentElement.style.opacity = .5; upd(); } }, 'Giữ nguyên')))));
    const keepAll = h('input', { type: 'checkbox', style: 'width:auto', onchange: upd });
    const ok = h('button', { class: 'btn hot', onclick: () => { st.problem = mi.value.trim(); st.images = images; if (!st.problem) return toast('Đề đang trống.', 'error'); step2(); } }, 'Xác nhận đề →');
    frame(h('h3', {}, 'Xác nhận đề đã nhận diện'), warn.length ? h('div', { class: 'solid', style: 'border-color:#fbbf24' }, warn.map(w => h('div', {}, '⚠️ ' + w))) : null, res.warnings?.length ? h('div', { class: 'solid err' }, res.warnings.map(w => h('div', {}, '⚠️ ' + w))) : null,
      h('div', { class: 'split' }, left, h('div', {}, mi.el)),
      res.given_numbers?.length ? h('div', { class: 'row' }, h('b', {}, 'Dữ kiện số: '), res.given_numbers.map(g => h('span', { class: 'chip' }, `${g.name} = ${g.value}`))) : null,
      res.tables?.length ? res.tables.map(t => h('table', { class: 'table', style: 'margin:8px 0' }, h('tr', {}, t.headers.map(x => h('th', {}, x))), t.rows.map(r => h('tr', {}, r.map(c => h('td', {}, c)))))) : null,
      res.missing_info?.length ? h('div', { class: 'solid', style: 'border-color:#fb7185' }, h('b', {}, 'Đề có vẻ thiếu: '), res.missing_info.join('; ')) : null,
      spans.length ? [h('h4', {}, 'Chỗ không chắc (tô vàng)'), spBox, h('label', { style: 'font-weight:400' }, keepAll, ' Tôi đã kiểm tra, đề đúng như bên trên')] : null, count,
      h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn alt', onclick: step1 }, 'Chụp/nhập lại'), ok));
    upd();
  }
  // ---------- Bước 2 ----------
  function step2() {
    st.step = 2; const o = ['Tôi chưa hiểu đề bài', 'Tôi hiểu đề nhưng chưa biết cách làm', 'Tôi đã làm thử nhưng chưa chắc chắn', 'Tôi muốn xem lời giải đầy đủ'];
    frame(h('div', { class: 'read' }, h('b', {}, 'Đề của bạn:'), h('div', { html: mathHtml(st.problem) })), h('h3', {}, 'Bạn đã hiểu đề bài đến đâu?'),
      h('div', { class: 'grid g2' }, o.map((t, i) => h('button', { class: 'tab' + (st.level === i ? ' on' : ''), style: 'padding:14px;text-align:left', onclick: () => { st.level = i; if (i === 2) st.mode = 'check'; step3(); } }, t))), h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn alt', onclick: step1 }, '← Sửa đề')));
  }
  // ---------- Bước 3 ----------
  function step3() {
    st.step = 3; const modes = [['hint', '💡 GỢI Ý', 'Gợi ý theo cấp 1-2-3, không lộ đáp án'], ['guide', '🧭 HƯỚNG DẪN', 'Phân tích và hướng dẫn từng bước'], ['partial', '🧩 GIẢI MỘT PHẦN', 'Chọn ý bạn muốn giải'], ['check', '✅ KIỂM TRA', 'Nộp bài làm để AI chấm lỗi'], ['full', '📘 GIẢI ĐẦY ĐỦ', 'Lời giải chi tiết đến đáp án']];
    const parts = h('input', { placeholder: 'Ví dụ: câu b, c', value: st.parts }); const work = mathInput({ placeholder: 'Nhập bài làm của bạn để AI kiểm tra…', value: st.work, rows: 4 }); cleanup.push(work.destroy);
    const extra = h('div'); const draw = () => { extra.innerHTML = ''; if (st.mode === 'partial') extra.append(h('label', {}, 'Phần cần giải'), parts); if (st.mode === 'check') extra.append(h('label', {}, 'Bài làm của bạn'), work.el); };
    frame(h('h3', {}, 'Chọn chế độ hỗ trợ'), h('div', { class: 'grid g3' }, modes.map(([k, t, d]) => h('button', { class: 'tab' + (st.mode === k ? ' on' : ''), style: 'padding:14px;text-align:left', onclick: () => { st.mode = k; step3(); } }, h('b', {}, t), h('div', { class: 'muted' }, d)))), extra,
      h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn alt', onclick: step2 }, '← Quay lại'), h('button', { class: 'btn hot', onclick: () => { st.parts = parts.value; st.work = work.value; if (st.mode === 'check' && !st.work.trim()) return toast('Hãy nhập bài làm cần kiểm tra.', 'error'); st.hint = st.mode === 'hint' ? 1 : 0; step4(true); } }, 'Xem kết quả →'))); draw();
  }
  // ---------- Bước 4 ----------
  async function step4(fetchNow) {
    st.step = 4; const area = h('div'); const btnRow = h('div', { class: 'row', style: 'margin-top:12px' });
    frame(h('div', { class: 'read' }, h('b', {}, 'Đề: '), h('span', { html: mathHtml(st.problem) })), area, btnRow);
    const next = h('button', { class: 'btn hot', onclick: step5 }, 'Tiếp tục → luyện tập');
    const back = h('button', { class: 'btn alt', onclick: step3 }, '← Đổi chế độ');
    if (!aiReady()) { area.append(h('div', { class: 'solid' }, h('b', {}, 'Chưa kết nối AI. '), 'Hãy bấm nút "🔑 Khóa AI" trên thanh điều hướng để nhập khóa. Trong lúc đó bạn vẫn có thể dùng chế độ "＝ Tính nhanh" để tính số liệu.')); btnRow.append(back); return; }
    area.append(h('p', { class: 'muted' }, '⏳ AI đang soạn lời giải theo quy trình 4 bước…')); btnRow.append(back);
    try {
      const sys = PERSONA + '\n' + SOLVE_RULES + '\n' + MODES[st.mode].replace('{L}', st.hint || 1).replace('{P}', st.parts || 'các ý người học chọn');
      const user = `${LEVELS[st.level]}\n\nĐỀ BÀI (đã được người học xác nhận):\n${st.problem}` + (st.mode === 'check' ? `\n\nBÀI LÀM CỦA NGƯỜI HỌC:\n${st.work}` : '');
      st.out = await gen({ system: sys, user, temperature: .25 }); show(area, btnRow, next, back);
    } catch (e) { area.innerHTML = ''; area.append(h('div', { class: 'solid err' }, friendly(e))); btnRow.prepend(h('button', { class: 'btn', onclick: () => step4(true) }, 'Thử lại')); }
  }
  function show(area, btnRow, next, back) {
    area.innerHTML = ''; let t = st.out; let verdict = null;
    const vm = /VERDICT:\s*(dung|sai|mot-phan)/i.exec(t); if (vm) { verdict = vm[1].toLowerCase(); t = t.replace(/VERDICT:.*\n?/i, '').trim(); }
    if (st.mode === 'hint') { area.append(h('h3', {}, `Gợi ý cấp ${st.hint}/3`), h('div', { class: 'read', html: mathHtml(t) })); }
    else {
      const parts = t.split(/^##\s*Bước\s*([1-4])[^\n]*$/m); // [pre, n, body, n, body…]
      const heads = ['Bước 1 – Tìm hiểu nội dung bài toán', 'Bước 2 – Xây dựng chương trình giải', 'Bước 3 – Trình bày lời giải', 'Bước 4 – Kiểm tra và nghiên cứu lời giải'];
      if (parts.length >= 3) { if (parts[0].trim()) area.append(h('div', { class: 'read', html: mathHtml(parts[0]) })); for (let i = 1; i < parts.length; i += 2) { const n = +parts[i]; const body = parts[i + 1].replace(/\*\*Kết quả:\*\*(.*)/g, (_, r) => `\n[[RES]]${r.trim()}[[/RES]]`); const d = h('details', { class: 'blk', open: n <= 3 }, h('summary', {}, heads[n - 1]), h('div')); const inner = d.lastChild; const [pre, res, post] = body.split(/\[\[RES\]\]|\[\[\/RES\]\]/); inner.innerHTML = mathHtml(pre); if (res) { inner.append(h('div', { class: 'result' }, h('b', {}, 'Kết quả: '), h('span', { html: mathHtml(res) }))); if (post) inner.append(h('div', { html: mathHtml(post) })); } area.append(d); } }
      else area.append(h('div', { class: 'read', html: mathHtml(t) }));
    }
    if (verdict) area.prepend(h('div', { class: 'result' }, verdict === 'dung' ? '✅ Bài làm đúng hướng.' : verdict === 'sai' ? '❌ Bài làm còn sai – xem chỗ sai bên dưới.' : '🟡 Đúng một phần – xem chỗ cần sửa.'));
    if (st.mode !== 'hint' && st.mode !== 'check') area.append(h('p', { class: 'muted' }, 'ℹ️ Kết quả số do AI tính và chưa được kiểm chứng bằng mã – bạn nên đối chiếu lại (có thể dùng nút ＝ Tính nhanh).'));
    btnRow.innerHTML = ''; btnRow.append(back, listenBtn(() => t));
    if (st.mode === 'hint' && st.hint < 3) btnRow.append(h('button', { class: 'btn', onclick: () => { st.hint++; step4(true); } }, 'Gợi ý thêm'));
    btnRow.append(h('button', { class: 'btn alt', onclick: () => { navigator.clipboard?.writeText(t); toast('Đã sao chép lời giải', 'ok'); } }, 'Sao chép'), h('button', { class: 'btn alt', onclick: () => { sessionStorage.setItem('sv_mm_topic', st.problem.replace(/\\[()\[\]]/g, '').slice(0, 100)); go('/mindmap'); } }, '🗺 Bản đồ tư duy'), next);
    logIt(verdict);
  }
  function logIt(verdict) { const result = st.mode === 'check' ? (verdict === 'dung' ? 'dung' : 'sai') : st.mode === 'full' ? 'xem_loi_giai' : st.mode === 'hint' ? 'can_goi_y' : 'can_goi_y'; addLog({ topic: st.problem.slice(0, 80), result, hint_level: st.mode === 'hint' ? st.hint : st.mode === 'full' ? 3 : 1, source: 'bai_tap', error_label: result === 'sai' ? 'Công thức' : null, chapter: guessChapter(st.problem) }); }
  // ---------- Bước 5 ----------
  function step5() {
    st.step = 5; const area = h('div');
    frame(h('h3', {}, 'Bạn có muốn luyện tập thêm không?'), h('div', { class: 'row' }, h('button', { class: 'btn alt', onclick: () => go('/home') }, 'Không'), h('button', { class: 'btn', onclick: () => { toast('Cùng luyện tập thêm dạng bài bạn vừa học nhé!', 'ok'); go('/games'); } }, 'Có – Chơi trò chơi'), h('button', { class: 'btn hot', onclick: () => similar(area) }, 'Làm bài tự luận tương tự')), area, h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn alt', onclick: () => step4(false) }, '← Xem lại lời giải'), h('button', { class: 'btn alt', onclick: () => { st.problem = ''; st.images = []; st.out = ''; step1(); } }, 'Đề mới')));
  }
  async function similar(area) {
    if (!aiReady()) return toast('Chưa kết nối AI nên chưa sinh được bài. Hãy nhập khóa ở nút "Khóa AI".', 'error', 5000);
    area.innerHTML = '<p class="muted">⏳ Đang sinh 5 bài tương tự…</p>';
    try {
      const t = await gen({ system: PERSONA + '\n' + SOLVE_RULES, user: `Dựa trên bài sau, hãy sinh ĐÚNG 5 bài tập tự luận tương tự (cùng dạng, cùng kiến thức, thay dữ kiện và số liệu; độ khó tăng dần; đủ dữ kiện, không mâu thuẫn, xác suất trong [0,1]).\nVới mỗi bài viết: "### Bài n" rồi đề bài, rồi dòng "**Chiến lược giải:**" nêu dạng bài, kiến thức, các bước tiếp cận ở mức định hướng và lỗi thường gặp. TUYỆT ĐỐI không viết lời giải hoàn chỉnh, không đưa đáp án cuối.\n\nBài gốc:\n${st.problem}`, temperature: .8 });
      area.innerHTML = ''; area.append(h('p', { class: 'muted' }, 'Bộ bài do AI sinh, chưa được kiểm chứng bằng mã – hãy cẩn thận với số liệu.'));
      t.split(/^###\s*/m).slice(1).forEach(b => { const [q, s] = b.split(/\*\*Chiến lược giải:?\*\*:?/); area.append(h('details', { class: 'blk' }, h('summary', {}, 'Bài ' + b.split('\n')[0].replace(/^Bài\s*/i, '').trim()), h('div', {}, h('div', { class: 'read', html: mathHtml(q.split('\n').slice(1).join('\n')) }), s ? h('details', {}, h('summary', {}, 'Chiến lược giải'), h('div', { html: mathHtml(s) })) : null))); });
      addLog({ topic: 'Bài tự luận tương tự', source: 'tu_luan', result: 'can_goi_y', chapter: guessChapter(st.problem) });
    } catch (e) { area.innerHTML = ''; area.append(h('div', { class: 'err' }, friendly(e))); }
  }
  // ---------- Dấu "=" : máy tính ----------
  function tabCalc(p) {
    const inp = h('input', { class: 'mono', placeholder: 'Ví dụ: C(10,3)*0.3^3*0.7^7   hoặc   Phi(1.96)   hoặc   sqrt(2)*pi', autocomplete: 'off', inputmode: 'text', style: 'font-size:1.2rem' });
    const out = h('div', { class: 'read', style: 'min-height:70px', 'aria-live': 'polite' }); const hist = h('div');
    const run = () => {
      const s = inp.value.trim(); if (!s) return;
      try { const r = evalExpr(s); const v = fmt(r.val); out.innerHTML = ''; out.append(h('div', { html: mathHtml(`\\[${r.tex} = ${/^[-\d.e+]+$/.test(v) ? v : '\\text{' + v + '}'}\\]`) }), h('div', { class: 'result' }, h('b', {}, 'Kết quả: '), h('span', { class: 'mono' }, v)), h('div', { class: 'row' }, h('button', { class: 'btn alt sm', onclick: () => { navigator.clipboard?.writeText(v); toast('Đã sao chép', 'ok'); } }, 'Sao chép'), listenBtn(() => `${r.tex.replace(/\\cdot/g, '\\times')} bằng ${v}`)));
        hist.prepend(h('div', { class: 'solid mono', style: 'margin:4px 0;cursor:pointer', onclick: () => { inp.value = s; } }, s + ' = ' + v)); }
      catch (e) { out.innerHTML = ''; out.append(h('span', { class: 'err' }, 'Biểu thức chưa đúng: ' + String(e.message).slice(0, 120) + '. Dùng dấu chấm cho số thập phân, ví dụ 0.35.')); }
    };
    const keys = ['7', '8', '9', '÷', '(', ')', '4', '5', '6', '×', '^', '√(', '1', '2', '3', '−', 'C(', 'Φ(', '0', '.', 'π', '+', '!', ','];
    const pad = h('div', { style: 'display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:10px 0' }, keys.map(k => h('button', { class: 'btn alt', type: 'button', onclick: () => { inp.setRangeText(k, inp.selectionStart, inp.selectionEnd, 'end'); inp.focus(); } }, k)));
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); run(); } };
    p.append(h('p', {}, 'Chỉ cần nhập phép tính rồi bấm ＝ để xem kết quả ngay (không cần gửi đề). Hỗ trợ: ', h('code', {}, 'C(n,k)'), ', ', h('code', {}, 'n!'), ', ', h('code', {}, 'Phi(z)'), ' (Φ), ', h('code', {}, 'Phi0(z)'), ' (Laplace), ', h('code', {}, 'binom(n,p,k)'), ', ', h('code', {}, 'poisson(λ,k)'), ', ', h('code', {}, 'sqrt, ln, log, exp, sin, cos…')),
      inp, pad, h('div', { class: 'row' }, h('button', { class: 'btn hot', style: 'font-size:1.3rem;padding:8px 36px', onclick: run, 'aria-label': 'Tính' }, '＝'), h('button', { class: 'btn alt', onclick: () => { inp.value = ''; out.innerHTML = ''; } }, 'Xóa'), h('button', { class: 'btn alt', onclick: () => { if (inp.value.trim()) { st.problem = `Tính: \\(${inp.value}\\)`; step2(); } } }, 'Nhờ AI giải thích →')), out, h('h4', {}, 'Lịch sử'), hist);
  }
  step1();
  return () => clean();
}
export function guessChapter(t) { const s = t.toLowerCase(); const m = [[/bayes|xác suất có điều kiện|biến cố|tổ hợp|chỉnh hợp/, 1], [/kỳ vọng|phương sai|hàm mật độ|biến ngẫu nhiên|phân phối xác suất/, 2], [/nhị thức|poisson|chuẩn|siêu bội|laplace|phi\(/, 3], [/mẫu|trung bình mẫu|phương sai mẫu|\\bar/, 4], [/khoảng tin cậy|ước lượng/, 5], [/kiểm định|h_0|giả thiết|mức ý nghĩa|p-value/, 6], [/hai tỉ lệ|hai trung bình|so sánh|\\mu_1/, 7]]; for (const [r, c] of m) if (r.test(s)) return c; return null; }
