// ======================================================================
//    KİVON API PROXY v3 — Groq + OpenRouter + Web Chat
//    Calistir: node api-server.js
//    Web chat: http://localhost:3000
// ======================================================================

const http = require('http');
const fs = require('fs');

// .env dosyasini yukle
try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.+)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
} catch(e) { /* .env yok */ }

const PORT = process.env.PORT || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60000;

function rateLimit(ip) {
  const now = Date.now();
  if (!requestCounts.has(ip)) requestCounts.set(ip, []);
  const timestamps = requestCounts.get(ip).filter(t => now - t < RATE_WINDOW);
  if (timestamps.length >= RATE_LIMIT) return false;
  timestamps.push(now);
  requestCounts.set(ip, timestamps);
  return true;
}

const MODELS = {
  'openrouter/deepseek-v4-flash': { provider:'openrouter', model:'deepseek/deepseek-v4-flash:free', ctx:1000000 },
  'openrouter/qwen3-next':        { provider:'openrouter', model:'qwen/qwen3-next-80b-a3b-instruct:free', ctx:256000 },
  'openrouter/llama-3.3-70b':    { provider:'openrouter', model:'meta-llama/llama-3.3-70b-instruct:free', ctx:64000 },
  'openrouter/nemotron-120b':    { provider:'openrouter', model:'nvidia/nemotron-3-super-120b-a12b:free', ctx:256000 },
  'groq/llama-3.3-70b':          { provider:'groq',     model:'llama-3.3-70b-versatile', ctx:128000 }
};

const VARSAYILAN_MODEL = 'groq/llama-3.3-70b';

// Ana İşlemci sistem prompt'u
const SISTEM_PROMPT = `Sen Kivon'un Ana İşlemci'sisin. Şu anda api-server.js üzerinden web chat'te konuşuyorsun.

Kivon Hakkında:
- Bursa merkezli AI danışmanlık şirketi
- Kurucu: Ahmet Işık, Mayıs 2026
- Web: kivontr.com
- Manifesto: "Kivon = Türk KOBİ'lerinin AI departmanı"
- Sektör sınırlaması yok, her KOBİ'ye AI çözümü
- İki ayaklı model: kendi ürünlerimiz + isteyene özel çözüm
- 30 ürün, 9 kategoride (Muhasebe, Satış, İK, E-Ticaret, Pazarlama, Müşteri Desteği, Doküman, Proje, Teknik)
- 17 kişilik ekip (Doruk CEO, Onur teknik lider, Selda kreatif, Lara operasyon, Cana test)
- Mevcut API port 3000, web kivontr.com (GitHub Pages)

Senin 34 meta modun var: Anla, Yavaş, Sorgula, Özet, Odak, Kök, Araştır, Onayla, Dene, Belgele, Kaydet, Yükselt, Yansıt, Koordine, Bağlam, Empati, Geri, Çürüt, İzle, Bağla, Süreç, Darboğaz, Öncelik, Devir, Kapanış, Çekimser, İtiraz, Sezgi, Yarat, Çakışma, Sağlık, Şeffaf, Otonom, Zincir

Yanıt kuralları:
- Kısa ve net konuş (2-4 cümle)
- Türkçe konuş, samimi ol
- Ekip üyelerinden bahsederken isimlerini kullan (Doruk, Onur, Selda, Lara, Cana)
- Bilmediğin bir şey sorulursa "bilmiyorum" de, uydurma
- Dosya düzenleme/kod yazma gibi işlemleri buradan yapamazsın, Ahmet'in CLI üzerinden yapması gerekir
- Kivon'un vizyonunu ve ürünlerini iyi bilirsin`;

// Chat Bridge depolama
const BRIDGE_STORE = 'chat-bridge-store.json';

function bridgeInit() {
  if (!fs.existsSync(BRIDGE_STORE)) {
    const ilk = { role: 'ai', text: 'Merhaba! Ben Kivon Ana İşlemci. Sana nasıl yardımcı olabilirim?', ts: new Date().toISOString() };
    fs.writeFileSync(BRIDGE_STORE, JSON.stringify({ nextId: 1, messages: [{ id: 0, ...ilk }] }));
  }
}

function bridgeOku() { return JSON.parse(fs.readFileSync(BRIDGE_STORE, 'utf-8')); }
function bridgeYaz(data) { fs.writeFileSync(BRIDGE_STORE, JSON.stringify(data, null, 2)); }

