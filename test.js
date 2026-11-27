import { KEY, SYS_CHAT, gemini, listModels, json, errText } from "./_ai.js";
export const config = { maxDuration: 30 };
export async function GET() {
  if (!KEY()) return json({ error: "no_key" }, 503);
  const t0 = Date.now();
  try {
    const r = await gemini(SYS_CHAT, [{ role: "user", parts: [{ text: "Ответь одним словом: работаешь?" }] }]);
    return json({ ok: true, model: r.model, ms: Date.now() - t0, answer: r.text.slice(0, 80) });
  } catch (e) {
    let models = null;
    try { models = (await listModels()).slice(0, 40); } catch (e2) { models = errText(e2); }
    return json({ ok: false, ms: Date.now() - t0, error: errText(e), models });
  }
}
