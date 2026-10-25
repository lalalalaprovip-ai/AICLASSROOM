// MathText: MỘT cơ chế hiển thị công thức (KaTeX) + chuyển công thức thành lời đọc tiếng Việt.
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Chuẩn hóa dấu phân cách: chấp nhận $$..$$ và $..$ do AI hay dùng, đổi về \[..\] và \(..\)
export function normalizeDelims(t) {
  return String(t ?? '')
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => '\\[' + m + '\\]')
    .replace(/(^|[^\\\w$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?![\w$])/g, (_, p, m) => p + '\\(' + m + '\\)');
}
const MATH_RE = /(\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;

export function mathHtml(text) {
  const src = normalizeDelims(text); const store = [];
  const prot = src.replace(MATH_RE, m => {
    const disp = m.startsWith('\\['); const inner = m.slice(2, -2).trim(); let html;
    try { html = window.katex.renderToString(inner, { displayMode: disp, throwOnError: true, strict: 'ignore' }); }
    catch { html = `<span class="math-err" title="Công thức cần kiểm tra">${esc(m)}</span>`; }
    store.push(html); return `\u0000${store.length - 1}\u0000`;
  });
  let s = esc(prot);
  s = s.replace(/^#{1,4}\s*(.+)$/gm, '<h4>$1</h4>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/^(?:[-*•]\s+.+\n?)+/gm, b => '<ul>' + b.trim().split('\n').map(l => '<li>' + l.replace(/^[-*•]\s+/, '') + '</li>').join('') + '</ul>');
  s = s.replace(/\n(?!<\/?(ul|li|h4))/g, '<br>').replace(/<\/(ul|h4)><br>/g, '</$1>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => store[+i]);
}
export function renderMath(el, text) { el.innerHTML = mathHtml(text); return el; }

// ---------- Lời đọc tiếng Việt ----------
const GREEK = { alpha: 'an-pha', beta: 'bê-ta', gamma: 'gam-ma', delta: 'đen-ta', epsilon: 'ép-xi-lon', varepsilon: 'ép-xi-lon', theta: 'thê-ta', lambda: 'lam-đa', mu: 'muy', nu: 'nuy', pi: 'pi', rho: 'rô', sigma: 'xích-ma', tau: 'tau', phi: 'phi', chi: 'khi', omega: 'ô-mê-ga', Phi: 'phi', Sigma: 'xích-ma', Delta: 'đen-ta', Omega: 'ô-mê-ga', eta: 'ê-ta', kappa: 'ka-pa' };
const SYM = { le: 'nhỏ hơn hoặc bằng', leq: 'nhỏ hơn hoặc bằng', ge: 'lớn hơn hoặc bằng', geq: 'lớn hơn hoặc bằng', ne: 'khác', neq: 'khác', approx: 'xấp xỉ', pm: 'cộng trừ', cap: 'giao', cup: 'hợp', mid: 'với điều kiện', sim: 'có phân phối', to: 'tiến tới', rightarrow: 'suy ra', Rightarrow: 'suy ra', infty: 'vô cực', cdot: 'nhân', times: 'nhân', div: 'chia', in: 'thuộc', notin: 'không thuộc', subset: 'là tập con của', emptyset: 'tập rỗng', lt: 'nhỏ hơn', gt: 'lớn hơn', ldots: 'v.v.', cdots: 'v.v.', dots: 'v.v.', quad: ',', qquad: ',', ',': '', ';': '', '!': '', ' ': ' ', lim: 'giới hạn', ln: 'lô-ga-rit tự nhiên của', log: 'lô-ga-rit của', exp: 'mũ e của', sin: 'sin', cos: 'cos', tan: 'tang', max: 'lớn nhất', min: 'nhỏ nhất', prime: 'phẩy', Pr: 'xác suất', binom: '' };
const OPNAME = { Var: 'phương sai', Cov: 'hiệp phương sai', E: 'kỳ vọng', P: 'xác suất', Corr: 'tương quan' };
const UNI = { 'α': 'an-pha', 'β': 'bê-ta', 'γ': 'gam-ma', 'δ': 'đen-ta', 'ε': 'ép-xi-lon', 'θ': 'thê-ta', 'λ': 'lam-đa', 'μ': 'muy', 'π': 'pi', 'ρ': 'rô', 'σ': 'xích-ma', 'χ': 'khi', 'Φ': 'phi', 'Σ': 'tổng', '∫': 'tích phân', '≤': 'nhỏ hơn hoặc bằng', '≥': 'lớn hơn hoặc bằng', '≠': 'khác', '≈': 'xấp xỉ', '±': 'cộng trừ', '∩': 'giao', '∪': 'hợp', '²': ' bình phương', '³': ' lập phương', '√': 'căn bậc hai của ', '∞': 'vô cực', '×': ' nhân ', '÷': ' chia ', '∈': 'thuộc', '→': 'suy ra', '−': ' trừ ', '%': ' phần trăm', '=': ' bằng ', '‰': ' phần nghìn' };

function group(s, i) { // trả [nội dung, vị trí kế tiếp] của {…} hoặc 1 ký tự
  while (s[i] === ' ') i++;
  if (s[i] === '{') { let d = 1, j = i + 1; while (j < s.length && d) { if (s[j] === '{') d++; else if (s[j] === '}') d--; j++; } return [s.slice(i + 1, j - 1), j]; }
  if (s[i] === '\\') { const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); return [m[0], i + m[0].length]; }
  return [s[i] ?? '', i + 1];
}
export function latexToSpeech(tex) {
  const s = String(tex); let out = '', i = 0; const paren = [];
  const sp = x => { out += ' ' + x + ' '; };
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(s.slice(i)); const cmd = m[1]; i += m[0].length;
      if (cmd === 'frac' || cmd === 'dfrac') { let a, b; [a, i] = group(s, i); [b, i] = group(s, i); sp(', ' + latexToSpeech(a) + ', phần, ' + latexToSpeech(b) + ','); }
      else if (cmd === 'sqrt') { let n = null; if (s[i] === '[') { const j = s.indexOf(']', i); n = s.slice(i + 1, j); i = j + 1; } let a; [a, i] = group(s, i); sp(n ? `căn bậc ${latexToSpeech(n)} của ${latexToSpeech(a)}, hết căn,` : `căn bậc hai của ${latexToSpeech(a)}, hết căn,`); }
      else if (cmd === 'bar' || cmd === 'overline') { let a; [a, i] = group(s, i); sp(latexToSpeech(a) + ' ngang'); }
      else if (cmd === 'hat') { let a; [a, i] = group(s, i); sp(latexToSpeech(a) + ' mũ'); }
      else if (cmd === 'tilde') { let a; [a, i] = group(s, i); sp(latexToSpeech(a) + ' ngã'); }
      else if (cmd === 'text' || cmd === 'mathrm' || cmd === 'textbf' || cmd === 'mathbf') { let a; [a, i] = group(s, i); sp(a); }
      else if (cmd === 'operatorname') { let a; [a, i] = group(s, i); sp(OPNAME[a] || a); }
      else if (cmd === 'binom') { let a, b; [a, i] = group(s, i); [b, i] = group(s, i); sp(`tổ hợp chập ${latexToSpeech(b)} của ${latexToSpeech(a)}`); }
      else if (cmd === 'sum' || cmd === 'prod' || cmd === 'int') {
        let lo = '', hi = ''; while (s[i] === ' ') i++;
        for (let k = 0; k < 2; k++) { if (s[i] === '_') { [lo, i] = group(s, i + 1); } else if (s[i] === '^') { [hi, i] = group(s, i + 1); } }
        const name = cmd === 'sum' ? 'tổng' : cmd === 'prod' ? 'tích' : 'tích phân';
        sp(cmd === 'int' ? `${name}${lo ? ' từ ' + latexToSpeech(lo) : ''}${hi ? ' đến ' + latexToSpeech(hi) : ''} của,` : `${name}${lo ? ' với ' + latexToSpeech(lo) : ''}${hi ? ' đến ' + latexToSpeech(hi) : ''} của,`);
      }
      else if (cmd === 'left' || cmd === 'right') { if (s[i] === '.' || s[i] === '|') i++; }
      else if (cmd === 'begin' || cmd === 'end') { [, i] = group(s, i); }
      else if (cmd === '\\') sp(',');
      else if (GREEK[cmd]) sp(GREEK[cmd]);
      else if (cmd in SYM) sp(SYM[cmd]);
      else sp(cmd);
    } else if (c === '^') {
      let a; [a, i] = group(s, i + 1); const t = latexToSpeech(a).trim();
      sp(t === '2' ? 'bình phương' : t === '3' ? 'lập phương' : t === '-1' || t === 'trừ 1' ? 'mũ trừ một' : 'mũ ' + t + ',');
    } else if (c === '_') { let a; [a, i] = group(s, i + 1); sp('chỉ số ' + latexToSpeech(a).trim() + ','); }
    else if (c === '{' || c === '}') i++;
    else if (c === '(') { const prev = s[i - 1]; if (prev && /[A-Za-z}]/.test(prev)) { sp('của'); paren.push('f'); } else { sp('mở ngoặc'); paren.push('g'); } i++; }
    else if (c === ')') { if (paren.pop() === 'g') sp('đóng ngoặc'); i++; }
    else if (c === '[' || c === ']') { sp(c === '[' ? 'mở ngoặc vuông' : 'đóng ngoặc vuông'); i++; }
    else if (c === '|') { sp('giá trị tuyệt đối'); i++; }
    else if (c === '=') { sp('bằng'); i++; } else if (c === '+') { sp('cộng'); i++; }
    else if (c === '-') { sp('trừ'); i++; } else if (c === '<') { sp('nhỏ hơn'); i++; } else if (c === '>') { sp('lớn hơn'); i++; }
    else if (c === '/') { sp('chia'); i++; } else if (c === '*') { sp('nhân'); i++; } else if (c === '!') { sp('giai thừa'); i++; }
    else if (c === '%') { sp('phần trăm'); i++; } else if (c === ',') { const d = /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || ''); out += d ? ' phẩy ' : ', '; i++; }
    else if (c === '.' && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || '')) { out += ' phẩy '; i++; }
    else if (c === '~') { sp('có phân phối'); i++; } else { out += c; i++; }
  }
  return out.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim();
}
// Văn bản (có thể lẫn công thức) -> lời đọc tiếng Việt chuẩn
export function toSpeech(text) {
  let t = normalizeDelims(text);
  t = t.replace(MATH_RE, m => ' ' + latexToSpeech(m.slice(2, -2)) + ' ');
  t = t.replace(/\*\*|#{1,4}\s*|`/g, '').replace(/^\s*[-*•]\s+/gm, '').replace(/\s*\n+\s*/g, '. ');
  t = t.replace(/(\d)\.(\d)/g, '$1 phẩy $2').replace(/(\d),(\d)/g, '$1 phẩy $2');
  t = t.replace(/[αβγδεθλμπρσχΦΣ∫≤≥≠≈±∩∪²³√∞×÷∈→−%=‰]/g, c => UNI[c] || c);
  return t.replace(/\s+/g, ' ').trim();
}
// Lời nói -> ký hiệu toán (dành cho nhập đề bằng micro)
const SPOKEN = [[/xích[ -]?ma/gi, 'σ'], [/lam[ -]?đa|lăm[ -]?đa/gi, 'λ'], [/an[ -]?pha|alpha/gi, 'α'], [/bê[ -]?ta|beta/gi, 'β'], [/muy|mu\b/gi, 'μ'], [/\bpi\b/gi, 'π'],
  [/nhỏ hơn hoặc bằng/gi, '≤'], [/lớn hơn hoặc bằng/gi, '≥'], [/khác/gi, '≠'], [/bình phương/gi, '²'], [/lập phương/gi, '³'], [/căn bậc hai của|căn bậc hai/gi, '√'],
  [/\bcộng\b/gi, '+'], [/\btrừ\b/gi, '-'], [/\bnhân\b/gi, '×'], [/\bchia\b/gi, '÷'], [/\bbằng\b/gi, '='], [/phần trăm/gi, '%']];
export function spokenToMath(t) { let s = t; for (const [r, v] of SPOKEN) s = s.replace(r, v); return s.replace(/(\d)\s*phẩy\s*(\d)/g, '$1,$2'); }
