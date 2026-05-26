const https = require('https');
const fs = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, 'leads.json');
const SEEN_FILE = path.join(__dirname, 'leads-seen.json');

const KEYWORDS = [
  'yapay zeka', 'dijital dönüşüm', 'otomasyon', 'chatbot',
  'ai chatbot', 'dijital pazarlama', 'e-ticaret', 'yazılım',
  'mobil uygulama', 'web sitesi', 'dijital ajans'
];

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'KivonAI/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return def; }
}

function isNew(url, seen) {
  if (seen[url]) return false;
  seen[url] = Date.now();
  return true;
}

async function searchGithub() {
  const leads = [];
  const queries = [
    'location:turkey repos:>5',
    'location:istanbul repos:>3',
    'location:ankara repos:>3',
    'location:izmir repos:>3',
    'type:org location:turkey'
  ];

  for (const q of queries) {
    try {
      const data = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=30`);
      if (data.items) {
        for (const user of data.items) {
          leads.push({
            name: user.login,
            type: user.type === 'Organization' ? 'sirket' : 'gelistirici',
            url: user.html_url,
            source: 'github',
            puan: user.score || 50,
            not: user.type === 'Organization' ? 'GitHub\'da sirket hesabi' : 'Aktif GitHub kullanicisi'
          });
        }
      }
    } catch (e) { console.log('GitHub search error:', q, e.message); }
  }
  return leads;
}

async function searchKariyerNet() {
  const leads = [];
  for (const kw of KEYWORDS.slice(0, 3)) {
    try {
      const html = await new Promise((resolve, reject) => {
        https.get(`https://www.kariyer.net/is-ilanlari?kw=${encodeURIComponent(kw)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        }, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        }).on('error', reject);
      });
      const matches = html.match(/data-company="([^"]+)"/g) || [];
      for (const m of matches.slice(0, 10)) {
        const company = m.replace(/data-company="/, '').replace(/"$/, '');
        if (company) {
          leads.push({
            name: company,
            type: 'sirket',
            source: 'kariyernet',
            not: `"${kw}" alaninda is ilani aciyor`,
            puan: 80
          });
        }
      }
    } catch (e) { /* kariyer.net might block */ }
  }
  return leads;
}

function generateReport(allLeads) {
  const sirketler = allLeads.filter(l => l.type === 'sirket');
  const gelistiriciler = allLeads.filter(l => l.type === 'gelistirici');

  return `
===========================
KIVON — MÜSTERİ BULUCU RAPORU
${new Date().toLocaleDateString('tr-TR')}
===========================

🏢 POTANSİYEL ŞİRKETLER (${sirketler.length} adet):
${sirketler.map(l => `  • ${l.name} — ${l.not} (${l.source})`).join('\n')}

👤 GELİŞTİRİCİLER (${gelistiriciler.length} adet):
${gelistiriciler.map(l => `  • ${l.name} — ${l.not} (${l.source})`).join('\n')}

📊 TOPLAM: ${allLeads.length} potansiyel müşteri

===========================
`.trim();
}

async function main() {
  console.log('🔍 Kivon Müşteri Bulucu başlıyor...\n');

  const seen = loadJSON(SEEN_FILE, {});
  const existing = loadJSON(LEADS_FILE, []);
  const existingUrls = new Set(existing.map(l => l.url));

  const githubLeads = await searchGithub();
  const kariyerLeads = await searchKariyerNet();

  const allNew = [...githubLeads, ...kariyerLeads];
  let added = 0;

  for (const lead of allNew) {
    if (!lead.url && lead.name) {
      lead.url = `https://github.com/search?q=${encodeURIComponent(lead.name)}`;
    }
    if (!existingUrls.has(lead.url) && isNew(lead.url, seen)) {
      lead.tarih = new Date().toISOString();
      existing.push(lead);
      added++;
    }
  }

  fs.writeFileSync(LEADS_FILE, JSON.stringify(existing, null, 2));
  fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));

  console.log(generateReport(existing));
  console.log(`\n✅ Bu çalışmada ${added} yeni potansiyel müşteri bulundu.`);
  console.log(`📁 Toplam: ${existing.length} kayıt (${LEADS_FILE})`);
}

main().catch(e => {
  console.error('Hata:', e);
  process.exit(1);
});
