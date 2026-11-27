import { KEY, json } from "./_ai.js";
export function GET() { return json({ ai: !!KEY() }); }
