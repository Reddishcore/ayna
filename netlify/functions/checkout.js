exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return { statusCode: 500, body: JSON.stringify({ error: "Stripe not configured" }) };

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) }; }

  const { device_id, lang } = payload;
  if (!device_id) return { statusCode: 400, body: JSON.stringify({ error: "device_id required" }) };

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) return { statusCode: 500, body: JSON.stringify({ error: "Price not configured" }) };

  const siteUrl = process.env.URL || "https://glowing-meerkat-f92b83.netlify.app";

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "mode": "payment",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": `${siteUrl}/?payment=success&device_id=${encodeURIComponent(device_id)}`,
        "cancel_url": `${siteUrl}/?payment=cancel`,
        "metadata[device_id]": device_id,
        "allow_promotion_codes": "true"
      }).toString()
    });

    const session = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: session.error?.message || "Stripe error" }) };

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch(err) {
    return { statusCode: 502, body: JSON.stringify({ error: "Stripe unreachable: " + err.message }) };
  }
};
