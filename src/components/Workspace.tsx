import { useState, useRef, useCallback } from "react";
import { useSelection } from "../hooks/useSelection";
import SaveSourceBanner from "./SaveSourceBanner";
import GeneratedCards from "./GeneratedCards";
import { generateCards } from "../lib/llm";
import type { Card } from "../types";

const MAX_SELECTION_LENGTH = 15_000;

export default function Workspace() {
  const editorRef = useRef<HTMLDivElement>(null);
  const { selectedText, wordCount } = useSelection(editorRef);
  const [showSaveBanner, setShowSaveBanner] = useState(false);
  const [pastedContent, setPastedContent] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [sourceTitle, setSourceTitle] = useState<string | undefined>();

  const [generatedCards, setGeneratedCards] = useState<Card[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const [showTruncateWarning, setShowTruncateWarning] = useState(false);
  const [pendingText, setPendingText] = useState("");

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);

      const fullContent = editorRef.current?.innerText ?? "";
      setPastedContent(fullContent);
      setEditorContent(fullContent);
      if (!showSaveBanner) {
        setShowSaveBanner(true);
      }
    },
    [showSaveBanner],
  );

  const handleInput = useCallback(() => {
    setEditorContent(editorRef.current?.innerText ?? "");
  }, []);

  async function doGenerate(text: string) {
    setGenerating(true);
    setError(null);
    setRawResponse(null);
    setShowTruncateWarning(false);

    const result = await generateCards(text, sourceTitle);

    if (result.cards) {
      setGeneratedCards(result.cards);
    } else {
      setError(result.error ?? "Unknown error");
      if (result.rawResponse) {
        setRawResponse(result.rawResponse);
      }
    }

    setGenerating(false);
  }

  function handleGenerate() {
    if (selectedText.length > MAX_SELECTION_LENGTH) {
      setPendingText(selectedText);
      setShowTruncateWarning(true);
      return;
    }
    doGenerate(selectedText);
  }

  function handleTruncateAndGenerate() {
    setShowTruncateWarning(false);
    doGenerate(pendingText.slice(0, MAX_SELECTION_LENGTH));
  }

  function handleUpdateCard(id: string, updates: Partial<Card>) {
    setGeneratedCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }

  function handleUpdateAllCards(updates: Partial<Card>) {
    setGeneratedCards((prev) => prev.map((c) => ({ ...c, ...updates })));
  }

  function handleSourceSaved(title: string) {
    setSourceTitle(title);
    setShowSaveBanner(false);
  }

  return (
    <div className="mx-auto px-6 py-8 flex flex-col gap-6">
      {showSaveBanner && (
        <SaveSourceBanner
          content={pastedContent}
          onDismiss={() => setShowSaveBanner(false)}
          onSaved={handleSourceSaved}
        />
      )}

      {/* Editor */}
      <div>
        <div
          ref={editorRef}
          contentEditable
          onPaste={handlePaste}
          onInput={handleInput}
          data-placeholder="Paste your reading material here..."
          className="min-h-[65vh] w-full rounded-lg border border-gray-700 bg-gray-900 p-5 font-mono text-[15px] leading-relaxed text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-600 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
          spellCheck={false}
        />
      </div>

      {/* Selection indicator */}
      <div className="h-6 flex items-center">
        {wordCount > 0 && (
          <span className="text-sm text-gray-500">
            Selection: {wordCount} {wordCount === 1 ? "word" : "words"}
            {selectedText.length > MAX_SELECTION_LENGTH && (
              <span className="text-amber-400 ml-2">
                ({selectedText.length.toLocaleString()} chars — exceeds{" "}
                {MAX_SELECTION_LENGTH.toLocaleString()} limit)
              </span>
            )}
          </span>
        )}
      </div>

      {/* Truncate warning */}
      {showTruncateWarning && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-950 border border-amber-800 px-4 py-3 text-sm">
          <span className="text-amber-300">
            Selection too long ({pendingText.length.toLocaleString()} chars).
            Max is {MAX_SELECTION_LENGTH.toLocaleString()}.
          </span>
          <button
            onClick={handleTruncateAndGenerate}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-700 text-white hover:bg-amber-600 transition-colors cursor-pointer"
          >
            Truncate & Generate
          </button>
          <button
            onClick={() => setShowTruncateWarning(false)}
            className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-400 hover:text-gray-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-end">
        <button
          disabled={!selectedText || generating}
          onClick={handleGenerate}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {generating ? "Generating..." : "Generate Cards"}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300">
          <p>{error}</p>
          {rawResponse && (
            <div className="mt-3">
              <pre className="mt-1 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                {rawResponse}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(rawResponse)}
                className="mt-2 px-3 py-1 text-xs font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
              >
                Copy raw response
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generated cards */}
      {generatedCards.length > 0 && (
        <GeneratedCards
          cards={generatedCards}
          onUpdateCard={handleUpdateCard}
          onUpdateAllCards={handleUpdateAllCards}
          onClear={() => {
            setGeneratedCards([]);
            setError(null);
            setRawResponse(null);
          }}
          onRegenerate={handleGenerate}
        />
      )}
    </div>
  );
}
