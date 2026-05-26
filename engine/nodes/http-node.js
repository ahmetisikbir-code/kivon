const https = require('https');
const http = require('http');

exports.run = async (config, ctx) => {
  const { url, method = 'GET', headers = {}, body } = config;

  const tpl = (s) => s.replace(/\{\{(.+?)\}\}/g, (_, k) => {
    const parts = k.trim().split('.');
    let val = ctx;
    for (const p of parts) val = val && val[p];
    return val !== undefined ? val : '';
  });

  const finalUrl = tpl(url);
  const finalBody = body ? tpl(JSON.stringify(body)) : null;
  const finalHeaders = {};
  Object.entries(headers).forEach(([k, v]) => finalHeaders[k] = tpl(v));

  return new Promise((resolve, reject) => {
    const parsed = new URL(finalUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'Content-Type': 'application/json', ...finalHeaders }
    };

    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ next: config.next, status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ next: config.next, status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (finalBody) req.write(finalBody);
    req.end();
  });
};
