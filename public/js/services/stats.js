// statsService: tính xác suất bằng mathjs để kiểm chứng và dựng bảng.
export const erf = x => window.math.erf(x);
export const Phi = z => .5 * (1 + erf(z / Math.SQRT2));        // hàm phân phối chuẩn tắc
export const Phi0 = z => Phi(z) - .5;                          // hàm Laplace
export const phiPdf = (x, m = 0, s = 1) => Math.exp(-((x - m) ** 2) / (2 * s * s)) / (s * Math.sqrt(2 * Math.PI));
export const nCr = (n, k) => window.math.combinations(n, k);
export const binomPmf = (n, p, k) => nCr(n, k) * p ** k * (1 - p) ** (n - k);
export const poissonPmf = (l, k) => Math.exp(-l) * l ** k / window.math.factorial(k);
export function evalExpr(src) {
  const m = window.math;
  const scope = { C: m.combinations, phi: Phi, Phi, Phi0, laplace: Phi0, binom: binomPmf, poisson: poissonPmf, normcdf: (x, mu, s) => Phi((x - mu) / s), pi: Math.PI, e: Math.E };
  let s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/²/g, '^2').replace(/³/g, '^3').replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/Φ0/g, 'Phi0').replace(/Φ/g, 'Phi').replace(/\s*=\s*$/, '');
  const node = m.parse(s); const val = node.evaluate(scope);
  return { node, val, tex: node.toTex({ parenthesis: 'keep' }) };
}
export const fmt = v => { if (typeof v === 'number') { if (!isFinite(v)) return String(v); const a = Math.abs(v); return a !== 0 && (a < 1e-6 || a >= 1e12) ? v.toExponential(6) : String(+v.toPrecision(10)); } return window.math.format(v, { precision: 10 }); };
