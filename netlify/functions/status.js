exports.handler = async (event) => {
  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "FASHN_API_KEY tanımlı değil" }) };
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: "id parametresi gerekli" }) };
  }

  try {
    const res = await fetch(`https://api.fashn.ai/v1/status/${encodeURIComponent(id)}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: (data && (data.error?.message || data.error || data.message)) || "Durum alınamadı" })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: data.status,
        output: data.output || null,
        error: data.error ? (data.error.message || data.error) : null
      })
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "FASHN API'ye ulaşılamadı: " + err.message }) };
  }
};
