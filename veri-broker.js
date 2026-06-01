const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';
const BATCH_SIZE = 10;
const OUTPUT = path.join(__dirname, 'veri-hazinesi');
const DB_FILE = path.join(OUTPUT, 'katalog.json');
const CSV_FILE = path.join(OUTPUT, 'katalog.csv');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ---- 0. KOMUT SATIRI PARAMETRELERI ----
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = process.argv[i + 1];
    if (v && !v.startsWith('--')) { args[k] = v; i++; }
    else { args[k] = true; }
  }
}

if (args.help) {
  console.log(`
${'='.repeat(52)}
  KIVON VERI BROKER v2 — KULLANIM
${'='.repeat(52)}

  node veri-broker.js [parametreler]

PARAMETRELER:
  --sektor "Avukat"   Sadece belirtilen sektörü tara
  --lokasyon "İstanbul" Aramaya lokasyon ekle
  --limit 100         İstek limitini değiştir (varsayılan: 500)
  --fresh             Eski verileri temizle
  --help              Bu mesajı göster

SEKTÖRLER:
  Avukat, Doktor, Emlak, Insaat, Kuafor, Lojistik,
  Muhasebe, Nakliyat, Oto-Servis, Restoran, Tekstil

ÖRNEK:
  node veri-broker.js --sektor "Avukat" --lokasyon "İstanbul" --limit 100

${'='.repeat(52)}
`);
  process.exit(0);
}

const SECTOR_KEYWORDS = {
  Restoran: 'restoran',
  Avukat: 'avukat',
  Doktor: 'doktor',
  Kuafor: 'kuaför',
  Insaat: 'inşaat',
  Emlak: 'emlak',
  Nakliyat: 'nakliyat',
  'Oto-Servis': 'oto servis',
  Muhasebe: 'muhasebe',
  Tekstil: 'tekstil',
  Lojistik: 'lojistik',
};

if (args.sektor && !SECTOR_KEYWORDS[args.sektor]) {
  console.error(`\n  HATA: "${args.sektor}" geçersiz sektör adı`);
  console.error(`  Geçerli sektörler: ${Object.keys(SECTOR_KEYWORDS).join(', ')}\n`);
  process.exit(1);
}

// ---- 1. SEED URL'LER (parametrelere gore olusturulur) ----
const BASE_URLS = [
  'https://www.bing.com/search?q=restoran+telefon+adres+ileti%C5%9Fim&setlang=tr&count=30',
  'https://www.bing.com/search?q=avukat+telefon+adres+ileti%C5%9Fim&setlang=tr&count=30',
  'https://www.bing.com/search?q=doktor+telefon+adres+ileti%C5%9Fim&setlang=tr&count=30',
  'https://www.bing.com/search?q=kuaf%C3%B6r+telefon+adres+ileti%C5%9Fim&setlang=tr&count=30',
  'https://www.bing.com/search?q=in%C5%9Faat+firma+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=emlak+ofisi+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=nakliyat+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=oto+servis+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=muhasebe+b%C3%BCrosu+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=firma+adres+telefon+email+liste&setlang=tr&count=30',
  'https://www.bing.com/search?q=tekstil+firma+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=lojistik+firma+telefon+adres&setlang=tr&count=30',
];

const GENERIC_URLS = [
  'https://www.bing.com/search?q=firma+rehberi+telefon+adres&setlang=tr&count=30',
  'https://www.bing.com/search?q=sar%C4%B1+saya%C3%A7+firma+telefon&setlang=tr&count=30',
  'https://www.bing.com/search?q=t%C3%BCrkiye+firma+veritaban%C4%B1+telefon&setlang=tr&count=30',
  'https://www.eniyifirmadan.com/',
  'https://www.firmaekle.net/',
  'https://www.bing.com/search?q=site:firmaekle.net+telefon&setlang=tr&count=30',
  'https://www.bing.com/search?q=site:eniyifirmadan.com+telefon&setlang=tr&count=30',
];

function buildSeedUrls(sektor, lokasyon) {
  let urls = sektor ? [] : [...BASE_URLS];

  if (sektor) {
    const kw = SECTOR_KEYWORDS[sektor];
    if (kw) {
      urls = BASE_URLS.filter(u => {
        const m = u.match(/q=([^&]+)/);
        if (!m) return false;
        try {
          const decoded = decodeURIComponent(m[1].replace(/\+/g, ' '));
          return decoded.toLowerCase().includes(kw.toLowerCase());
        } catch { return false; }
      });
    }
  }

  urls = [...urls, ...GENERIC_URLS];

  if (lokasyon) {
    urls = urls.map(u => {
      if (!u.includes('bing.com/search')) return u;
      return u.replace(/q=([^&]+)/, (_, q) => {
        try {
          const decoded = decodeURIComponent(q.replace(/\+/g, ' '));
          if (decoded.toLowerCase().includes(lokasyon.toLowerCase())) return 'q=' + q;
          return 'q=' + encodeURIComponent(decoded + ' ' + lokasyon).replace(/%20/g, '+');
        } catch { return 'q=' + q; }
      });
    });
  }

  return urls;
}

const SEED_URLS = buildSeedUrls(args.sektor, args.lokasyon);

