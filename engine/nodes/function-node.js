exports.run = async (config, ctx) => {
  const { code } = config;
  const fn = new Function('ctx', code || 'return {}');
  const result = await fn(ctx);
  return { next: config.next, ...result };
};
