import { useMemo } from 'react';
import type { DataBundle } from '../lib/data';
import { useStore } from '../lib/store';

export function WrongBook({ data, onStart }: { data: DataBundle; onStart: (ids: string[]) => void }) {
  const words = useStore((s) => s.words);
  const remove = useStore((s) => s.removeFromWrongBook);

  const items = useMemo(
    () =>
      data.words
        .filter((word) => words[word.id]?.inWrongBook)
        .sort((a, b) => (words[b.id]?.wrong ?? 0) - (words[a.id]?.wrong ?? 0)),
    [data.words, words],
  );

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>错题本</h1>
          <p className="muted">一组练习中同一道题错三次会自动加入</p>
        </div>
        <span className="streak-pill">{items.length} 词</span>
      </header>

      <button
        type="button"
        className="primary"
        disabled={items.length === 0}
        onClick={() => onStart(items.map((word) => word.id))}
      >
        复习全部错题
      </button>

      {items.length === 0 ? (
        <section className="card center">
          <p className="muted">还没有错题。先去基础模式练一组吧。</p>
        </section>
      ) : (
        <ul className="list">
          {items.map((word) => {
            const record = words[word.id];
            return (
              <li key={word.id} className="list-item">
                <div className="list-main">
                  <div className="list-title">
                    {word.w}
                    {word.phon ? <span className="phon small">/{word.phon}/</span> : null}
                  </div>
                  <div className="muted small">
                    {word.senses.map((s) => `${s.pos} ${s.cn}`).join('；')}
                  </div>
                  <div className="muted small">
                    错 {record?.wrong ?? 0} 次 · 阶段 {record?.stage ?? 0}
                  </div>
                </div>
                <button type="button" className="ghost small" onClick={() => remove(word.id)}>
                  移出
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
