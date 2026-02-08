type Tab = "workspace" | "saved" | "settings";

interface TabNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string }[] = [
  { id: "workspace", label: "Workspace" },
  { id: "saved", label: "Saved Cards" },
  { id: "settings", label: "Settings" },
];

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="flex items-center gap-1 border-b border-gray-800 px-6 pt-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors cursor-pointer
            ${
              active === tab.id
                ? "bg-gray-950 text-gray-100 border border-b-gray-950 border-gray-800 -mb-px"
                : "text-gray-500 hover:text-gray-300 border border-transparent"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
