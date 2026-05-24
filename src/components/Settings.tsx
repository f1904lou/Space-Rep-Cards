import { useEffect, useState } from "react";
import { testConnection as testMochiConnection } from "../lib/mochi";
import { apiFetch, readApiError } from "../lib/api";

const LS_KEY = "promptforge_settings";

interface SavedSettings {
  provider: "openai";
  model: string;
}

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedSettings>;
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

function persistSettings(s: SavedSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export default function Settings() {
  const [model, setModel] = useState("gpt-4o");
  const [saved, setSaved] = useState(false);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [testingMochi, setTestingMochi] = useState(false);
  const [mochiTestResult, setMochiTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setModel(s.model);
    persistSettings(s);
  }, []);

  function handleSave() {
    persistSettings({ provider: "openai", model });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await apiFetch("/api/openai/models");
      setTestResult({
        ok: res.ok,
        message: res.ok ? "Connection successful" : await readApiError(res),
      });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleTestMochi() {
    setTestingMochi(true);
    setMochiTestResult(null);
    const result = await testMochiConnection();
    setMochiTestResult(result);
    setTestingMochi(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.reload();
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 flex flex-col gap-6">
      <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
        <p className="text-sm text-gray-300">
          Provider keys are configured on the server through Vercel environment
          variables. This browser stores only non-secret preferences.
        </p>
      </div>

      {/* Model */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
        <p className="text-xs text-gray-500">
          Leave as gpt-4o unless you set a different OpenAI model in Vercel.
        </p>
      </div>

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
          {testing ? "Testing..." : "Test OpenAI"}
        </button>
      </div>

      {testResult && (
        <div
          className={`flex items-center gap-2 text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}
        >
          <span>{testResult.ok ? "\u2713" : "\u2717"}</span>
          <span>{testResult.message}</span>
        </div>
      )}

      <hr className="border-gray-700" />

      <h3 className="text-sm font-semibold text-gray-200 tracking-wide">
        Mochi Integration
      </h3>

      <p className="text-xs text-gray-500">
        Mochi pushes use the server-side MOCHI_API_KEY configured in Vercel.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={handleTestMochi}
          disabled={testingMochi}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {testingMochi ? "Testing..." : "Test Mochi"}
        </button>
      </div>

      {mochiTestResult && (
        <div
          className={`flex items-center gap-2 text-sm ${mochiTestResult.ok ? "text-green-400" : "text-red-400"}`}
        >
          <span>{mochiTestResult.ok ? "\u2713" : "\u2717"}</span>
          <span>{mochiTestResult.message}</span>
        </div>
      )}

      <hr className="border-gray-700" />

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="self-start px-4 py-2 text-sm font-medium rounded-lg text-red-400 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {loggingOut ? "Logging out..." : "Log out"}
      </button>
    </div>
  );
}
