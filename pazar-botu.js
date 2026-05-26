const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const OUTPUT = path.join(__dirname, 'pazar-verisi');

function askGroq(prompt) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1500 });
    const opts = { hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } };
    const req = https.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { const j = JSON.parse(b); resolve(j.choices?.[0]?.message?.content || b); } catch { resolve(b); } }); });
    req.on('error', reject);
    req.write(d);
    req.end();
  });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractBetween(html, before, after) {
  const results = [];
  let idx = 0;
  while ((idx = html.indexOf(before, idx)) !== -1) {
    const start = idx + before.length;
    const end = html.indexOf(after, start);
    if (end === -1) break;
    results.push(html.substring(start, end));
    idx = end + after.length;
  }
  return results;
}

async function getSearchSuggestions(sektor) {
  const results = [];
  const prefixes = ['en iyi', 'en ucuz', 'fiyat', '2026', 'nasil', 'nedir', 'karsilastirma', 'yorum', 'tavsiye', 'satin al', 'firsat', 'indirim', 'kampanya', 'bedava', 'ucretsiz'];
  for (const p of prefixes) {
    await wait(200);
    try {
      const q = p + ' ' + sektor;
      const html = await fetch(`https://www.google.com/complete/search?q=${encodeURIComponent(q)}&cp=30&client=gws-wiz&xssi=t`);
      const json = JSON.parse(html.substring(html.indexOf('[')));
      for (const item of json[0] || []) {
        const text = (item[0] || '').replace(/<[^>]+>/g, '');
        if (text) results.push(text);
      }
    } catch (e) { }
  }
  return [...new Set(results)];
}

async function getNews(sektor, limit = 8) {
  const results = [];
  const urls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(sektor + ' sektor')}&hl=tr&gl=TR`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(sektor + ' trend')}&hl=tr&gl=TR`
  ];
  for (const url of urls) {
    try {
      const xml = await fetch(url);
      const items = xml.split('<item>').slice(1);
      for (const item of items.slice(0, limit)) {
        const t = item.match(/<title>(.*?)<\/title>/);
        if (t && t[1]) results.push({ baslik: t[1].replace(/<!\[CDATA\[|\]\]>/g, ''), kaynak: 'news' });
      }
    } catch (e) { }
  }
  return results;
}

async function getSiteData(sektor) {
  const results = [];
  const sources = [
    `https://www.sikayetvar.com/ara?q=${encodeURIComponent(sektor)}`,
    `https://www.google.com/search?q=${encodeURIComponent('site:eksisozluk.com ' + sektor)}`
  ];
  for (const url of sources) {
    await wait(800);
    try {
      const html = await fetch(url);
      const texts = [...html.matchAll(/<[^>]+>\s*([A-Z][^<>]{20,200}[.!?])\s*<\/[^>]+>/g)].map(m => m[1]);
      for (const t of texts.slice(0, 5)) results.push({ icerik: t, kaynak: url.includes('sikayet') ? 'sikayetvar' : 'eksisozluk' });
    } catch (e) { }
  }
  return results;
}

async function getPriceData(sektor) {
  const results = [];
  try {
    const html = await fetch(`https://www.google.com/search?q=${encodeURIComponent(sektor + ' fiyat listesi 2026')}`);
    const parts = [...html.matchAll(/<div[^>]*class="[^"]*[Bb]ox[^"]*"[^>]*>[\s\S]*?<\/div>/g)];
    for (const p of parts.slice(0, 5)) {
      const text = p[0].replace(/<[^>]+>/g, '').trim();
      if (text.length > 20) results.push(text.substring(0, 300));
    }
  } catch (e) { }
  return results;
}

async function analyzeMarket(sektor, queries, news, sites, prices) {
  const prompt = `Sen bir pazar arastirmacisi ve veri broker'isin. "${sektor}" sektorunu analiz et.

**Trend Arama Sorgulari** (kullanicilar Google'da bunlari ariyor - talep gostergesi):
${queries.map(q => '- ' + q).join('\n')}

**Sektor Haberleri**:
${news.map(n => '- ' + n.baslik).join('\n')}

**Forum/Sirkayet Verileri**:
${sites.map(s => '- ' + s.icerik?.substring(0, 150)).join('\n')}

**Fiyat/Pazar Verileri**:
${prices.map(p => '- ' + p.substring(0, 150)).join('\n')}

Yanit olarak SU FORMATTA bir "PAZAR DEGERLENDIRMESI VE SATILIK PAKET" cikar:

KARSILAMA
- Bu sektorun durumu, buyuklugu, potansiyeli

EN COK ARANAN BILGILER
- Kullanicilar hangi konularda bilgi eksikligi yasiyor (maddeler halinde)
- Bunlarin her biri nasil bir veri paketine donusturulebilir?

EN DEGERLI 3 VERI SETI
1. [Veri seti adi] — [icerik] — [tahmini fiyat: TL]
2. ...
3. ...

KIMLER SATIN ALIR
- Sirket turleri, departmanlar, unvanlar

SATIS STRATEJISI
- Hangi platformda satilir (Gumroad, Linkedin, direkt mail)
- Nasil paketlenir (PDF, Excel, CSV)
- Pazarlama taktigi

Turkce yaz. Somut, gercekci ve satisa yonelik ol. Her veri seti icin TL fiyat belirt.`;

  return await askGroq(prompt);
}

