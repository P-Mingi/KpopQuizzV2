'use client';

interface TabBarProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps): React.ReactElement {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 rounded-full text-sm border whitespace-nowrap cursor-pointer transition-colors ${
            activeTab === tab
              ? 'border-txt-primary bg-txt-primary text-white font-medium'
              : 'border-default text-secondary bg-transparent hover:border-default'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
