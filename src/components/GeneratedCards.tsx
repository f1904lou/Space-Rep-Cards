import { useState } from "react";
import { saveCards } from "../lib/db";
import type { Card, CardType } from "../types";

interface GeneratedCardsProps {
  cards: Card[];
  onUpdateCard: (id: string, updates: Partial<Card>) => void;
  onUpdateAllCards: (updates: Partial<Card>) => void;
  onClear: () => void;
  onRegenerate: () => void;
}

const TYPE_COLORS: Record<CardType, string> = {
  factual: "bg-blue-900 text-blue-300",
  conceptual: "bg-purple-900 text-purple-300",
  procedural: "bg-amber-900 text-amber-300",
  salience: "bg-green-900 text-green-300",
};

export default function GeneratedCards({
  cards,
  onUpdateCard,
  onUpdateAllCards,
  onClear,
  onRegenerate,
}: GeneratedCardsProps) {
  const [kept, setKept] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const topic = cards[0]?.topic ?? "";

  function toggleKept(id: string) {
    setKept((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    const selected = cards.filter((c) => kept.has(c.id));
    if (selected.length === 0) return;
    setSaving(true);
    await saveCards(selected);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Editable topic */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-gray-500">Topic:</span>
        <input
          type="text"
          value={topic}
          onChange={(e) => onUpdateAllCards({ topic: e.target.value })}
          className="bg-transparent text-sm font-medium text-gray-200 border-b border-gray-700 focus:border-gray-500 focus:outline-none px-1 py-0.5"
          placeholder="Enter topic..."
        />
      </div>

      {/* Cards grid */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex-shrink-0 w-80 rounded-lg border border-gray-700 bg-gray-900 shadow-md flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${TYPE_COLORS[card.type]}`}
              >
                {card.type}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kept.has(card.id)}
                  onChange={() => toggleKept(card.id)}
                  className="accent-white"
                />
                <span className="text-xs text-gray-400">Keep</span>
              </label>
            </div>

            {/* Question */}
            <div className="px-4 pb-2">
              <label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 block">
                Question
              </label>
              <textarea
                value={card.question}
                onChange={(e) =>
                  onUpdateCard(card.id, { question: e.target.value })
                }
                rows={2}
                className="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none border-b border-gray-800 focus:border-gray-600 pb-1"
              />
            </div>

            {/* Answer */}
            <div className="px-4 pb-3">
              <label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1 block">
                Answer
              </label>
              <textarea
                value={card.answer}
                onChange={(e) =>
                  onUpdateCard(card.id, { answer: e.target.value })
                }
                rows={2}
                className="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none border-b border-gray-800 focus:border-gray-600 pb-1"
              />
            </div>

            {/* Source quote */}
            <div className="px-4 pb-4 mt-auto">
              <button
                onClick={() => toggleExpanded(card.id)}
                className="text-[11px] uppercase tracking-wide text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                Source quote {expanded.has(card.id) ? "▾" : "▸"}
              </button>
              {expanded.has(card.id) && (
                <p className="mt-1 text-xs text-gray-400 italic leading-relaxed">
                  "{card.source_quote}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={kept.size === 0 || saving}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {savedMsg ? "Saved!" : saving ? "Saving..." : `Save Selected (${kept.size})`}
        </button>
        <button
          onClick={onRegenerate}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors cursor-pointer"
        >
          Regenerate
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
