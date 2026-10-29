module.exports = async function (context, req) {
  const { handle } = await import('../src/http.mjs');
  context.res = await handle(req);
};
