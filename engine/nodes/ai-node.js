exports.run = async (config, ctx) => {
  const { system, prompt, model = 'llama-3.3-70b-versatile' } = config;

  const tpl = (s) => s.replace(/\{\{(.+?)\}\}/g, (_, k) => {
    const parts = k.trim().split('.');
    let val = ctx;
    for (const p of parts) val = val && val[p];
    return val !== undefined ? val : '';
  });

  const baseUrl = config.baseUrl || process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
  const apiKey = config.apiKey || process.env.AI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('AI_API_KEY not set (GROQ_API_KEY or OPENAI_API_KEY)');

  const finalSystem = tpl(system || '');
  const finalPrompt = tpl(prompt);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(finalSystem ? [{ role: 'system', content: finalSystem }] : []),
          { role: 'user', content: finalPrompt }
        ]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { next: config.next, text, model, full: data };
  } finally {
    clearTimeout(timeout);
  }
};
