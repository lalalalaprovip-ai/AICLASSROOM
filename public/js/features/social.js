// Mạng xã hội học tập: hồ sơ, User Tag, link, QR, tìm bạn, kết bạn, chat 1-1 thời gian thực giữa người thật.
import { h, toast, busy, modal, ago, debounce } from '../services/ui.js';
import { sb, S, uploadImage, dataUrlToBlob, loadProfile } from '../services/supa.js';
import { avatarSvg, ANIMALS } from './avatars.js';
import { prepImage } from '../services/media.js';
import { mathHtml } from '../services/math.js';
import { symbolBar } from '../components.js';

export const profileUrl = id => `${location.origin}/profile/${id}`;
// QR: nền trắng #FFF, module đen #000, quiet zone 4 module, ECC M, >= 220px, KHÔNG hiệu ứng nào lên mã
export function qrCanvas(text, px = 8) {
  const q = window.qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), Q = 4, size = (n + 2 * Q) * px;
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, size, size); x.fillStyle = '#000000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + Q) * px, (r + Q) * px, px, px);
  return c;
}
const copy = async (t, ok) => { try { await navigator.clipboard.writeText(t); toast(ok, 'ok'); } catch { prompt('Hãy chọn và sao chép thủ công:', t); } };
const gate = box => { if (S.user) return false; box.append(h('div', { class: 'glass' }, h('h2', {}, 'Cần đăng nhập'), h('p', {}, 'Khách chỉ xem được diễn đàn. Hãy đăng nhập để tìm bạn, kết bạn và nhắn tin.'))); return true; };

