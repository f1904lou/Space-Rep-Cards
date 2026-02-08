import { useState, useEffect, useCallback } from "react";
import { getAllCards, updateCard, deleteCards, saveCards } from "../lib/db";
import type { Card, CardType } from "../types";

const TYPE_COLORS: Record<CardType, string> = {
  factual: "bg-blue-900 text-blue-300",
  conceptual: "bg-purple-900 text-purple-300",
  procedural: "bg-amber-900 text-amber-300",
  salience: "bg-green-900 text-green-300",
};

function exportCSV(cards: Card[]) {
  const header = "Front,Back";
  const rows = cards.map(
    (c) =>
      `"${c.question.replace(/"/g, '""')}","${c.answer.replace(/"/g, '""')}"`,
  );
  const csv = [header, ...rows].join("\n");
  download(csv, "cards.csv", "text/csv");
}

function exportMarkdown(cards: Card[]) {
  const md = cards
    .map((c) => `${c.question}\n---\n${c.answer}`)
    .join("\n\n");
  download(md, "cards.md", "text/markdown");
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export default function SavedCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedTopics, setCollapsedTopics] = useState<Set<string>>(
    new Set(),
  );
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState("");

  const load = useCallback(async () => {
    const all = await getAllCards();
    setCards(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === cards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cards.map((c) => c.id)));
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTopicCollapsed(topic: string) {
    setCollapsedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  function startEditingTopic(topic: string) {
    setEditingTopic(topic);
    setEditingTopicValue(topic);
  }

  async function finishEditingTopic() {
    if (editingTopic === null) return;
    const newTopic = editingTopicValue.trim() || "Uncategorized";
    if (newTopic !== editingTopic) {
      const toUpdate = cards.filter(
        (c) => (c.topic || "Uncategorized") === editingTopic,
      );
      const updated = toUpdate.map((c) => ({ ...c, topic: newTopic }));
      await saveCards(updated);
      setCards((prev) =>
        prev.map((c) =>
          (c.topic || "Uncategorized") === editingTopic
            ? { ...c, topic: newTopic }
            : c,
        ),
      );
    }
    setEditingTopic(null);
  }

  async function handleFieldChange(
    card: Card,
    field: "question" | "answer",
    value: string,
  ) {
    const updated = { ...card, [field]: value };
    setCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
    await updateCard(updated);
  }

  async function handleDelete() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await deleteCards(ids);
    setSelected(new Set());
    await load();
  }

  function handleExportCSV() {
    const toExport =
      selected.size > 0 ? cards.filter((c) => selected.has(c.id)) : cards;
    exportCSV(toExport);
  }

  function handleExportMarkdown() {
    const toExport =
      selected.size > 0 ? cards.filter((c) => selected.has(c.id)) : cards;
    exportMarkdown(toExport);
  }

  const grouped = groupByTopic(cards);

  if (loading) {
    return (
      <div className="px-6 py-16 text-center text-gray-500 text-sm">
        Loading...
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-gray-500 text-sm">
        No saved cards yet. Generate and save some cards from the Workspace tab.
      </div>
    );
  }

  return (
    <div className="mx-auto px-6 py-8 flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.size === cards.length && cards.length > 0}
              onChange={toggleSelectAll}
              className="accent-white"
            />
            <span className="text-xs text-gray-400">Select all</span>
          </label>

          <span className="text-sm text-gray-500">
            {cards.length} {cards.length === 1 ? "card" : "cards"}
            {selected.size > 0 && ` \u00b7 ${selected.size} selected`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={cards.length === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportMarkdown}
            disabled={cards.length === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Export Markdown
          </button>
          <button
            onClick={handleDelete}
            disabled={selected.size === 0}
            className="px-3 py-1.5 text-sm font-medium rounded-lg text-red-400 hover:bg-red-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Delete ({selected.size})
          </button>
        </div>
      </div>

      {/* Grouped card list */}
      <div className="flex flex-col gap-6">
        {Array.from(grouped.entries()).map(([topic, topicCards]) => (
          <div key={topic} className="flex flex-col gap-2">
            {/* Topic header */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleTopicCollapsed(topic)}
                className="text-gray-400 hover:text-gray-200 cursor-pointer text-sm"
              >
                {collapsedTopics.has(topic) ? "▸" : "▾"}
              </button>

              {editingTopic === topic ? (
                <input
                  type="text"
                  value={editingTopicValue}
                  onChange={(e) => setEditingTopicValue(e.target.value)}
                  onBlur={finishEditingTopic}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") finishEditingTopic();
                    if (e.key === "Escape") setEditingTopic(null);
                  }}
                  autoFocus
                  className="bg-transparent text-sm font-semibold text-gray-200 border-b border-gray-600 focus:border-gray-400 focus:outline-none px-1 py-0.5"
                />
              ) : (
                <button
                  onClick={() => startEditingTopic(topic)}
                  className="text-sm font-semibold text-gray-200 hover:text-white cursor-pointer"
                  title="Click to rename topic"
                >
                  {topic}
                </button>
              )}

              <span className="text-xs text-gray-600">
                {topicCards.length} {topicCards.length === 1 ? "card" : "cards"}
              </span>
            </div>

            {/* Cards in topic */}
            {!collapsedTopics.has(topic) && (
              <div className="flex flex-col gap-2 ml-5">
                {topicCards.map((card) => (
                  <div
                    key={card.id}
                    className={`rounded-lg border bg-gray-900 shadow-sm flex flex-col ${selected.has(card.id) ? "border-gray-500" : "border-gray-700"}`}
                  >
                    <div className="flex items-start gap-4 px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(card.id)}
                        onChange={() => toggleSelected(card.id)}
                        className="accent-white mt-1 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded ${TYPE_COLORS[card.type]}`}
                          >
                            {card.type}
                          </span>
                          <span className="text-xs text-gray-600">
                            {new Date(card.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5 block">
                            Question
                          </label>
                          <textarea
                            value={card.question}
                            onChange={(e) =>
                              handleFieldChange(card, "question", e.target.value)
                            }
                            rows={1}
                            className="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none border-b border-gray-800 focus:border-gray-600 pb-1"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5 block">
                            Answer
                          </label>
                          <textarea
                            value={card.answer}
                            onChange={(e) =>
                              handleFieldChange(card, "answer", e.target.value)
                            }
                            rows={1}
                            className="w-full bg-transparent text-sm text-gray-200 resize-none focus:outline-none border-b border-gray-800 focus:border-gray-600 pb-1"
                          />
                        </div>

                        <div>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
