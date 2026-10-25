import { useState } from 'react';
import type { DataBundle } from '../lib/data';

const GROUP_SIZE = 20;

export function Preview({
  data,
  ids,
  title,
  onStart,
  onExit,
}: {
  data: DataBundle;
  ids: string[];
  title: string;
  onStart: () => void;
  onExit: () => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(ids.length / GROUP_SIZE));
  const group = ids
    .slice(page * GROUP_SIZE, page * GROUP_SIZE + GROUP_SIZE)
    .map((id) => data.byId.get(id))
    .filter((word): word is NonNullable<typeof word> => Boolean(word));
  const isLast = page >= pages - 1;

  return (
    <div className="app">
      <main className="page stack">
        <header className="quiz-head">
          <button type="button" className="ghost" onClick={onExit}>
            退出
          </button>
          <span className="muted">{title} · 预习</span>
          <span className="muted">
            {page + 1} / {pages} 组
          </span>
        </header>

        <p className="muted small center">
          先过一遍这组单词，共 {ids.length} 词，每 {GROUP_SIZE} 词一组
        </p>

        <ul className="preview-list">
          {group.map((word) => (
            <li key={word.id} className="preview-item">
              <div className="preview-word">
                {word.w}
                {word.phon ? <span className="phon">/{word.phon}/</span> : null}
              </div>
              <div className="muted small">
                {word.senses.map((sense) => `${sense.pos} ${sense.cn}`).join('；')}
              </div>
            </li>
          ))}
        </ul>

        <div className="preview-actions">
          {page > 0 ? (
            <button type="button" className="secondary" onClick={() => setPage((n) => n - 1)}>
              上一组
            </button>
          ) : null}
          {isLast ? (
            <button type="button" className="primary" onClick={onStart}>
              开始答题
            </button>
          ) : (
            <button type="button" className="primary" onClick={() => setPage((n) => n + 1)}>
              下一组（{page + 2} / {pages}）
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
