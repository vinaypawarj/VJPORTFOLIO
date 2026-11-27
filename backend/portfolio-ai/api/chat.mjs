const INSTRUCTIONS = `You are the AI assistant on Vinay Pawar's portfolio, not Vinay himself or ChatGPT.
Help with general questions, study topics, coding, writing, and explanations. Answer in the user's language, including English, Kannada, or Hindi. Be friendly, accurate, concise, and honest about uncertainty. Use short paragraphs, simple lists, and fenced code when useful. You have no browsing, private files, messaging, or external-action tools; never claim to have searched current facts or performed actions.
For questions about Vinay, use only these public portfolio facts: His name is Vinay Pawar. He is a UPSC aspirant and aspiring developer learning to code. His developing skills are coding, research, problem solving, and creative thinking. He values public service, creative technology, and turning ideas into action. His project cards are currently placeholders, not completed projects. The portfolio sections are #about, #skills, #projects, and #contact. Contact options are on #contact. Do not invent experience, achievements, services, availability, qualifications, or exam results. Do not pretend the portfolio owner is replying personally.`;

export function createChatHandler({ env = process.env, requestModel = fetch, now = Date.now } = {}) {
  // These limits are per warm instance; use a provider firewall for a global limit.
  const limits = new Map();

  function takeRequest(key, max, time) {
    let bucket = limits.get(key);
    if (!bucket || time >= bucket.reset) bucket = { count: 0, reset: time + 60000 };
    bucket.count += 1; limits.set(key, bucket);
    return bucket.count <= max;
  }

  return async function handleChat(request) {
    const origin = request.headers.get("origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "https://vinaypawarj.github.io").split(",").map(value => value.trim()).filter(Boolean);
    const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff" };
    const reply = (status, body) => Response.json(body, { status, headers });
    if (!allowed.includes(origin)) return reply(403, { error: "Origin not allowed." });
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return reply(405, { error: "Use POST." });
    if (!env.OPENAI_API_KEY) return reply(503, { error: "AI service is not configured." });
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply(415, { error: "Use application/json." });
    if (Number(request.headers.get("content-length")) > 64000) return reply(413, { error: "Message is too large." });

    const time = now();
    for (const [key, bucket] of limits) if (time >= bucket.reset) limits.delete(key);
    if (limits.size > 5000) return reply(429, { error: "Please try again in a minute." });
    const client = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!takeRequest(`client:${client}`, 10, time) || !takeRequest("global", 60, time)) {
      headers["Retry-After"] = "60";
      return reply(429, { error: "Please try again in a minute." });
    }

    let body;
    try {
      // Bound the stream before decoding, rather than trusting Content-Length.
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "A message is required." });
      const chunks = []; let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 64000) { await reader.cancel(); return reply(413, { error: "Message is too large." }); }
          chunks.push(value);
        }
      } finally { reader.releaseLock(); }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch { return reply(400, { error: "Invalid JSON message." }); }
    const messages = body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 9 || messages.at(-1)?.role !== "user") return reply(400, { error: "Invalid conversation." });
    let total = 0;
    for (const message of messages) {
      if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || !message.content.trim() || message.content.length > (message.role === "user" ? 2000 : 14000)) return reply(400, { error: "Invalid message." });
      total += message.content.length;
    }
    if (total > 20000) return reply(413, { error: "Conversation is too long. Start a new chat." });

    try {
      const response = await requestModel("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-6.2-sol",
          input: [{ role: "developer", content: INSTRUCTIONS }, ...messages.map(({ role, content }) => ({ role, content }))],
          reasoning: { effort: "low" }, max_output_tokens: 1800, store: false
        }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)])
      });
      if (!response.ok) return reply(response.status === 429 ? 429 : 503, { error: "AI replies are temporarily unavailable." });
      const data = await response.json();
      const parts = [];
      for (const item of data.output || []) {
        if (item.type !== "message" || item.role !== "assistant") continue;
        for (const part of item.content || []) {
          if (part.type === "output_text" && typeof part.text === "string") parts.push(part.text);
          if (part.type === "refusal" && typeof part.refusal === "string") parts.push(part.refusal);
        }
      }
      const answer = parts.join("\n").trim();
      if (!answer) return reply(502, { error: "No reply returned. Please try again." });
      return reply(200, { reply: answer.slice(0, 14000) });
    } catch { return reply(503, { error: "AI replies are temporarily unavailable." }); }
  };
}

export default { fetch: createChatHandler() };
