import { SUPABASE_URL, SUPABASE_KEY, EMAIL_DOMAIN } from '../config.js';
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
export const S = { user: null, profile: null, guest: false };
const mail = u => `${u.toLowerCase()}@${EMAIL_DOMAIN}`;
export const validUser = u => /^[a-zA-Z0-9_]{3,20}$/.test(u);
export async function loadProfile() {
  if (!S.user) return null;
  for (let i = 0; i < 4; i++) { const { data } = await sb.from('profiles').select('*').eq('id', S.user.id).maybeSingle(); if (data) return (S.profile = data); await new Promise(r => setTimeout(r, 400)); }
  return null;
}
export async function restore() { const { data } = await sb.auth.getSession(); S.user = data.session?.user || null; if (S.user) await loadProfile(); return S.user; }
export async function signUp(username, password, avatar = 'cat') {
  const { data, error } = await sb.auth.signUp({ email: mail(username), password, options: { data: { username, avatar } } });
  if (error) throw new Error(/registered|exists/i.test(error.message) ? 'Tên người dùng đã có người dùng.' : /password/i.test(error.message) ? 'Mật khẩu chưa đủ mạnh (tối thiểu 6 ký tự).' : error.message);
  if (!data.session) throw new Error('Dự án Supabase đang bật xác nhận email. Hãy tắt "Confirm email" (xem README) rồi đăng ký lại.');
  S.user = data.user; return loadProfile();
}
export async function signIn(username, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: mail(username), password });
  if (error) throw new Error('Tên người dùng hoặc mật khẩu chưa đúng.'); S.user = data.user; return loadProfile();
}
export async function signOut() { await sb.auth.signOut(); S.user = null; S.profile = null; S.guest = false; }
export const loggedIn = () => !!S.user;
export const needLogin = () => { if (S.user) return false; return true; };
export async function uploadImage(blob, folder = 'forum') {
  const name = `${folder}/${S.user?.id || 'x'}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('forum-images').upload(name, blob, { contentType: blob.type || 'image/jpeg' });
  if (error) throw new Error('Không tải được ảnh: ' + error.message);
  return sb.storage.from('forum-images').getPublicUrl(name).data.publicUrl;
}
export const dataUrlToBlob = d => { const [m, b] = d.split(','); const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: /:(.*?);/.exec(m)[1] }); };