export function friendsView(root) {
  const box = h('div', { class: 'wrap' }); root.append(box); if (gate(box)) return;
  const me = S.profile; let ch = null, presence = null, online = new Set(); const left = h('div'), right = h('div', { class: 'glass' }, h('p', { class: 'muted' }, 'Chọn một người bạn để bắt đầu trò chuyện.'));
  box.append(h('div', { class: 'grid g2', style: 'grid-template-columns:minmax(300px,380px) 1fr;align-items:start' }, left, right));
  const profBox = h('div', { class: 'glass' }), qrBox = h('div', { style: 'margin-top:10px' }); const res = h('div'), reqs = h('div'), fr = h('div');
  const search = h('input', { placeholder: 'Gõ User Tag, ví dụ @anbinh#2026', oninput: debounce(find, 300) });
  profBox.append(h('div', { class: 'row' }, h('span', { html: avatarSvg(me?.avatar, 64) }), h('div', {}, h('b', {}, me?.display_name || me?.username), h('div', { class: 'mono' }, me?.user_tag))),
    h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { class: 'btn alt sm', onclick: () => copy(me.user_tag, 'Đã sao chép User Tag') }, 'Sao chép mã'), h('button', { class: 'btn alt sm', onclick: () => copy(profileUrl(me.id), 'Đã sao chép link cá nhân') }, 'Sao chép link cá nhân'), h('button', { class: 'btn alt sm', onclick: showQR }, 'Mã QR'), h('button', { class: 'btn alt sm', onclick: pickAvatar }, 'Đổi avatar')), qrBox);
  left.append(profBox, h('div', { class: 'glass', style: 'margin-top:12px' }, h('h3', {}, 'Tìm bạn'), search, res), h('div', { class: 'glass', style: 'margin-top:12px' }, h('h3', {}, 'Lời mời'), reqs), h('div', { class: 'glass', style: 'margin-top:12px' }, h('h3', {}, 'Bạn bè'), fr));
  function showQR() { qrBox.innerHTML = ''; const url = profileUrl(me.id); const c = qrCanvas(url); const card = h('div', { class: 'qrcard' }, c); qrBox.append(card, h('div', { class: 'muted mono', style: 'word-break:break-all' }, url), h('div', { class: 'row' }, h('button', { class: 'btn alt sm', onclick: () => { const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'statverse-qr.png'; a.click(); } }, 'Tải mã QR (PNG)')), h('p', { class: 'muted' }, 'Quét bằng Google Lens hoặc Camera điện thoại để mở hồ sơ và kết bạn.')); }
  function pickAvatar() { const m = modal(h('div', {}, h('h3', {}, 'Chọn avatar'), h('div', { class: 'row' }, ANIMALS.map(a => h('button', { style: 'background:none;border:0;cursor:pointer', onclick: async () => { await sb.from('profiles').update({ avatar: a }).eq('id', me.id); await loadProfile(); m.close(); toast('Đã đổi avatar', 'ok'); location.reload(); } }, h('span', { html: avatarSvg(a, 72) })))))); }
  async function find() {
    const q = search.value.trim(); res.innerHTML = ''; if (q.length < 2) return;
    const { data } = await sb.from('profiles').select('id,user_tag,display_name,username,avatar').ilike('user_tag', '%' + q.replace(/[%_]/g, '') + '%').neq('id', me.id).limit(8);
    (data || []).forEach(p => res.append(h('div', { class: 'row solid', style: 'margin:6px 0' }, h('span', { html: avatarSvg(p.avatar, 36) }), h('div', { class: 'sp' }, h('b', {}, p.display_name || p.username), h('div', { class: 'muted mono' }, p.user_tag)), h('button', { class: 'btn sm', onclick: () => invite(p.id) }, 'Kết bạn'))));
    if (!data?.length) res.append(h('p', { class: 'muted' }, 'Không tìm thấy tài khoản nào.'));
  }
  async function refresh() {
    const { data } = await sb.from('friendships').select('*').or(`requester.eq.${me.id},addressee.eq.${me.id}`);
    const ids = [...new Set((data || []).flatMap(r => [r.requester, r.addressee]))].filter(i => i !== me.id);
    const { data: ps } = ids.length ? await sb.from('profiles').select('id,user_tag,display_name,username,avatar').in('id', ids) : { data: [] }; const P = Object.fromEntries((ps || []).map(p => [p.id, p]));
    reqs.innerHTML = ''; fr.innerHTML = '';
    for (const r of data || []) {
      const other = P[r.requester === me.id ? r.addressee : r.requester]; if (!other) continue; const row = (...k) => h('div', { class: 'row solid', style: 'margin:6px 0' }, h('span', { html: avatarSvg(other.avatar, 36) }), h('div', { class: 'sp' }, h('b', {}, other.display_name || other.username), h('div', { class: 'muted' }, other.user_tag)), ...k);
      if (r.status === 'pending' && r.addressee === me.id) reqs.append(row(h('button', { class: 'btn sm', onclick: async () => { await sb.from('friendships').update({ status: 'accepted' }).eq('id', r.id); refresh(); } }, 'Chấp nhận'), h('button', { class: 'btn alt sm', onclick: async () => { await sb.from('friendships').delete().eq('id', r.id); refresh(); } }, 'Từ chối')));
      else if (r.status === 'pending') reqs.append(row(h('span', { class: 'muted' }, 'Đã gửi'), h('button', { class: 'btn alt sm', onclick: async () => { await sb.from('friendships').delete().eq('id', r.id); refresh(); } }, 'Hủy')));
      else if (r.status === 'accepted') fr.append(row(h('span', { class: 'dot', style: `color:${online.has(other.id) ? '#34d399' : '#94a3b8'}` }, online.has(other.id) ? '● Trực tuyến' : '○ Ngoại tuyến'), h('button', { class: 'btn sm', onclick: () => openChat(other) }, 'Chat'), h('button', { class: 'btn alt sm', title: 'Hủy kết bạn', onclick: async () => { if (confirm('Hủy kết bạn?')) { await sb.from('friendships').delete().eq('id', r.id); refresh(); } } }, '✕'), h('button', { class: 'btn alt sm', title: 'Chặn', onclick: async () => { if (confirm('Chặn người này?')) { await sb.from('friendships').update({ status: 'blocked', requester: me.id, addressee: other.id }).eq('id', r.id); refresh(); } } }, '🚫')));
    }
    if (!reqs.children.length) reqs.append(h('p', { class: 'muted' }, 'Không có lời mời.')); if (!fr.children.length) fr.append(h('p', { class: 'muted' }, 'Chưa có bạn bè. Hãy tìm bạn bằng User Tag hoặc QR.'));
  }
  refresh();
  ch = sb.channel('fr-' + me.id).on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => { refresh(); }).subscribe();
  presence = sb.channel('online', { config: { presence: { key: me.id } } }).on('presence', { event: 'sync' }, () => { online = new Set(Object.keys(presence.presenceState())); refresh(); }).subscribe(async s => { if (s === 'SUBSCRIBED') await presence.track({ at: Date.now() }); });
  let chatCh = null;
  async function openChat(other) {
    chatCh && sb.removeChannel(chatCh); const log = h('div', { class: 'chatbox solid' }); const ta = h('textarea', { rows: 2, placeholder: 'Nhắn tin… (Ctrl+V để dán ảnh chụp màn hình)', style: 'min-height:56px' }); const typing = h('div', { class: 'muted', style: 'height:18px' });
    const E = ['👍', '❤️', '😂', '😮', '🤔', '🆘'], EL = ['Thích', 'Thả tim', 'Cười', 'Bất ngờ', 'Suy ngẫm', 'Cần hỗ trợ']; const seen = new Set();
    const draw = async m => {
      if (seen.has(m.id)) return; seen.add(m.id); const mine = m.sender === me.id; const d = h('div', { class: 'msg' + (mine ? ' me' : ''), 'data-id': m.id });
      if (m.body) d.append(h('div', { html: mathHtml(m.body) })); if (m.image_url) d.append(h('img', { src: m.image_url, alt: 'Ảnh', onclick: () => modal(h('img', { src: m.image_url, style: 'max-width:100%' })) }));
      d.append(h('div', { class: 'muted', style: 'font-size:.72rem' }, ago(m.created_at) + (mine ? (m.read_at ? ' · đã xem' : ' · đã gửi') : '')), h('div', { class: 'react', id: 'r' + m.id }), h('div', { class: 'row', style: 'gap:2px' }, E.map((e, i) => h('button', { title: EL[i], style: 'background:none;border:0;cursor:pointer;opacity:.7', onclick: async () => { const { data: ex } = await sb.from('reactions').select('emoji').match({ message_id: m.id, user_id: me.id }).maybeSingle(); if (ex?.emoji === e) await sb.from('reactions').delete().match({ message_id: m.id, user_id: me.id }); else await sb.from('reactions').upsert({ message_id: m.id, user_id: me.id, emoji: e }); paintReact(m.id); } }, e))));
      log.append(d); log.scrollTop = log.scrollHeight; paintReact(m.id); if (!mine && !m.read_at) sb.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id).then(() => { });
    };
    const paintReact = async id => { const { data } = await sb.from('reactions').select('emoji').eq('message_id', id); const el = log.querySelector('#r' + id); if (el) el.textContent = (data || []).map(x => x.emoji).join(' '); };
    const send = async (body, image_url) => { if (!body?.trim() && !image_url) return; const { error } = await sb.from('messages').insert({ sender: me.id, receiver: other.id, body: body?.trim() || null, image_url: image_url || null }); if (error) toast(/rate|limit/i.test(error.message) ? 'Bạn nhắn quá nhanh, hãy chậm lại một chút.' : 'Không gửi được: ' + error.message, 'error'); };
    const sendBtn = h('button', { class: 'btn', onclick: async () => { const t = ta.value; ta.value = ''; await send(t); } }, 'Gửi');
    ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); } else bc?.send({ type: 'broadcast', event: 'typing', payload: { from: me.id } }); };
    ta.addEventListener('paste', async e => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith('image/')); if (!f) return; e.preventDefault(); try { const r = await prepImage(f); toast('Đang gửi ảnh…'); await send('', await uploadImage(dataUrlToBlob(r.dataUrl), 'chat')); } catch (er) { toast(er.message, 'error'); } });
    const pic = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', style: 'display:none', onchange: async e => { const f = e.target.files[0]; if (!f) return; try { const r = await prepImage(f); await send('', await uploadImage(dataUrlToBlob(r.dataUrl), 'chat')); } catch (er) { toast(er.message, 'error'); } } });
    right.innerHTML = ''; right.append(h('div', { class: 'row' }, h('span', { html: avatarSvg(other.avatar, 44) }), h('div', {}, h('b', {}, other.display_name || other.username), h('div', { class: 'muted' }, 'Chat 1-1 giữa hai người học thật · không phải bot AI'))), log, typing, symbolBar(ta), ta, h('div', { class: 'row', style: 'margin-top:6px' }, sendBtn, h('button', { class: 'btn alt', onclick: () => pic.click() }, '🖼 Gửi ảnh'), pic));
    const { data } = await sb.from('messages').select('*').or(`and(sender.eq.${me.id},receiver.eq.${other.id}),and(sender.eq.${other.id},receiver.eq.${me.id})`).order('created_at').limit(200); (data || []).forEach(draw);
    const pair = [me.id, other.id].sort().join('_'); let bc = null;
    chatCh = sb.channel('dm-' + pair).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => { const m = p.new; if ((m.sender === me.id && m.receiver === other.id) || (m.sender === other.id && m.receiver === me.id)) draw(m); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, p => { const id = p.new?.message_id || p.old?.message_id; if (id) paintReact(id); })
      .on('broadcast', { event: 'typing' }, p => { if (p.payload.from === other.id) { typing.textContent = other.display_name + ' đang nhập…'; clearTimeout(typing._t); typing._t = setTimeout(() => typing.textContent = '', 1800); } }).subscribe(); bc = chatCh;
  }
  return () => { [ch, presence, chatCh].forEach(c => c && sb.removeChannel(c)); };
}
async function invite(id) {
  const { error } = await sb.from('friendships').insert({ requester: S.user.id, addressee: id, status: 'pending' });
  toast(error ? (/duplicate|unique/i.test(error.message) ? 'Đã có lời mời hoặc đã là bạn bè.' : 'Không gửi được: ' + error.message) : 'Đã gửi lời mời kết bạn!', error ? 'error' : 'ok');
}
// Hồ sơ công khai theo link/QR: /profile/<id>
export function publicProfile(root, id, { go }) {
  const box = h('div', { class: 'wrap' }); root.append(box); const c = h('div', { class: 'glass', style: 'max-width:480px;margin:6vh auto;text-align:center' }, 'Đang tải…'); box.append(c);
  sb.from('profiles').select('id,user_tag,display_name,username,avatar').eq('id', id).maybeSingle().then(({ data }) => {
    c.innerHTML = ''; if (!data) return c.append(h('h3', {}, 'Không tìm thấy hồ sơ'), h('button', { class: 'btn', onclick: () => go('/home') }, 'Về Trang chủ'));
    c.append(h('span', { html: avatarSvg(data.avatar, 96) }), h('h2', {}, data.display_name || data.username), h('div', { class: 'mono' }, data.user_tag),
      S.user ? (S.user.id === data.id ? h('p', { class: 'muted' }, 'Đây là hồ sơ của bạn.') : h('button', { class: 'btn hot', onclick: () => invite(data.id) }, 'Kết bạn')) : h('button', { class: 'btn hot', onclick: () => { sessionStorage.setItem('sv_after', '/profile/' + id); location.href = '/'; } }, 'Đăng nhập để kết bạn'),
      h('div', {}, h('button', { class: 'btn alt sm', style: 'margin-top:12px', onclick: () => go('/home') }, 'Về Trang chủ')));
  });
}
