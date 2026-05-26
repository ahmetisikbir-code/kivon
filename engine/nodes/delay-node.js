exports.run = async (config) => {
  const ms = config.delay || 1000;
  await new Promise(r => setTimeout(r, ms));
  return { next: config.next };
};
