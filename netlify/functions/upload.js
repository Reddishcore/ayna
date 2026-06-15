// imgbb API ile geçici image hosting
// Ücretsiz, URL döndürüyor, TheNewBlack bunu kabul ediyor
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const imgbbKey = process.env.IMGBB_API_KEY || process.env.IMGBB;
  if (!imgbbKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "IMGBB_API_KEY not set" }) };
  }

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const { image, url: imageUrl, filename } = payload;

  let base64;
  if (image) {
    base64 = image.replace(/^data:image\/\w+;base64,/, "");
  } else if (imageUrl) {
    // URL'den indir, base64'e çevir
    try {
      const fetchRes = await fetch(imageUrl);
      if (!fetchRes.ok) throw new Error("Failed to fetch image URL");
      const arrayBuffer = await fetchRes.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString("base64");
    } catch(e) {
      return { statusCode: 500, body: JSON.stringify({ error: "URL fetch failed: " + e.message }) };
    }
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "image or url required" }) };
  }

  try {
    const form = new FormData();
    form.append("key", imgbbKey);
    form.append("image", base64);
    form.append("expiration", "600"); // 10 dakika yeterli

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: form
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error?.message || "imgbb upload failed" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ url: data.data.url }) };
  } catch(err) {
    return { statusCode: 502, body: JSON.stringify({ error: "Upload failed: " + err.message }) };
  }
};
