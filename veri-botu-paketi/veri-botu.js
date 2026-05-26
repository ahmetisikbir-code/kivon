const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY || process.argv[3];
const MODEL = 'llama-3.3-70b-versatile';
const OUTPUT = path.join(__dirname, 'rapor');

function askGroq(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: MODEL,
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
    req.write(data);
    req.end();
  });
}

function anonymize(text) {
  const pii = [
    [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]'],
    [/0?5[0-9]{9}/g, '[TELEFON]'],
    [/\b(?:0[0-9]{3})[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}\b/g, '[TELEFON]'],
    [/(?:[A-ZÇŞĞÜÖİ][a-zçşğüöı]+\s[A-ZÇŞĞÜÖİ][a-zçşğüöı]+(?:\s[A-ZÇŞĞÜÖİ][a-zçşğüöı]+)?)/g, '[ISIM]'],
    [/\b(?:Cad\.|Cadde|Sok\.|Sokak|Mah\.|Mahalle|No\.?|Apartman|Daire|Kat)\s*\d*\s*[A-Za-zÇŞĞÜÖİçşğüöı0-9\s,.-]*/gi, '[ADRES]'],
    [/[A-Za-z0-9_-]{24,}/g, '[ID]'],
    [/[A-Z]{2}[0-9]{6,}/g, '[SERI_NO]']
  ];
  for (const [re, sub] of pii) text = text.replace(re, sub);
  return text;
}

function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const vals = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
  return { headers, rows };
}

function rowsToText(headers, rows, maxRows) {
  return rows.slice(0, maxRows).map(r =>
    headers.map(h => `${h}: ${r[h]}`).join('\n')
  ).join('\n---\n');
}

async function generateReport(sektor, rows, headers) {
  const sample = rowsToText(headers, rows, 30);
  const anonymized = anonymize(sample);

  const prompt = `Sen bir veri analisti ve rapor yazarsın.
Aşağıdaki "${sektor}" sektörüne ait müşteri/sipariş verilerini analiz et.

VERİ:
${anonymized}

Şu başlıklarla profesyonel bir sektör raporu hazırla:

1. **Yönetici Özeti** (3 cümle)
2. **Demografik Dağılım** (yaş, şehir, cinsiyet varsa)
3. **Satın Alma Trendleri** (en çok satılan ürünler, sezonluk trendler)
4. **Müşteri Davranışı** (alışveriş sıklığı, sepet ortalaması)
5. **Öne Çıkan İçgörüler** (verideki ilginç pattern'ler)
6. **Tavsiyeler** (işletmenin büyümesi için 3 öneri)

Kategorileri varsa belirt. Para birimini koru. Türkçe yaz. Profesyonel ve akıcı ol.`;

  return await askGroq(prompt);
}

function buildHTML(sektor, report, stats) {
  const date = new Date().toLocaleDateString('tr-TR');
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8">
<title>${sektor} Sektör Raporu — KIVON AI</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:800px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;font-size:28px;border-bottom:2px solid #222;padding-bottom:12px}
h2{color:#00e5ff;margin-top:32px}
.meta{color:#666;font-size:13px;margin-bottom:30px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0}
.stat{border:1px solid #222;border-radius:8px;padding:16px;background:#111;text-align:center}
.stat .n{font-size:28px;font-weight:700;color:#00e5ff}
.stat .l{font-size:11px;color:#666;margin-top:4px}
.footer{border-top:1px solid #222;margin-top:40px;padding-top:20px;font-size:12px;color:#444;text-align:center}
h3{color:#fbbf24;margin-top:24px}
p{margin:8px 0}
.pson{background:#00e5ff08;border-left:3px solid #00e5ff;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;color:#ccc}
</style></head><body>
<h1>${sektor} Sektör Raporu</h1>
<div class="meta">KIVON AI — Otomatik Oluşturuldu • ${date} • ${stats.satir} kayıt analiz edildi</div>
<div class="stats">
<div class="stat"><div class="n">${stats.satir}</div><div class="l">Kayıt</div></div>
<div class="stat"><div class="n">${stats.anahtar}</div><div class="l">Sütun</div></div>
<div class="stat"><div class="n">${stats.sektor}</div><div class="l">Sektör</div></div>
</div>
${report.split('\n').map(l => {
  if (l.startsWith('##')) return `<h2>${l.replace(/^##\s*/,'')}</h2>`;
  if (l.startsWith('###')) return `<h3>${l.replace(/^###\s*/,'')}</h3>`;
  if (l.startsWith('**')) return `<p><strong>${l.replace(/\*\*/g,'')}</strong></p>`;
  if (l.trim().startsWith('-')) return `<li>${l.replace(/^-\s*/,'')}</li>`;
  if (l.trim().startsWith('*')) return `<li>${l.replace(/^\*\s*/,'')}</li>`;
  if (l.trim() === '') return '';
  return `<p>${l}</p>`;
}).filter(Boolean).join('\n')}
<div class="footer">Bu rapor KIVON AI tarafından otomatik üretilmiştir. Veriler anonimleştirilmiştir.</div>
</body></html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const csvFile = args[0];
  const sektor = args[1] || 'Genel';

  if (!csvFile || !fs.existsSync(csvFile)) {
    console.log(`
KIVON Veri Botu — CSV verisini AI ile rapora dönüştürür

KULLANIM:
  node veri-botu.js <csv-dosyasi> [sektor-adi]

ÖRNEK:
  node veri-botu.js siparisler.csv "E-Ticaret"
  node veri-botu.js musteriler.csv "Perakende"

CSV'de şu sütunlar olabilir: isim, telefon, email, sehir, yas, urun, tutar, tarih, cinsiyet, kategori
`);
    return;
  }

  console.log(`Veri Botu: ${csvFile} → ${sektor}`);
  const raw = fs.readFileSync(csvFile, 'utf8');
  const { headers, rows } = parseCSV(raw);

  console.log(`${rows.length} satir, ${headers.length} sutun okundu`);
  console.log('Anonimlestiriliyor...');
  const anonymized = anonymize(raw);

  console.log('AI rapor uretiyor...');
  const report = await generateReport(sektor, rows, headers);

  const stats = { satir: rows.length, anahtar: headers.length, sektor };
  const html = buildHTML(sektor, report, stats);

  fs.mkdirSync(OUTPUT, { recursive: true });
  const filename = `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-rapor-${Date.now()}`;
  const htmlFile = path.join(OUTPUT, `${filename}.html`);
  fs.writeFileSync(htmlFile, html);
  fs.writeFileSync(path.join(OUTPUT, `${filename}.md`), report);

  console.log(`\nRapor hazir: ${htmlFile}`);
  console.log('---');
  console.log(report.substring(0, 500) + '...');
}

main().catch(e => console.error('HATA:', e.message));
