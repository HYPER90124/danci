import type { DataBundle } from '../lib/data';

export function Preview({
  data,
  ids,
  title,
  groupLabel,
  onStart,
  onExit,
}: {
  data: DataBundle;
  ids: string[];
  title: string;
  groupLabel: string;
  onStart: () => void;
  onExit: () => void;
}) {
  const words = ids
    .map((id) => data.byId.get(id))
    .filter((word): word is NonNullable<typeof word> => Boolean(word));

  return (
    <div className="app">
      <main className="page stack">
        <header className="quiz-head">
          <button type="button" className="ghost" onClick={onExit}>
            退出
          </button>
          <span className="muted">{title} · 预习</span>
          <span className="muted">{groupLabel}</span>
        </header>

        <p className="muted small center">本组 {words.length} 词，先过一遍再开始答题</p>

        <ul className="preview-list">
          {words.map((word) => (
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
          <button type="button" className="primary" onClick={onStart}>
            开始答题
          </button>
        </div>
      </main>
    </div>
  );
}
