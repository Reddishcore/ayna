// No-op — sayaç client-side localStorage'da tutuluyor
exports.handler = async (event) => {
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
