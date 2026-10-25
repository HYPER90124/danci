import { useMemo } from 'react';
import { Chart, type ChartPoint } from '../components/Chart';
import { Ring } from '../components/Ring';
import { StatCard } from '../components/StatCard';
import type { DataBundle } from '../lib/data';
import { lastNDays, shortLabel, todayStr } from '../lib/date';
import { computeTotals } from '../lib/stats';
import { useStore } from '../lib/store';

export function Stats({ data }: { data: DataBundle }) {
  const words = useStore((s) => s.words);
  const daily = useStore((s) => s.daily);
  const posStats = useStore((s) => s.posStats);
  const streak = useStore((s) => s.streak);

  const totals = useMemo(() => computeTotals(words, data.words.length), [words, data.words.length]);
  const today = daily[todayStr()];
  const points: ChartPoint[] = useMemo(
    () =>
      lastNDays(14).map((day) => {
        const stat = daily[day];
        return {
          label: shortLabel(day),
          total: stat?.total ?? 0,
          accuracy: stat && stat.total ? Math.round((stat.correct / stat.total) * 100) : null,
        };
      }),
    [daily],
  );

  const mastery = totals.total ? totals.mastered / totals.total : 0;
  const posRows = useMemo(
    () =>
      Object.entries(posStats)
        .filter(([, value]) => value.total > 0)
        .sort((a, b) => b[1].total - a[1].total),
    [posStats],
  );

  const topWrong = useMemo(
    () =>
      data.words
        .filter((word) => words[word.id]?.inWrongBook)
        .sort((a, b) => (words[b.id]?.wrong ?? 0) - (words[a.id]?.wrong ?? 0))
        .slice(0, 10),
    [data.words, words],
  );

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>统计面板</h1>
          <p className="muted">连续 {streak.current} 天 · 最长 {streak.best} 天</p>
        </div>
      </header>

      <section className="card hero">
        <Ring percent={mastery}>
          <strong>{totals.mastered}</strong>
          <span className="muted">已掌握</span>
        </Ring>
        <div className="hero-side">
          <div className="hero-line">
            <span>已学</span>
            <strong>
              {totals.learned} / {totals.total}
            </strong>
          </div>
          <div className="hero-line">
            <span>总正确率</span>
            <strong>{totals.accuracy}%</strong>
          </div>
          <div className="hero-line">
            <span>今日作答</span>
            <strong>{today?.total ?? 0}</strong>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <StatCard label="今日新词" value={today?.newWords ?? 0} />
        <StatCard label="今日复习" value={today?.review ?? 0} hint={`正确率 ${today && today.total ? Math.round((today.correct / today.total) * 100) : 0}%`} />
        <StatCard label="到期复习" value={totals.dueToday} />
        <StatCard label="错题本" value={totals.wrongBook} />
      </div>

      <section className="card">
        <div className="section-head">
          <h2>近 14 天</h2>
          <span className="muted small">柱：作答量 · 线：正确率</span>
        </div>
        <Chart points={points} />
      </section>

      <section className="card">
        <div className="section-head">
          <h2>词性正确率</h2>
        </div>
        {posRows.length === 0 ? (
          <p className="muted">还没有作答记录。</p>
        ) : (
          <ul className="bars">
            {posRows.map(([pos, value]) => {
              const percent = value.total ? Math.round((value.correct / value.total) * 100) : 0;
              return (
                <li key={pos}>
                  <div className="bar-head">
                    <span>{pos}</span>
                    <span className="muted">
                      {value.correct}/{value.total} · {percent}%
                    </span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>错题 Top 10</h2>
        </div>
        {topWrong.length === 0 ? (
          <p className="muted">暂无错题。</p>
        ) : (
          <ul className="plain-list">
            {topWrong.map((word) => (
              <li key={word.id}>
                <span>{word.w}</span>
                <span className="muted">错 {words[word.id]?.wrong ?? 0} 次</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
