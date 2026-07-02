exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "FASHN_API_KEY not set" }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const { image } = payload;
  if (!image) {
    return { statusCode: 400, body: JSON.stringify({ error: "image required" }) };
  }

  try {
    const res = await fetch("https://api.fashn.ai/v1/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model_name: "background-remove",
        inputs: { image }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: (data && (data.error?.message || data.error || data.message)) || "Background removal failed" })
      };
    }

    return { statusCode: 200, body: JSON.stringify({ id: data.id }) };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "FASHN unreachable: " + err.message }) };
  }
};
