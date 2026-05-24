import { requireSession } from "../_lib/auth.js";
import { allowMethods, missingEnv, providerError } from "../_lib/http.js";

const BASE = "https://app.mochi.cards/api";

function authHeader(apiKey) {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["GET"])) return;
  if (!requireSession(req, res)) return;

  const apiKey = process.env.MOCHI_API_KEY;
  if (!apiKey) {
    missingEnv(res, "MOCHI_API_KEY");
    return;
  }

  try {
    const upstream = await fetch(`${BASE}/decks/`, {
      headers: { Authorization: authHeader(apiKey) },
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: providerError(
          data,
          `Mochi error ${upstream.status}: ${upstream.statusText}`,
        ),
      });
      return;
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ error: "Unable to reach Mochi" });
  }
}
