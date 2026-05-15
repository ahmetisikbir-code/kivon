// ======================================================================
//    KİVON API PROXY v2 — Groq + OpenRouter (cift motor)
//    Calistir: node api-server.js
//    Ucretsiz modeller: Llama 3.3 70B, Qwen3 Next 80B, DeepSeek V4 Flash
//    OpenRouter anahtari gerekmez (ucretsiz modeller icin)
// ======================================================================

const http = require('http');

const PORT = 3000;
const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

// UCRETSIZ modeller (sirali: en iyiden)
const MODELS = {
  'openrouter/deepseek-v4-flash': { provider:'openrouter', model:'deepseek/deepseek-v4-flash:free', ctx:1000000 },
  'openrouter/qwen3-next':        { provider:'openrouter', model:'qwen/qwen3-next-80b-a3b-instruct:free', ctx:256000 },
  'openrouter/llama-3.3-70b':    { provider:'openrouter', model:'meta-llama/llama-3.3-70b-instruct:free', ctx:64000 },
  'openrouter/nemotron-120b':    { provider:'openrouter', model:'nvidia/nemotron-3-super-120b-a12b:free', ctx:256000 },
  'groq/llama-3.3-70b':          { provider:'groq',     model:'llama-3.3-70b-versatile', ctx:128000 }
};

const VARSAYILAN_MODEL = 'openrouter/deepseek-v4-flash'; // En iyi ucretsiz

const server = http.createServer(async (req, res) => {
  const IZINLI_ORIGINLER = ['https://kivontr.com', 'https://www.kivontr.com', 'http://localhost:3000', 'null'];
  const origin = req.headers.origin;
  if (IZINLI_ORIGINLER.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'null');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // GET / -> durum
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      durum: 'ok', sunucu: 'Kivon API Proxy v2',
      motorlar: ['Groq', 'OpenRouter'],
      varsayilan: VARSAYILAN_MODEL,
      modeller: Object.keys(MODELS)
    }));
    return;
  }

  // POST /api/groq -> Groq + OpenRouter
  if (req.method === 'POST' && req.url === '/api/groq') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { soru, sistem, model: istenenModel } = JSON.parse(body);
        const modelKey = istenenModel && MODELS[istenenModel] ? istenenModel : VARSAYILAN_MODEL;
        const modelConfig = MODELS[modelKey];

        const messages = [];
        messages.push({ role: 'system', content: sistem || 'Sen Kivon AI asistanisin. Turkce, kisa ve net cevap ver.' });
        messages.push({ role: 'user', content: soru });

        let url, headers, bodyData;

        if (modelConfig.provider === 'openrouter') {
          url = 'https://openrouter.ai/api/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + OPENROUTER_KEY,
            'HTTP-Referer': 'https://kivontr.com',
            'X-Title': 'Kivon AI'
          };
          bodyData = { model: modelConfig.model, messages, temperature: 0.7, max_tokens: 600 };
        } else {
          url = 'https://api.groq.com/openai/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + GROQ_KEY
          };
          bodyData = { model: modelConfig.model, messages, temperature: 0.7, max_tokens: 600 };
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
        const keys = { groqVar: !!process.env.GROQ_API_KEY, openrouterVar: !!process.env.OPENROUTER_API_KEY };
        res.end(JSON.stringify({ hata: e.message, stack: e.stack, env: keys }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ hata: 'Bulunamadi' }));
});

server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   KİVON API PROXY v2 — Port ' + PORT + '          ║');
  console.log('║   Motor: Groq + OpenRouter               ║');
  console.log('║   Varsayilan: ' + VARSAYILAN_MODEL.padEnd(28) + '║');
  console.log('║   Ucretsiz modeller: 5                   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Modeller:');
  for (const [k, v] of Object.entries(MODELS)) {
    console.log('  ' + k.padEnd(30) + v.provider.padEnd(12) + (v.ctx/1000).toFixed(0) + 'K context');
  }
  console.log('');
  console.log('Kapatmak icin Ctrl+C');
});
