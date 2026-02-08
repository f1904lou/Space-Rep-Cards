import { useState, useEffect } from "react";

const LS_KEY = "promptforge_settings";

interface SavedSettings {
  provider: "openai";
  model: string;
  apiKey: string;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: "openai", model: "gpt-4o", apiKey: "" };
}

function persistSettings(s: SavedSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export default function Settings() {
  const [model, setModel] = useState("gpt-4o");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setModel(s.model);
    setApiKey(s.apiKey);
  }, []);

  function handleSave() {
    persistSettings({ provider: "openai", model, apiKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, message: "Enter an API key first." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        setTestResult({ ok: true, message: "Connection successful" });
      } else {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error?.message ?? `Error ${res.status}: ${res.statusText}`;
        setTestResult({ ok: false, message: msg });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 flex flex-col gap-6">
      {/* Model */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
      </div>

      {/* API Key */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">
          OpenAI API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 pr-16 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600"
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
          >
            {showKey ? "Hide" : "Show"}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Your API key is stored locally in your browser and never sent anywhere
          except OpenAI's API.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}
        >
          <span>{testResult.ok ? "\u2713" : "\u2717"}</span>
          <span>{testResult.message}</span>
        </div>
      )}
    </div>
  );
}