// Web chat HTML sayfası
const CHAT_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kivon Ana İşlemci</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; height: 100vh; display: flex; flex-direction: column; }
.header { background: #1a1a2e; padding: 12px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #2a2a4a; flex-shrink: 0; }
.header h1 { font-size: 16px; color: #fff; }
.header .status { width: 8px; height: 8px; border-radius: 50%; background: #4ade80; display: inline-block; }
.chat { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.user { background: #2b2b4a; align-self: flex-end; border-bottom-right-radius: 4px; }
.bot { background: #1a1a2e; align-self: flex-start; border-bottom-left-radius: 4px; }
.bot .tag { font-size: 11px; color: #888; margin-bottom: 4px; }
.input-area { display: flex; padding: 12px 16px; background: #1a1a2e; gap: 8px; border-top: 1px solid #2a2a4a; flex-shrink: 0; }
.input-area input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #333; background: #0f0f0f; color: #e0e0e0; font-size: 14px; outline: none; }
.input-area input:focus { border-color: #4ade80; }
.input-area button { padding: 10px 20px; border-radius: 8px; border: none; background: #4ade80; color: #000; font-weight: 600; font-size: 14px; cursor: pointer; }
.input-area button:disabled { opacity: 0.5; cursor: not-allowed; }
.typing { align-self: flex-start; color: #888; font-size: 13px; padding: 8px 12px; }
.error { align-self: center; color: #f87171; font-size: 13px; padding: 8px; }
</style>
</head>
<body>
<div class="header">
  <span class="status"></span>
  <h1>Kivon Ana İşlemci</h1>
</div>
<div class="chat" id="chat"></div>
<div class="input-area">
  <input type="text" id="input" placeholder="Mesajınız..." autofocus>
  <button id="send">Gönder</button>
</div>
<script>
const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
let lastMsgId = -1;
let pollTimer = null;

function addMessage(text, type) {
  const div = document.createElement('div');
  div.className = 'msg ' + type;
  if (type === 'bot') {
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.textContent = 'Ana İşlemci';
    div.appendChild(tag);
  }
  const content = document.createElement('div');
  content.textContent = text;
  div.appendChild(content);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function showTyping() {
  if (document.getElementById('typing')) return;
  const div = document.createElement('div');
  div.className = 'typing';
  div.id = 'typing';
  div.textContent = 'Yazıyor...';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function setLoading(state) {
  sendBtn.disabled = state;
  input.disabled = state;
}

async function pollMessages() {
  try {
    const res = await fetch('/api/bridge/poll?after=' + lastMsgId);
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      hideTyping();
      data.messages.forEach(m => {
        if (m.id > lastMsgId) {
          addMessage(m.text, m.role === 'ai' ? 'bot' : 'user');
          lastMsgId = m.id;
        }
      });
    }
  } catch(e) { /* poll hatasi */ }
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  setLoading(true);
  showTyping();
  try {
    const res = await fetch('/api/bridge/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (data.ok) {
      addMessage(text, 'user');
      lastMsgId = data.id;
      pollTimer = setInterval(pollMessages, 2000);
    } else {
      hideTyping();
      addMessage('Bir hata oldu', 'error');
      setLoading(false);
    }
  } catch(e) {
    hideTyping();
    addMessage('Sunucuya bağlanılamadı: ' + e.message, 'error');
    setLoading(false);
  }
}

sendBtn.addEventListener('click', sendMessage);
input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

// Geçmiş mesajları yükle
(async function() {
  try {
    const res = await fetch('/api/bridge/poll?after=-1');
    const data = await res.json();
    if (data.messages) {
      data.messages.forEach(m => {
        addMessage(m.text, m.role === 'ai' ? 'bot' : 'user');
        if (m.id > lastMsgId) lastMsgId = m.id;
      });
      // Son mesaj user ise polling baslat
      const son = data.messages[data.messages.length - 1];
      if (son && son.role === 'user') {
        showTyping();
        pollTimer = setInterval(pollMessages, 2000);
      }
    }
  } catch(e) {
    addMessage('Merhaba! Ben Kivon Ana İşlemci. Sana nasıl yardımcı olabilirim?', 'bot');
  }
})();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  bridgeInit();
  // CORS
  const IZINLI_ORIGINLER = ['https://kivontr.com', 'https://www.kivontr.com', 'http://localhost:3000', 'null'];
  const origin = req.headers.origin;
  if (IZINLI_ORIGINLER.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  else res.setHeader('Access-Control-Allow-Origin', 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // GET / -> web chat
  if (req.method === 'GET' && pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(CHAT_HTML);
    return;
  }

  // POST /api/groq -> AI chat
  if (req.method === 'POST' && pathname === '/api/groq') {
    // Rate limit
    const ip = req.socket.remoteAddress || 'unknown';
    if (!rateLimit(ip)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hata: 'Çok fazla istek, biraz bekle' }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { soru, sistem, model: istenenModel } = JSON.parse(body);
        const modelKey = istenenModel && MODELS[istenenModel] ? istenenModel : VARSAYILAN_MODEL;
        const modelConfig = MODELS[modelKey];

        const messages = [
          { role: 'system', content: sistem || SISTEM_PROMPT },
          { role: 'user', content: soru }
        ];

        let url, headers, bodyData;
        if (modelConfig.provider === 'openrouter') {
          url = 'https://openrouter.ai/api/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + OPENROUTER_KEY,
            'HTTP-Referer': 'https://kivontr.com',
            'X-Title': 'Kivon AI'
          };
          bodyData = { model: modelConfig.model, messages, temperature: 0.7, max_tokens: 800 };
        } else {
          url = 'https://api.groq.com/openai/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + GROQ_KEY
          };
          bodyData = { model: modelConfig.model, messages, temperature: 0.7, max_tokens: 800 };
        }

        const aiRes = await fetch(url, { method: 'POST', headers, body: JSON.stringify(bodyData) });
        const data = await aiRes.json();

        if (data.error) throw new Error(`${modelConfig.provider}: ${data.error.message || JSON.stringify(data.error)}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          cevap: data.choices?.[0]?.message?.content || '',
          model: modelKey,
          provider: modelConfig.provider
        }));
      } catch(e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hata: e.message }));
      }
    });
    return;
  }

  // POST /api/bridge/send -> kullanicidan mesaj al (CLI AI'ya iletilecek)
  if (req.method === 'POST' && pathname === '/api/bridge/send') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        if (!text || !text.trim()) throw new Error('Bos mesaj');
        const store = bridgeOku();
        const id = store.nextId++;
        store.messages.push({ id, role: 'user', text: text.trim(), ts: new Date().toISOString() });
        bridgeYaz(store);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hata: e.message }));
      }
    });
    return;
  }

  // GET /api/bridge/poll?after=<id> -> web chat polling
  if (req.method === 'GET' && pathname === '/api/bridge/poll') {
    const afterId = parseInt(url.searchParams.get('after')) || -1;
    const store = bridgeOku();
    const yeni = store.messages.filter(m => m.id > afterId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: yeni }));
    return;
  }

  // GET /api/bridge/inbox -> CLI AI'nin bekleyen mesajlari okumasi icin
  if (req.method === 'GET' && pathname === '/api/bridge/inbox') {
    const store = bridgeOku();
    const bekleyen = [];
    for (let i = store.messages.length - 1; i >= 0; i--) {
      const m = store.messages[i];
      if (m.role === 'user') {
        // Bu user mesajindan sonra ai mesaji var mi?
        const sonraAi = store.messages.slice(i + 1).some(x => x.role === 'ai');
        if (!sonraAi) bekleyen.unshift(m);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: bekleyen }));
    return;
  }

  // POST /api/bridge/respond -> CLI AI cevap yazsin
  if (req.method === 'POST' && pathname === '/api/bridge/respond') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body);
        if (!text || !text.trim()) throw new Error('Bos cevap');
        const store = bridgeOku();
        const id = store.nextId++;
        store.messages.push({ id, role: 'ai', text: text.trim(), ts: new Date().toISOString() });
        bridgeYaz(store);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ hata: e.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ hata: 'Bulunamadi' }));
});

server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   KİVON API PROXY v3 — Port ' + PORT + '          ║');
  console.log('║   Motor: Groq + OpenRouter               ║');
  console.log('║   Web Chat: http://localhost:' + PORT + '            ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('Kapatmak icin Ctrl+C');
});
