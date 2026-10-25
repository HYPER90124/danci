import type { QuizOption } from '../types';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'muted';

export function OptionButton({
  option,
  state,
  disabled,
  onClick,
  text,
  sub,
}: {
  option: QuizOption;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
  text?: string;
  sub?: string;
}) {
  return (
    <button type="button" className={`option is-${state}`} disabled={disabled} onClick={onClick}>
      <span className="option-main">{text ?? option.label}</span>
      {sub ? <span className="option-sub">{sub}</span> : null}
    </button>
  );
}
