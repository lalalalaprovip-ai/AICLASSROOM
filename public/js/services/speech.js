// speechService: nghe (liên tục, KHÔNG tự tắt) + đọc tiếng Việt.
import { toSpeech } from './math.js';
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const canListen = () => !!SR;

const FATAL = {
  'not-allowed': ['NO_PERMISSION', 'Bạn chưa cho phép dùng micro. Hãy bật quyền micro trong cài đặt trình duyệt, hoặc gõ chữ trực tiếp.'],
  'service-not-allowed': ['NO_PERMISSION', 'Trình duyệt không cho dùng dịch vụ nhận giọng nói. Hãy bật quyền micro hoặc gõ chữ trực tiếp.'],
  'audio-capture': ['NO_MIC', 'Không tìm thấy micro. Hãy cắm/bật micro rồi bấm lại.'],
  'language-not-supported': ['NO_LANG', 'Trình duyệt chưa hỗ trợ nhận giọng tiếng Việt. Hãy dùng Chrome hoặc Edge bản mới.']
};

export class Listener {
  constructor({ onText, onState, onError, lang = 'vi-VN' }) {
    Object.assign(this, { onText, onState, onError, lang, base: '', sess: '', itm: '', stopped: true, muted: false, rec: null, fails: 0 });
  }
  start(initial = '') {
    if (!SR) { this.onError?.('NOT_SUPPORTED', 'Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy dùng Chrome hoặc Edge, hoặc gõ chữ trực tiếp.'); return false; }
    stopSpeak(); // tránh micro thu lại tiếng loa
    this.base = initial ? initial.replace(/\s*$/, ' ') : ''; this.sess = ''; this.itm = '';
    this.stopped = false; this.muted = false; this.fails = 0; this._open(); return true;
  }
  _open() {
    const r = new SR(); this.rec = r; r.lang = this.lang; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onstart = () => { if (this.rec === r) this.onState?.('listening'); };
    r.onresult = e => {
      if (this.rec !== r || this.muted) return;
      let fin = '', itm = '';
      for (let i = 0; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else itm += t; }
      this.sess = fin; this.itm = itm; this.fails = 0; this.onText?.(this.base + fin, itm);
    };
    r.onerror = e => {
      if (this.rec !== r) return;
      const f = FATAL[e.error];
      if (f) { this.stopped = true; this.onState?.('idle'); this.onError?.(f[0], f[1]); }
      else if (e.error === 'network' && ++this.fails > 4) { this.stopped = true; this.onState?.('idle'); this.onError?.('NETWORK', 'Mất kết nối dịch vụ nhận giọng nói. Hãy kiểm tra mạng rồi bấm micro lại.'); }
      // 'no-speech' / 'aborted': bỏ qua, onend sẽ tự mở lại
    };
    r.onend = () => { // Chrome tự ngắt sau một lúc im lặng -> mở lại cho tới khi người dùng bấm tắt
      if (this.rec !== r) return;
      const tail = this.sess || this.itm; // giữ cả chữ còn ở dạng tạm
      if (tail && !this.muted) this.base += tail.replace(/\s*$/, ' ');
      this.sess = ''; this.itm = '';
      if (!this.stopped) setTimeout(() => { if (!this.stopped) { try { this._open(); } catch { setTimeout(() => !this.stopped && this._open(), 500); } } }, 150);
      else this.onState?.('idle');
    };
    try { r.start(); } catch { /* đã chạy */ }
  }
  // discard = true: bỏ mọi kết quả về muộn (dùng khi vừa gửi tin để ô nhập không bị điền lại)
  stop(discard = false) {
    this.stopped = true; if (discard) this.muted = true;
    try { discard ? this.rec?.abort() : this.rec?.stop(); } catch { }
    this.onState?.('idle');
  }
  get active() { return !this.stopped; }
}

// ---------------- Đọc thành tiếng ----------------
let voices = [], token = 0, current = null; // current: giữ tham chiếu để Chrome không dọn utterance
const loadVoices = () => { try { voices = speechSynthesis.getVoices(); } catch { } };
if (typeof speechSynthesis !== 'undefined') { loadVoices(); speechSynthesis.addEventListener?.('voiceschanged', loadVoices); }
const isVi = v => /^vi([-_]|$)/i.test(v.lang);
const viVoice = () => { loadVoices(); return voices.find(v => isVi(v) && /google|online|natural/i.test(v.name)) || voices.find(isVi); };
const waitVoices = ms => new Promise(ok => {
  loadVoices(); if (voices.length) return ok();
  const t = setTimeout(ok, ms);
  speechSynthesis.addEventListener('voiceschanged', () => { clearTimeout(t); loadVoices(); ok(); }, { once: true });
});
const delay = ms => new Promise(r => setTimeout(r, ms));

export function stopSpeak() { token++; current = null; try { speechSynthesis.cancel(); } catch { } }

export async function speak(text, { rate = .95, onend, onWarn } = {}) {
  if (typeof speechSynthesis === 'undefined') { onWarn?.('Trình duyệt chưa hỗ trợ đọc thành tiếng.'); return; }
  const wasBusy = speechSynthesis.speaking || speechSynthesis.pending;
  stopSpeak(); const my = token;
  const plain = toSpeech(text); if (!plain) return;
  if (!voices.length) { await waitVoices(800); if (my !== token) return; }
  if (wasBusy) { await delay(120); if (my !== token) return; } // Chrome bỏ qua speak() ngay sau cancel()
  const v = viVoice();
  if (!v) onWarn?.('Thiết bị chưa có giọng đọc tiếng Việt nên có thể nghe không đúng tiếng. Hãy cài giọng "Tiếng Việt" trong cài đặt hệ thống, hoặc dùng Microsoft Edge (có sẵn giọng Việt trực tuyến).');
  const chunks = (plain.match(/[^.!?;:]+[.!?;:]?/g) || [plain])
    .flatMap(s => s.length > 170 ? (s.match(/.{1,160}(\s|$)/g) || [s]) : [s])
    .map(s => s.trim()).filter(s => /[\p{L}\d]/u.test(s)); // bỏ chunk rỗng/chỉ dấu câu (không phát onend)
  if (!chunks.length) return;
  let i = 0;
  const next = () => {
    if (my !== token) return;
    if (i >= chunks.length) { current = null; onend?.(); return; }
    const u = new SpeechSynthesisUtterance(chunks[i++]); current = u;
    u.lang = 'vi-VN'; if (v) u.voice = v; u.rate = rate;
    u.onend = next;
    u.onerror = e => {
      if (my !== token || e.error === 'interrupted' || e.error === 'canceled') return;
      if (['language-unavailable', 'voice-unavailable', 'synthesis-unavailable', 'not-allowed'].includes(e.error)) {
        stopSpeak(); onWarn?.('Không đọc được tiếng Việt (' + e.error + '). Hãy cài giọng Tiếng Việt hoặc thử trình duyệt khác.'); return;
      }
      next();
    };
    speechSynthesis.speak(u);
  };
  try { speechSynthesis.resume(); } catch { }
  next();
}
