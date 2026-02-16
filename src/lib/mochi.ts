import JSZip from "jszip";
import type { Card } from "../types";

const BASE = "https://app.mochi.cards/api";

export class MochiCorsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MochiCorsError";
  }
}

function authHeader(apiKey: string): string {
  return "Basic " + btoa(apiKey + ":");
}

async function mochiGet(path: string, apiKey: string) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: {
        Authorization: authHeader(apiKey),
      },
    });
  } catch {
    throw new MochiCorsError(
      "Mochi API blocked by browser (CORS). Falling back to file export.",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.errors
        ? Object.values(body.errors).join(", ")
        : `Error ${res.status}: ${res.statusText}`,
    );
  }
  return res.json();
}

async function mochiPost(path: string, apiKey: string, body: object) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: authHeader(apiKey),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MochiCorsError(
      "Mochi API blocked by browser (CORS). Falling back to file export.",
    );
  }
  if (res.status === 429) {
    throw new Error("rate_limited");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(
      data?.errors
        ? Object.values(data.errors).join(", ")
        : `Error ${res.status}: ${res.statusText}`,
    );
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function testConnection(
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    await mochiGet("/decks/", apiKey);
    return { ok: true, message: "Connection successful" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export async function listDecks(
  apiKey: string,
): Promise<{ id: string; name: string }[]> {
  const data = await mochiGet("/decks/", apiKey);
  return (data.docs ?? []).map((d: { id: string; name: string }) => ({
    id: d.id,
    name: d.name,
  }));
}

export async function createDeck(
  apiKey: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const data = await mochiPost("/decks/", apiKey, { name });
  return { id: data.id, name: data.name };
}

export async function createCard(
  apiKey: string,
  content: string,
  deckId: string,
) {
  return mochiPost("/cards/", apiKey, { content, "deck-id": deckId });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Push cards to Mochi via API. Groups by topic, creates one deck per topic.
 * Cards are sent sequentially (rate limit: 1 concurrent request).
 */
export async function pushCards(
  apiKey: string,
  cards: Card[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: number; failed: number; errors: string[] }> {
  const grouped = groupByTopic(cards);
  const existingDecks = await listDecks(apiKey);

  // Map topic → deck ID
  const deckMap = new Map<string, string>();
  for (const [topic] of grouped) {
    const existing = existingDecks.find(
      (d) => d.name.toLowerCase() === topic.toLowerCase(),
    );
    if (existing) {
      deckMap.set(topic, existing.id);
    } else {
      const created = await createDeck(apiKey, topic);
      deckMap.set(topic, created.id);
    }
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  let current = 0;
  const total = cards.length;

  for (const [topic, topicCards] of grouped) {
    const deckId = deckMap.get(topic)!;
    for (const card of topicCards) {
      const content = card.question + "\n---\n" + card.answer;
      current++;
      onProgress?.(current, total);

      try {
        await createCard(apiKey, content, deckId);
        success++;
      } catch (err) {
        if (err instanceof MochiCorsError) throw err;
        // Retry once on rate limit
        if (err instanceof Error && err.message === "rate_limited") {
          await sleep(1000);
          try {
            await createCard(apiKey, content, deckId);
            success++;
            continue;
          } catch {
            /* fall through to failure */
          }
        }
        failed++;
        errors.push(
          `Card "${card.question.slice(0, 40)}...": ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }
  }

  return { success, failed, errors };
}

// ---------------------------------------------------------------------------
// .mochi file export (ZIP with data.edn)
// ---------------------------------------------------------------------------

function groupByTopic(cards: Card[]): Map<string, Card[]> {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const topic = card.topic || "Uncategorized";
    const group = groups.get(topic) ?? [];
    group.push(card);
    groups.set(topic, group);
  }
  return groups;
}

function escapeEdn(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildEdn(cards: Card[]): string {
  const grouped = groupByTopic(cards);
  const deckStrs: string[] = [];

  for (const [topic, topicCards] of grouped) {
    const cardStrs = topicCards.map((c) => {
      const content = escapeEdn(c.question + "\n---\n" + c.answer);
      return `{:content "${content}"}`;
    });
    deckStrs.push(
      `{:name "${escapeEdn(topic)}" :cards [${cardStrs.join(" ")}]}`,
    );
  }

  return `{:version 2 :decks [${deckStrs.join(" ")}]}`;
}

export async function exportMochiFile(cards: Card[]) {
  const edn = buildEdn(cards);
  const zip = new JSZip();
  zip.file("data.edn", edn);
  const blob = await zip.generateAsync({ type: "blob" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cards.mochi";
  a.click();
  URL.revokeObjectURL(url);
}
