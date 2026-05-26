const http = require('http');
const fs = require('fs');
const path = require('path');

const ENGINE_DIR = __dirname;
const WORKFLOWS_DIR = path.join(ENGINE_DIR, 'workflows');
const NODES_DIR = path.join(ENGINE_DIR, 'nodes');

let errors = 0;

console.log('=== KIVON Workflow Engine — Doğrulama ===\n');

// 1. Node kontrol
console.log('[1] Node modülleri:');
fs.readdirSync(NODES_DIR).filter(f => f.endsWith('.js')).forEach(f => {
  try {
    const mod = require(path.join(NODES_DIR, f));
    if (typeof mod.run === 'function') {
      console.log(`  ✅ ${f} (run() mevcut)`);
    } else {
      console.log(`  ❌ ${f} (run() eksik!)`);
      errors++;
    }
  } catch (e) {
    console.log(`  ❌ ${f} (yüklenemedi: ${e.message})`);
    errors++;
  }
});

// 2. Workflow JSON kontrol
console.log('\n[2] Workflow JSON dosyaları:');
fs.readdirSync(WORKFLOWS_DIR).filter(f => f.endsWith('.json')).forEach(f => {
  try {
    const wf = JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8'));
    const issues = [];

    if (!wf.name) issues.push('name eksik');
    if (!wf.trigger) issues.push('trigger eksik');
    if (!wf.nodes || !Array.isArray(wf.nodes)) issues.push('nodes eksik');
    else {
      const ids = wf.nodes.map(n => n.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) issues.push('tekrarlanan node id');
      if (!wf.nodes.find(n => n.id === wf.trigger)) issues.push(`trigger node (${wf.trigger}) bulunamadı`);

      wf.nodes.forEach(n => {
        if (!n.type) issues.push(`node ${n.id}: type eksik`);
        if (!fs.existsSync(path.join(NODES_DIR, n.type + '-node.js'))) {
          issues.push(`node ${n.id}: bilinmeyen tip "${n.type}"`);
        }
      });
    }

    if (issues.length === 0) {
      console.log(`  ✅ ${f} (${wf.name}, ${wf.nodes.length} node)`);
    } else {
      console.log(`  ⚠️  ${f} - ${issues.join(', ')}`);
      errors++;
    }
  } catch (e) {
    console.log(`  ❌ ${f} (parse hatası: ${e.message})`);
    errors++;
  }
});

// 3. Sunucu başlatma testi
console.log('\n[3] Sunucu başlatma testi:');
try {
  const server = require(path.join(ENGINE_DIR, 'server.js'));
  console.log('  ✅ Server modülü yüklendi');
} catch (e) {
  console.log(`  ❌ Server yüklenemedi: ${e.message}`);
  errors++;
}

console.log(`\n=== SONUÇ: ${errors === 0 ? '✅ TÜM TESTLER GEÇTİ' : `❌ ${errors} HATA`} ===`);
