const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const OUTPUT = path.join(__dirname, 'veri-hazinesi');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function curl(url, timeout = 10) {
  try {
    return execSync(`curl -s --max-time ${timeout} -A "${UA}" -H "Accept-Language: tr-TR,tr" -H "Accept: text/html" "${url.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: (timeout + 2) * 1000 });
  } catch (e) { return e.stdout || ''; }
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

// ---- 1. BING SEARCH ----
async function searchBing(sektor, sehir) {
  const r = [];
  const qs = [
    `${sektor} ${sehir} iletişim telefon`,
    `${sektor} ${sehir} firma email adres`,
    `"${sektor}" "${sehir}" telefon numarası`,
    `${sektor} şirket iletişim bilgileri`,
    `${sektor} ajans ${sehir} telefon`,
  ];
  for (const q of qs) {
    await wait(800);
    const html = curl(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=tr&count=30`);
    const phones = extractPhones(html);
    const emails = extractEmails(html);
    for (const tel of phones) r.push({ tel, kaynak: 'bing', q });
    for (const mail of emails) r.push({ mail, kaynak: 'bing', q });
  }
  return r;
}

// ---- 2. TURKISH DIRECTORIES ----
async function searchDirectories(sektor) {
  const r = [];
  const siteler = [
    `https://www.eniyifirmadan.com/?s=${encodeURIComponent(sektor)}`,
    `https://www.firmaekle.net/ara?q=${encodeURIComponent(sektor)}`,
  ];
  for (const url of siteler) {
    await wait(1000);
    const html = curl(url);
    const phones = extractPhones(html);
    for (const tel of phones) r.push({ tel, kaynak: url.includes('eniyifirmadan') ? 'eniyifirmadan' : 'firmaekle' });
  }
  return r;
}

// ---- 3. GOOGLE SUGGEST (TREND) ----
async function getDemand(sektor) {
  const q = [];
  const pre = ['en iyi','en ucuz','fiyat','2026','nasil','nedir','karsilastirma','yorum','tavsiye','telefon','adres','iletisim','mail','ucret','paket','hizmet','firsat','indirim','kurumsal','ne kadar','nerede','satin al','bedava','ucretsiz','online','profesyonel','yerli','istanbul','ankara','izmir','firma','şirket'];
  for (const p of pre) {
    await wait(100);
    try {
      const html = curl(`https://www.google.com/complete/search?q=${encodeURIComponent(p + ' ' + sektor)}&cp=30&client=gws-wiz&xssi=t`);
      const j = JSON.parse(html.substring(html.indexOf('[')));
      for (const i of j[0] || []) { const t = (i[0] || '').replace(/<[^>]+>/g, ''); if (t) q.push(t); }
    } catch (e) { }
  }
  return [...new Set(q)];
}

// ---- 4. NEWS ----
async function getNews(sektor) {
  const xml = curl(`https://news.google.com/rss/search?q=${encodeURIComponent(sektor + ' sektor')}&hl=tr&gl=TR`);
  return xml.split('<item>').slice(1).slice(0, 10).map(item => {
    const t = item.match(/<title>(.*?)<\/title>/); return t ? t[1].replace(/<!\[CDATA\[|\]\]>/g, '') : '';
  }).filter(Boolean);
}

