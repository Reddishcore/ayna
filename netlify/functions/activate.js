// Premium aktivasyon — şimdilik client-side token ile
exports.handler = async (event) => {
  return { statusCode: 200, body: JSON.stringify({ ok: true, premium: true }) };
};
