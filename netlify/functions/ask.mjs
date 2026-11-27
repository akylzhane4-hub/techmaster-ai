// TechMaster AI — ИИ через Google Gemini. Ключ: переменная окружения GEMINI_API_KEY в настройках Netlify.
// Проверка: /api/status — есть ли ключ; /api/test — пробный запрос к ИИ (показывает модель или ошибку).
const KEY = () => (process.env.GEMINI_API_KEY || "").trim();
const API = "https://generativelanguage.googleapis.com/v1beta";
const SYSTEM = "Ты — ИИ-ассистент TechMaster AI для инженера-технолога производства строительных материалов. Отвечай по-русски, только по теме технологии стройматериалов, кратко и конкретно, в Markdown.\n\n";
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

async function call(model, prompt, thinking) {
  const gen = { temperature: 0.4, maxOutputTokens: 1500 };
  if (thinking === "budget") gen.thinkingConfig = { thinkingBudget: 0 };
  if (thinking === "level") gen.thinkingConfig = { thinkingLevel: "low" };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 22000);
  try {
    const r = await fetch(`${API}/models/${model}:generateContent`, {
      method: "POST",
      signal: ctl.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY() },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: gen }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  } finally { clearTimeout(t); }
}

async function gemini(prompt) {
  const model = await pickModel();
  // быстрый режим без долгого «обдумывания», чтобы уложиться во время функции
  const modes = /2\.5/.test(model) ? ["budget", "none"] : /gemini-[3-9]/.test(model) ? ["level", "none"] : ["none"];
  let last;
  for (const m of modes) {
    last = await call(model, prompt, m);
    if (last.ok) break;
    if (last.status !== 400) break; // 400 — модель не поняла настройку, пробуем без неё
  }
  if (!last.ok) {
    if (last.status === 404 && !process.env.GEMINI_MODEL) MODEL = "";
    throw new Error(`gemini ${last.status}: ${last.j?.error?.message || "error"} (model ${model})`);
  }
  const text = (last.j.candidates?.[0]?.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error(`empty answer (model ${model}, finish ${last.j.candidates?.[0]?.finishReason || "?"})`);
  return { text, model };
}

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export default async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/api/status") return json({ ai: !!KEY() });
  if (!KEY()) return json({ error: "no_key" }, 503);
  if (url.pathname === "/api/test") {
    const t0 = Date.now();
    try {
      const r = await gemini("Ответь одним словом по-русски: работаешь?");
      return json({ ok: true, model: r.model, ms: Date.now() - t0, answer: r.text.slice(0, 80) });
    } catch (e) {
      let models = null;
      try { models = (await listModels()).slice(0, 30); } catch (e2) { models = String(e2?.message || e2); }
      return json({ ok: false, ms: Date.now() - t0, error: String(e?.name === "AbortError" ? "timeout" : e?.message || e), models });
    }
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").slice(0, 8000);
    if (!prompt.trim()) return json({ error: "empty" }, 400);
    const r = await gemini(SYSTEM + prompt);
    return json({ text: r.text, model: r.model });
  } catch (e) {
    const msg = String(e?.name === "AbortError" ? "timeout" : e?.message || e);
    console.log("AI error:", msg);
    return json({ error: msg }, 502);
  }
};

export const config = { path: ["/api/status", "/api/ask", "/api/test"] };
