exports.run = async (config, ctx) => {
  const { message, level = 'info' } = config;

  const tpl = (s) => s.replace(/\{\{(.+?)\}\}/g, (_, k) => {
    const parts = k.trim().split('.');
    let val = ctx;
    for (const p of parts) val = val && val[p];
    return val !== undefined ? val : '';
  });

  const finalMsg = tpl(message);
  console.log(`[${level.toUpperCase()}] ${finalMsg}`);
  return { next: config.next };
};