// ---- 2. TELEFON & MAIL AYIKLAMA (genisletilmis regex) ----
function extractVisibleText(html) {
  // Bing sonuc sayfalarinda sadece arama sonuclarindaki metni al
  let text = html;
  // Bing sonuclari <li class="b_algo"> icinde
  const results = [...html.matchAll(/<li[^>]*class="b_algo"[^>]*>[\s\S]*?<\/li>/g)];
  if (results.length > 0) {
    text = results.map(m => m[0]).join(' ');
  }
  // Tum HTML taglerini temizle
  return text.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractPhones(text) {
  const s = new Set();
  const patterns = [
    // Turk cep telefonu: 05XX XXX XX XX
    /0?5[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    // Turk sabit hat: 02XX XXX XX XX / 03XX XXX XX XX / 04XX XXX XX XX
    /0?[234][0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    // 444 hattI: 444 0 XXX
    /444[-\s]?0?[0-9]{3}/g,
    // 850/800 numaralari
    /0?8[05]0[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    // Uluslararasi: +90 5XX XXX XX XX
    /\+90[-\s]?5[0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    // +90 2XX format
    /\+90[-\s]?[234][0-9]{2}[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
    // (0XXX) XXX XX XX format
    /\(0?[0-9]{3,4}\)[-\s]?[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{2}/g,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) m.forEach(x => s.add(x.replace(/[-\s]/g, '')));
  }
  return [...s].filter(t => t.length >= 10 && t.length <= 14);
}

function decodeCloudflareEmail(hex) {
  try {
    const bytes = hex.match(/.{1,2}/g).map(b => parseInt(b, 16));
    const key = bytes[0];
    return bytes.slice(1).map(b => String.fromCharCode(b ^ key)).join('');
  } catch (e) { return null; }
}

function extractEmails(text, rawHtml) {
  const s = new Set();
  const patterns = [
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    /[A-Za-z0-9._%+-]+\[at\][A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) m.forEach(x => s.add(x.replace(/\[at\]/g, '@')));
  }

  if (rawHtml) {
    // mailto: linklerinden email çek
    const mailtoMatches = [...rawHtml.matchAll(/href="mailto:([^"]+)"/gi)];
    mailtoMatches.forEach(m => { if (m[1].includes('@')) s.add(m[1].trim()); });

    // CloudFlare email protection decode
    const cfMatches = [...rawHtml.matchAll(/href="\/cdn-cgi\/l\/email-protection#([a-f0-9]+)"/gi)];
    cfMatches.forEach(m => { const d = decodeCloudflareEmail(m[1]); if (d && d.includes('@')) s.add(d); });

    // <a> tagi icinde email
    const linkTextMatches = [...rawHtml.matchAll(/<a[^>]*>([^<]*@[^<]+)<\/a>/gi)];
    linkTextMatches.forEach(m => { if (m[1].includes('@')) s.add(m[1].trim()); });
  }

  // "e-posta", "mail", "email", "eposta" kelimelerinin yanindaki email
  const nearbyPattern = /(?:e-posta|mail|email|eposta)[:\s]*([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;
  const nearbyMatches = [...text.matchAll(nearbyPattern)];
  nearbyMatches.forEach(m => s.add(m[1]));

  return [...s].filter(e => {
    const tld = e.split('.').pop();
    return tld.length >= 2 && tld.length <= 6 && !e.includes('example.com');
  });
}

function extractCompanyName(html, url) {
  let name = '';

  // Bing sonuc sayfasiysa gercek firma adi yok, yer tutucu ata
  if (url.includes('bing.com/search') || url.includes('bing.com/copilot')) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) { hash = ((hash << 5) - hash) + url.charCodeAt(i); hash = hash & hash; }
    return `Bilinmeyen Firma #${Math.abs(hash).toString(36).substring(0, 4).toUpperCase()}`;
  }

  const mTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (mTitle) name = mTitle[1].replace(/[-|].*$/, '').trim();

  if (!name || name.length < 3) {
    const mH1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (mH1) name = mH1[1].trim();
  }

  if (!name || name.length < 3) {
    const mOG = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
    if (mOG) name = mOG[1].trim();
  }

  if (!name || name.length < 3) {
    try { name = new URL(url).hostname.replace(/^www\./, '').split('.')[0].toUpperCase(); }
    catch (e) { name = url.substring(0, 40); }
  }

  return name.substring(0, 80).replace(/&amp;/g, '&').replace(/&#\d+;/g, '');
}

function extractBingResults(html) {
  // Bing arama sonuclarindaki gercek firma linklerini cikar
  const links = new Set();
  // Bing sonuclari genelde <h2><a href="..." target="_blank">
  const m1 = [...html.matchAll(/<h2><a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/g)];
  m1.forEach(m => { try { const u = new URL(m[1]); if (u.hostname !== 'www.bing.com') links.add(m[1].split('#')[0]); } catch(e){} });
  // Bing yanitlari: <cite> veya <a> icinde sonuclar
  const m2 = [...html.matchAll(/<a[^>]+href="(https?:\/\/(?!www\.bing\.com)[^"]+)"[^>]*>/g)];
  m2.forEach(m => { try { const u = new URL(m[1]); if (u.hostname !== 'www.bing.com' && !u.pathname.match(/\.(pdf|jpg|png|css|js)$/i)) links.add(m[1].split('#')[0]); } catch(e){} });
  return [...links];
}

function extractLinks(html, baseUrl) {
  const links = new Set();
  const base = (() => { try { return new URL(baseUrl).hostname; } catch { return ''; } })();
  const baseOrigin = (() => { try { return new URL(baseUrl).origin; } catch { return ''; } })();

  const patterns = [/href="([^"]+)"/g, /href='([^']+)'/g, /href=([^\s>]+)/g];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      try {
        let u = m[1];
        if (u.startsWith('//')) u = 'https:' + u;
        else if (u.startsWith('/')) u = baseOrigin + u;
        else if (!u.startsWith('http')) continue;

        const parsed = new URL(u);
        if (parsed.hostname === base || parsed.hostname.endsWith('.' + base)) {
          // Prioritize contact/about/iletisim pages
          const h = parsed.href.split('#')[0];
          if (h && !h.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|ico|xml|zip|rar|mp4|mp3)$/i)) {
            links.add(h);
          }
        }
      } catch (e) { }
    }
  }
  return [...links];
}

function isContactPage(url) {
  const keywords = /(iletisim|contact|about|hakkimizda|telefon|adres|bize-ulas|kurumsal)/i;
  return keywords.test(url);
}

function curl(url) {
  return new Promise(resolve => {
    // Denonce curl (Windows varsayilaninda yoksa patlamasin)
    try {
      const result = execSync(`curl -s --max-time 12 -A "${UA}" -H "Accept-Language: tr-TR,tr" -H "Referer: https://www.bing.com/" "${url.replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 15000 });
      resolve(result);
      return;
    } catch (e) {
      if (e.stdout) { resolve(e.stdout); return; }
    }
    // curl yoksa Node.js https ile dene
    try {
      const u = new URL(url);
      const opts = {
        hostname: u.hostname, path: u.pathname + u.search,
        method: 'GET', timeout: 12000,
        headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr', 'Referer': 'https://www.bing.com/' }
      };
      const req = https.request(opts, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(b));
      });
      req.on('error', () => resolve(''));
      req.end();
    } catch (e) { resolve(''); }
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- GOOGLE MAPS SEARCH (deneysel) ----
// NOT: Google Maps JS render gerektirir. curl ile sadece skeleton HTML gelir.
// Gerçek veri icin Google Places API veya headless browser (Puppeteer/Playwright) gerekir.
async function googleMapsSearch(sektor, lokasyon, existingHtml) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(sektor)}+${encodeURIComponent(lokasyon)}/`;
  const html = existingHtml || await curl(url);

  // JS render edilmedigi icin veri gelmezse sessizce gec
  if (!html || html.length < 500 || html.includes('noscript') || html.includes('JavaScript') || html.includes('etkinle')) {
    return [];
  }

  const results = [];
  const articles = [...html.matchAll(/<div[^>]+role="article"[^>]*>[\s\S]*?<\/div>/g)];

  for (const article of articles) {
    const content = article[0];
    const name = content.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                 content.match(/<h3[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h3>/i)?.[1] || '';
    const phoneMatch = content.match(/<a[^>]*data-tooltip[^>]*Telefon[^>]*>([^<]+)<\/a>/i);
    const phone = phoneMatch?.[1] || extractPhones(content)[0] || '';
    const address = content.match(/<div[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)<\/div>/i)?.[1] || '';
    const rating = content.match(/<span[^>]*aria-label[^>]*?(\d+(?:\.\d+)?)\s*yıldız/i)?.[1] || '';

    if (name) {
      results.push({
        firma: name,
        telefon: phone ? [phone.replace(/[-\s]/g, '')] : [],
        email: [],
        adres: address,
        puan: rating,
        kaynak: 'google_maps',
        url: url,
        domain: 'www.google.com',
        bulundu: new Date().toISOString()
      });
    }
  }

  return results;
}

function isGoogleMapsUrl(url) {
  return url.includes('google.com/maps/search');
}

// ---- 3. AI SINIFLANDIRMA (iyilestirilmis) ----
function askGroq(prompt) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 800 });
    const opts = { hostname: 'api.groq.com', path: '/openai/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } };
    const req = https.request(opts, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { const j = JSON.parse(b); resolve(j.choices?.[0]?.message?.content || b); }
        catch { resolve(b); }
      });
    });
    req.on('error', () => resolve('SINIFLANDIRILAMADI'));
    req.write(d);
    req.end();
  });
}

