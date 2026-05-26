const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const OUTPUT = path.join(__dirname, 'veri-hazinesi');

function fetch(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractPhones(text) {
  const p = [/0?5[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g, /0?2[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g];
  const s = new Set();
  for (const re of p) { const m = text.match(re); if (m) m.forEach(x => s.add(x.replace(/[-\s]/g, ''))); }
  return [...s];
}

function extractEmails(text) {
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  return m ? [...new Set(m)] : [];
}

// ---- TURKISH DIRECTORY SCRAPERS ----
async function scrapeEniyifirmadan(sektor) {
  const r = [];
  try {
    const html = await fetch(`https://www.eniyifirmadan.com/?s=${encodeURIComponent(sektor)}`);
    const phones = extractPhones(html);
    for (const tel of phones) r.push({ tel, kaynak: 'eniyifirmadan', sektor });
  } catch (e) { }
  return r;
}

async function scrapeFirmaekle(sektor) {
  const r = [];
  try {
    const html = await fetch(`https://www.firmaekle.net/ara?q=${encodeURIComponent(sektor)}`);
    const phones = extractPhones(html);
    for (const tel of phones) r.push({ tel, kaynak: 'firmaekle', sektor });
  } catch (e) { }
  return r;
}

async function scrapeSahibinden(sektor) {
  const r = [];
  try {
    const html = await fetch(`https://www.sahibinden.com/kategori-is-ilani?query=${encodeURIComponent(sektor)}`);
    const phones = extractPhones(html);
    const emails = extractEmails(html);
    for (const tel of phones) r.push({ tel, kaynak: 'sahibinden', sektor });
    for (const mail of emails) r.push({ mail, kaynak: 'sahibinden', sektor });
  } catch (e) { }
  return r;
}

// ---- GOOGLE SUGGEST (TREND) ----
async function getDemand(sektor) {
  const q = [];
  const pre = ['en iyi','en ucuz','fiyat','2026','nasil','nedir','karsilastirma','yorum','tavsiye','telefon','adres','iletisim','mail','ucret','paket','hizmet','firsat','indirim','kurumsal','ne kadar','nerede','satın al','bedava','ucretsiz','online','profesyonel','yerli'];
  for (const p of pre) {
    await wait(120);
    try {
      const html = await fetch(`https://www.google.com/complete/search?q=${encodeURIComponent(p + ' ' + sektor)}&cp=30&client=gws-wiz&xssi=t`);
      const j = JSON.parse(html.substring(html.indexOf('[')));
      for (const i of j[0] || []) { const t = (i[0] || '').replace(/<[^>]+>/g, ''); if (t) q.push(t); }
    } catch (e) { }
  }
  return [...new Set(q)];
}

// ---- NEWS ----
async function getNews(sektor) {
  try {
    const xml = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(sektor + ' sektor')}&hl=tr&gl=TR`);
    return xml.split('<item>').slice(1).slice(0, 10).map(item => {
      const t = item.match(/<title>(.*?)<\/title>/); return t ? t[1].replace(/<!\[CDATA\[|\]\]>/g, '') : '';
    }).filter(Boolean);
  } catch (e) { return []; }
}

// ---- AI ANALIZ ----
function analyzeData(sektor, tels, mails, demand, news) {
  const ornekTel = tels.slice(0, 15).map(t => `  - ${t.tel} (${t.kaynak})`).join('\n');
  const ornekMail = mails.slice(0, 10).map(m => `  - ${m}`).join('\n');

  const prompt = `Sen bir veri broker'i ve pazar arastirmacisisin.

Sektor: ${sektor}

TOPLANAN VERI:
- Telefon: ${tels.length} adet
- Email: ${mails.length} adet
- Kaynaklar: eniyifirmadan, firmaekle, sahibinden

ORNEK TELEFONLAR:
${ornekTel}

ORNEK MAILLER:
${ornekMail}

TREND SORGULARI (insanlarin aradigi):
${demand.map(q => '  - ' + q).join('\n')}

HABERLER:
${news.map(n => '  - ' + n).join('\n')}

Su formatta "SATILABILIR VERI PAKETI" raporu olustur:

## 1. ILETISIM VERI PAKETI
- Icerik: telefon, email listesi
- Kac kayit, hangi sehirler, hangi kaynaklar
- Fiyat: TL (kayit sayisina gore)
- Kim alir?

## 2. PAZAR ARASTIRMASI PAKETI
- Trend sorgulardan cikan talep analizi
- Rakipler, fiyat algisi, musteri ihtiyaclari
- Fiyat: TL

## 3. POTANSIYEL MUSTERI PAKETI
- Bu veri ${sektor} firmalarina nasil satilir?
- Kimler hedef kitle?
- Nasil ulasilir? (mail, telefon, linkedin)

## GELIR PROJEKSIYONU
- Her paket kac TL?
- Ayda kac satilabilir?
- TOPLAM GELIR: TL/ay

Turkce yaz. Gercekci ol.`;

  return new Promise((resolve, reject) => {
    const d = JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 });
    const opts = { hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { const j = JSON.parse(b); resolve(j.choices?.[0]?.message?.content || b); }
        catch { resolve(b); }
      });
    });
    req.on('error', reject);
    req.write(d);
    req.end();
  });
}

function buildHTML(sektor, tels, mails, demand, news, analysis) {
  const date = new Date().toLocaleDateString('tr-TR');
  const utels = [...new Set(tels.map(t => t.tel))];
  const umails = [...new Set(mails)];

  const telRows = utels.map(t => `<tr><td>${t}</td><td>${tels.find(x => x.tel === t)?.kaynak || ''}</td></tr>`).join('');
  const mailRows = umails.map(m => `<tr><td>${m}</td></tr>`).join('');
  const demandTags = demand.map(q => `<span class="tag">${q}</span>`).join('');

  const aHtml = analysis.split('\n').map(l => {
    if (/^##/.test(l)) return `<h2>${l.replace(/^##\s*/, '')}</h2>`;
    if (/^###/.test(l)) return `<h3>${l.replace(/^###\s*/, '')}</h3>`;
    if (l.trim().startsWith('-')) return `<li>${l.replace(/^-\s*/, '')}</li>`;
    if (l.trim() === '') return '';
    return `<p>${l}</p>`;
  }).filter(Boolean).join('\n');

  const csvTel = utels.map(t => `${t},telefon,${sektor}`).join('\n');
  const csvMail = umails.map(m => `${m},email,${sektor}`).join('\n');

  return {
    html: `
<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${sektor} Veri Paketi</title>
<style>
body{font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:960px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;border-bottom:2px solid #222;padding-bottom:12px;font-size:26px}
h2{color:#00e5ff;margin-top:36px;font-size:18px;border-bottom:1px solid #1a1a1a;padding-bottom:8px}
h3{color:#fbbf24;margin-top:24px;font-size:15px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.grid{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.kart{border:1px solid #222;border-radius:8px;padding:16px;background:#111;flex:1;min-width:100px;text-align:center}
.kart .s{font-size:32px;font-weight:700;color:#00e5ff}
.kart .a{font-size:11px;color:#666;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:6px;color:#888;border-bottom:1px solid #333}
td{padding:6px;border-bottom:1px solid #1a1a1a;font-family:monospace}
.tag{display:inline-block;background:#00e5ff10;color:#00e5ff;padding:2px 8px;border-radius:12px;font-size:11px;margin:3px}
.kutu{background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin:20px 0}
.veri-kutusu{max-height:300px;overflow-y:auto;border:1px solid #1a1a1a;border-radius:8px;margin:12px 0}
.footer{text-align:center;margin-top:48px;padding-top:20px;border-top:1px solid #222;font-size:12px;color:#444}
</style></head><body>
<h1>${sektor} — Veri Paketi</h1>
<div class="meta">KIVON Veri Broker Botu | ${date} | Acik kaynak veri</div>

<div class="grid">
<div class="kart"><div class="s">${utels.length}</div><div class="a">Telefon</div></div>
<div class="kart"><div class="s">${umails.length}</div><div class="a">E-posta</div></div>
<div class="kart"><div class="s">${demand.length}</div><div class="a">Talep Sorgusu</div></div>
<div class="kart"><div class="s">${news.length}</div><div class="a">Haber</div></div>
</div>

<h2>Trend Aramalar</h2>
<p style="color:#666;font-size:12px">Insanlarin Google'da aradigi seyler — talep gostergesi</p>
<p>${demandTags}</p>

<h2>Telefon Listesi (${utels.length})</h2>
<div class="veri-kutusu"><table><thead><tr><th>Telefon</th><th>Kaynak</th></tr></thead><tbody>${telRows}</tbody></table></div>

<h2>E-posta Listesi (${umails.length})</h2>
<div class="veri-kutusu"><table><thead><tr><th>E-posta</th><th></th></tr></thead><tbody>${mailRows}</tbody></table></div>

<h2>Haberler</h2>
<ul>${news.map(n => `<li>${n}</li>`).join('') || '<li style="color:#555">Henuz haber yok</li>'}</ul>

<hr style="border:none;border-top:1px solid #222;margin:36px 0">
<h2>AI Veri Paketi Analizi</h2>
${aHtml}
<div class="footer">KIVON Veri Broker Botu ile olusturulmustur.</div>
</body></html>`,
    csv: `telefon,email,kaynak,sektor\n${csvTel}\n${csvMail}`
  };
}

async function main() {
  const sektor = process.argv[2] || 'E-Ticaret';
  console.log(`\nKIVON VERI BROKER BOTU`);
  console.log(`Sektor: ${sektor}\n`);

  console.log('[1] Talep sorgulari...');
  const demand = await getDemand(sektor);
  console.log(`  ${demand.length} sorgu`);

  console.log('[2] Firma rehberleri taranıyor...');
  const [e1, e2, e3] = await Promise.all([
    scrapeEniyifirmadan(sektor),
    scrapeFirmaekle(sektor),
    scrapeSahibinden(sektor)
  ]);
  const tels = [...e1, ...e2, ...e3];
  const mails = [];
  console.log(`  ${tels.length} telefon, ${mails.length} email bulundu`);

  console.log('[3] Haberler...');
  const news = await getNews(sektor);
  console.log(`  ${news.length} haber`);

  console.log('[4] AI analiz...');
  const analysis = await analyzeData(sektor, tels, mails, demand, news);

  const { html, csv } = buildHTML(sektor, tels, mails, demand, news, analysis);

  fs.mkdirSync(OUTPUT, { recursive: true });
  const base = path.join(OUTPUT, `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-veri-${Date.now()}`);
  fs.writeFileSync(base + '.html', html);
  fs.writeFileSync(base + '.csv', csv, 'utf8');
  fs.writeFileSync(base + '-analiz.md', analysis);

  console.log(`\n✅ ${base}.html`);
  console.log(`✅ ${base}.csv`);
  console.log(`\nOZET: ${tels.length} tel | ${mails.length} mail | ${demand.length} talep`);
}

main().catch(e => console.error('HATA:', e.message));
