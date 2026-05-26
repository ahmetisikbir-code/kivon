exports.run = async (config, ctx) => {
  const { condition, trueNext, falseNext } = config;

  const tpl = (s) => s.replace(/\{\{(.+?)\}\}/g, (_, k) => {
    const parts = k.trim().split('.');
    let val = ctx;
    for (const p of parts) val = val && val[p];
    return val !== undefined ? val : '';
  });

  const expr = tpl(condition);
  let result;
  try { result = Boolean(eval(expr)); }
  catch { result = false; }

  return {
    next: result ? (trueNext || config.next) : (falseNext || null),
    matched: result
  };
};