async function classifyPage(firma, telefon, email, snippet) {
  const prompt = `Sen bir veri broker asistanisin. Verilen firma bilgilerine gore sadece JSON ciktisi ver. Asla aciklama yazma, sadece gecerli JSON dondur.

ORNEK 1:
Firma: Lezzet Lokantasi
Telefon: 02125551234
Icerik: Lezzet Lokantasi Istiklal Caddesi'nde hizmet veren koklu bir restorandir. Yemek firmalarina toplu siparis verir.
Cikti: {"sektor":"Restoran","alici":"Yemek Firmasi, catering sirketi","fiyat":"350 TL","kullanim":"Toplu yemek siparisi ve catering firmalarina satis listesi","guven":"yuksek"}

ORNEK 2:
Firma: Hukuk Burosu Av. Mehmet Yilmaz
Telefon: 05321234567
Icerik: Avukat Mehmet Yilmaz Istanbul Barosu'na kayitli, ceza ve aile hukuku alaninda uzman.
Cikti: {"sektor":"Hukuk Burosu","alici":"Hukuk yazilim sirketi, dava takip firmasi","fiyat":"750 TL","kullanim":"Hukuk burolarina yonelik yazilim ve danismanlik hizmeti satisi","guven":"yuksek"}

ORNEK 3:
Firma: Guzel Eller Kuafoer
Telefon: 02163334455
Icerik: Kadin kuaföru, sac kesimi ve boyama hizmetleri. Indirim kuponlari mevcut.
Cikti: {"sektor":"Kuafor","alici":"Kozmetik markasi, guzellik urunu saticisi","fiyat":"250 TL","kullanim":"Kozmetik ve guzellik urunlerinin tanitim ve satis listesi","guven":"orta"}

SIMDI ASAGIDAKINI SINIFLANDIR:

Firma: ${firma}
Telefon: ${telefon || 'yok'}
Icerik: ${snippet.substring(0, 400)}

SEKTORE GORE FIYAT BANDI:
- Restoran, Kafe, Kuafor, Spor-Salonu: 200-400 TL
- Avukat, Doktor, Muhasebe, Hukuk Burosu: 500-1000 TL
- Emlak, Insaat, Nakliyat: 400-800 TL
- Oto-Servis, Lojistik, Tekstil: 300-600 TL
- E-Ticaret, Yazilim, Dijital-Ajans: 250-500 TL
- Egitim, Danismanlik: 400-700 TL
- Temizlik, Otel, Diger: 200-500 TL

Sektor icin dogal isim kullan (ornek: "Hukuk Burosu", "Insaat Firmasi", "Doktor Klinigi"). Alici turunu sektore gore spesifik yaz. Fiyati yukaridaki banda gore tahmin et. Kullanimi 1 cumle ile acikla. Eger %70'ten az eminsen "guven" alanini "dusuk" yap, degilse "yuksek" veya "orta" yap.

Yalnizca gecerli JSON dondur: {"sektor":"...","alici":"...","fiyat":"... TL","kullanim":"...","guven":"yuksek|orta|dusuk"}`;

  return await askGroq(prompt);
}

