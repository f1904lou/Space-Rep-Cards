import { requireSession } from "../_lib/auth.js";
import { allowMethods, missingEnv, providerError } from "../_lib/http.js";

async function callOpenAI({ apiKey, model, messages, responseFormat }) {
  const body = {
    model,
    messages,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => null);
  return { upstream, data };
}

function isUnsupportedResponseFormat(message) {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("response_format") &&
    (normalized.includes("not supported") ||
      normalized.includes("unsupported") ||
      normalized.includes("invalid parameter"))
  );
}

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
    let { upstream, data } = await callOpenAI({
      apiKey,
      model: requestedModel,
      messages,
      responseFormat: response_format,
    });

    if (!upstream.ok && response_format) {
      const message = providerError(
        data,
        `OpenAI error ${upstream.status}: ${upstream.statusText}`,
      );
      if (isUnsupportedResponseFormat(message)) {
        ({ upstream, data } = await callOpenAI({
          apiKey,
          model: requestedModel,
          messages,
        }));
      }
    }

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
