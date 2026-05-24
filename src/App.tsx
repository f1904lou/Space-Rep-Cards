import { useState } from "react";
import TabNav from "./components/TabNav";
import Workspace from "./components/Workspace";
import SavedCards from "./components/SavedCards";
import Settings from "./components/Settings";
import AuthGate from "./components/AuthGate";

type Tab = "workspace" | "saved" | "settings";

export default function App() {
  const [tab, setTab] = useState<Tab>("workspace");

  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-6 pt-5 pb-0">
            <div className="flex items-center gap-4">
              <div
                className="flex w-16 flex-col gap-2"
                aria-hidden="true"
              >
                <span className="h-2 w-10 rounded-sm bg-emerald-500" />
                <span className="h-2 w-16 rounded-sm bg-red-500" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight">
                Spaced Repetition Cards
              </h1>
            </div>
          </div>
          <div className="max-w-5xl mx-auto">
            <TabNav active={tab} onChange={setTab} />
          </div>
        </header>

        {/* Content */}
        <main>
          {tab === "workspace" && <Workspace />}
          {tab === "saved" && <SavedCards />}
          {tab === "settings" && <Settings />}
        </main>
      </div>
    </AuthGate>
  );
}
