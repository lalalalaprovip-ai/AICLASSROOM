import { initBg } from './bg.js';
import { h, $, toast, modal } from './services/ui.js';
import { restore, signOut, S, loadProfile } from './services/supa.js';
import { getKey, aiReady, getModel } from './services/ai.js';
import { keyGate } from './features/keygate.js';
import { welcome } from './features/auth.js';
import { avatarSvg } from './features/avatars.js';
import { mountChatbot, chatbotVisible, chatbotRoute } from './features/chatbot.js';
import { solveView } from './features/solve.js';
import { forumView } from './features/forum.js';
import { friendsView, publicProfile } from './features/social.js';
import { mindmapView } from './features/mindmap.js';
import { reviewView } from './features/review.js';
import { gamesView } from './features/games.js';
import { homeView, processView, laplaceView, graphsView, tutorView } from './features/pages.js';

const app = $('#app'); let dispose = null;
const ROUTES = { '/home': homeView, '/solve': solveView, '/forum': forumView, '/friends': friendsView, '/review': reviewView, '/games': gamesView, '/process': processView, '/laplace': laplaceView, '/graphs': graphsView, '/tutor': tutorView, '/mindmap': mindmapView };
export const go = p => { if (location.pathname.startsWith('/profile/')) history.replaceState(null, '', '/'); location.hash = '#' + p; if (location.hash === '#' + p) route(); };
const pathNow = () => location.pathname.startsWith('/profile/') ? location.pathname : (location.hash.slice(1) || '/home');

function goBack() { const from = pathNow(); history.back(); setTimeout(() => { if (pathNow() === from) go('/home'); }, 250); }
function shell() {
  app.innerHTML = '';
  const link = (p, t) => h('a', { href: '#' + p, 'data-p': p }, t);
  const acc = h('button', { class: 'link', onclick: accountMenu }, S.profile ? [h('span', { html: avatarSvg(S.profile.avatar, 26), style: 'vertical-align:middle' }), ' ', S.profile.display_name || S.profile.username] : '👤 Khách');
  app.append(h('nav', { class: 'nav', 'aria-label': 'Điều hướng chính' }, h('button', { class: 'link back', id: 'backbtn', 'aria-label': 'Quay lại trang trước', onclick: goBack }, '← Quay lại'), h('a', { href: '#/home', class: 'logo' }, 'Σ AI Classroom'), link('/graphs', 'Giải Toán & Đồ Thị'), link('/process', 'Quy Trình 4 Bước'), link('/laplace', 'Giá Trị Hàm Laplace'), link('/forum', 'Diễn đàn'), link('/tutor', 'TUTOR'),
    h('div', { class: 'group' }, link('/solve', 'Giải bài'), link('/games', 'Chơi trò chơi'), link('/review', 'Ôn tập')), h('span', { style: 'flex:1' }),
    h('button', { class: 'link', onclick: openKey, title: aiReady() ? 'Model: ' + getModel() : 'Chưa kết nối AI' }, aiReady() ? '🔑 AI: ' + getModel().slice(0, 18) : '🔑 Khóa AI'), acc, h('a', { href: '#/solve', class: 'btn hot sm', style: 'color:#fff' }, 'Giải Đề Ngay')), h('main', { id: 'view' }));
}
function openKey() { const m = modal(keyGate({ canSkip: true, closable: true, onDone: ok => { m.close(); if (ok) shell(), route(); } })); }
function accountMenu() {
  const m = modal(h('div', { style: 'text-align:center' }, S.profile ? [h('span', { html: avatarSvg(S.profile.avatar, 80) }), h('h3', {}, S.profile.display_name || S.profile.username), h('div', { class: 'mono' }, S.profile.user_tag), h('div', { class: 'row', style: 'justify-content:center;margin-top:12px' }, h('button', { class: 'btn', onclick: () => { m.close(); go('/friends'); } }, '👥 Bạn bè & QR'), h('button', { class: 'btn alt', onclick: async () => { await signOut(); m.close(); start(); } }, 'Đăng xuất'))] : [h('h3', {}, 'Tài khoản khách'), h('p', {}, 'Dữ liệu chỉ lưu tạm và mất khi đóng trình duyệt. Khách không đăng bài, kết bạn hay nhắn tin được.'), h('button', { class: 'btn hot', onclick: async () => { await signOut(); m.close(); start(); } }, 'Đăng nhập / Đăng ký')]));
}
async function route() {
  if (!$('#view')) return; dispose?.(); dispose = null; const v = $('#view'); v.innerHTML = ''; const p = pathNow();
  document.querySelectorAll('.nav a[data-p]').forEach(a => a.classList.toggle('on', a.dataset.p === p));
  const bb = $('#backbtn'); if (bb) bb.style.display = p === '/home' ? 'none' : ''; chatbotVisible(true); chatbotRoute(p); window.scrollTo(0, 0);
  try {
    if (p.startsWith('/profile/')) dispose = publicProfile(v, p.split('/')[2], { go });
    else { const f = ROUTES[p] || ROUTES['/home']; dispose = await f(v, { go }); }
  } catch (e) { console.error(e); v.append(h('div', { class: 'wrap' }, h('div', { class: 'glass' }, h('h3', {}, 'Có lỗi khi mở trang này'), h('p', { class: 'muted' }, 'Hãy tải lại trang. Nếu lỗi lặp lại, kiểm tra kết nối mạng.')))); }
}
window.addEventListener('hashchange', route);
function enter() { shell(); const after = sessionStorage.getItem('sv_after'); if (after && S.user) { sessionStorage.removeItem('sv_after'); history.replaceState(null, '', after); } route(); }
async function start() {
  chatbotVisible(false); app.innerHTML = '';
  await restore();
  // 1) khóa AI -> 2) đăng nhập/đăng ký -> 3) ứng dụng
  const needKey = !getKey() && !sessionStorage.getItem('sv_skipkey');
  const authStep = () => { if (S.user || S.guest) return enter(); app.append(welcome({ onEnter: () => { app.innerHTML = ''; enter(); } })); };
  if (needKey && !S.user) { app.append(h('div', { class: 'wrap', style: 'padding-top:6vh' }, h('h1', { class: 'big', style: 'text-align:center' }, 'AI Classroom'), keyGate({ onDone: ok => { if (!ok) sessionStorage.setItem('sv_skipkey', '1'); app.innerHTML = ''; authStep(); } }))); }
  else authStep();
}
initBg(); mountChatbot(go);
start();
