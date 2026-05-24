import { requireSession } from "../_lib/auth.js";
import { allowMethods, missingEnv, providerError } from "../_lib/http.js";

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!requireSession(req, res)) return;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    missingEnv(res, "OPENAI_API_KEY");
    return;
  }

  const { model, messages, response_format } = req.body ?? {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages must be an array" });
    return;
  }

  const requestedModel =
    typeof model === "string" && model.trim()
      ? model.trim()
      : process.env.OPENAI_MODEL || "gpt-4o";

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: requestedModel,
        messages,
        response_format,
      }),
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

    res.status(200).json({
      model: requestedModel,
      content: data?.choices?.[0]?.message?.content ?? "",
    });
  } catch {
    res.status(502).json({ error: "Unable to reach OpenAI" });
  }
}
