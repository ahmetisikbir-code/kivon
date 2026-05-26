exports.run = async (config, ctx) => {
  return { next: config.next, body: ctx.payload.body || ctx.payload };
};
