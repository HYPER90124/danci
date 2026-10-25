import { useEffect, useState } from 'react';
import { TabBar, type TabKey } from './components/TabBar';
import { loadData, type DataBundle } from './lib/data';
import { planSession } from './lib/session';
import { useStore } from './lib/store';
import type { ProgressState } from './types';
import { Basic } from './pages/Basic';
import { Home } from './pages/Home';
import { PosQuiz, PosStart } from './pages/PosQuiz';
import { Preview } from './pages/Preview';
import { SettingsPage } from './pages/Settings';
import { Stats } from './pages/Stats';
import { WrongBook } from './pages/WrongBook';

const GROUP_SIZE = 20;

interface Flow {
  ids: string[];
  title: string;
  mode: 'basic' | 'wrong';
  offset: number;
  round: number;
  fixed: boolean;
}

type Screen =
  | { type: 'tabs' }
  | { type: 'preview'; flow: Flow }
  | { type: 'basic'; flow: Flow }
  | { type: 'pos' };

function chunkOf(flow: Flow): string[] {
  return flow.ids.slice(flow.offset, flow.offset + GROUP_SIZE);
}

function groupLabelOf(flow: Flow): string {
  if (flow.fixed) {
    const current = Math.floor(flow.offset / GROUP_SIZE) + 1;
    const total = Math.max(1, Math.ceil(flow.ids.length / GROUP_SIZE));
    return `第 ${current} / ${total} 组`;
  }
  return `第 ${flow.round} 组`;
}

function nextFlow(flow: Flow, data: DataBundle, progress: ProgressState['words']): Flow | null {
  if (flow.fixed) {
    const offset = flow.offset + GROUP_SIZE;
    if (offset >= flow.ids.length) return null;
    return { ...flow, offset };
  }
  const plan = planSession(GROUP_SIZE, data, progress);
  if (!plan.ids.length) return null;
  return { ...flow, ids: plan.ids, offset: 0, round: flow.round + 1 };
}

export default function App() {
  const [data, setData] = useState<DataBundle | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('home');
  const [screen, setScreen] = useState<Screen>({ type: 'tabs' });
  const theme = useStore((s) => s.settings.theme);
  const progressWords = useStore((s) => s.words);

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

  if (screen.type === 'preview') {
    const flow = screen.flow;
    return (
      <Preview
        data={data}
        ids={chunkOf(flow)}
        title={flow.title}
        groupLabel={groupLabelOf(flow)}
        onStart={() => setScreen({ type: 'basic', flow })}
        onExit={() => setScreen({ type: 'tabs' })}
      />
    );
  }

  if (screen.type === 'basic') {
    const flow = screen.flow;
    const next = nextFlow(flow, data, progressWords);
    return (
      <Basic
        data={data}
        ids={chunkOf(flow)}
        title={flow.title}
        groupLabel={groupLabelOf(flow)}
        mode={flow.mode}
        hasNext={next !== null}
        onNext={() => {
          if (next) setScreen({ type: 'preview', flow: next });
        }}
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
            onStart={(ids, title, mode) =>
              setScreen({
                type: 'preview',
                flow: { ids, title, mode, offset: 0, round: 1, fixed: false },
              })
            }
            onGo={setTab}
          />
        ) : null}
        {tab === 'pos' ? <PosStart count={10} onStart={() => setScreen({ type: 'pos' })} /> : null}
        {tab === 'wrong' ? (
          <WrongBook
            data={data}
            onStart={(ids) =>
              setScreen({
                type: 'preview',
                flow: { ids, title: '错题复习', mode: 'wrong', offset: 0, round: 1, fixed: true },
              })
            }
          />
        ) : null}
        {tab === 'stats' ? <Stats data={data} /> : null}
        {tab === 'settings' ? <SettingsPage /> : null}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
