// TechMaster AI — ИИ через Google Gemini. Ключ: переменная окружения GEMINI_API_KEY в настройках Netlify.
// Адреса: /api/status — есть ли ключ; /api/test — пробный запрос к ИИ; /api/ask — анализ (prompt) и чат (messages).
const KEY = () => (process.env.GEMINI_API_KEY || "").trim();
const API = "https://generativelanguage.googleapis.com/v1beta";
const SYS_TASK = "Ты — ИИ-ассистент TechMaster AI для инженера-технолога производства строительных материалов. Отвечай по-русски, кратко и конкретно, в Markdown.";
const SYS_CHAT = "Ты — ИИ-ассистент TechMaster AI, дружелюбный помощник на сайте для инженеров-технологов. Твоя специализация — технология строительных материалов: бетон и растворы, кирпич, газоблок, сухие смеси, рецептуры, ГОСТы, дефекты и их причины, контроль качества, экономия сырья, отчёты. Но ты помогаешь и с любыми другими вопросами пользователя. Отвечай на языке вопроса (по умолчанию по-русски), понятно и по делу, используй Markdown (короткие абзацы, списки, **жирный** для главного). Если вопрос про расчёт — показывай формулу и ход решения. Если данных не хватает — уточни. Не выдумывай нормативы и цифры: если не уверен, так и скажи.";
let MODEL = (process.env.GEMINI_MODEL || "").trim();

async function listModels() {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": KEY() } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`models ${r.status}: ${j?.error?.message || ""}`);
  return (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name).replace("models/", ""));
}

async function pickModel() {
  if (MODEL) return MODEL;
  const names = await listModels();
  const good = (n) => /flash/.test(n) && !/image|tts|live|audio|exp|preview|thinking|embedding/.test(n);
  const prefer = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  MODEL = prefer.find((p) => names.includes(p))
    || names.filter((n) => good(n) && !/lite/.test(n)).sort().reverse()[0]
    || names.filter(good).sort().reverse()[0]
    || names[0];
  if (!MODEL) throw new Error("no models available for this key");
  return MODEL;
}

async function call(model, system, contents, thinking) {
  const gen = { temperature: 0.5, maxOutputTokens: 1500 };
  if (thinking === "budget") gen.thinkingConfig = { thinkingBudget: 0 };
  if (thinking === "level") gen.thinkingConfig = { thinkingLevel: "low" };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 22000);
  try {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: "POST",
      signal: ctl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY() },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: gen }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } finally { clearTimeout(t); }
}

async function gemini(system, contents) {
  const model = await pickModel();
  // быстрый режим без долгого «обдумывания», чтобы уложиться во время функции
  const modes = /2\.5/.test(model) ? ["budget", "none"] : /gemini-[3-9]/.test(model) ? ["level", "none"] : ["none"];
  let last;
  for (const m of modes) {
    last = await call(model, system, contents, m);
    if (last.ok || last.status !== 400) break; // 400 — модель не приняла настройку, пробуем без неё
  }
  if (!last.ok) {
    if (last.status === 404 && !process.env.GEMINI_MODEL) MODEL = "";
    throw new Error(`gemini ${last.status}: ${last.j?.error?.message || "error"} (model ${model})`);
  }
  const text = (last.j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error(`empty answer (model ${model}, finish ${last.j.candidates?.[0]?.finishReason || "?"})`);
  return { text, model };
}

function toContents(messages) {
  const list = (Array.isArray(messages) ? messages : []).slice(-14)
    .map((m) => ({ role: m?.role === "assistant" ? "model" : "user", parts: [{ text: String(m?.content || "").slice(0, 4000) }] }))
    .filter((m) => m.parts[0].text.trim());
  while (list.length && list[0].role !== "user") list.shift();
  return list;
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const errText = (e) => String(e?.name === "AbortError" ? "timeout" : e?.message || e);

export default async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/api/status") return json({ ai: !!KEY() });
  if (!KEY()) return json({ error: "no_key" }, 503);
  if (url.pathname === "/api/test") {
    const t0 = Date.now();
    try {
      const r = await gemini(SYS_CHAT, [{ role: "user", parts: [{ text: "Ответь одним словом: работаешь?" }] }]);
      return json({ ok: true, model: r.model, ms: Date.now() - t0, answer: r.text.slice(0, 80) });
    } catch (e) {
      let models = null;
      try { models = (await listModels()).slice(0, 30); } catch (e2) { models = errText(e2); }
      return json({ ok: false, ms: Date.now() - t0, error: errText(e), models });
    }
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = await req.json();
    let r;
    if (Array.isArray(body?.messages)) {
      const contents = toContents(body.messages);
      if (!contents.length) return json({ error: "empty" }, 400);
      const ctx = String(body?.context || "").slice(0, 3000);
      r = await gemini(ctx ? `${SYS_CHAT}\n\nКонтекст с сайта (последний расчёт пользователя, используй если вопрос о нём):\n${ctx}` : SYS_CHAT, contents);
    } else {
      const prompt = String(body?.prompt || "").slice(0, 8000);
      if (!prompt.trim()) return json({ error: "empty" }, 400);
      r = await gemini(SYS_TASK, [{ role: "user", parts: [{ text: prompt }] }]);
    }
    return json({ text: r.text, model: r.model });
  } catch (e) {
    const msg = errText(e);
    console.log("AI error:", msg);
    return json({ error: msg }, 502);
  }
};

export const config = { path: ["/api/status", "/api/ask", "/api/test"] };
