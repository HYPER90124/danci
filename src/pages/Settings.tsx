import { useRef, useState } from 'react';
import { BatchSlider } from '../components/BatchSlider';
import { todayStr } from '../lib/date';
import { useStore } from '../lib/store';
import type { ProgressState } from '../types';

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const replaceAll = useStore((s) => s.replaceAll);
  const resetAll = useStore((s) => s.resetAll);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const state = useStore.getState();
    const payload = {
      version: state.version,
      settings: state.settings,
      words: state.words,
      daily: state.daily,
      sessions: state.sessions,
      posStats: state.posStats,
      streak: state.streak,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danci-progress-${todayStr()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('已导出学习记录');
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as ProgressState;
      if (!parsed || parsed.version !== 1 || typeof parsed.words !== 'object') {
        throw new Error('不是有效的学习记录文件');
      }
      replaceAll(parsed);
      setMessage('导入成功，进度已恢复');
    } catch (error) {
      setMessage(`导入失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const reset = () => {
    if (!window.confirm('确定清空所有学习记录？此操作不可撤销。')) return;
    resetAll();
    setMessage('已清空本地记录');
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <h1>设置</h1>
          <p className="muted">所有数据保存在本机浏览器</p>
        </div>
      </header>

      <section className="card stack-sm">
        <BatchSlider value={settings.batchSize} onChange={(value) => updateSettings({ batchSize: value })} />
        <label className="field">
          <span>每日目标</span>
          <input
            type="number"
            min={10}
            max={200}
            step={5}
            value={settings.dailyGoal}
            onChange={(event) => updateSettings({ dailyGoal: Math.max(10, Math.min(200, Number(event.target.value) || 10)) })}
          />
        </label>
        <div className="field">
          <span>主题</span>
          <div className="segmented">
            {(['auto', 'light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={`segment ${settings.theme === theme ? 'is-active' : ''}`}
                onClick={() => updateSettings({ theme })}
              >
                {theme === 'auto' ? '跟随系统' : theme === 'light' ? '浅色' : '深色'}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card stack-sm">
        <h2>备份与迁移</h2>
        <p className="muted small">换手机或清理浏览器前，先导出 JSON；在新设备导入即可恢复。</p>
        <div className="button-row">
          <button type="button" className="secondary" onClick={exportData}>
            导出记录
          </button>
          <button type="button" className="secondary" onClick={() => fileRef.current?.click()}>
            导入记录
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importData(file);
              event.target.value = '';
            }}
          />
        </div>
        <button type="button" className="danger" onClick={reset}>
          清空所有数据
        </button>
        {message ? <p className="muted small">{message}</p> : null}
      </section>

      <section className="card stack-sm">
        <h2>关于</h2>
        <p className="muted small">
          词表来自 CET-4 词汇表，中文释义与词性由 ECDICT 补齐，可在 data/overrides.json 中修正。
        </p>
      </section>
    </div>
  );
}
