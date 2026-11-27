import { KEY, SYS_TASK, SYS_CHAT, gemini, toContents, json, errText } from "./_ai.js";
export const config = { maxDuration: 30 };
export function GET() { return json({ error: "method" }, 405); }
export async function POST(req) {
  if (!KEY()) return json({ error: "no_key" }, 503);
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
}
