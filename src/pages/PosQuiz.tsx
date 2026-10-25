import { Fragment, useEffect, useRef, useState } from 'react';
import { OptionButton, type OptionState } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import type { DataBundle } from '../lib/data';
import { formatDuration, todayStr } from '../lib/date';
import { buildPosQuestions, MAX_WRONG, type PosQuestion } from '../lib/quiz';
import { useStore } from '../lib/store';
import type { QuizOption } from '../types';

const POS_REQUEUE_GAP = 3;

const POS_LABEL: Record<string, string> = {
  'n.': '名词',
  'v.': '动词',
  'adj.': '形容词',
  'adv.': '副词',
  'prep.': '介词',
  'conj.': '连词',
  'pron.': '代词',
  'num.': '数词',
  'art.': '冠词',
  'int.': '感叹词',
  'aux.': '助动词',
};

function posName(pos: string): string {
  return POS_LABEL[pos] ? `${POS_LABEL[pos]}（${pos}）` : pos;
}

function Sentence({ text, answer }: { text: string; answer?: string }) {
  const parts = text.split('____');
  return (
    <p className="sentence">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 ? (
            <span className={answer ? 'blank is-filled' : 'blank'}>{answer ?? '\u00a0\u00a0\u00a0\u00a0'}</span>
          ) : null}
        </Fragment>
      ))}
    </p>
  );
}

export function PosStart({ count, onStart }: { count: number; onStart: () => void }) {
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>词性模式</h1>
          <p className="muted">看句子语法，只靠词性就能选出答案</p>
        </div>
      </header>
      <section className="card stack-sm">
        <ul className="bullet-list">
          <li>每题给出一个带空格的英文句子</li>
          <li>选项只显示英文单词，答完后再显示词性、中文释义和整句翻译</li>
          <li>四个选项的词性互不相同，只有一个能填进空里</li>
          <li>例句为真实中英句对，填空词均为四级核心词汇</li>
          <li>一轮 {count} 题，错 3 次才跳过并加入错题本</li>
        </ul>
        <button type="button" className="primary" onClick={onStart}>
          开始练习
        </button>
      </section>
    </div>
  );
}

interface PosItem {
  question: PosQuestion;
  errors: number;
}

interface PosState {
  queue: PosItem[];
  index: number;
  picked: string | null;
  attempts: number;
  correct: number;
}

export function PosQuiz({ data, onExit }: { data: DataBundle; onExit: () => void }) {
  const [state, setState] = useState<PosState>(() => ({
    queue: buildPosQuestions(data, 50).map((question) => ({ question, errors: 0 })),
    index: 0,
    picked: null,
    attempts: 0,
    correct: 0,
  }));
  const sessionStart = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const logged = useRef(false);

  const done = state.index >= state.queue.length;
  const item = done ? null : state.queue[state.index];
  const question = item?.question ?? null;
  const correctOption = question?.options.find((option) => option.correct) ?? null;
  const answered = state.picked !== null;

  useEffect(() => {
    if (!done || !state.queue.length || logged.current) return;
    logged.current = true;
    useStore.getState().logSession({
      date: todayStr(),
      mode: 'pos',
      total: state.attempts,
      correct: state.correct,
      ms: Date.now() - sessionStart.current,
    });
  }, [done, state.queue.length, state.attempts, state.correct]);

  if (!state.queue.length) {
    return (
      <div className="app">
        <main className="page stack">
          <header className="quiz-head">
            <button type="button" className="ghost" onClick={onExit}>
              退出
            </button>
            <span className="muted">词性模式</span>
            <span />
          </header>
          <section className="card center">
            <p>例句库为空，请先运行 npm run data && npm run sentences。</p>
          </section>
        </main>
      </div>
    );
  }

  if (done) {
    const accuracy = state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
    return (
      <div className="app">
        <main className="page stack">
          <header className="page-head">
            <h1>本组完成</h1>
          </header>
          <section className="card center stack-sm">
            <div className="big-number">{accuracy}%</div>
            <p className="muted">词性题正确率</p>
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
                <strong>{state.attempts - state.correct}</strong>
                <span className="muted">错误</span>
              </div>
            </div>
            <p className="muted">用时 {formatDuration(Date.now() - sessionStart.current)}</p>
            <button type="button" className="primary" onClick={onExit}>
              返回
            </button>
          </section>
        </main>
      </div>
    );
  }

  if (!question || !correctOption || !item) return null;

  const choose = (option: QuizOption) => {
    if (answered) return;
    const store = useStore.getState();
    store.answer(question.word.id, correctOption.pos, option.correct, Date.now() - questionStart.current);

    let queue = state.queue;
    if (!option.correct) {
      const errors = item.errors + 1;
      if (errors >= MAX_WRONG) {
        store.addToWrongBook(question.word.id);
        queue = queue.map((entry, i) => (i === state.index ? { ...entry, errors } : entry));
      } else {
        const at = Math.min(state.index + POS_REQUEUE_GAP + 1, queue.length);
        queue = [...queue.slice(0, at), { question, errors }, ...queue.slice(at)];
      }
    }

    setState((prev) => ({
      ...prev,
      queue,
      picked: option.key,
      attempts: prev.attempts + 1,
      correct: prev.correct + (option.correct ? 1 : 0),
    }));
  };

  const next = () => {
    questionStart.current = Date.now();
    setState((prev) => ({ ...prev, index: prev.index + 1, picked: null }));
  };

  const optionState = (option: QuizOption): OptionState => {
    if (!answered) return 'idle';
    if (option.correct) return 'correct';
    if (option.key === state.picked) return 'wrong';
    return 'muted';
  };

  const isCorrect = state.picked === correctOption.key;

  return (
    <div className="app">
      <main className="page stack">
        <header className="quiz-head">
          <button type="button" className="ghost" onClick={onExit}>
            退出
          </button>
          <span className="muted">
            词性模式 · 第 {state.index + 1} / {state.queue.length} 题
          </span>
          <span className="muted">正确 {state.correct}</span>
        </header>
        <ProgressBar value={state.index / state.queue.length} />

        <section className="card sentence-card">
          <Sentence
            text={question.sentence.text}
            answer={answered ? question.sentence.surface ?? question.word.w : undefined}
          />
          {answered && question.sentence.zh ? (
            <p className="translation">译文：{question.sentence.zh}</p>
          ) : null}
        </section>

        <p className="question-hint">选出能填入空格的单词</p>
        <div className="options">
          {question.options.map((option) => (
            <OptionButton
              key={option.key}
              option={option}
              state={optionState(option)}
              disabled={answered}
              onClick={() => choose(option)}
              text={option.word}
              sub={answered ? option.label : undefined}
            />
          ))}
        </div>

        {answered ? (
          <div className={`feedback ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
            <div>
              <strong>{isCorrect ? '回答正确' : '回答错误'}</strong>
              <p className="muted small">
                这个空需要 {posName(correctOption.pos)}，正确答案是 {correctOption.word}（{correctOption.label}）。
              </p>
              {!isCorrect ? (
                <p className="muted small">
                  {item.errors >= MAX_WRONG ? '已加入错题本' : '稍后会再次出现'}
                </p>
              ) : null}
            </div>
            <button type="button" className="secondary" onClick={next}>
              {state.index + 1 >= state.queue.length ? '查看结果' : '下一题'}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
