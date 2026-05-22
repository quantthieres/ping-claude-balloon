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

  const demo = DEMOS[activeState];
  const displayTitle = notifyOverride?.title ?? demo.title;
  const displaySubtitle = notifyOverride?.subtitle ?? demo.subtitle;
  const displayMeta = notifyOverride?.meta ?? demo.meta;

  const handleDismiss = () => {
    setVisible(false);
    window.electronAPI?.hideBubble();
  };

  const handleFocusTerminal = async () => {
    if (!window.electronAPI?.focusTerminal) {
      console.log('[agent-ping] focus terminal (no IPC bridge)');
      return;
    }
    const result = await window.electronAPI.focusTerminal();
    if (result?.ok) {
      console.log(`[agent-ping] focused ${result.app}`);
    } else {
      console.warn('[agent-ping] terminal focus failed:', result?.error);
    }
  };

  return (
    <div className="p-[10px]">
      {visible && (
        <BubbleNotification
          state={activeState}
          title={displayTitle}
          subtitle={displaySubtitle}
          meta={displayMeta}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          onClick={handleFocusTerminal}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
