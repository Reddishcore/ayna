exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const tnbKey = process.env.TNB_API_KEY || process.env.NEWBLACK_SHOES;
  if (!tnbKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "TNB API key not set" }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const { model_url, shoes_url } = payload;
  if (!model_url || !shoes_url) {
    return { statusCode: 400, body: JSON.stringify({ error: "model_url and shoes_url required" }) };
  }

  console.log("Model URL:", model_url.slice(0, 80));
  console.log("Shoes URL:", shoes_url.slice(0, 80));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    // İkisi de URL — TNB'nin dokümantasyonundaki örnek format
    const form = new FormData();
    form.append("model_photo", model_url);
    form.append("shoes_photo", shoes_url);

    const res = await fetch(
      `https://thenewblack.ai/api/1.1/wf/vto-shoes?api_key=${encodeURIComponent(tnbKey)}`,
      { method: "POST", body: form, signal: controller.signal }
    );
    clearTimeout(timeoutId);

    const text = await res.text();
    console.log("TNB status:", res.status);
    console.log("TNB body:", text.slice(0, 500));

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: `TNB ${res.status}: ${text.slice(0,300)}` }) };
    }

    let resultUrl;
    try {
      const json = JSON.parse(text);
      resultUrl = json.url || json.image_url || json.result || json.output || json.response;
    } catch(e) {
      resultUrl = text.trim().replace(/^"|"$/g, "");
    }

    if (!resultUrl || !resultUrl.startsWith("http")) {
      return { statusCode: 500, body: JSON.stringify({ error: "No valid URL: " + text.slice(0,300) }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: resultUrl }) };
  } catch(err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { statusCode: 504, body: JSON.stringify({ error: "TNB timeout (25s)" }) };
    }
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