// ---- 5. AI ANALIZ ----
function analyzeData(sektor, tels, mails, demand, news) {
  const utels = [...new Set(tels.map(t => t.tel))].filter(Boolean);
  const umails = [...new Set(mails.map(m => m.mail))].filter(Boolean);
  const ornekTel = utels.slice(0, 15).join(', ');
  const ornekMail = umails.slice(0, 10).join(', ');
  const kaynaklar = [...new Set([...tels, ...mails].map(x => x.kaynak).filter(Boolean))];

  const prompt = `Sen bir veri broker'i ve pazar arastirmacisisin.

Sektor: ${sektor}

TOPLANAN VERI:
- Telefon: ${utels.length} adet
- Email: ${umails.length} adet
- Kaynak: ${kaynaklar.join(', ')}

ORNEK TELEFON: ${ornekTel || '(yok)'}
ORNEK MAIL: ${ornekMail || '(yok)'}

TREND SORGULARI (insanlarin aradigi):
${demand.map(q => '  - ' + q).join('\n')}

HABER:
${news.map(n => '  - ' + n).join('\n')}

Su formatta "SATILABILIR VERI PAKETI" raporu hazirla:

## ILETISIM PAKETI
Icerik, kac kayit, kim alir, fiyat TL

## PAZAR ARASTIRMASI PAKETI
Trendlerden cikan talep, fiyat TL

## MUSTERI LISTESI PAKETI
Bu veriyi kimlere satariz, fiyat TL

## GELIR PROJEKSIYONU
Beklenen aylik gelir TL

Turkce yaz. Kisa ve oz olsun. Somut TL fiyatlari ver.`;

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

function buildHTML(sektor, tels, mails, demand, analysis) {
  const utels = [...new Set(tels.map(t => t.tel))].filter(Boolean);
  const umails = [...new Set(mails.map(m => m.mail))].filter(Boolean);

  const telRows = utels.map(t => `<tr><td>${t}</td></tr>`).join('');
  const mailRows = umails.map(m => `<tr><td>${m}</td></tr>`).join('');
  const demandTags = demand.map(q => `<span class="tag">${q}</span>`).join('');

  const aHtml = analysis.split('\n').map(l => {
    if (/^##/.test(l)) return `<h2>${l.replace(/^##\s*/, '')}</h2>`;
    if (l.trim().startsWith('-')) return `<li>${l.replace(/^-\s*/, '')}</li>`;
    if (l.trim() === '') return '';
    return `<p>${l}</p>`;
  }).filter(Boolean).join('\n');

  return {
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${sektor} Veri Paketi</title>
<style>
body{font:14px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:960px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;margin-bottom:4px;font-size:26px}
h2{color:#00e5ff;margin-top:36px;font-size:18px;border-bottom:1px solid #1a1a1a;padding-bottom:8px}
.meta{color:#666;font-size:13px;margin-bottom:24px}
.grid{display:flex;gap:12px;margin:20px 0;flex-wrap:wrap}
.kart{border:1px solid #222;border-radius:8px;padding:16px;background:#111;flex:1;min-width:100px;text-align:center}
.kart .s{font-size:32px;font-weight:700;color:#00e5ff}
.kart .a{font-size:11px;color:#666;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0}
th{text-align:left;padding:6px;color:#888;border-bottom:1px solid #333}
td{padding:6px;border-bottom:1px solid #1a1a1a;font-family:monospace;font-size:13px}
.tag{display:inline-block;background:#00e5ff10;color:#00e5ff;padding:2px 8px;border-radius:12px;font-size:11px;margin:3px}
.veri-kutusu{max-height:350px;overflow-y:auto;border:1px solid #1a1a1a;border-radius:8px}
.footer{text-align:center;margin-top:48px;padding-top:20px;border-top:1px solid #222;font-size:12px;color:#444}
</style></head><body>
<h1>${sektor} Veri Paketi</h1>
<div class="meta">KIVON Veri Broker | ${new Date().toLocaleDateString('tr-TR')}</div>

<div class="grid">
<div class="kart"><div class="s">${utels.length}</div><div class="a">Telefon</div></div>
<div class="kart"><div class="s">${umails.length}</div><div class="a">E-posta</div></div>
<div class="kart"><div class="s">${demand.length}</div><div class="a">Talep Sorgusu</div></div>
</div>

<h2>Trend Aramalar</h2>
<p style="color:#666;font-size:12px">Insanlarin Google'da aradigi seyler — neye ihtiyaclari oldugunu gosterir</p>
<p>${demandTags}</p>

<h2>Telefon Listesi (${utels.length})</h2>
<div class="veri-kutusu"><table><thead><tr><th>Telefon</th></tr></thead><tbody>${telRows || '<tr><td style="color:#555">Henuz veri yok</td></tr>'}</tbody></table></div>

<h2>E-posta Listesi (${umails.length})</h2>
<div class="veri-kutusu"><table><thead><tr><th>E-posta</th></tr></thead><tbody>${mailRows || '<tr><td style="color:#555">Henuz veri yok</td></tr>'}</tbody></table></div>

<hr style="border:none;border-top:1px solid #222;margin:36px 0">
<h2>AI Veri Paketi Analizi</h2>
${aHtml}
<div class="footer">KIVON Veri Broker Botu ile olusturulmustur.</div>
</body></html>`,
    csv: `telefon,eposta,sektor\n${utels.map(t => `"${t}",,${sektor}`).join('\n')}\n${umails.map(m => `,"${m}",${sektor}`).join('\n')}`
  };
}

async function main() {
  const sektor = process.argv[2] || 'Avukat';
  const sehir = process.argv[3] || '';

  console.log(`\nKIVON VERI BROKER BOTU (curl)`);
  console.log(`Sektor: ${sektor}\n`);

  console.log('[1] Trend sorgular...');
  const demand = await getDemand(sektor);
  console.log(`  ${demand.length} sorgu`);

  console.log('[2] Bing taranıyor...');
  const bing = await searchBing(sektor, sehir);
  console.log(`  Bing: ${bing.filter(x => x.tel).length} tel, ${bing.filter(x => x.mail).length} mail`);

  console.log('[3] Firma rehberleri...');
  const dir = await searchDirectories(sektor);
  console.log(`  Rehber: ${dir.length} tel`);

  console.log('[4] Haberler...');
  const news = await getNews(sektor);
  console.log(`  ${news.length} haber`);

  const allTels = [...bing.filter(x => x.tel), ...dir.filter(x => x.tel)];
  const allMails = [...bing.filter(x => x.mail)];
  const utels = [...new Set(allTels.map(t => t.tel))].filter(Boolean);
  const umails = [...new Set(allMails.map(m => m.mail))].filter(Boolean);

  console.log(`\n[5] AI analiz...`);
  const analysis = await analyzeData(sektor, allTels, allMails, demand, news);

  const { html, csv } = buildHTML(sektor, allTels, allMails, demand, analysis);

  fs.mkdirSync(OUTPUT, { recursive: true });
  const base = path.join(OUTPUT, `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-veri-${Date.now()}`);
  fs.writeFileSync(base + '.html', html);
  fs.writeFileSync(base + '.csv', csv, 'utf8');
  fs.writeFileSync(base + '-analiz.md', analysis);

  console.log(`\n✅ ${base}.html`);
  console.log(`\nOZET: ${utels.length} tel | ${umails.length} mail | ${demand.length} talep`);
}

main().catch(e => console.error('HATA:', e));