// ---- 3B. BATCH SINIFLANDIRMA ----
async function classifyBatch(bekleyenler) {
  const prompt = `Sen bir veri broker asistanisin. Asagidaki ${bekleyenler.length} firmayi JSON array olarak siniflandir. Asla aciklama yazma, sadece gecerli JSON array dondur.

Her eleman su formatta olmali:
{"sektor":"...","alici":"...","fiyat":"...","kullanim":"...","guven":"yuksek|orta|dusuk"}

SEKTORE GORE FIYAT BANDI:
- Restoran, Kafe, Kuafor, Spor-Salonu: 200-400 TL
- Avukat, Doktor, Muhasebe, Hukuk Burosu: 500-1000 TL
- Emlak, Insaat, Nakliyat: 400-800 TL
- Oto-Servis, Lojistik, Tekstil: 300-600 TL
- E-Ticaret, Yazilim, Dijital-Ajans: 250-500 TL
- Egitim, Danismanlik: 400-700 TL
- Temizlik, Otel, Diger: 200-500 TL

Sektor icin dogal isim kullan. Alici turunu sektore gore spesifik yaz. Fiyati banda gore tahmin et. Kullanimi 1 cumle ile acikla. Eger %70'ten az eminsen "guven"i "dusuk" yap.

SINIFLANDIRILACAK FIRMALAR:
${bekleyenler.map((b, i) =>
  `${i + 1}. Firma: ${b.firma}\n   Telefon: ${b.telefon && b.telefon[0] ? b.telefon[0] : 'yok'}\n   Icerik: ${b.snippet.substring(0, 200)}`
).join('\n\n')}

Yalnizca gecerli JSON array dondur. Her firma icin 1 eleman.
Ornek:
[{"sektor":"Restoran","alici":"Yemek Firmasi","fiyat":"350 TL","kullanim":"Toplu yemek siparisi","guven":"yuksek"}]`;

  return await askGroq(prompt);
}

function parseBatchResponse(raw) {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

// ---- VERITABANI ----
function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') console.error('loadDB uyarisi:', e.message);
    return [];
  }
}

