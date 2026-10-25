import { useMemo } from 'react';
import { BatchSlider } from '../components/BatchSlider';
import { Ring } from '../components/Ring';
import type { DataBundle } from '../lib/data';
import { todayStr } from '../lib/date';
import { planSession } from '../lib/session';
import { computeTotals } from '../lib/stats';
import { useStore } from '../lib/store';
import type { TabKey } from '../components/TabBar';

export function Home({
  data,
  onStart,
  onGo,
}: {
  data: DataBundle;
  onStart: (ids: string[], title: string, mode: 'basic' | 'wrong') => void;
  onGo: (tab: TabKey) => void;
}) {
  const settings = useStore((s) => s.settings);
  const progress = useStore((s) => s.words);
  const daily = useStore((s) => s.daily);
  const streak = useStore((s) => s.streak);
  const updateSettings = useStore((s) => s.updateSettings);

  const totals = useMemo(() => computeTotals(progress, data.words.length), [progress, data.words.length]);
  const plan = useMemo(() => planSession(settings.batchSize, data, progress), [settings.batchSize, data, progress]);
  const today = daily[todayStr()];
  const doneToday = today?.total ?? 0;
  const goal = Math.max(1, settings.dailyGoal);
  const percent = Math.min(1, doneToday / goal);

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>四级词汇</h1>
          <p className="muted">
            共 {data.words.length} 词 · 已学 {totals.learned}
          </p>
        </div>
        <div className="streak-pill">连续 {streak.current} 天</div>
      </header>

      <section className="card hero">
        <Ring percent={percent}>
          <strong>{doneToday}</strong>
          <span className="muted">/ {goal} 今日</span>
        </Ring>
        <div className="hero-side">
          <div className="hero-line">
            <span>今日正确率</span>
            <strong>{today && today.total ? Math.round((today.correct / today.total) * 100) : 0}%</strong>
          </div>
          <div className="hero-line">
            <span>到期复习</span>
            <strong>{totals.dueToday}</strong>
          </div>
          <div className="hero-line">
            <span>错题本</span>
            <strong>{totals.wrongBook}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <BatchSlider value={settings.batchSize} onChange={(value) => updateSettings({ batchSize: value })} />
        <div className="plan-row">
          <span className="chip">复习 {plan.review}</span>
          <span className="chip">新词 {plan.fresh}</span>
          <span className="chip muted">合计 {plan.ids.length}</span>
        </div>
        <button
          type="button"
          className="primary"
          disabled={plan.ids.length === 0}
          onClick={() => onStart(plan.ids, '基础模式', 'basic')}
        >
          开始学习
        </button>
        {plan.ids.length === 0 ? <p className="muted center">没有待学单词了，明天再来或去词性模式巩固。</p> : null}
      </section>

      <div className="grid-2">
        <button type="button" className="card mini" onClick={() => onGo('wrong')}>
          <span className="muted">错题本</span>
          <strong>{totals.wrongBook}</strong>
        </button>
        <button type="button" className="card mini" onClick={() => onGo('stats')}>
          <span className="muted">掌握</span>
          <strong>{totals.mastered}</strong>
        </button>
      </div>
    </div>
  );
}
