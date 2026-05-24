import type { Card, CardType } from "../types";
import { SYSTEM_PROMPT, DEVELOPER_PROMPT, buildUserMessage } from "./prompts";
import { apiFetch, readApiError } from "./api";

const LS_KEY = "promptforge_settings";
const VALID_TYPES: CardType[] = ["factual", "conceptual", "procedural", "salience"];

interface Settings {
  provider: "openai";
  model: string;
}

function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        provider: "openai",
        model: parsed.model || "gpt-4o",
      };
    }
  } catch {
    // Ignore malformed legacy settings and fall back to safe defaults.
  }
  return { provider: "openai", model: "gpt-4o" };
}

interface RawCard {
  type?: string;
  topic?: string;
  question?: string;
  answer?: string;
  source_quote?: string;
  inference?: boolean;
}

function parseCards(json: string, model: string): Card[] {
  const parsed = JSON.parse(json);
  const rawCards: RawCard[] = parsed?.cards;
  if (!Array.isArray(rawCards) || rawCards.length === 0) {
    throw new Error("Response JSON missing 'cards' array");
  }

  return rawCards.map((raw) => {
    if (!raw.question || !raw.answer) {
      throw new Error("Card missing question or answer");
    }
    return {
      id: crypto.randomUUID(),
      type: VALID_TYPES.includes(raw.type as CardType)
        ? (raw.type as CardType)
        : "factual",
      topic: raw.topic || "Uncategorized",
      question: raw.question,
      answer: raw.answer,
      source_quote: raw.source_quote || "",
      inference: raw.inference ?? false,
      created_at: Date.now(),
      provider: "openai",
      model,
    };
  });
}

async function callOpenAI(
  settings: Settings,
  userMessage: string,
  repair?: boolean,
): Promise<string> {
  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "developer", content: DEVELOPER_PROMPT },
    { role: "user", content: userMessage },
  ];

  if (repair) {
    messages.push({
      role: "user",
      content:
        "Your previous response was not valid JSON. Return ONLY valid JSON matching the schema.",
    });
  }

  const res = await apiFetch("/api/openai/chat", {
    method: "POST",
    body: JSON.stringify({
      model: settings.model,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  const data = (await res.json()) as { content?: string };
  return data.content ?? "";
}

export interface GenerateResult {
  cards?: Card[];
  error?: string;
  rawResponse?: string;
}

export async function generateCards(
  selectedText: string,
  title?: string,
): Promise<GenerateResult> {
  const settings = getSettings();

  if (!settings.model) {
    return { error: "Set a model name in Settings first." };
  }

  const userMessage = buildUserMessage(selectedText, title);

  try {
    let raw = await callOpenAI(settings, userMessage);

    try {
      const cards = parseCards(raw, settings.model);
      return { cards };
    } catch {
      // Retry once with repair instruction
      try {
        raw = await callOpenAI(settings, userMessage, true);
        const cards = parseCards(raw, settings.model);
        return { cards };
      } catch {
        return {
          error: "LLM returned invalid JSON. Raw response below:",
          rawResponse: raw,
        };
      }
    }
  } catch (err) {
    const message =
      err instanceof TypeError && err.message === "Failed to fetch"
        ? "Network error. Check your internet connection and API key."
        : err instanceof Error
          ? err.message
          : "Unknown error";
    return { error: message };
  }
}
