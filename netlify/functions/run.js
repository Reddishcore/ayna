exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Sadece POST" }) };
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "FASHN_API_KEY tanımlı değil. Netlify > Site configuration > Environment variables bölümüne ekleyin ve siteyi yeniden deploy edin." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Geçersiz istek gövdesi" }) };
  }

  const { model_image, garment_image, category } = payload;
  if (!model_image || !garment_image) {
    return { statusCode: 400, body: JSON.stringify({ error: "İki fotoğraf da gerekli" }) };
  }

  console.log("model_image prefix:", model_image.slice(0, 60));
  console.log("garment_image prefix:", garment_image.slice(0, 60));
  console.log("model_image length:", model_image.length);
  console.log("garment_image length:", garment_image.length);

  const validCategories = ["tops", "bottoms", "one-pieces", "auto"];
  const garmentCategory = validCategories.includes(category) ? category : "tops";

  try {
    const res = await fetch("https://api.fashn.ai/v1/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model_name: "tryon-v1.6",
        inputs: { model_image, garment_image, category: garmentCategory }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.log("FASHN error response:", JSON.stringify(data));
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: (data && (data.error?.message || data.error || data.message)) || "FASHN isteği reddetti" })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ id: data.id }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "FASHN API'ye ulaşılamadı: " + err.message }) };
  }
};
