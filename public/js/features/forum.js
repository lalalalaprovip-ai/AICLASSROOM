import { h, toast, busy, modal, debounce, ago } from '../services/ui.js';
import { sb, S, uploadImage, dataUrlToBlob } from '../services/supa.js';
import { mathHtml } from '../services/math.js';
import { mathInput } from '../components.js';
import { avatarSvg } from './avatars.js';
import { prepImage } from '../services/media.js';
import { gen, aiReady, friendly, PERSONA } from '../services/ai.js';
import { CHAPTERS } from '../config.js';

const f = { q: '', chapter: '', status: '', sort: 'new', page: 0 }; const PAGE = 15;
const author = p => h('div', { class: 'row' }, h('span', { html: avatarSvg(p?.avatar || 'cat', 40) }), h('div', {}, h('b', {}, p?.display_name || p?.username || 'Ẩn danh'), h('div', { class: 'muted' }, p?.user_tag || '')));
const body = t => h('div', { class: 'read', html: mathHtml(t) });

export function forumView(root, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); let ch = null;
  const list = h('div'); const more = h('button', { class: 'btn alt', onclick: () => { f.page++; load(true); } }, 'Tải thêm');
  const search = h('input', { placeholder: 'Tìm theo tiêu đề, tag, nội dung…', value: f.q, oninput: debounce(e => { f.q = e.target.value.trim(); f.page = 0; load(); }, 350) });
  const sel = (k, opts) => h('select', { style: 'width:auto', onchange: e => { f[k] = e.target.value; f.page = 0; load(); } }, opts.map(([v, l]) => h('option', { value: v, selected: f[k] === v }, l)));
  box.append(h('div', { class: 'glass' }, h('div', { class: 'row' }, h('h2', { class: 'sp' }, '🌠 AI CLASSROOM FORUM'), h('button', { class: 'btn hot', style: 'font-size:1.05rem;padding:12px 22px', onclick: () => S.user ? editor(load) : toast('Hãy đăng nhập để đăng câu hỏi (khách chỉ xem).', 'error') }, '＋ Đăng câu hỏi'), h('button', { class: 'btn alt', onclick: () => go('/friends') }, '👥 Bạn bè & Chat'), h('button', { class: 'btn alt', onclick: () => go('/tutor') }, '📘 TUTOR')),
    search, h('div', { class: 'row', style: 'margin-top:8px' }, sel('chapter', [['', 'Mọi chương'], ...CHAPTERS.map((c, i) => [String(i + 1), `Chương ${i + 1}: ${c}`])]), sel('status', [['', 'Mọi trạng thái'], ['open', 'Chưa trả lời'], ['solved', 'Đã có lời giải được chọn']]), sel('sort', [['new', 'Mới nhất'], ['answers', 'Nhiều trả lời'], ['likes', 'Nhiều lượt thích']]))), list, h('div', { class: 'row', style: 'justify-content:center;margin:12px' }, more));
  async function load(append) {
    if (!append) list.innerHTML = '<p class="muted">Đang tải bài…</p>';
    let q = sb.from('posts_view').select('*').eq('hidden', false);
    if (f.chapter) q = q.eq('chapter', +f.chapter); if (f.status === 'open') q = q.eq('answer_count', 0); if (f.status === 'solved') q = q.not('solved_answer_id', 'is', null);
    if (f.q) q = q.or(`title.ilike.%${f.q.replace(/[%,]/g, '')}%,body.ilike.%${f.q.replace(/[%,]/g, '')}%`);
    q = q.order(f.sort === 'answers' ? 'answer_count' : f.sort === 'likes' ? 'like_count' : 'created_at', { ascending: false }).range(f.page * PAGE, f.page * PAGE + PAGE - 1);
    const { data, error } = await q; if (!append) list.innerHTML = '';
    if (error) return list.append(h('div', { class: 'solid err' }, 'Chưa tải được diễn đàn: ' + error.message + '. Hãy chắc chắn đã chạy supabase/schema.sql.'));
    if (!data.length && !append) list.append(h('div', { class: 'solid' }, 'Chưa có bài nào phù hợp. Hãy là người đầu tiên đăng câu hỏi!'));
    data.forEach(p => list.append(card(p, load))); more.style.display = data.length < PAGE ? 'none' : '';
  }
  load();
  ch = sb.channel('forum-live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, debounce(() => { if (f.page === 0) load(); }, 800)).subscribe();
  return () => ch && sb.removeChannel(ch);
}
function card(p, reload) {
  let opened = false, loaded = false;
  const bodyEl = body(p.body); bodyEl.classList.add('post-body', 'clamp');
  const content = h('div'), hintBox = h('div');
  const detail = h('div', { class: 'pdetail', style: 'display:none' }, content, hintBox);
  const meta = h('span', { class: 'post-meta' });
  const viewBtn = h('button', { class: 'abtn primary', 'aria-expanded': 'false', onclick: () => show() });
  const likeBtn = h('button', { class: 'abtn', title: 'Thích bài này', onclick: like });
  const paint = () => {
    meta.textContent = `💬 ${p.answer_count} trả lời · 👍 ${p.like_count} thích`;
    viewBtn.textContent = opened ? '▲ Thu gọn' : `👁 Xem câu hỏi & ${p.answer_count} trả lời`;
    likeBtn.textContent = `👍 Thích (${p.like_count})`;
  };
  async function show(force) {
    opened = force ?? !opened; viewBtn.setAttribute('aria-expanded', opened);
    bodyEl.classList.toggle('clamp', !opened); detail.style.display = opened ? '' : 'none'; paint();
    if (opened && !loaded) { loaded = true; await fill(); }
    if (!opened) card_el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  async function afterReply() { if (!opened) { loaded = false; await show(true); } else { loaded = true; await fill(); } }
  async function like() {
    if (!S.user) return toast('Đăng nhập để thích bài.', 'error');
    const { error } = await sb.from('post_likes').insert({ post_id: p.id, user_id: S.user.id });
    if (error) { await sb.from('post_likes').delete().match({ post_id: p.id, user_id: S.user.id }); p.like_count = Math.max(0, p.like_count - 1); } else p.like_count++;
    paint();
  }
  const replyBtn = () => h('button', { class: 'abtn hot', onclick: () => S.user ? reply(p, afterReply) : toast('Hãy đăng nhập để trả lời (khách chỉ xem).', 'error') }, '💬 Viết câu trả lời');
  const aiBtn = h('button', { class: 'abtn', onclick: async () => { if (!opened) await show(true); hint(p, hintBox); hintBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }, '🤖 Gợi ý từ AI');
  async function fill() {
    content.innerHTML = '';
    (p.images || []).forEach(u => content.append(h('img', { class: 'preview-img', src: u, alt: 'Ảnh đính kèm', loading: 'lazy' })));
    const head = h('div', { class: 'row ans-head' }), ans = h('div'); content.append(head, ans);
    const { data } = await sb.from('answers_view').select('*').eq('post_id', p.id).order('created_at');
    p.answer_count = data?.length || 0; paint();
    head.append(h('h4', { class: 'sp' }, `💬 Câu trả lời (${p.answer_count})`), replyBtn());
    (data || []).forEach(a => ans.append(answer(a, p, fill)));
    if (!data?.length) ans.append(h('div', { class: 'solid empty-ans' }, 'Chưa có câu trả lời nào. Hãy là người đầu tiên giúp bạn học này!'));
    const bottom = h('div', { class: 'actions' }, replyBtn(), h('button', { class: 'abtn', onclick: () => show(false) }, '▲ Thu gọn'));
    if (S.user?.id === p.author_id) bottom.append(h('button', { class: 'abtn danger', onclick: async () => { if (confirm('Xóa bài này?')) { await sb.from('posts').delete().eq('id', p.id); reload(); } } }, '🗑 Xóa bài'));
    if (S.user) bottom.append(h('button', { class: 'abtn', onclick: async () => { const { error } = await sb.from('post_reports').insert({ post_id: p.id, user_id: S.user.id }); toast(error ? 'Bạn đã báo cáo bài này rồi.' : 'Đã gửi báo cáo, cảm ơn bạn.', error ? 'info' : 'ok'); } }, '⚑ Báo cáo'));
    content.append(bottom);
  }
  paint();
  const card_el = h('article', { class: 'glass post post-card hover-lift' },
    h('div', { class: 'row' }, author(p), h('span', { class: 'sp' }), h('span', { class: 'muted' }, ago(p.created_at))),
    h('h3', { class: 'post-title', role: 'button', tabindex: 0, onclick: () => show(), onkeydown: e => e.key === 'Enter' && show() }, p.title, p.solved_answer_id ? h('span', { class: 'okc' }, ' ✔ Đã giải') : null),
    h('div', { class: 'row' }, p.chapter ? h('span', { class: 'chip' }, 'Chương ' + p.chapter) : null, (p.tags || []).map(t => h('span', { class: 'chip' }, '#' + t)), meta),
    bodyEl,
    h('div', { class: 'actions' }, viewBtn, replyBtn(), likeBtn, aiBtn),
    detail);
  return card_el;
}
function answer(a, p, refresh) {
  const mine = S.user?.id === p.author_id, chosen = p.solved_answer_id === a.id;
  return h('div', { class: 'answer' + (chosen ? ' chosen' : '') },
    h('div', { class: 'row' }, author(a), h('span', { class: 'sp' }), chosen ? h('span', { class: 'okc' }, '✔ Câu trả lời được chọn') : null, h('span', { class: 'muted' }, ago(a.created_at))),
    body(a.body), (a.images || []).map(u => h('img', { class: 'preview-img', src: u, alt: 'Ảnh' })),
    h('div', { class: 'actions' },
      mine && !chosen ? h('button', { class: 'abtn ok', onclick: async () => { await sb.from('posts').update({ solved_answer_id: a.id }).eq('id', p.id); p.solved_answer_id = a.id; refresh(); } }, '✔ Chọn làm lời giải') : null,
      S.user?.id === a.author_id ? h('button', { class: 'abtn danger', onclick: async () => { if (confirm('Xóa câu trả lời này?')) { await sb.from('answers').delete().eq('id', a.id); refresh(); } } }, '🗑 Xóa') : null));
}
async function hint(p, detail) {
  if (!aiReady()) return toast('Chức năng AI chưa được kết nối. Hãy nhập khóa ở nút "Khóa AI".', 'error', 5000);
  const w = h('div', { class: 'solid', style: 'border-color:#38bdf8' }, '⏳ AI Classroom đang nghĩ…'); detail.innerHTML = ''; detail.append(w);
  try { const t = await gen({ system: PERSONA + '\nChỉ GỢI Ý HƯỚNG GIẢI cho bài đăng diễn đàn: nêu dạng bài, kiến thức, công thức và các bước tiếp cận. TUYỆT ĐỐI không đưa đáp án cuối.', user: `${p.title}\n${p.body}`, temperature: .3 }); w.innerHTML = ''; w.append(h('b', {}, '🤖 Gợi ý từ AI Classroom'), h('div', { class: 'muted' }, '(Không phải câu trả lời của thành viên)'), body(t)); }
  catch (e) { w.innerHTML = ''; w.append(h('span', { class: 'err' }, friendly(e))); }
}
// ---- trình soạn thảo có dán ảnh, kéo thả, xem trước song song ----
function composer({ placeholder, rows = 7 }) {
  const urls = []; const mi = mathInput({ placeholder, rows, mic: true }); const tray = h('div', { class: 'row' });
  const add = async file => {
    try { if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Chỉ nhận ảnh .png, .jpg, .webp'); const r = await prepImage(file); const label = h('span', { class: 'chip' }, 'Đang tải ảnh…'); tray.append(label);
      const u = await uploadImage(dataUrlToBlob(r.dataUrl)); urls.push(u); label.remove(); tray.append(h('span', { class: 'row' }, h('img', { src: u, style: 'height:60px;border-radius:8px', alt: 'Ảnh đính kèm' }), h('button', { class: 'btn alt sm', onclick: ev => { urls.splice(urls.indexOf(u), 1); ev.target.parentElement.remove(); } }, '✕'))); }
    catch (e) { toast(e.message, 'error'); tray.lastChild?.textContent === 'Đang tải ảnh…' && tray.lastChild.remove(); }
  };
  mi.ta.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])].filter(x => x.type.startsWith('image/')); if (fs.length) { e.preventDefault(); fs.forEach(add); } });
  mi.ta.addEventListener('dragover', e => e.preventDefault()); mi.ta.addEventListener('drop', e => { e.preventDefault(); [...e.dataTransfer.files].forEach(add); });
  const pick = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', multiple: true, style: 'display:none', onchange: e => [...e.target.files].forEach(add) });
  const el = h('div', {}, mi.el, h('div', { class: 'row', style: 'margin:8px 0' }, h('button', { class: 'btn alt sm', type: 'button', onclick: () => pick.click() }, '🖼 Đính kèm ảnh'), h('span', { class: 'muted' }, 'Dán ảnh bằng Ctrl+V / Cmd+V hoặc kéo thả. Đừng đưa thông tin cá nhân vào ảnh.'), pick), tray);
  return { el, mi, urls };
}
function editor(reload) {
  const title = h('input', { placeholder: 'Tiêu đề bài toán', maxlength: 160 }); const tags = h('input', { placeholder: 'Tag (cách nhau bằng dấu phẩy), ví dụ: bayes, kiểm định' });
  const chap = h('select', {}, h('option', { value: '' }, 'Chọn chương'), CHAPTERS.map((c, i) => h('option', { value: i + 1 }, `Chương ${i + 1}: ${c}`))); const c = composer({ placeholder: 'Nội dung câu hỏi. Dùng thanh ký hiệu để chèn công thức; khung bên dưới là xem trước.' });
  const btn = h('button', { class: 'btn hot', onclick: async () => {
    if (title.value.trim().length < 5 || c.mi.value.trim().length < 5) return toast('Hãy nhập tiêu đề và nội dung (tối thiểu 5 ký tự).', 'error');
    busy(btn, true, 'Đang đăng…'); const { error } = await sb.from('posts').insert({ author_id: S.user.id, title: title.value.trim(), body: c.mi.value.trim(), chapter: chap.value ? +chap.value : null, tags: tags.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 5), images: c.urls });
    busy(btn, false); if (error) return toast(/rate|limit/i.test(error.message) ? 'Bạn đăng quá nhanh, hãy đợi một chút.' : 'Không đăng được: ' + error.message, 'error', 6000); toast('Đã đăng câu hỏi!', 'ok'); m.close(); reload(); } }, 'Đăng');
  const m = modal(h('div', {}, h('h3', {}, 'Đăng câu hỏi'), title, h('div', { class: 'row', style: 'margin-top:8px' }, chap, tags), c.el, h('div', { class: 'row', style: 'margin-top:10px' }, btn, h('button', { class: 'btn alt', onclick: () => m.close() }, 'Hủy'))), { onClose: () => c.mi.destroy() });
}
function reply(p, refresh) {
  const c = composer({ placeholder: 'Viết câu trả lời…', rows: 5 });
  const btn = h('button', { class: 'btn hot', onclick: async () => { if (c.mi.value.trim().length < 2) return toast('Câu trả lời đang trống.', 'error'); busy(btn, true); const { error } = await sb.from('answers').insert({ post_id: p.id, author_id: S.user.id, body: c.mi.value.trim(), images: c.urls }); busy(btn, false); if (error) return toast('Không gửi được: ' + error.message, 'error'); m.close(); refresh(); } }, 'Gửi trả lời');
  const m = modal(h('div', {}, h('h3', {}, 'Trả lời: ' + p.title), c.el, h('div', { class: 'row', style: 'margin-top:10px' }, btn, h('button', { class: 'btn alt', onclick: () => m.close() }, 'Hủy'))), { onClose: () => c.mi.destroy() });
}
