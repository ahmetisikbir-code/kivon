const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const OUTPUT = path.join(__dirname, 'veri-hazinesi');
const STATE_FILE = path.join(OUTPUT, 'state.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CITIES = [
  'Adana','Adıyaman','Afyon','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin',
  'Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur',
  'Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan',
  'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Iğdır','Isparta','İstanbul',
  'İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli',
  'Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş',
  'Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Siirt','Sinop','Sivas',
  'Şanlıurfa','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak'
];

const QUERY_PATTERNS = [
  (s, c) => `${s} ${c} iletişim telefon`,
  (s, c) => `${s} ${c} firma adres telefon`,
  (s, c) => `${s} ${c} hizmet telefon numarası`,
  (s, c) => `${s} ${c} şirket email iletişim`,
  (s, c) => `"${s}" "${c}" tel:`,
  (s, c) => `${s} ${c} kurumsal iletişim`,
  (s, c) => `${s} ${c} nerede telefon adres`,
  (s, c) => `${s} ${c} müşteri hizmetleri telefon`,
  (s, c) => `${s} ${c} çalışan sayısı iletişim`,
  (s, c) => `${s} ${c} başvuru iletişim`,
];

const DIRECTORIES = [
  (s) => `https://www.eniyifirmadan.com/?s=${encodeURIComponent(s)}`,
  (s) => `https://www.firmaekle.net/ara?q=${encodeURIComponent(s)}`,
  (s) => `https://www.google.com/search?q=${encodeURIComponent(s + ' telefon adres')}`,
];

