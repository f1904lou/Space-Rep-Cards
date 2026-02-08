import { useState } from "react";
import { saveSource } from "../lib/db";
import type { Source } from "../types";

interface SaveSourceBannerProps {
  onDismiss: () => void;
  onSaved?: (title: string) => void;
  content: string;
}

export default function SaveSourceBanner({
  onDismiss,
  onSaved,
  content,
}: SaveSourceBannerProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const source: Source = {
      id: crypto.randomUUID(),
      title: title.trim(),
      content,
      created_at: Date.now(),
    };
    await saveSource(source);
    setSaving(false);
    onSaved ? onSaved(title.trim()) : onDismiss();
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-blue-950 border border-blue-800 px-4 py-3 text-sm">
      <span className="text-blue-300 font-medium whitespace-nowrap">
        Save this source?
      </span>
      <input
        type="text"
        placeholder="Title (required)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        className="flex-1 min-w-0 px-3 py-1.5 rounded-md border border-blue-800 bg-gray-900 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={!title.trim() || saving}
        className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        Save
      </button>
      <button
        onClick={onDismiss}
        className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  );
}
