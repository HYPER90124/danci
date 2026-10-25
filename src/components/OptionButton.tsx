import type { QuizOption } from '../types';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'muted';

export function OptionButton({
  option,
  state,
  disabled,
  onClick,
}: {
  option: QuizOption;
  state: OptionState;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`option is-${state}`}
      disabled={disabled}
      onClick={onClick}
    >
      {option.label}
    </button>
  );
}
