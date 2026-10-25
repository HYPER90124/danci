export function BatchSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-block">
      <div className="slider-head">
        <span>本次学习</span>
        <strong>{value} 词</strong>
      </div>
      <input
        className="slider"
        type="range"
        min={10}
        max={80}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="本次学习单词数量"
      />
      <div className="slider-scale">
        <span>10</span>
        <span>45</span>
        <span>80</span>
      </div>
    </div>
  );
}
