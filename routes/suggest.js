// routes/suggest.js
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
      options: { temperature: 0.5, num_predict: 256 }
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.response || "";
}


router.post("/", express.json({ limit: "12kb" }), async (req, res) => {
  try {
    const { placeholders = [], answers = {}, context = "" } = req.body || {};
    const pls = (Array.isArray(placeholders) ? placeholders : []).slice(0, 25);

    const answered = Object.entries(answers)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => `- ${k}: ${String(v).trim()}`)
      .join("\n") || "(none)";

    const list = pls.map((p, i) => `${i + 1}. ${p}`).join("\n");

    const prompt = `
You are a legal product assistant helping a founder complete a SAFE doc.
Given the placeholders and any already-provided answers, propose short,
crisp follow-up QUESTIONS the app should ask to fill missing info.
Return ONLY minified JSON array, each item:
{"label":"<placeholder>","question":"<one-sentence question>","example":"<short example answer>"}

Context:
${context}

Existing answers:
${answered}

Placeholders:
${list}

Output format example:
[{"label":"Company Name","question":"What is the full legal name of the company?","example":"Acme, Inc."}]
`;

    const out = await ollamaGenerate(prompt);

    let arr = [];
    const jsonMatch = out.match(/\[[\s\S]*\]$/m) || out.match(/\[[\s\S]*\]/m);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          // Keep it tidy and short
          arr = parsed.slice(0, 10).map(x => ({
            label: String(x.label || ""),
            question: String(x.question || ""),
            example: x.example ? String(x.example) : undefined
          })).filter(x => x.label && x.question);
        }
      } catch { /* ignore */ }
    }

    
    if (!arr.length) {
      arr = pls.slice(0, 6).map(label => ({
        label,
        question: `Please provide ${label} (keep it brief).`,
        example:
          /date/i.test(label) ? "2025-01-15" :
          /governing law/i.test(label) ? "State of Delaware" :
          /state of incorporation/i.test(label) ? "Delaware" :
          /company|issuer/i.test(label) ? "Acme, Inc." :
          /investor/i.test(label) ? "Alpha Ventures, LP" :
          /title/i.test(label) ? "CEO" :
          undefined
      }));
    }

    return res.json({ suggestions: arr });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Suggest failed" });
  }
});

export default router;
