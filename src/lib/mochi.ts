import JSZip from "jszip";
import type { Card } from "../types";
import { apiFetch, readApiError } from "./api";

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiFetch("/api/mochi/test");
    if (!res.ok) {
      return { ok: false, message: await readApiError(res) };
    }
    return { ok: true, message: "Connection successful" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

/**
 * Push cards to Mochi through the Vercel API so the Mochi key stays server-side.
 */
export async function pushCards(
  cards: Card[],
  onProgress?: (current: number, total: number) => void,
): Promise<{ success: number; failed: number; errors: string[] }> {
  const total = cards.length;
  onProgress?.(0, total);
  const res = await apiFetch("/api/mochi/push", {
    method: "POST",
    body: JSON.stringify({ cards }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  onProgress?.(total, total);
  return (await res.json()) as {
    success: number;
    failed: number;
    errors: string[];
  };
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
