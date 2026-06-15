// Basit limit kontrolü — blobs olmadan, sadece client-side token'a güvenir
// Gerçek limit enforcement client tarafında localStorage ile yapılıyor
// Bu fonksiyon sadece "can_generate: true" döndürür, gerçek sayaç client'ta
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }
  // Şimdilik her zaman izin ver — limit kontrolü client-side
  return {
    statusCode: 200,
    body: JSON.stringify({
      usage: 0,
      free_limit: 3,
      premium: false,
      can_generate: true,
      remaining: 3
    })
  };
};
