import { useEffect, useRef, useState } from 'react';
import { OptionButton, type OptionState } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import type { DataBundle } from '../lib/data';
import { formatDuration, todayStr } from '../lib/date';
import { makeBasicOptions, shuffle } from '../lib/quiz';
import { useStore } from '../lib/store';
import type { QuizOption } from '../types';

const REQUEUE_GAP = 10;

interface Item {
  id: string;
  errors: number;
}

interface SessionState {
  queue: Item[];
  index: number;
  options: QuizOption[];
  picked: string | null;
  feedback: 'correct' | 'wrong' | null;
  attempts: number;
  correct: number;
}

function buildInitial(ids: string[], data: DataBundle): SessionState {
  const queue = shuffle(ids).map((id) => ({ id, errors: 0 }));
  return {
    queue,
    index: 0,
    options: makeBasicOptions(data.byId.get(queue[0].id)!, data),
    picked: null,
    feedback: null,
    attempts: 0,
    correct: 0,
  };
}

export function Basic({
  data,
  ids,
  title,
  mode,
  onExit,
}: {
  data: DataBundle;
  ids: string[];
  title: string;
  mode: 'basic' | 'wrong';
  onExit: () => void;
}) {
  const [state, setState] = useState<SessionState>(() => buildInitial(ids, data));
  const sessionStart = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const logged = useRef(false);

  const done = state.index >= state.queue.length;
  const total = state.queue.length;
  const current = done ? null : state.queue[state.index];
  const word = current ? data.byId.get(current.id) : undefined;

  const advance = () => {
    questionStart.current = Date.now();
    setState((prev) => {
      const next = prev.index + 1;
      if (next >= prev.queue.length) {
        return { ...prev, index: next, picked: null, feedback: null };
      }
      return {
        ...prev,
        index: next,
        picked: null,
        feedback: null,
        options: makeBasicOptions(data.byId.get(prev.queue[next].id)!, data),
      };
    });
  };

  useEffect(() => {
    if (state.feedback !== 'correct') return;
    const timer = setTimeout(advance, 550);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feedback]);

  useEffect(() => {
    if (!done || logged.current) return;
    logged.current = true;
    useStore.getState().logSession({
      date: todayStr(),
      mode,
      total: state.attempts,
      correct: state.correct,
      ms: Date.now() - sessionStart.current,
    });
  }, [done, mode, state.attempts, state.correct]);

  const choose = (option: QuizOption) => {
    if (state.picked || !current) return;
    const store = useStore.getState();
    const correctOption = state.options.find((o) => o.correct)!;
    store.answer(current.id, correctOption.pos, option.correct, Date.now() - questionStart.current);

    let queue = state.queue;
    let errors = current.errors;
    if (!option.correct) {
      errors += 1;
      if (errors >= 2) {
        store.addToWrongBook(current.id);
        queue = queue.map((item, i) => (i === state.index ? { ...item, errors } : item));
      } else {
        const at = Math.min(state.index + REQUEUE_GAP + 1, queue.length);
        queue = [...queue.slice(0, at), { id: current.id, errors }, ...queue.slice(at)];
      }
    }

    setState((prev) => ({
      ...prev,
      queue,
      picked: option.key,
      feedback: option.correct ? 'correct' : 'wrong',
      attempts: prev.attempts + 1,
      correct: prev.correct + (option.correct ? 1 : 0),
    }));
  };

  const optionState = (option: QuizOption): OptionState => {
    if (!state.picked) return 'idle';
    if (option.correct) return 'correct';
    if (option.key === state.picked) return 'wrong';
    return 'muted';
  };

  if (done) {
    const accuracy = state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
    const elapsed = Date.now() - sessionStart.current;
    return (
      <div className="app">
        <main className="page stack">
          <header className="page-head">
            <h1>本次完成</h1>
          </header>
          <section className="card center stack-sm">
            <div className="big-number">{accuracy}%</div>
            <p className="muted">正确率</p>
            <div className="result-grid">
              <div>
                <strong>{state.attempts}</strong>
                <span className="muted">作答</span>
              </div>
              <div>
                <strong>{state.correct}</strong>
                <span className="muted">正确</span>
              </div>
              <div>
                <strong>{total}</strong>
                <span className="muted">词数</span>
              </div>
            </div>
            <p className="muted">用时 {formatDuration(elapsed)}</p>
            <button type="button" className="primary" onClick={onExit}>
              返回
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (!word || !current) return null;
  const remaining = total - state.index;
  const wrongMessage =
    state.feedback === 'wrong'
      ? current.errors >= 2
        ? '已加入错题本'
        : '稍后会再次出现'
      : '';

  return (
    <div className="app">
      <main className="page stack">
        <header className="quiz-head">
          <button type="button" className="ghost" onClick={onExit}>
            退出
          </button>
          <span className="muted">{title}</span>
          <span className="muted">剩余 {remaining}</span>
        </header>
        <ProgressBar value={state.index / total} />

        <section className="card word-card">
          <div className="word">{word.w}</div>
          {word.phon ? <div className="phon">/{word.phon}/</div> : null}
        </section>

        <p className="question-hint">选择正确的中文释义</p>
        <div className="options">
          {state.options.map((option) => (
            <OptionButton
              key={option.key}
              option={option}
              state={optionState(option)}
              disabled={state.picked !== null}
              onClick={() => choose(option)}
            />
          ))}
        </div>

        {state.feedback === 'wrong' ? (
          <div className="feedback is-wrong">
            <span>{wrongMessage}</span>
            <button type="button" className="secondary" onClick={advance}>
              继续
            </button>
          </div>
        ) : null}
        {state.feedback === 'correct' ? <div className="feedback is-correct">回答正确</div> : null}
        {state.feedback ? (
          <p className="muted small center">
            {word.senses.map((sense) => `${sense.pos} ${sense.cn}`).join('；')}
          </p>
        ) : null}
      </main>
    </div>
  );
}
