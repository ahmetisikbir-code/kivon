const https = require('https');

const API_KEY = process.env.GROQ_API_KEY;

module.exports = {
  type: 'data-report',
  label: 'Veri Botu',
  description: 'CSV/schema verisi alir, anonimlestirir, AI rapor olusturur, HTML kaydeder',
  inputs: ['data', 'schema', 'sektor'],
  async execute({ data, schema, sektor }) {
    const rows = typeof data === 'string' ? JSON.parse(data) : data;
    const headers = schema || (rows[0] ? Object.keys(rows[0]) : []);
    const sektorAdi = sektor || 'Genel';
    const sample = rows.slice(0, 30).map(r => headers.map(h => `${h}: ${r[h] || ''}`).join('\n')).join('\n---\n');

    const pii = [
      [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'],
      [/0?5[0-9]{9}/g, '[TELEFON]'],
      [/[A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?/g, '[ISIM]'],
      [/[A-Za-z0-9_-]{24,}/g, '[ID]']
    ];
    let clean = sample;
    for (const [re, sub] of pii) clean = clean.replace(re, sub);

    const prompt = `Sen bir veri analisti ve rapor yazarsin. "${sektorAdi}" sektorune ait veriyi analiz et.

VERI:
${clean}

Su basliklarla profesyonel sektor raporu hazirla:
1. Yonetici Ozeti
2. Demografik Dagitim (sehir, yas, cinsiyet varsa)
3. Satin Alma Trendleri
4. Musteri Davranisi
5. One Cikan Icguruler
6. Tavsiyeler (3 oneri)

Turkce yaz, profesyonel ol.`;

    const response = await new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, max_tokens: 2000
      });
      const opts = {
        hostname: 'api.groq.com', path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` }
      };
      const req = https.request(opts, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { const j = JSON.parse(d); resolve(j.choices?.[0]?.message?.content || d); }
          catch { resolve(d); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    const date = new Date().toLocaleDateString('tr-TR');
    const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${sektorAdi} Sektor Raporu</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;border-bottom:2px solid #222;padding-bottom:12px}
h2{color:#00e5ff;margin-top:32px}
.meta{color:#666;font-size:13px}
.stat{display:inline-block;border:1px solid #222;border-radius:8px;padding:16px 24px;background:#111;margin:8px;text-align:center}
.stat .n{font-size:28px;font-weight:700;color:#00e5ff}
.stat .l{font-size:11px;color:#666}
.footer{border-top:1px solid #222;margin-top:40px;padding-top:20px;font-size:12px;color:#444;text-align:center}
</style></head><body>
<h1>${sektorAdi} Sektor Raporu</h1>
<div class="meta">KIVON Veri Botu • ${date} • ${rows.length} kayit</div>
<div style="margin:20px 0"><div class="stat"><div class="n">${rows.length}</div><div class="l">Kayit</div></div><div class="stat"><div class="n">${headers.length}</div><div class="l">Sutun</div></div></div>
${response.split('\n').map(l => {
  if (l.startsWith('#')) return `<h2>${l.replace(/^#+\s*/,'')}</h2>`;
  if (l.trim().startsWith('-') || l.trim().startsWith('*')) return `<li>${l.replace(/^[\s*\-]+/,'')}</li>`;
  if (l.trim() === '') return '';
  return `<p>${l}</p>`;
}).filter(Boolean).join('\n')}
<div class="footer">KIVON AI ile otomatik uretilmistir. Veriler anonimlestirilmistir.</div>
</body></html>`;

    return {
      output: html,
      report: response,
      stats: { rows: rows.length, columns: headers.length, sector: sektorAdi }
    };
  }
};
