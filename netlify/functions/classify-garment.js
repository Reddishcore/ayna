exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Sadece POST" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY tanımlı değil." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Geçersiz istek gövdesi" }) };
  }

  const { image } = payload;
  if (!image || typeof image !== "string") {
    return { statusCode: 400, body: JSON.stringify({ error: "Görsel gerekli" }) };
  }

  // data URL'den media_type ve base64 kısmını ayır
  const match = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) {
    // Zaten hosted bir URL ise (imgbb vb.), varsayılan olarak "auto" dön — sınıflandırma atlanır
    return { statusCode: 200, body: JSON.stringify({ type: "auto" }) };
  }
  const mediaType = match[1];
  const base64Data = match[2];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
              {
                type: "text",
                text: "Bu bir giysi görseli. Görselde bir insan var mı (giysi bir insanın üzerinde mi görünüyor), yoksa giysi tek başına mı (askıda, düz yüzeyde, manken üzerinde vb.)? Sadece şu iki kelimeden birini yaz, başka hiçbir şey yazma: 'model' (insan üzerinde) veya 'flat-lay' (insan yok)."
              }
            ]
          }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return { statusCode: 200, body: JSON.stringify({ type: "auto" }) };
    }

    const textBlock = (data.content || []).find(function (b) { return b.type === "text"; });
    const raw = (textBlock && textBlock.text || "").toLowerCase();
    const type = raw.indexOf("flat-lay") !== -1 ? "flat-lay"
      : raw.indexOf("model") !== -1 ? "model"
      : "auto";

    return { statusCode: 200, body: JSON.stringify({ type: type }) };
  } catch (err) {
    // Sınıflandırma başarısız olursa akışı bozma — "auto" ile devam
    return { statusCode: 200, body: JSON.stringify({ type: "auto" }) };
  }
};
