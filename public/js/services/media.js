// mediaService + OCR: camera, ảnh, PDF, Word, nhận diện đề (Gemini vision hai lượt, dự phòng Tesseract.js).
import { loadScript } from './ui.js';
import { gen, parseJSON, EXTRACT_SYS, aiReady, AIError } from './ai.js';
export const LIMITS = { maxMB: 10, maxImages: 4, maxPdfPages: 5, maxSide: 2048 };
const CDN = { pdf: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js', pdfw: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js', mammoth: 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js', tess: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js' };
export class MediaError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

export function checkFile(f) {
  const ok = /^image\/(jpeg|png|webp)$/.test(f.type) || f.type === 'application/pdf' || /\.docx$/i.test(f.name);
  if (/heic|heif/i.test(f.type + f.name)) throw new MediaError('FILE_INVALID', 'Ảnh HEIC của iPhone chưa đọc được. Hãy chọn lại dạng JPG hoặc chụp trực tiếp bằng nút Camera của web.');
  if (!ok || f.size > LIMITS.maxMB * 1048576) throw new MediaError('FILE_INVALID', `Tệp không hợp lệ. Hỗ trợ ảnh JPG, PNG, WEBP, PDF, Word (.docx), tối đa ${LIMITS.maxMB} MB.`);
}
// sửa hướng EXIF + thu nhỏ + cảnh báo chất lượng
export async function prepImage(src, { png = false } = {}) {
  let bmp;
  try { bmp = await createImageBitmap(src, { imageOrientation: 'from-image' }); }
  catch { bmp = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(src); }).catch(() => { throw new MediaError('IMAGE_UNREADABLE', 'Không đọc được ảnh này. Hãy thử ảnh khác.'); }); }
  const w0 = bmp.width, h0 = bmp.height, sc = Math.min(1, LIMITS.maxSide / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * sc); c.height = Math.round(h0 * sc);
  const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data; let sum = 0, n = 0; for (let i = 0; i < d.length; i += 160) { sum += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; n++; }
  const warn = []; if (sum / n < 55) warn.push('Ảnh khá tối, nên chụp lại ở nơi đủ sáng.'); if (Math.max(c.width, c.height) < 600) warn.push('Ảnh nhỏ (dưới 600 px), có thể đọc sai.');
  return { dataUrl: c.toDataURL(png ? 'image/png' : 'image/jpeg', .9), warn };
}
// Camera
export async function openCamera(video, facing = 'environment') {
  if (!navigator.mediaDevices?.getUserMedia) throw new MediaError('NOT_SUPPORTED', 'Trình duyệt này chưa hỗ trợ camera (cần HTTPS). Bạn có thể chọn ảnh từ thiết bị.');
  try { const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 } }, audio: false }); video.srcObject = s; await video.play(); return s; }
  catch (e) { throw new MediaError(e.name === 'NotAllowedError' ? 'NO_PERMISSION' : 'NOT_SUPPORTED', e.name === 'NotAllowedError' ? 'Bạn chưa cho phép dùng camera. Hãy bật quyền trong cài đặt trình duyệt, hoặc chọn ảnh từ thiết bị.' : 'Không mở được camera trên thiết bị này.'); }
}
export const stopCamera = s => s?.getTracks().forEach(t => t.stop());
export function snap(video) { const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0); return new Promise(ok => c.toBlob(ok, 'image/jpeg', .92)); }
// PDF
export async function pdfToImages(file, onProgress) {
  await loadScript(CDN.pdf); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = CDN.pdfw;
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise; const n = Math.min(pdf.numPages, LIMITS.maxPdfPages); const images = []; let hint = '';
  for (let p = 1; p <= n; p++) {
    onProgress?.(p, n); const pg = await pdf.getPage(p); const vp = pg.getViewport({ scale: 2 }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; images.push(c.toDataURL('image/jpeg', .9));
    hint += (await pg.getTextContent()).items.map(i => i.str).join(' ') + '\n';
  }
  return { images, hint: hint.trim(), total: pdf.numPages };
}
// Word
export async function docxRead(file) {
  await loadScript(CDN.mammoth); const buf = await file.arrayBuffer(); const imgs = [];
  const html = await window.mammoth.convertToHtml({ arrayBuffer: buf }, { convertImage: window.mammoth.images.imgElement(async im => { const b = await im.read('base64'); imgs.push(`data:${im.contentType};base64,${b}`); return { src: '' }; }) });
  const raw = await window.mammoth.extractRawText({ arrayBuffer: buf });
  return { text: raw.value.trim(), images: imgs, warn: 'Công thức Word (OMML) chưa tự chuyển sang LaTeX; hãy kiểm tra kỹ phần công thức ở bước xác nhận.' };
}
// Tesseract (dự phòng khi chưa có khóa AI): chỉ đọc chữ, KHÔNG đọc chuẩn công thức
export async function tesseractRead(images, onProgress) {
  await loadScript(CDN.tess); let out = '';
  const worker = await window.Tesseract.createWorker('vie+eng', 1, { logger: m => m.status === 'recognizing text' && onProgress?.(Math.round(m.progress * 100)) });
  try { for (const im of images) out += (await worker.recognize(im)).data.text + '\n'; } finally { await worker.terminate(); }
  return out.trim();
}
// ---- Trích xuất đề bằng AI thị giác, hai lượt, so sánh bằng mã ----
const digits = t => (String(t).replace(/\\\(|\\\)|\\\[|\\\]/g, '').match(/\d+(?:[.,]\d+)?/g) || []).sort().join('|');
function checkLatex(t) {
  const problems = []; const o = (t.match(/\\\(/g) || []).length, c = (t.match(/\\\)/g) || []).length; if (o !== c) problems.push('Dấu \\( \\) không cân bằng');
  for (const m of t.matchAll(/\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g)) { try { window.katex.renderToString(m[1] || m[2], { throwOnError: true, strict: 'ignore' }); } catch { problems.push('Công thức lỗi: ' + (m[1] || m[2]).slice(0, 40)); } }
  return problems;
}
export async function extractProblem(images, { hint = '', twoPass = true, onStage } = {}) {
  const base = 'Hãy chép lại nội dung toán trong ảnh theo đúng schema. ' + (hint ? 'Lớp chữ của PDF để đối chiếu (có thể thiếu công thức): ' + hint.slice(0, 3000) : '');
  onStage?.('Đang đọc đề (lượt 1)…');
  const r1 = parseJSON(await gen({ system: EXTRACT_SYS, user: base, images, json: true, temperature: .1 }));
  let r2 = null;
  if (twoPass) { try { onStage?.('Đang đọc lại độc lập (lượt 2)…'); r2 = parseJSON(await gen({ system: EXTRACT_SYS, user: 'Đọc ảnh một lần nữa, thật cẩn thận từng chữ số, dấu và chỉ số, rồi xuất JSON theo schema. ' + (hint ? 'Gợi ý chữ PDF: ' + hint.slice(0, 2000) : ''), images, json: true, temperature: 0 })); } catch { r2 = null; } }
  const items = (r1.items || []).map(it => ({ ...it, uncertain_spans: [...(it.uncertain_spans || [])] }));
  if (r2?.items) {
    const t1 = items.map(i => i.text).join('\n'), t2 = r2.items.map(i => i.text).join('\n');
    if (digits(t1) !== digits(t2)) {
      const a = new Set(t1.match(/\d+(?:[.,]\d+)?/g) || []), b = new Set(t2.match(/\d+(?:[.,]\d+)?/g) || []);
      for (const v of a) if (!b.has(v) && items[0]) items[0].uncertain_spans.push({ text: v, reason: 'Hai lượt đọc khác nhau', candidates: [v, ...[...b].filter(x => !a.has(x)).slice(0, 2)] });
      for (const v of b) if (!a.has(v) && items[0] && !items[0].uncertain_spans.some(s => s.candidates?.includes(v))) items[0].uncertain_spans.push({ text: v, reason: 'Lượt 2 đọc thấy số khác', candidates: [v] });
    }
  }
  for (const it of items) { const p = checkLatex(it.text || ''); if (p.length) it.uncertain_spans.push({ text: it.text.slice(0, 30), reason: p[0], candidates: [] }); }
  const warnings = []; for (const g of r1.given_numbers || []) { const v = parseFloat(String(g.value).replace(',', '.')); if (/^p$|xác suất/i.test(g.name) && (v < 0 || v > 1)) warnings.push(`${g.name} = ${g.value} nằm ngoài [0, 1]`); if (/^n$/i.test(g.name) && (v < 0 || !Number.isInteger(v))) warnings.push(`Cỡ mẫu ${g.value} không hợp lệ`); }
  return { ...r1, items, warnings };
}
