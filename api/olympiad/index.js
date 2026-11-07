module.exports = async function (context, req) {
  const { handle } = await import('../src/http.mjs');
  // Preserve Buffer/isRaw responses for protected assets; never JSON-encode bytes.
  context.res = await handle(req, undefined, context);
};
