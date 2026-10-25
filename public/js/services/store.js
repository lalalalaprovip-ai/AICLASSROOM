// storageService + logService: nhật ký học và sao. Đã đăng nhập -> Supabase (+ bản nháp cục bộ); khách -> bộ nhớ tạm.
import { LS } from '../config.js';
import { sb, S } from './supa.js';
const mem = {}; // dự phòng khi localStorage bị chặn
export const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch { return k in mem ? mem[k] : d; } };
export const lsSet = (k, v) => { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const lk = () => LS.log + '_' + (S.user?.id || 'guest');
export async function addLog(e) {
  const rec = { created_at: new Date().toISOString(), source: 'bai_tap', result: 'dung', topic: '', chapter: null, hint_level: 0, error_label: null, note: '', ...e };
  if (S.guest || !S.user) { const l = (mem[lk()] ||= []); l.push(rec); return; }
  const l = lsGet(lk(), []); l.push(rec); lsSet(lk(), l.slice(-300));
  sb.from('study_logs').insert({ user_id: S.user.id, ...rec }).then(() => { });
}
export async function getLogs() {
  if (S.guest || !S.user) return mem[lk()] || [];
  const { data } = await sb.from('study_logs').select('*').eq('user_id', S.user.id).order('created_at', { ascending: true }).limit(1000);
  return data?.length ? data : lsGet(lk(), []);
}
export const getStars = () => lsGet(LS.stars, 10);
export const setStars = n => lsSet(LS.stars, Math.max(0, n));
