// routes/ai.js
import express from "express";

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL?.trim() || "http://127.0.0.1:11434";
const MODEL = process.env.OLLAMA_MODEL?.trim() || "llama3.2:3b";


async function ollamaGenerate(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.4,
        num_predict: 256
      }
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.response || "";
}


router.post("/autofill", express.json({ limit: "12kb" }), async (req, res) => {
  try {
    const { placeholders = [], note = "", context = "" } = req.body || {};
    const pls = (Array.isArray(placeholders) ? placeholders : []).slice(0, 40);

    if (!pls.length) {
      return res.status(400).json({ error: "No placeholders provided" });
    }

    const list = pls.map((p, i) => `${i + 1}. ${p}`).join("\n");

    const prompt = `
You are a paralegal assistant. You fill a JSON object with concise, realistic values
for the given document placeholders. Use American legal/business style, keep it short,
and avoid fabricating unknown specifics—use plausible generic values instead.

Return ONLY valid minified JSON with keys EXACTLY matching the placeholders.

Context (may be empty):
${context}

User note (may be empty):
${note}

Placeholders:
${list}

Output format:
{"Placeholder A":"Value A","Placeholder B":"Value B",...}
`;

    const out = await ollamaGenerate(prompt);

    
    const jsonMatch = out.match(/\{[\s\S]*\}$/m) || out.match(/\{[\s\S]*\}/m);
    let values = {};
    if (jsonMatch) {
      try {
        const obj = JSON.parse(jsonMatch[0]);
        
        for (const k of pls) {
          if (typeof obj[k] !== "undefined") values[k] = String(obj[k]);
        }
      } catch { /* fall through */ }
    }

    
    if (!Object.keys(values).length) {
      const today = new Date().toISOString().slice(0, 10);
      for (const k of pls) {
        if (/date/i.test(k)) values[k] = today;
        else if (/company|issuer|corporation|llc/i.test(k)) values[k] = "Acme, Inc.";
        else if (/investor/i.test(k)) values[k] = "Alpha Ventures, LP";
        else if (/state of incorporation/i.test(k)) values[k] = "Delaware";
        else if (/governing law/i.test(k)) values[k] = "State of Delaware";
        else if (/name/i.test(k)) values[k] = "Jane Doe";
        else if (/title/i.test(k)) values[k] = "CEO";
        else values[k] = "—";
      }
    }

    return res.json({ values });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Autofill failed" });
  }
});

export default router;