const SEARCH_ENGINES = [
  { name: 'bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=tr&count=30` },
  { name: 'bing2', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=tr&count=30&first=31` },
  { name: 'yahoo', url: (q) => `https://search.yahoo.com/search?p=${encodeURIComponent(q)}&ei=UTF-8&fr=sfp` },
];

function curl(url, timeout = 10) {
  try {
    return execSync(`curl -s --max-time ${timeout} -A "${UA}" -H "Accept-Language: tr-TR,tr" -H "Accept: text/html,application/xhtml+xml" -H "Referer: https://www.google.com/" "${url.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: (timeout + 3) * 1000 });
  } catch (e) { return e.stdout || ''; }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractPhones(text) {
  const s = new Set();
  const patterns = [
    /0?5[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    /0?2[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    /0?8[05]0[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    /\+90[-\s]?5[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) m.forEach(x => s.add(x.replace(/[-\s]/g, '')));
  }
  return [...s].filter(t => t.length >= 10);
}

function extractEmails(text) {
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g);
  return m ? [...new Set(m)] : [];
}

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function saveState(state) {
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function crawlSector(sektor) {
  const allTels = new Map(); // key: tel, value: { kaynak, sehir, sorgu, motor }
  const allMails = new Map(); // key: email, value: { kaynak, sehir }
  const allDemand = new Set();
  let totalRequests = 0;
  const cityStats = {}; // city -> { telCount, mailCount }
  CITIES.forEach(c => cityStats[c] = { tel: 0, mail: 0 });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SEKTOR: ${sektor}`);
  console.log(`${'='.repeat(50)}\n`);

  // 1. Google Suggest (trend) - once per sector
  console.log('[TREND] Google Suggest taranıyor...');
  const pre = ['en iyi','en ucuz','fiyat','2026','nasil','nedir','karsilastirma','yorum','tavsiye','telefon','adres','iletisim','mail','ucret','paket','hizmet','firsat','indirim','kurumsal'];
  for (const p of pre) {
    await wait(100);
    try {
      const html = curl(`https://www.google.com/complete/search?q=${encodeURIComponent(p + ' ' + sektor)}&cp=30&client=gws-wiz&xssi=t`);
      const j = JSON.parse(html.substring(html.indexOf('[')));
      for (const i of j[0] || []) { const t = (i[0] || '').replace(/<[^>]+>/g, ''); if (t) allDemand.add(t); }
    } catch (e) { }
    totalRequests++;
  }
  console.log(`  ${allDemand.size} sorgu bulundu\n`);

  // 2. Directories
  console.log('[DIZIN] Firma rehberleri taranıyor...');
  for (const dir of DIRECTORIES) {
    await wait(1500);
    try {
      const html = curl(dir(sektor));
      for (const tel of extractPhones(html)) { if (!allTels.has(tel)) { allTels.set(tel, { kaynak: 'dizin', sehir: '', sorgu: 'rehber', motor: '' }); cityStats[''] = cityStats[''] || { tel: 0, mail: 0 }; cityStats[''].tel++; } }
      for (const mail of extractEmails(html)) { if (!allMails.has(mail)) { allMails.set(mail, { kaynak: 'dizin', sehir: '' }); } }
    } catch (e) { }
    totalRequests++;
    process.stdout.write('.');
  }
  console.log(` ${allTels.size} tel, ${allMails.size} mail\n`);

  // 3. City-based search via multiple engines
  console.log('[SEHIR] 81 il taranıyor (yavas ama kapsamli)...');
  console.log(`  ${CITIES.length} sehir x ${QUERY_PATTERNS.length} sorgu x ${SEARCH_ENGINES.length} motor\n`);

  let cityCount = 0;
  for (const city of CITIES) {
    cityCount++;
    for (const qp of QUERY_PATTERNS) {
      const query = qp(sektor, city);
      for (const engine of SEARCH_ENGINES) {
        await wait(1500);
        const html = curl(engine.url(query));
        totalRequests++;

        const phones = extractPhones(html);
        const emails = extractEmails(html);
        for (const tel of phones) {
          if (!allTels.has(tel)) {
            allTels.set(tel, { kaynak: engine.name, sehir: city, sorgu: qp(sektor, city).substring(0, 40), motor: engine.name });
            cityStats[city].tel++;
          }
        }
        for (const mail of emails) {
          if (!allMails.has(mail)) {
            allMails.set(mail, { kaynak: engine.name, sehir: city });
            cityStats[city].mail++;
          }
        }
      }
    }

    if (cityCount % 5 === 0 || cityCount === CITIES.length) {
      const progress = (cityCount / CITIES.length * 100).toFixed(0);
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(0);
      console.log(`  ${cityCount}/${CITIES.length} sehir (%${progress}) — ${allTels.size} tel, ${allMails.size} mail — ${elapsed}dk gecti`);
    }
  }

  return {
    tels: [...allTels.keys()],
    telsMeta: Object.fromEntries(allTels),
    mails: [...allMails.keys()],
    mailsMeta: Object.fromEntries(allMails),
    demand: [...allDemand],
    requests: totalRequests,
    cityStats
  };
}

function analyzeData(sektor, tels, mails, demand, cityStats) {
  const topCities = Object.entries(cityStats || {}).filter(([c]) => c).sort((a, b) => b[1].tel - a[1].tel).slice(0, 10);
  const citySummary = topCities.map(([c, s]) => `${c}: ${s.tel} tel`).join(', ');
  const prompt = `Sen bir veri broker'i ve pazar arastirmacisisin.
Sektor: ${sektor}
Toplanan: ${tels.length} telefon, ${mails.length} email
En cok veri bulunan sehirler: ${citySummary}
Trend sorgu: ${demand.length} adet

Su formatta SATILABILIR VERI PAKETI RAPORU hazirla:

ILETISIM PAKETI: ${tels.length} telefon + ${mails.length} email — fiyat: ? TL
PAZAR PAKETI: Trend sorgulardan talep analizi — fiyat: ? TL
GELIR PROJEKSIYONU: Toplam aylik ? TL

Turkce yaz. Kisa ve oz.`;

  return new Promise((resolve, reject) => {
    const d = JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 1000 });
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

function buildHTML(sektor, tels, mails, demand, analysis, telsMeta, mailsMeta, cityStats) {
  const sehirSirali = Object.entries(cityStats || {}).filter(([c]) => c).sort((a, b) => b[1].tel - a[1].tel);
  const cityHtml = sehirSirali.map(([c, s]) =>
    `<div class="stat"><div class="s">${s.tel}</div><div class="a">${c}</div></div>`
  ).join('');

  const telRows = tels.map(t => {
    const m = telsMeta?.[t] || {};
    return `<tr><td>${t}</td><td style="color:#888;font-size:11px">${m.kaynak || ''}</td><td style="color:#888;font-size:11px">${m.sehir || ''}</td></tr>`;
  }).join('');

  const mailRows = mails.map(m => {
    const mm = mailsMeta?.[m] || {};
    return `<tr><td>${m}</td><td style="color:#888;font-size:11px">${mm.sehir || ''}</td></tr>`;
  }).join('');

  const dTags = demand.map(q => `<span class="tag">${q}</span>`).join('');

  const aHtml = analysis.split('\n').map(l => {
    if (/^##/.test(l)) return `<h2>${l.replace(/^##\s*/, '')}</h2>`;
    if (l.trim().startsWith('-')) return `<li>${l.replace(/^-\s*/, '')}</li>`;
    return l.trim() ? `<p>${l}</p>` : '';
  }).filter(Boolean).join('\n');

  return {
    html: `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>${sektor} — Veri Paketi</title>
<style>
body{font:14px -apple-system,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:960px;margin:0 auto;padding:40px 20px;line-height:1.7}
h1{color:#00e5ff;border-bottom:2px solid #222;padding-bottom:8px;font-size:26px}
h2{color:#00e5ff;margin-top:30px;font-size:17px;border-bottom:1px solid #1a1a1a;padding-bottom:6px}
.meta{color:#666;font-size:12px;margin-bottom:20px}
.stat{display:inline-block;border:1px solid #222;border-radius:8px;padding:14px 18px;background:#111;margin:6px;text-align:center}
.stat .s{font-size:28px;font-weight:700;color:#00e5ff}
.stat .a{font-size:11px;color:#666;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px;margin:10px 0}
th{text-align:left;padding:5px;color:#888;border-bottom:1px solid #333}
td{padding:5px;border-bottom:1px solid #1a1a1a;font-family:monospace;font-size:12px}
.tag{display:inline-block;background:#00e5ff10;color:#00e5ff;padding:2px 7px;border-radius:10px;font-size:10px;margin:2px}
.kutu{max-height:400px;overflow-y:auto;border:1px solid #1a1a1a;border-radius:8px}
.footer{text-align:center;margin-top:48px;padding-top:20px;border-top:1px solid #222;font-size:12px;color:#444}
</style></head><body>
<h1>${sektor} Veri Paketi</h1>
<div class="meta">KIVON Veri Broker | ${new Date().toLocaleDateString('tr-TR')} | ${tels.length} telefon • ${mails.length} email • ${demand.length} talep sorgusu | 81 il tarandi</div>
<p>${['Telefon','Email','Talep','Sehir'].map((l,i) => `<span class="stat"><div class="s">${[tels.length,mails.length,demand.length,sehirSirali.length][i]}</div><div class="a">${l}</div></span>`).join('')}</p>

<h2>Sehirlere Gore Dagitim</h2>
<p>${cityHtml || '<span style="color:#555">Henuz yok</span>'}</p>

<h2>Telefon Listesi (${tels.length})</h2>
<div class="kutu"><table><thead><tr><th>Telefon</th><th>Kaynak</th><th>Sehir</th></tr></thead><tbody>${telRows || '<tr><td colspan="3" style="color:#555">Yok</td></tr>'}</tbody></table></div>
<h2>Email Listesi (${mails.length})</h2>
<div class="kutu"><table><thead><tr><th>Email</th><th>Sehir</th></tr></thead><tbody>${mailRows || '<tr><td colspan="2" style="color:#555">Yok</td></tr>'}</tbody></table></div>
<h2>Trend Aramalar</h2>
<p>${dTags}</p>
<hr style="border:none;border-top:1px solid #222;margin:30px 0">
<h2>AI Veri Paketi Analizi</h2>
${aHtml}
<div class="footer">KIVON Veri Broker</div>
</body></html>`,
    csv: `telefon,email,sektor\n${tels.map(t => `"${t}",,${sektor}`).join('\n')}\n${mails.map(m => `,"${m}",${sektor}`).join('\n')}`
  };
}

const startTime = Date.now();

async function main() {
  const sektor = process.argv[2] || 'Avukat';
  const state = loadState();

  console.log(`\nKIVON VERI BROKER — SINIRSIZ MOD`);
  console.log(`Sektor: ${sektor}`);
  console.log(`81 il x 10 sorgu x 3 motor = 2.430 sorgu\n`);

  const { tels, telsMeta, mails, mailsMeta, demand, requests, cityStats } = await crawlSector(sektor);
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(0);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TARAMA TAMAM`);
  console.log(`Sure: ${elapsed} dk`);
  console.log(`Istek: ${requests} adet`);
  console.log(`Telefon: ${tels.length} benzersiz`);
  console.log(`Email: ${mails.length} benzersiz`);
  console.log(`Talep: ${demand.length}`);
  console.log(`${'='.repeat(50)}`);

  console.log(`\nAI analiz...`);
  const analysis = await analyzeData(sektor, tels, mails, demand, cityStats);

  const { html, csv } = buildHTML(sektor, tels, mails, demand, analysis, telsMeta, mailsMeta, cityStats);
  fs.mkdirSync(OUTPUT, { recursive: true });
  const base = path.join(OUTPUT, `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}-sinirsiz-${Date.now()}`);
  fs.writeFileSync(base + '.html', html);
  fs.writeFileSync(base + '.csv', csv, 'utf8');
  fs.writeFileSync(base + '-analiz.md', analysis);

  state[sektor] = { tarih: Date.now(), tels: tels.length, mails: mails.length, demand: demand.length };
  saveState(state);

  console.log(`\n✅ ${base}.html`);
  console.log(`✅ ${base}.csv`);
}

main().catch(e => console.error('HATA:', e));
