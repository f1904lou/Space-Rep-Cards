import { requireSession } from "../_lib/auth.js";
import { allowMethods, missingEnv, providerError } from "../_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (!requireSession(req, res)) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    missingEnv(res, "OPENAI_API_KEY");
    return;
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: providerError(
          data,
          `OpenAI error ${upstream.status}: ${upstream.statusText}`,
        ),
      });
      return;
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ error: "Unable to reach OpenAI" });
  }
}
