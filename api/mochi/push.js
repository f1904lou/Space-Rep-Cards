import { requireSession } from "../_lib/auth.js";
import { allowMethods, missingEnv, providerError } from "../_lib/http.js";

const BASE = "https://app.mochi.cards/api";

function authHeader(apiKey) {
  return "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
}

async function mochiGet(path, apiKey) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: authHeader(apiKey) },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      providerError(data, `Mochi error ${res.status}: ${res.statusText}`),
    );
  }
  return data;
}

async function mochiPost(path, apiKey, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(apiKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) {
    throw new Error(
      providerError(data, `Mochi error ${res.status}: ${res.statusText}`),
    );
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function groupByTopic(cards) {
  const groups = new Map();
  for (const card of cards) {
    const topic = card.topic || "Uncategorized";
    const group = groups.get(topic) ?? [];
    group.push(card);
    groups.set(topic, group);
  }
  return groups;
}

async function listDecks(apiKey) {
  const data = await mochiGet("/decks/", apiKey);
  return (data.docs ?? []).map((deck) => ({
    id: deck.id,
    name: deck.name,
  }));
}

export default async function handler(req, res) {
  if (!allowMethods(req, res, ["POST"])) return;
  if (!requireSession(req, res)) return;

  const apiKey = process.env.MOCHI_API_KEY;
  if (!apiKey) {
    missingEnv(res, "MOCHI_API_KEY");
    return;
  }

  const cards = req.body?.cards;
  if (!Array.isArray(cards) || cards.length === 0) {
    res.status(400).json({ error: "cards must be a non-empty array" });
    return;
  }

  try {
    const grouped = groupByTopic(cards);
    const existingDecks = await listDecks(apiKey);
    const deckMap = new Map();

    for (const [topic] of grouped) {
      const existing = existingDecks.find(
        (deck) => deck.name.toLowerCase() === topic.toLowerCase(),
      );
      if (existing) {
        deckMap.set(topic, existing.id);
      } else {
        const created = await mochiPost("/decks/", apiKey, { name: topic });
        deckMap.set(topic, created.id);
      }
    }

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const [topic, topicCards] of grouped) {
      const deckId = deckMap.get(topic);
      for (const card of topicCards) {
        const content = `${card.question}\n---\n${card.answer}`;
        try {
          await mochiPost("/cards/", apiKey, { content, "deck-id": deckId });
          success++;
        } catch (err) {
          if (err instanceof Error && err.message === "rate_limited") {
            await sleep(1000);
            try {
              await mochiPost("/cards/", apiKey, {
                content,
                "deck-id": deckId,
              });
              success++;
              continue;
            } catch {
              // Fall through to the normal failure counter.
            }
          }
          failed++;
          errors.push(
            `Card "${String(card.question ?? "").slice(0, 40)}...": ${
              err instanceof Error ? err.message : "Unknown error"
            }`,
          );
        }
      }
    }

    res.status(200).json({ success, failed, errors });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "Unable to reach Mochi",
    });
  }
}
