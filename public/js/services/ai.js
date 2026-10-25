// aiClient: gọi Gemini trực tiếp bằng khóa của từng người dùng (lưu ở trình duyệt của họ).
import { LS } from '../config.js';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
export class AIError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
export const getKey = () => localStorage.getItem(LS.key) || '';
export const getModel = () => localStorage.getItem(LS.model) || '';
export const setKey = k => localStorage.setItem(LS.key, k.trim());
export const setModel = m => localStorage.setItem(LS.model, m);
export const clearKey = () => { localStorage.removeItem(LS.key); localStorage.removeItem(LS.model); };
export const aiReady = () => !!(getKey() && getModel());

async function req(url, opt = {}, ms = 60000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opt, signal: ac.signal }); }
  catch (e) { throw new AIError(e.name === 'AbortError' ? 'AI_TIMEOUT' : 'NETWORK', e.name === 'AbortError' ? 'AI phản hồi quá lâu. Bạn thử lại nhé.' : 'Không kết nối được tới Google AI. Kiểm tra mạng và thử lại.'); }
  finally { clearTimeout(t); }
}
async function fail(r) {
  let msg = ''; try { msg = (await r.json()).error?.message || ''; } catch { }
  if (r.status === 400 && /API key/i.test(msg)) throw new AIError('KEY_INVALID', 'Khóa API không hợp lệ. Hãy kiểm tra lại khóa lấy từ Google AI Studio.');
  if (r.status === 403) throw new AIError('KEY_DENIED', 'Khóa API bị từ chối (chưa bật quyền hoặc bị giới hạn khu vực).');
  if (r.status === 404) throw new AIError('MODEL_404', 'Mô hình này không dùng được. Hãy chọn mô hình khác ở nút "Khóa AI".');
  if (r.status === 429) throw new AIError('QUOTA', 'Khóa miễn phí đã hết lượt trong phút/ngày này. Đợi một chút hoặc đổi mô hình khác.');
  throw new AIError('AI_ERROR', 'AI đang gặp sự cố (' + r.status + '). ' + (msg ? msg.slice(0, 140) : 'Bạn thử lại nhé.'));
}
export async function listModels(key) {
  let out = [], tok = '';
  do {
    const r = await req(`${BASE}/models?pageSize=100${tok ? '&pageToken=' + tok : ''}`, { headers: { 'x-goog-api-key': key } }, 20000);
    if (!r.ok) await fail(r);
    const j = await r.json(); out = out.concat(j.models || []); tok = j.nextPageToken || '';
  } while (tok);
  return out.filter(m => (m.supportedGenerationMethods || []).includes('generateContent') && /gemini|gemma/i.test(m.name))
    .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name, desc: m.description || '', inTok: m.inputTokenLimit }))
    .sort((a, b) => b.id.localeCompare(a.id));
}
export async function testModel(key, model) {
  const r = await req(`${BASE}/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng một từ: OK' }] }], generationConfig: { maxOutputTokens: 20 } }) }, 25000);
  if (!r.ok) await fail(r); return true;
}
// contents: [{role:'user'|'model', parts:[{text}|{inlineData}]}]
export async function gen({ system, contents, user, images = [], json = false, temperature = .3, retry = 1 }) {
  const key = getKey(), model = getModel();
  if (!key || !model) throw new AIError('NO_KEY', 'Chưa kết nối AI. Hãy nhập khóa ở nút "Khóa AI".');
  const parts = [{ text: user || '' }, ...images.map(d => { const m = /^data:(.+?);base64,(.*)$/.exec(d); return { inlineData: { mimeType: m[1], data: m[2] } }; })];
  const body = { systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents: contents || [{ role: 'user', parts }], generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}) } };
  for (let a = 0; ; a++) {
    try {
      const r = await req(`${BASE}/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) }, images.length ? 90000 : 60000);
      if (!r.ok) { if (r.status >= 500 && a < retry) continue; await fail(r); }
      const j = await r.json(); const txt = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
      if (!txt) throw new AIError('EMPTY', j.promptFeedback?.blockReason ? 'AI từ chối nội dung này.' : 'AI không trả về nội dung. Bạn thử lại nhé.');
      return txt;
    } catch (e) { if (e instanceof AIError && ['NETWORK', 'AI_TIMEOUT'].includes(e.code) && a < retry) continue; throw e; }
  }
}
// JSON: thử parse; nếu hỏng do dấu \ của LaTeX thì nhân đôi các \ lẻ rồi parse lại
export function parseJSON(t) {
  const clean = t.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try { return JSON.parse(clean); } catch { }
  try { return JSON.parse(clean.replace(/\\(?![\\"\/]|u[0-9a-fA-F]{4})/g, '\\\\')); } catch { throw new AIError('AI_BAD_FORMAT', 'Kết quả chưa đúng định dạng. Bạn thử lại nhé.'); }
}
export const friendly = e => e instanceof AIError ? e.message : 'Có lỗi xảy ra: ' + (e?.message || e);

// ------------ Lời nhắc hệ thống ------------
export const PERSONA = `Bạn là trợ lý học tập của AI Classroom, kiên nhẫn, chính xác, thân thiện nhưng chuyên nghiệp. Luôn trả lời bằng tiếng Việt; thuật ngữ tiếng Anh phải được giải thích.
QUY TẮC CÔNG THỨC (bắt buộc): mọi công thức viết bằng LaTeX, nội dòng đặt trong \\( ... \\), công thức độc lập đặt trong \\[ ... \\]. TUYỆT ĐỐI không dùng dấu $ và không viết tên ký hiệu thành chữ (không viết "alpha", "sigma"; viết \\alpha, \\sigma). Số thập phân dùng dấu phẩy kiểu Việt Nam trong văn bản.
Tính từng bước, tự kiểm tra lại kết quả một lần. Không chắc thì nói rõ mức chưa chắc; không bịa định lý hay công thức. Sai ở câu trước thì thừa nhận và sửa. Không nịnh, không chê bai.`;
export const SOLVE_RULES = `Chương trình gồm 7 chương: (1) Xác suất và công thức tính xác suất; (2) Biến ngẫu nhiên; (3) Một số phân phối xác suất thông dụng; (4) Mẫu ngẫu nhiên và các số đặc trưng của mẫu; (5) Ước lượng khoảng; (6) Kiểm định giả thiết; (7) So sánh 2 tham số. Phân biệt rõ: xác suất biến cố và mật độ xác suất; phương sai tổng thể và phương sai mẫu hiệu chỉnh; phân phối chuẩn và chuẩn tắc; Φ(z) và hàm Laplace Φ0(z)=Φ(z)-0,5.
Đề thiếu dữ kiện hoặc mơ hồ: nêu rõ giả định hoặc hỏi lại, không tự bịa số.
Trình bày lời giải theo ĐÚNG 4 khối, mỗi khối mở đầu bằng dòng tiêu đề chính xác như sau:
## Bước 1 – Tìm hiểu nội dung bài toán   (dữ kiện, điều kiện, yêu cầu; ký hiệu hóa đề)
## Bước 2 – Xây dựng chương trình giải   (kiến thức, công thức tổng quát, điều kiện áp dụng, kế hoạch)
## Bước 3 – Trình bày lời giải   (các bước chi tiết, viết công thức tổng quát trước khi thay số; kết thúc bằng một dòng "**Kết quả:** ..." nếu được phép đưa kết quả)
## Bước 4 – Kiểm tra và nghiên cứu lời giải   (kiểm tra hợp lý, lỗi thường gặp, cách giải khác, bài tương tự)`;
export const MODES = {
  hint: 'CHẾ ĐỘ GỢI Ý – cấp {L}/3: chỉ gợi ý đúng cấp này (cấp 1: nhắc dạng bài và kiến thức; cấp 2: nêu công thức và hướng làm; cấp 3: gợi ý chi tiết từng bước nhưng chưa thay số ra kết quả). TUYỆT ĐỐI không lộ lời giải hay đáp án cuối. Chỉ viết nội dung gợi ý, không cần đủ 4 khối.',
  guide: 'CHẾ ĐỘ HƯỚNG DẪN: phân tích đề, xác định dữ kiện và đại lượng cần tìm, hướng dẫn từng bước và giải thích vì sao chọn công thức. KHÔNG đưa đáp án cuối, không có dòng "Kết quả". Dùng 4 khối nhưng Bước 3 chỉ hướng dẫn cách làm.',
  partial: 'CHẾ ĐỘ GIẢI MỘT PHẦN: chỉ giải đầy đủ các ý được chọn: {P}. Bỏ qua các ý khác. Dùng 4 khối.',
  check: 'CHẾ ĐỘ KIỂM TRA: người học đã nộp bài làm. Kiểm tra từng bước, chỉ bước đúng, bước sai, nguyên nhân và cách sửa; mỗi lỗi gắn nhãn trong {Khái niệm, Công thức, Tính toán, Đọc đề, Thiếu bước, Trình bày}. KHÔNG đưa đáp án cuối đầy đủ. Dòng đầu tiên của câu trả lời: "VERDICT: dung" hoặc "VERDICT: sai" hoặc "VERDICT: mot-phan". Sau đó trình bày nhận xét.',
  full: 'CHẾ ĐỘ GIẢI ĐẦY ĐỦ: lời giải chi tiết từ đầu đến cuối, công thức tổng quát trước khi thay số, giải thích từng phép tính, nêu đáp án cuối ở dòng "**Kết quả:**". Dùng 4 khối.'
};
export const LEVELS = { 0: 'Người học chưa hiểu đề: giải thích dữ kiện và yêu cầu trước.', 1: 'Người học hiểu đề nhưng chưa biết cách làm: nhấn vào kiến thức và phương pháp.', 2: 'Người học đã làm thử nhưng chưa chắc: ưu tiên phát hiện lỗi sai.', 3: 'Người học muốn xem lời giải đầy đủ.' };
export const EXTRACT_SYS = `Bạn là bộ nhận diện đề toán. Nguyên tắc: CHÉP LẠI ĐÚNG NHƯ THẤY, không giải, không sửa, không tự điền chỗ thiếu. Chỗ không chắc phải đánh dấu trong uncertain_spans chứ không đoán. Công thức xuất bằng LaTeX trong \\( ... \\) (không dùng $, không viết "alpha"). Giữ nguyên số liệu, dấu phẩy thập phân, dấu âm, chỉ số dưới, số mũ.
Trả về DUY NHẤT một JSON hợp lệ (nhớ nhân đôi dấu \\ trong chuỗi JSON) theo schema:
{"image_quality":{"ok":true,"issues":[]},"is_relevant":true,"content_type":"problem|student_work|data_table|mixed|not_math","items":[{"id":"p1","label":"Câu 1","kind":"problem|sub_question|student_step|table|figure_description","text":"...","confidence":0.0,"uncertain_spans":[{"text":"0,35","reason":"chữ mờ","candidates":["0,35","0,36"]}]}],"tables":[{"caption":"","headers":[],"rows":[[]]}],"given_numbers":[{"name":"n","value":"10","source_item":"p1"}],"missing_info":[],"notes_for_user":""}
confidence dưới 0.8 thì phải có uncertain_spans hoặc notes_for_user. Nếu ảnh không phải toán thì content_type="not_math", is_relevant=false.`;
