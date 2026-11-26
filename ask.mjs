// TechMaster AI — ИИ через Google Gemini. Ключ: переменная окружения GEMINI_API_KEY в настройках Netlify.
const KEY = () => (process.env.GEMINI_API_KEY || "").trim();
const API = "https://generativelanguage.googleapis.com/v1beta";
let MODEL = (process.env.GEMINI_MODEL || "").trim();

async function pickModel() {
  if (MODEL) return MODEL;
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": KEY() } });
  const j = await r.json();
  const names = (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name).replace("models/", ""));
  const flash = names.filter(n => /flash/.test(n) && !/lite|image|tts|live|audio|exp|preview|thinking/.test(n));
  MODEL = flash.sort().reverse()[0] || names.find(n => /flash/.test(n)) || names[0] || "gemini-2.5-flash";
  console.log("Gemini model:", MODEL);
  return MODEL;
}

async function gemini(prompt, retry = true) {
  const model = await pickModel();
  const r = await fetch(`${API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY() },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 2048 } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.log("Gemini error", r.status, JSON.stringify(j).slice(0, 300));
    if (retry && r.status === 404 && !process.env.GEMINI_MODEL) { MODEL = ""; return gemini(prompt, false); }
    throw new Error("gemini " + r.status);
  }
  const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("empty");
  return text;
}

const SYSTEM = "Ты — ИИ-ассистент TechMaster AI для инженера-технолога производства строительных материалов. Отвечай по-русски, только по теме технологии стройматериалов, кратко и конкретно, в Markdown.\n\n";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

export default async (req) => {
  const url = new URL(req.url);
  if (url.pathname === "/api/status") return json({ ai: !!KEY() });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!KEY()) return json({ error: "no_key" }, 503);
  try {
    const body = await req.json();
    const prompt = String(body?.prompt || "").slice(0, 8000);
    if (!prompt.trim()) return json({ error: "empty" }, 400);
    return json({ text: await gemini(SYSTEM + prompt) });
  } catch (e) { return json({ error: String(e?.message || e) }, 502); }
};

export const config = { path: ["/api/status", "/api/ask"] };
