import React, { useState, useEffect } from 'react';
import BubbleNotification from './components/BubbleNotification';

const DEMOS = {
  'task-complete': {
    title: 'Task complete',
    subtitle: <>Refactored <code>auth.ts</code> · 12 files changed</>,
    meta: ['4m 12s', '+184 −96'],
  },
  'waiting-for-input': {
    title: 'Waiting for input',
    subtitle: <>Which branch should I push <code>fix/login</code> to?</>,
    meta: ['idle 38s', 'tap to reply'],
  },
  'permission-needed': {
    title: 'Permission needed',
    subtitle: <>Run <code>rm -rf node_modules</code> in <code>~/app</code>?</>,
    meta: ['claude-code', 'now'],
  },
};

const STATE_MAP = {
  complete: 'task-complete',
  waiting: 'waiting-for-input',
  permission: 'permission-needed',
};

const STATE_BTNS = [
  { key: 'task-complete', label: 'done' },
  { key: 'waiting-for-input', label: 'idle' },
  { key: 'permission-needed', label: 'hold' },
];

export default function App() {
  const [visible, setVisible] = useState(true);
  const [activeState, setActiveState] = useState('task-complete');
  const [theme, setTheme] = useState('light');
  const [notifyOverride, setNotifyOverride] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onNotify) return;
    window.electronAPI.onNotify(({ state, title, message, meta }) => {
      const internalState = STATE_MAP[state];
      if (!internalState) return;
      const normMeta = meta == null
        ? undefined
        : Array.isArray(meta) ? meta : [meta];
      setActiveState(internalState);
      setVisible(true);
      setNotifyOverride({ title, subtitle: message, meta: normMeta });
    });
  }, []);

  const isDark = theme === 'dark';
  const demo = DEMOS[activeState];
  const displayTitle = notifyOverride?.title ?? demo.title;
  const displaySubtitle = notifyOverride?.subtitle ?? demo.subtitle;
  const displayMeta = notifyOverride?.meta ?? demo.meta;

  const handleDismiss = () => setVisible(false);

  const handleShow = (state) => {
    setActiveState(state);
    setVisible(true);
    setNotifyOverride(null);
  };

  return (
    <div className="p-[10px] flex flex-col gap-[10px]">
      {/* Bubble or placeholder */}
      {visible ? (
        <BubbleNotification
          state={activeState}
          title={displayTitle}
          subtitle={displaySubtitle}
          meta={displayMeta}
          theme={theme}
          onClick={() => console.log('focus terminal')}
          onDismiss={handleDismiss}
        />
      ) : (
        <button
          onClick={() => setVisible(true)}
          className={[
            'w-[312px] h-[108px] rounded-[14px] border-2 border-dashed',
            'cursor-pointer transition-colors',
            isDark
              ? 'border-white/20 hover:border-white/30 text-white/40'
              : 'border-black/10 hover:border-black/20 text-black/30',
          ].join(' ')}
          aria-label="Show bubble"
        >
          <span className="text-[11px] font-mono">↑ show bubble</span>
        </button>
      )}

      {/* Demo controls */}
      <div
        className={[
          'w-[312px] rounded-[10px] px-2 py-[7px] flex items-center gap-1',
          isDark
            ? 'bg-[#1c1d22] border border-white/10'
            : 'bg-white/90 border border-black/[0.07] shadow-sm',
        ].join(' ')}
      >
        {STATE_BTNS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleShow(key)}
            className={[
              'flex-1 text-[9.5px] font-mono font-medium py-[5px] rounded-[6px] transition-colors',
              activeState === key
                ? isDark
                  ? 'bg-white/15 text-white'
                  : 'bg-black/[0.08] text-black'
                : isDark
                  ? 'text-white/40 hover:bg-white/10'
                  : 'text-black/[0.35] hover:bg-black/[0.05]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}

        <div className={isDark ? 'w-px h-4 bg-white/10 mx-1' : 'w-px h-4 bg-black/10 mx-1'} />

        <button
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          className={[
            'text-[11px] px-2 py-[5px] rounded-[6px] transition-colors',
            isDark ? 'text-white/40 hover:bg-white/10' : 'text-black/[0.35] hover:bg-black/[0.05]',
          ].join(' ')}
        >
          {isDark ? '◐' : '◑'}
        </button>
      </div>
    </div>
  );
}