function saveDB(db) {
  try {
    fs.mkdirSync(OUTPUT, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('saveDB basarisiz:', e.message);
  }
}

function exportCSV(db) {
  const header = 'Firma;Sektor;Telefon;Email;Alici;Fiyat;Kullanim;Guven;Domain;URL;Bulundu\n';
  const rows = db.map(e => {
    const tel = (e.telefon || []).join(', ');
    const mail = (e.email || []).join(', ');
    return `"${(e.firma || '').replace(/"/g, '""')}";"${(e.sektor || '').replace(/"/g, '""')}";"${tel}";"${mail}";"${(e.alici || '').replace(/"/g, '""')}";"${e.fiyat || ''}";"${(e.kullanim || '').replace(/"/g, '""')}";"${e.guven || ''}";"${e.domain || ''}";"${e.url || ''}";"${e.bulundu || ''}"`;
  });
  return header + rows.join('\n');
}

function exportSectorCSV(db, sektor) {
  const filtered = db.filter(e => (e.sektor || 'Diger') === sektor);
  if (filtered.length === 0) return '';
  const f = path.join(OUTPUT, `${sektor.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv`);
  const header = 'Firma;Telefon;Email;Alici;Fiyat;Kullanim;Guven;URL\n';
  const rows = filtered.map(e => {
    const tel = (e.telefon || []).join(', ');
    const mail = (e.email || []).join(', ');
    return `"${(e.firma || '').replace(/"/g, '""')}";"${tel}";"${mail}";"${(e.alici || '').replace(/"/g, '""')}";"${e.fiyat || ''}";"${(e.kullanim || '').replace(/"/g, '""')}";"${e.guven || ''}";"${e.url || ''}"`;
  });
  fs.writeFileSync(f, header + rows.join('\n'), 'utf8');
  return f;
}

// ---- 4. ZENGIN RAPOR ----
function generateReport(db) {
  const sectors = {};
  const allPhones = new Set();
  const allEmails = new Set();

  db.forEach(entry => {
    const s = entry.sektor || 'Bilinmeyen';
    if (!sectors[s]) sectors[s] = { tel: 0, mail: 0, firmaSayisi: 0, fiyatToplam: 0, fiyatDeger: 0, kayit: [] };
    sectors[s].tel += entry.telefon?.length || 0;
    sectors[s].mail += entry.email?.length || 0;
    sectors[s].firmaSayisi++;
    sectors[s].kayit.push(entry);

    const f = parseInt(entry.fiyat) || 0;
    sectors[s].fiyatToplam += f;
    // Her telefon icin ayri deger biç
    sectors[s].fiyatDeger += f * (entry.telefon?.length || 1);

    if (entry.telefon) entry.telefon.forEach(t => allPhones.add(t));
    if (entry.email) entry.email.forEach(e => allEmails.add(e));
  });

  const toplamDeger = Object.values(sectors).reduce((s, d) => s + d.fiyatDeger, 0);

  let html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>KIVON Veri Katalogu</title>
<style>
*{box-sizing:border-box}
body{font:14px -apple-system,sans-serif;background:#0a0a0a;color:#e0e0e0;max-width:1100px;margin:0 auto;padding:40px 20px}
h1{color:#00e5ff;border-bottom:2px solid #222;padding-bottom:8px;font-size:24px}
h2{color:#00e5ff;margin-top:30px;font-size:18px}
.genel{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}
.kart{display:inline-block;border:1px solid #222;border-radius:8px;padding:14px 18px;background:#111;text-align:center;min-width:120px;flex:1}
.kart .s{font-size:26px;font-weight:700;color:#00e5ff}
.kart .a{font-size:11px;color:#666;margin-top:2px}
.sektor{background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin:16px 0}
.sektor h3{margin:0 0 4px 0;color:#fbbf24;font-size:15px}
.sektor .meta{margin:4px 0 12px 0;color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}
th{text-align:left;padding:5px 6px;color:#888;border-bottom:1px solid #333;font-size:11px;text-transform:uppercase}
td{padding:5px 6px;border-bottom:1px solid #1a1a1a;font-family:monospace;font-size:11px;word-break:break-all}
tr:hover{background:#151515}
.etiket{display:inline-block;background:#00e5ff10;color:#00e5ff;padding:2px 8px;border-radius:10px;font-size:10px;margin:1px}
.footer{text-align:center;margin-top:48px;padding-top:20px;border-top:1px solid #222;font-size:12px;color:#444}
.footer a{color:#555;text-decoration:none}
.token{color:#16a34a;font-weight:600}
</style></head><body>
<h1>KIVON Veri Katalogu</h1>
<p style="color:#666">AI destekli otomatik veri broker botu</p>

<div class="genel">
<div class="kart"><div class="s">${db.length}</div><div class="a">Toplam Kayit</div></div>
<div class="kart"><div class="s">${Object.keys(sectors).length}</div><div class="a">Sektor</div></div>
<div class="kart"><div class="s">${allPhones.size}</div><div class="a">Benzersiz Telefon</div></div>
<div class="kart"><div class="s">${allEmails.size}</div><div class="a">Benzersiz Email</div></div>
<div class="kart"><div class="s">~${toplamDeger.toLocaleString('tr-TR')} TL</div><div class="a">Tahmini Pazar Degeri</div></div>
</div>`;

  Object.entries(sectors).sort((a, b) => b[1].tel - a[1].tel).forEach(([sektor, data]) => {
    const csvPath = exportSectorCSV(db, sektor);
    html += `
<div class="sektor">
<h3>${sektor}</h3>
<div class="meta">${data.firmaSayisi} firma · ${data.tel} telefon · ${data.mail} email · tahmini ~${data.fiyatDeger.toLocaleString('tr-TR')} TL deger</div>
<div style="display:flex;gap:8px;margin:8px 0">
<span class="kart" style="min-width:80px;padding:10px"><div class="s" style="font-size:20px">${data.firmaSayisi}</div><div class="a">Firma</div></span>
<span class="kart" style="min-width:80px;padding:10px"><div class="s" style="font-size:20px">${data.tel}</div><div class="a">Telefon</div></span>
<span class="kart" style="min-width:80px;padding:10px"><div class="s" style="font-size:20px">${data.mail}</div><div class="a">Email</div></span>
<span class="kart" style="min-width:100px;padding:10px"><div class="s" style="font-size:20px">~${data.fiyatDeger.toLocaleString('tr-TR')} TL</div><div class="a">Tahmini Deger</div></span>
</div>
${csvPath ? `<p style="font-size:11px;margin:4px 0"><a href="${path.basename(csvPath)}" style="color:#888;text-decoration:none">CSV indir</a></p>` : ''}
<table><thead><tr><th>Firma</th><th>Telefon</th><th>Email</th><th>Alici</th><th>Fiyat</th><th>Kullanim</th><th>Guven</th></tr></thead><tbody>
${data.kayit.map(k => {
  const t = k.telefon?.slice(0, 2).join('<br>') || '-';
  const e = k.email?.slice(0, 2).join('<br>') || '-';
  const f = k.firma ? k.firma.substring(0, 25) : '-';
  const guvenRengi = k.guven === 'dusuk' ? 'color:#ef4444' : k.guven === 'yuksek' ? 'color:#22c55e' : 'color:#eab308';
  return `<tr><td style="color:#ddd;font-size:11px">${f}</td><td>${t}</td><td style="color:#666">${e}</td><td style="color:#888;font-size:10px">${k.alici || '-'}</td><td style="color:#fbbf24">${k.fiyat || '-'}</td><td style="font-size:10px;color:#888">${(k.kullanim || '').substring(0, 35)}</td><td style="${guvenRengi};font-size:10px">${k.guven || '-'}</td></tr>`;
}).join('')}
</tbody></table>
</div>`;
  });

  html += `<div class="footer">KIVON Veri Broker Botu · AI destekli otomatik veri kesfi<br><span style="font-size:10px">Tum veriler acik kaynaklardan toplanmistir</span></div></body></html>`;

  return html;
}

// ---- MAIN ----
async function main() {
  if (!API_KEY) throw new Error('GROQ_API_KEY not set');
  if (process.argv.includes('--fresh')) {
    console.log('  --fresh mod: eski veriler temizleniyor...');
    try { fs.rmSync(OUTPUT, { recursive: true, force: true }); } catch (e) {}
  }

  console.log(`\n${'='.repeat(52)}`);
  console.log(`  KIVON VERI BROKER v2 — OTOMATIK KESIF MODU`);
  console.log(`  AI destekli web tarama + siniflandirma + raporlama`);
  if (args.sektor) console.log(`  Hedef Sektor: ${args.sektor}`);
  if (args.lokasyon) console.log(`  Hedef Lokasyon: ${args.lokasyon}`);
  console.log(`${'='.repeat(52)}\n`);

  const db = loadDB();
  const gidilmis = new Set(db.map(d => d.url).filter(Boolean));
  const gorulenTel = new Set();
  const telFrekans = {};
  db.forEach(d => { if (d.telefon) d.telefon.forEach(t => { gorulenTel.add(t); telFrekans[t] = (telFrekans[t] || 0) + 1; }); });

  const kuyruk = [...SEED_URLS];
  let beklemeKuyrugu = [];
  const baslangic = Date.now();

  const LIMIT = parseInt(args.limit) || 500;
  const BEKLE = 500;
  const MAX_KUYRUK = 300;

  const CONCURRENCY = 5;
  const domainLastRequest = {};

  async function processQueue(kuyruk, gidilmis, gorulenTel, telFrekans, db) {
    let istekSayisi = 0;
    let hataSayisi = 0;
    let bulunanSayisi = 0;
    let AIKullanim = 0;

    const popUrl = () => {
      while (kuyruk.length > 0) {
        const url = kuyruk.shift();
        if (url && !gidilmis.has(url)) { gidilmis.add(url); return url; }
      }
      return null;
    };

    const takeSlot = () => {
      if (istekSayisi >= LIMIT) return false;
      istekSayisi++;
      return true;
    };

    async function domainWait(url) {
      try {
        const domain = new URL(url).hostname;
        const now = Date.now();
        const last = domainLastRequest[domain] || 0;
        const diff = now - last;
        if (diff < 2000) await wait(2000 - diff);
        domainLastRequest[domain] = Date.now();
      } catch {}
    }

    const processBatch = async () => {
      if (beklemeKuyrugu.length === 0) return;
      const batch = beklemeKuyrugu;
      beklemeKuyrugu = [];

      let results;
      let batchOk = false;
      try {
        const raw = await classifyBatch(batch);
        results = parseBatchResponse(raw);
        if (results && results.length === batch.length) batchOk = true;
      } catch (e) {}

      if (batchOk) {
        AIKullanim++;
      } else {
        AIKullanim += batch.length;
        console.warn(`  Batch AI basarisiz, tek tek deneniyor (${batch.length} kayit)`);
      }

      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        let sektor = 'Diger', alici = '?', fiyat = '?', kullanim = '?', guven = '?';

        if (batchOk && results[i]) {
          const r = results[i];
          sektor = r.sektor || sektor;
          alici = r.alici || alici;
          fiyat = r.fiyat || fiyat;
          kullanim = r.kullanim || kullanim;
          guven = r.guven || guven;
        } else if (!batchOk) {
          try {
            const raw = await classifyPage(item.firma, item.telefon[0] || '', item.email[0] || '', item.snippet);
            const jsonMatch = raw.match(/\{.*\}/s);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              sektor = parsed.sektor || sektor;
              alici = parsed.alici || alici;
              fiyat = parsed.fiyat || fiyat;
              kullanim = parsed.kullanim || kullanim;
              guven = parsed.guven || guven;
            } else {
              raw.split('\n').forEach(line => {
                const clean = line.replace(/\r/g, '').trim();
                if (/^SEKTOR\s*[:]\s*/.test(clean)) sektor = clean.replace(/^SEKTOR\s*[:]\s*/, '').trim();
                if (/^ALICI\s*[:]\s*/.test(clean)) alici = clean.replace(/^ALICI\s*[:]\s*/, '').trim();
                if (/^FIYAT\s*[:]\s*/.test(clean)) fiyat = clean.replace(/^FIYAT\s*[:]\s*/, '').trim();
                if (/^KULLANIM\s*[:]\s*/.test(clean)) kullanim = clean.replace(/^KULLANIM\s*[:]\s*/, '').trim();
              });
            }
          } catch (e) {}
        }

        if (sektor === 'Diger' && alici === '?' && fiyat === '?') {
          const urlLower = item.url.toLowerCase();
          if (urlLower.includes('restoran')) sektor = 'Restoran';
          else if (urlLower.includes('avukat')) sektor = 'Avukat';
          else if (urlLower.includes('doktor')) sektor = 'Doktor';
          else if (urlLower.includes('kuaf')) sektor = 'Kuafor';
          else if (urlLower.includes('insaat') || urlLower.includes('inşaat')) sektor = 'Insaat';
          else if (urlLower.includes('emlak')) sektor = 'Emlak';
          else if (urlLower.includes('nakliyat')) sektor = 'Nakliyat';
          else if (urlLower.includes('oto') || urlLower.includes('servis')) sektor = 'Oto-Servis';
          else if (urlLower.includes('muhasebe')) sektor = 'Muhasebe';
          else if (urlLower.includes('tekstil')) sektor = 'Tekstil';
          else if (urlLower.includes('lojistik')) sektor = 'Lojistik';
          else if (urlLower.includes('firmaekle') || urlLower.includes('eniyifirmadan')) sektor = 'E-Ticaret';
        }

        const entry = {
          firma: item.firma, url: item.url, domain: item.domain,
          sektor, alici, fiyat, kullanim, guven,
          telefon: item.telefon,
          email: item.email,
          bulundu: item.bulundu
        };

        db.push(entry);

        const sure = ((Date.now() - baslangic) / 1000 / 60).toFixed(1);
        const guvenEtiketi = guven === 'dusuk' ? ' ⚠' : '';
        console.log(`[${String(istekSayisi).padStart(3)}] ${sektor.padEnd(16)} ${item.telefon.length} tel ${item.email.length} mail | ${item.firma.substring(0, 25).padEnd(25)} | ~${String(fiyat).padEnd(8)} | ${String(guven).padEnd(6)}${guvenEtiketi} | ${sure}dk`);
      }

      if (db.length % BATCH_SIZE === 0) {
        saveDB(db);
        fs.writeFileSync(path.join(OUTPUT, 'katalog.html'), generateReport(db));
        fs.writeFileSync(CSV_FILE, exportCSV(db), 'utf8');
        const kalanSure = ((LIMIT - istekSayisi) * BEKLE / 1000 / 60 / CONCURRENCY).toFixed(0);
        console.log(`  → Kaydedildi (${db.length} kayit, ~${kalanSure}dk kaldi)`);
      }
    };

    async function processUrl(url) {
      await domainWait(url);
      await wait(BEKLE);
      const html = await curl(url);

      if (!html || html.length < 100) {
        hataSayisi++;
        return;
      }

      if (isGoogleMapsUrl(url)) {
        const mapsResults = await googleMapsSearch('', '', html);
        if (mapsResults.length > 0) {
          for (const mr of mapsResults) {
            if (gidilmis.has(mr.url)) continue;
            db.push({
              firma: mr.firma,
              url: mr.url,
              domain: mr.domain,
              sektor: 'Diger',
              alici: '?',
              fiyat: '?',
              kullanim: 'Google Maps verisi',
              guven: 'dusuk',
              telefon: mr.telefon,
              email: mr.email,
              bulundu: mr.bulundu
            });
            bulunanSayisi++;
            console.log(`  [GOOGLE MAPS] ${mr.firma.substring(0, 30)} — ${mr.telefon.length} tel`);
          }
        }
        return;
      }

      const visibleText = extractVisibleText(html);
      const telefon = extractPhones(visibleText);
      const email = extractEmails(visibleText, html);

      const yeniTel = telefon.filter(t => {
        if (gorulenTel.has(t)) return false;
        if (t.length < 10) return false;
        if (t.startsWith('059')) return false;
        if (t.length === 10 && t.startsWith('0')) return false;
        if (t.length === 11) {
          const prefix3 = t.substring(0, 3);
          const prefix4 = t.substring(0, 4);
          const validArea = ['0212','0216','0222','0224','0232','0242','0246','0248','0256','0258','0262','0264','0266','0272','0274','0276','0282','0284','0286','0288','0312','0318','0322','0324','0326','0328','0332','0338','0342','0344','0346','0348','0352','0354','0356','0358','0362','0364','0366','0368','0370','0372','0374','0376','0378','0380','0382','0384','0386','0388','0392','0412','0414','0416','0418','0422','0424','0426','0428','0432','0434','0436','0438','0442','0444','0446','0448','0452','0454','0456','0458','0462','0464','0466','0468','0472','0474','0476','0478','0482','0484','0486','0488'];
          if (prefix3 === '050' || prefix3 === '055' || prefix3.startsWith('05')) return true;
          if (prefix3 === '080' || prefix3 === '085' || prefix3 === '0444' || prefix3 === '444') return true;
          if (prefix3.startsWith('0') && validArea.includes(prefix4)) return true;
          if (prefix3.startsWith('0') && validArea.includes(prefix3)) return true;
          return false;
        }
        if (t.length === 10) {
          if (t.startsWith('5')) {
            const p2 = t.substring(0, 2);
            if (['50','51','52','53','54','55','56'].includes(p2)) return true;
            return false;
          }
          if (['2','3','4'].includes(t[0])) {
            const p3 = t.substring(0, 3);
            const validShort = ['212','216','222','224','232','242','246','248','252','256','258','262','264','266','272','274','276','282','284','286','288','312','318','322','324','326','328','332','334','338','342','344','346','348','352','354','356','358','362','364','366','368','370','372','374','376','378','380','382','384','386','388','392','412','414','416','418','422','424','426','428','432','434','436','438','442','444','446','448','452','454','456','458','462','464','466','468','472','474','476','478','482','484','486','488'];
            if (validShort.includes(p3)) return true;
            return false;
          }
          return false;
        }
        return true;
      });
      yeniTel.forEach(t => { gorulenTel.add(t); telFrekans[t] = (telFrekans[t] || 0) + 1; });

      const gercekYeniTel = yeniTel.filter(t => (telFrekans[t] || 0) < 5);

      if (gercekYeniTel.length > 0 || email.length > 0) {
        const firma = extractCompanyName(html, url);
        const snippet = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500);
        bulunanSayisi++;

        let domain = '';
        try { domain = new URL(url).hostname; } catch (e) { }

        beklemeKuyrugu.push({
          firma, url, domain,
          telefon: gercekYeniTel.slice(0, 5),
          email: email.slice(0, 5),
          snippet,
          bulundu: new Date().toISOString()
        });

        if (url.includes('bing.com/search')) {
          const bingResults = extractBingResults(html);
          for (const l of bingResults) {
            if (!gidilmis.has(l) && !kuyruk.includes(l)) kuyruk.unshift(l);
          }
        } else {
          const links = extractLinks(html, url);
          const contactLinks = links.filter(l => isContactPage(l));
          const otherLinks = links.filter(l => !isContactPage(l));
          for (const l of [...contactLinks, ...otherLinks]) {
            if (!gidilmis.has(l) && !kuyruk.includes(l) && l !== url) kuyruk.push(l);
          }
        }

        if (beklemeKuyrugu.length >= BATCH_SIZE) {
          await processBatch();
        }
      }

      if (kuyruk.length > MAX_KUYRUK) kuyruk.length = MAX_KUYRUK;
    }

    const workers = Array(CONCURRENCY).fill().map(async () => {
      while (true) {
        try {
          const url = popUrl();
          if (!url || !takeSlot()) break;
          await processUrl(url);
        } catch (err) {
          console.error('Worker error:', err.message);
        }
      }
    });

    await Promise.all(workers);
    await processBatch();
    return { istekSayisi, hataSayisi, bulunanSayisi, AIKullanim };
  }

  const { istekSayisi, hataSayisi, bulunanSayisi, AIKullanim } = await processQueue(kuyruk, gidilmis, gorulenTel, telFrekans, db);

  // Final kayit
  saveDB(db);
  const htmlRapor = generateReport(db);
  fs.writeFileSync(path.join(OUTPUT, 'katalog.html'), htmlRapor);
  fs.writeFileSync(CSV_FILE, exportCSV(db), 'utf8');

  const sure = ((Date.now() - baslangic) / 1000 / 60).toFixed(0);
  const sektorler = [...new Set(db.map(d => d.sektor))];
  const toplamTel = new Set();
  const toplamMail = new Set();
  db.forEach(d => {
    if (d.telefon) d.telefon.forEach(t => toplamTel.add(t));
    if (d.email) d.email.forEach(e => toplamMail.add(e));
  });

  console.log(`\n${'='.repeat(52)}`);
  console.log(`  TAMAM`);
  console.log(`${'='.repeat(52)}`);
  console.log(`  Sure:       ${sure} dk`);
  console.log(`  Istek:      ${istekSayisi} (hata: ${hataSayisi})`);
  console.log(`  AI Cagri:   ${AIKullanim}`);
  console.log(`  Bulgular:   ${bulunanSayisi} adet`);
  console.log(`  Kayit:      ${db.length} adet`);
  console.log(`  Sektor:     ${sektorler.length} farkli kategori`);
  console.log(`  Telefon:    ${toplamTel.size} benzersiznumara`);
  console.log(`  Email:      ${toplamMail.size} benzersiz adres`);
  console.log(`  Sektorler:  ${sektorler.join(', ')}`);
  console.log(`${'='.repeat(52)}`);
  console.log(`  JSON:    ${DB_FILE}`);
  console.log(`  HTML:    ${path.join(OUTPUT, 'katalog.html')}`);
  console.log(`  CSV:     ${CSV_FILE}`);
  console.log(`  Sektor CSV'leri: ${OUTPUT}/*.csv`);
  console.log(`${'='.repeat(52)}\n`);
}

main().catch(e => {
  console.error('\n  KRITIK HATA — Bot durdu');
  console.error('  Sebep:', e.message || e);
  console.error('  Cozum:');
  if (e.message?.includes('GROQ_API_KEY')) console.error('    API key\'ini .env dosyasina ekle');
  else if (e.message?.includes('ETIMEDOUT')) console.error('    Internet baglantini kontrol et');
  else console.error('    Detay:', e.stack?.split('\n').slice(0, 3).join('\n    '));
  process.exit(1);
});
