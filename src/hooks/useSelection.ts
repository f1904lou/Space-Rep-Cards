import { useState, useEffect, useCallback, type RefObject } from "react";

export function useSelection(editorRef: RefObject<HTMLElement | null>) {
  const [selectedText, setSelectedText] = useState("");
  const [wordCount, setWordCount] = useState(0);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current) {
      setSelectedText("");
      setWordCount(0);
      return;
    }

    // Only count selection if it's within the active content container
    if (!editorRef.current.contains(sel.anchorNode)) {
      setSelectedText("");
      setWordCount(0);
      return;
    }

    const text = sel.toString().trim();
    setSelectedText(text);
    setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  return { selectedText, wordCount };
}