function buildHTML(sektor, analysis, queries, news, sites) {
  const date = new Date().toLocaleDateString('tr-TR');
  const qHtml = queries.map(q => `<span class="etiket">${q}</span>`).join('');
  const newsHtml = news.map(n => `<li>${n.baslik}</li>`).join('');
  const sitesHtml = sites.map(s => `<li>${s.icerik.substring(0, 100)}...</li>`).join('');

  const aHtml = analysis.split('\n').map(l => {
    if (/^[A-Z\s]{3,}$/.test(l.trim())) return `<h2>${l.trim()}</h2>`;
    if (l.startsWith('#')) return `<h2>${l.replace(/^#+\s*/, '')}</h2>`;
    if (l.match(/^\d+\.\s*\*\*/)) return `<h3>${l.replace(/^\d+\.\s*\*+|\*+$/g, '')}</h3>`;
    if (l.trim().startsWith('-')) return `<li>${l.replace(/^-\s*/, '')}</li>`;
    if (l.match(/^\d+\./) && !l.includes('*')) return `<li>${l}</li>`;
    if (l.trim() === '') return '';
    return `<p>${l}</p>`;
  }).filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${sektor} Pazar Veri Paketi</title>
<style>
body{font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:900px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;border-bottom:2px solid #222;padding-bottom:12px;font-size:26px}
h2{color:#00e5ff;margin-top:36px;font-size:20px;border-bottom:1px solid #1a1a1a;padding-bottom:8px}
h3{color:#fbbf24;margin-top:24px;font-size:16px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.stats{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.istatistik{border:1px solid #222;border-radius:8px;padding:16px 20px;background:#111;flex:1;min-width:100px;text-align:center}
.istatistik .sayi{font-size:28px;font-weight:700;color:#00e5ff}
.istatistik .aciklama{font-size:11px;color:#666;margin-top:4px}
.kutu{background:#111;border:1px solid #222;border-radius:8px;padding:20px;margin:20px 0}
.etiket{display:inline-block;background:#00e5ff10;color:#00e5ff;padding:3px 10px;border-radius:12px;font-size:12px;margin:4px}
.fiyat-kart{border:1px solid #222;border-radius:8px;padding:16px;background:#111;margin:12px 0}
.fiyat-kart .fiyat{color:#00e5ff;font-size:20px;font-weight:700}
.fiyat-kart .detay{color:#888;font-size:13px;margin-top:4px}
.footer{text-align:center;margin-top:48px;padding-top:20px;border-top:1px solid #222;font-size:12px;color:#444}
</style></head><body>
<h1>${sektor} — Pazar Veri Paketi</h1>
<div class="meta">KIVON Pazar Botu | ${date} | AI destekli pazar analizi</div>

<div class="stats">
<div class="istatistik"><div class="sayi">${queries.length}</div><div class="aciklama">Trend Arama Sorgusu</div></div>
<div class="istatistik"><div class="sayi">${news.length}</div><div class="aciklama">Sektor Haberi</div></div>
<div class="istatistik"><div class="sayi">${sites.length}</div><div class="aciklama">Forum/Sikayet</div></div>
</div>

<div class="kutu">
<h3 style="margin-top:0">Bu paket kimin icin?</h3>
<p style="color:#aaa;margin:8px 0">${sektor} sektorunde faaliyet gosteren firmalar, pazarlama ekipleri, urun yoneticileri ve danismanlar. Trend aramalardaki talep, bu verilere olan ihtiyaci gosteriyor.</p>
</div>

<h2>Trend Arama Sorgulari (${queries.length} adet)</h2>
<p style="color:#666;font-size:13px">Kullanicilarin Google'da aradigi terimler — talebin canli gostergesi</p>
<p>${qHtml}</p>

<h2>Sektor Haberleri</h2>
<ul>${newsHtml || '<li style="color:#555">Henuz veri yok</li>'}</ul>

<h2>Forum ve Kullanici Yorumlari</h2>
<ul>${sitesHtml || '<li style="color:#555">Henuz veri yok</li>'}</ul>

<hr style="border:none;border-top:1px solid #222;margin:36px 0">

${aHtml}

<div class="footer">KIVON AI Pazar Botu ile otomatik olusturulmustur. Veriler acik kaynaklardan toplanmistir. Ticari amacla kullanilabilir.</div>
</body></html>`;
}

async function main() {
  const sektor = process.argv[2] || 'E-Ticaret';
  console.log(`\nKIVON PAZAR BOTU: "${sektor}" sektoru taranıyor...\n`);

  console.log('[1/4] Trend sorgular taranıyor...');
  const queries = await getSearchSuggestions(sektor);
  console.log(`  -> ${queries.length} arama sorgusu bulundu`);

  console.log('[2/4] Haberler taranıyor...');
  const news = await getNews(sektor);
  console.log(`  -> ${news.length} haber bulundu`);

  console.log('[3/4] Forum/sirkayet verisi taranıyor...');
  const sites = await getSiteData(sektor);
  console.log(`  -> ${sites.length} girdi bulundu`);

  console.log('[4/4] AI analiz yapılıyor...');
  const analysis = await analyzeMarket(sektor, queries, news, sites, []);

  const html = buildHTML(sektor, analysis, queries, news, sites);

  fs.mkdirSync(OUTPUT, { recursive: true });
  const f = path.join(OUTPUT, `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-pazar-${Date.now()}`);

  fs.writeFileSync(f + '.html', html);
  fs.writeFileSync(f + '.md', analysis);

  console.log(`\n✅ Rapor hazir: ${f}.html`);
  console.log('\n--- AI PAKET ANALIZI ---\n');
  console.log(analysis.substring(0, 800));
}

main().catch(e => console.error('HATA:', e));
