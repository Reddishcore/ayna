exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 200, body: JSON.stringify({ comment: null, score: null }) };

  let payload;
  try { payload = JSON.parse(event.body || "{}"); } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid body" }) };
  }

  const { image_url: imageUrl, lang, prev_score } = payload;
  if (!imageUrl || !/^https:\/\//.test(imageUrl)) {
    return { statusCode: 200, body: JSON.stringify({ comment: null, score: null }) };
  }

  const isEN = lang === "en";
  const commentLang = isEN ? "English" : "Turkish";

  const angles = isEN ? [
    "focus on colour harmony",
    "focus on which occasion or setting this works for",
    "focus on the overall vibe (sporty / smart / casual)",
    "focus on what accessory would complete this outfit",
    "focus on the strongest piece in the outfit"
  ] : [
    "renk uyumuna odaklan",
    "hangi ortama veya davete uygun olduğuna odaklan",
    "kombinin genel havasına (spor / şık / rahat) odaklan",
    "bu kombinle hangi aksesuarın iyi gideceğine odaklan",
    "kombinin en güçlü parçasına odaklan"
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  // Eğer önceki skor yüksekse daha eleştirel ol
  const prevNote = prev_score && prev_score >= 8
    ? (isEN
        ? "The user's previous outfit scored high. Be more critical this time — look harder for what could be improved."
        : "Kullanıcının önceki kombini yüksek puan aldı. Bu sefer daha eleştirel bak — neyin geliştirilebileceğini daha dikkatli ara.")
    : "";

  const systemPrompt = isEN
    ? `You are a genuine, witty but honest stylist. You will be shown a virtual try-on result.
NEVER comment on the person's body, weight, height or physical features — only the clothes.
Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"score": <integer 1-10>, "comment": "<one or two short sentences>"}

Scoring rules:
- Be genuinely critical. Most outfits should score 5-7. Only exceptional combinations earn 8+.
- If prev_score was high, be harder to impress.
- Score reflects: colour harmony, occasion fit, overall coherence.
- Never give the same score twice in a row if you can help it.

Comment rules:
- High score (8-10): short specific praise — say WHY it works.
- Mid score (5-7): honest observation + one actionable suggestion.
- Low score (1-4): direct but kind — say what clashes and what to try instead.
- No hollow praise. No quotation marks inside the comment.
- Language: ${commentLang}.
${prevNote}`
    : `Sen samimi, esprili ama dürüst bir stilistsin. Sana bir kıyafet deneme sonucu gösterilecek.
Kişinin vücudu, kilosu, boyu veya fiziksel özellikleri hakkında ASLA yorum yapma — sadece kıyafetler.
SADECE şu formatta geçerli JSON döndür (markdown yok, başka metin yok):
{"score": <1-10 arası tam sayı>, "comment": "<bir veya iki kısa cümle>"}

Puanlama kuralları:
- Gerçekten eleştirel ol. Çoğu kombin 5-7 almalı. Sadece gerçekten iyi kombinler 8+ alır.
- Önceki puan yüksekse bu sefer daha zor beğen.
- Puan şunları yansıtır: renk uyumu, ortama uygunluk, genel tutarlılık.
- Mümkünse art arda aynı puanı verme.

Yorum kuralları:
- Yüksek puan (8-10): kısa ve spesifik övgü — NEDEN iyi olduğunu söyle.
- Orta puan (5-7): dürüst gözlem + tek bir somut öneri.
- Düşük puan (1-4): doğrudan ama nazik — neyin çakıştığını ve ne denenmesi gerektiğini söyle.
- Boş övgü yok. Yorumun içinde tırnak işareti kullanma.
- Dil: Türkçe.
${prevNote}`;

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
        max_tokens: 200,
        temperature: 1,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: imageUrl } },
            { type: "text", text: isEN
              ? `Rate this outfit. Focus: ${angle}`
              : `Bu kombini değerlendir. Odak: ${angle}` }
          ]
        }]
      })
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: 200, body: JSON.stringify({ comment: null, score: null }) };

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim()
      .replace(/```json|```/g, "");

    let parsed;
    try { parsed = JSON.parse(text); } catch(e) {
      return { statusCode: 200, body: JSON.stringify({ comment: text || null, score: null }) };
    }

    const score = typeof parsed.score === "number"
      ? Math.min(10, Math.max(1, Math.round(parsed.score)))
      : null;

    return { statusCode: 200, body: JSON.stringify({ score, comment: parsed.comment || null }) };
  } catch(err) {
    return { statusCode: 200, body: JSON.stringify({ comment: null, score: null }) };
  }
};
