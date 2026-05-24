import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiFetch, readApiError } from "../lib/api";

interface AuthGateProps {
  children: ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await apiFetch("/api/auth/session");
        const data = (await res.json().catch(() => null)) as {
          authenticated?: boolean;
        } | null;
        setAuthenticated(Boolean(data?.authenticated));
      } catch {
        setAuthenticated(false);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      setAuthenticated(true);
      setPasscode("");
    } catch {
      setError("Unable to reach the auth endpoint.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-500 flex items-center justify-center text-sm">
        Checking session...
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-gray-800 bg-gray-900 p-6 flex flex-col gap-4"
      >
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            Spaced Repetition Cards
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter your app passcode to unlock this personal workspace.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-300">Passcode</span>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            className="px-3 py-2 rounded-lg border border-gray-700 bg-gray-950 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-600"
          />
        </label>

        <button
          type="submit"
          disabled={!passcode || submitting}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {submitting ? "Unlocking..." : "Unlock"}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
