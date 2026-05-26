const https = require('https');
const fs = require('fs');
const path = require('path');

const LEADS_FILE = path.join(__dirname, 'leads.json');
const SEEN_FILE = path.join(__dirname, 'leads-seen.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'KivonAI/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return def; }
}

function isNew(url, seen) {
  if (seen[url]) return false;
  seen[url] = Date.now();
  return true;
}

function isQuality(name) {
  if (!name || name.length < 3) return false;
  if (/^[0-9]+$/.test(name)) return false;
  return true;
}

async function searchGithub() {
  const leads = [];
  const queries = [
    ['type:org location:turkey repos:>2', 'sirket', 85],
    ['type:org location:istanbul repos:>1', 'sirket', 80],
    ['location:turkey repos:>8 followers:>5', 'gelistirici', 0],
    ['location:istanbul repos:>5 followers:>3', 'gelistirici', 0]
  ];

  for (const [q, type, puan] of queries) {
    await wait(400);
    try {
      const data = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=30&sort=followers`);
      if (!Array.isArray(data?.items)) continue;
      for (const u of data.items) {
        if (!isQuality(u.login)) continue;
        leads.push({
          name: u.login,
          url: u.html_url,
          type,
          puan: type === 'sirket' ? puan : Math.min(60, Math.round(u.score || 10)),
          not: type === 'sirket'
            ? 'Turkiye GitHub org'
            : `${u.public_repos || 0} repo, ${u.followers || 0} takipci`,
          source: 'github'
        });
      }
    } catch (e) { }
  }
  return leads;
}

async function searchGithubTopics() {
  const leads = [];
  const topics = ['artificial-intelligence', 'machine-learning', 'nlp', 'chatbot', 'automation'];
  for (const topic of topics) {
    await wait(400);
    try {
      const data = await fetch(`https://api.github.com/search/repositories?q=topic:${topic}+location:turkey&per_page=10&sort=updated`);
      if (!Array.isArray(data?.items)) continue;
      const seen = new Set();
      for (const repo of data.items) {
        const owner = repo.owner?.login;
        if (owner && !seen.has(owner) && isQuality(owner)) {
          seen.add(owner);
          const isOrg = repo.owner?.type === 'Organization';
          leads.push({
            name: owner,
            url: repo.owner?.html_url || `https://github.com/${owner}`,
            type: isOrg ? 'sirket' : 'gelistirici',
            puan: isOrg ? 90 : 50,
            not: `"${topic}" repo: ${repo.full_name}`,
            source: 'github-topic'
          });
        }
      }
    } catch (e) { }
  }
  return leads;
}

function getHotLeads(leads) {
  return leads.filter(l => l.type === 'sirket')
    .sort((a, b) => b.puan - a.puan)
    .slice(0, 10);
}

async function main() {
  console.log('Kivon Musteri Bulucu\n');

  const seen = loadJSON(SEEN_FILE, {});
  const existing = loadJSON(LEADS_FILE, []);
  const existingUrls = new Set(existing.map(l => l.url));

  console.log('GitHub org/users taranıyor...');
  const github = await searchGithub();
  console.log(`  ${github.length} sonuc`);

  console.log('GitHub topic repos taranıyor...');
  const topics = await searchGithubTopics();
  console.log(`  ${topics.length} sonuc\n`);

  const allNew = [...github, ...topics];
  let added = 0;

  for (const lead of allNew) {
    if (!lead.url) lead.url = `https://github.com/${lead.name}`;
    if (!existingUrls.has(lead.url) && isNew(lead.url, seen)) {
      lead.tarih = new Date().toISOString();
      existing.push(lead);
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(existing, null, 2));
    fs.writeFileSync(SEEN_FILE, JSON.stringify(seen, null, 2));
  }

  const companies = existing.filter(l => l.type === 'sirket');
  const devs = existing.filter(l => l.type === 'gelistirici');
  console.log(`${added} yeni, ${existing.length} toplam (${companies.length} sirket, ${devs.length} yazilimci)`);
  console.log('\nSICAK FIRSATLAR:');
  getHotLeads(existing).forEach((l, i) => console.log(`  ${i+1}. ${l.name} (puan:${l.puan}, ${l.source})`));
}

main().catch(e => { console.error('HATA:', e.message); process.exit(1); });
