export type TabKey = 'home' | 'pos' | 'wrong' | 'stats' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: '学习' },
  { key: 'pos', label: '词性' },
  { key: 'wrong', label: '错题' },
  { key: 'stats', label: '统计' },
  { key: 'settings', label: '设置' },
];

export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`tab ${tab === item.key ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
