import { Fragment, useEffect, useRef, useState } from 'react';
import { OptionButton, type OptionState } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import type { DataBundle } from '../lib/data';
import { formatDuration, todayStr } from '../lib/date';
import { buildPosQuestions, type PosQuestion } from '../lib/quiz';
import { useStore } from '../lib/store';

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
          <li>四个选项的词性互不相同，只有一个能填进空里</li>
          <li>一轮 {count} 题，答完给出词性正确率</li>
        </ul>
        <button type="button" className="primary" onClick={onStart}>
          开始练习
        </button>
      </section>
    </div>
  );
}

export function PosQuiz({ data, onExit }: { data: DataBundle; onExit: () => void }) {
  const [questions] = useState<PosQuestion[]>(() => buildPosQuestions(data, 10));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const sessionStart = useRef(Date.now());
  const questionStart = useRef(Date.now());
  const logged = useRef(false);

  useEffect(() => {
    if (!done || logged.current) return;
    logged.current = true;
    useStore.getState().logSession({
      date: todayStr(),
      mode: 'pos',
      total: attempts,
      correct: correctCount,
      ms: Date.now() - sessionStart.current,
    });
  }, [done, attempts, correctCount]);

  if (!questions.length) {
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

  const question = questions[Math.min(index, questions.length - 1)];
  const correctOption = question.options.find((o) => o.correct)!;
  const answered = picked !== null;

  const choose = (option: QuizOptionLike) => {
    if (answered) return;
    useStore.getState().answer(question.word.id, correctOption.pos, option.correct, Date.now() - questionStart.current);
    setPicked(option.key);
    setAttempts((n) => n + 1);
    if (option.correct) setCorrectCount((n) => n + 1);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
    questionStart.current = Date.now();
  };

  const optionState = (option: QuizOptionLike): OptionState => {
    if (!answered) return 'idle';
    if (option.correct) return 'correct';
    if (option.key === picked) return 'wrong';
    return 'muted';
  };

  if (done) {
    const accuracy = attempts ? Math.round((correctCount / attempts) * 100) : 0;
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
                <strong>{attempts}</strong>
                <span className="muted">题数</span>
              </div>
              <div>
                <strong>{correctCount}</strong>
                <span className="muted">正确</span>
              </div>
              <div>
                <strong>{attempts - correctCount}</strong>
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

  return (
    <div className="app">
      <main className="page stack">
        <header className="quiz-head">
          <button type="button" className="ghost" onClick={onExit}>
            退出
          </button>
          <span className="muted">
            第 {index + 1} / {questions.length} 题
          </span>
          <span className="muted">正确 {correctCount}</span>
        </header>
        <ProgressBar value={index / questions.length} />

        <section className="card sentence-card">
          <Sentence text={question.sentence.text} answer={answered ? question.word.w : undefined} />
          {question.sentence.zh ? <p className="muted small">{question.sentence.zh}</p> : null}
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
            />
          ))}
        </div>

        {answered ? (
          <div className={`feedback ${picked === correctOption.key ? 'is-correct' : 'is-wrong'}`}>
            <div>
              <strong>{picked === correctOption.key ? '回答正确' : '回答错误'}</strong>
              <p className="muted small">
                这个空需要 {posName(correctOption.pos)}，正确答案是 {question.word.w}。
              </p>
            </div>
            <button type="button" className="secondary" onClick={next}>
              {index + 1 >= questions.length ? '查看结果' : '下一题'}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

type QuizOptionLike = PosQuestion['options'][number];
