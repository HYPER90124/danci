import { useEffect, useState } from 'react';
import { TabBar, type TabKey } from './components/TabBar';
import { loadData, type DataBundle } from './lib/data';
import { useStore } from './lib/store';
import { Basic } from './pages/Basic';
import { Home } from './pages/Home';
import { PosQuiz, PosStart } from './pages/PosQuiz';
import { SettingsPage } from './pages/Settings';
import { Stats } from './pages/Stats';
import { WrongBook } from './pages/WrongBook';

type Screen =
  | { type: 'tabs' }
  | { type: 'basic'; ids: string[]; title: string; mode: 'basic' | 'wrong' }
  | { type: 'pos' };

export default function App() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('home');
  const [screen, setScreen] = useState<Screen>({ type: 'tabs' });
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, tab]);

  if (error) {
    return (
      <div className="splash">
        <p>加载失败：{error}</p>
        <button type="button" className="primary" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="splash">
        <p>正在加载词库…</p>
      </div>
    );
  }

  if (screen.type === 'basic') {
    return (
      <Basic
        data={data}
        ids={screen.ids}
        title={screen.title}
        mode={screen.mode}
        onExit={() => setScreen({ type: 'tabs' })}
      />
    );
  }

  if (screen.type === 'pos') {
    return <PosQuiz data={data} onExit={() => setScreen({ type: 'tabs' })} />;
  }

  return (
    <div className="app">
      <main className="page">
        {tab === 'home' ? (
          <Home
            data={data}
            onStart={(ids, title, mode) => setScreen({ type: 'basic', ids, title, mode })}
            onGo={setTab}
          />
        ) : null}
        {tab === 'pos' ? <PosStart count={10} onStart={() => setScreen({ type: 'pos' })} /> : null}
        {tab === 'wrong' ? (
          <WrongBook
            data={data}
            onStart={(ids) => setScreen({ type: 'basic', ids, title: '错题复习', mode: 'wrong' })}
          />
        ) : null}
        {tab === 'stats' ? <Stats data={data} /> : null}
        {tab === 'settings' ? <SettingsPage /> : null}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
