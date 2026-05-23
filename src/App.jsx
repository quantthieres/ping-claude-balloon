import React, { useState, useEffect, useRef } from 'react';
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
  complete:   'task-complete',
  waiting:    'waiting-for-input',
  permission: 'permission-needed',
};

// Auto-hide delay per state (ms). null = persistent until dismissed.
const AUTO_HIDE = {
  'task-complete':    6000,
  'waiting-for-input': 8000,
  'permission-needed': null,
};

// ── Sound ──────────────────────────────────────────────────────────────────
// Sound is enabled by default; set PING_BALLOON_SOUND=0 to disable.
// The flag is read once at startup via the preload bridge.
const SOUND_ENABLED = window.electronAPI?.env?.soundEnabled ?? true;

/**
 * Schedule a single tone using the Web Audio API.
 * @param {AudioContext} ctx
 * @param {number} freq        Frequency in Hz
 * @param {number} startDelay  Seconds after ctx.currentTime to start
 * @param {number} duration    Seconds the tone lasts
 * @param {number} volume      Peak gain (0–1)
 */
function scheduleTone(ctx, freq, startDelay, duration, volume) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);

  // Soft attack / decay envelope
  gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startDelay + 0.015);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startDelay + duration);

  osc.start(ctx.currentTime + startDelay);
  osc.stop(ctx.currentTime + startDelay + duration + 0.05);
}

/**
 * Play a short, discrete notification sound for the given bubble state.
 * No-op when PING_BALLOON_SOUND=0.
 */
function playSound(internalState) {
  if (!SOUND_ENABLED) return;

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    if (internalState === 'task-complete') {
      // Soft two-note ascending chime: C5 → E5
      scheduleTone(ctx, 523.25, 0.00, 0.15, 0.06);
      scheduleTone(ctx, 659.25, 0.10, 0.20, 0.07);
    } else if (internalState === 'permission-needed') {
      // Three quick ascending beeps — a bit more attention-grabbing
      scheduleTone(ctx, 440.00, 0.00, 0.08, 0.08);
      scheduleTone(ctx, 554.37, 0.12, 0.08, 0.08);
      scheduleTone(ctx, 659.25, 0.24, 0.12, 0.10);
    } else {
      // waiting-for-input (legacy/debug): single soft pulse
      scheduleTone(ctx, 440.00, 0.00, 0.18, 0.05);
    }

    // Release the AudioContext once all tones have played
    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    // AudioContext unavailable — ignore silently
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function App() {
  const [visible, setVisible]               = useState(false);   // hidden on start
  const [activeState, setActiveState]       = useState('task-complete');
  const [theme, setTheme]                   = useState('light');
  const [notifyOverride, setNotifyOverride] = useState(null);
  const autoHideTimer  = useRef(null);
  const isFocusingRef  = useRef(false);  // guard against concurrent focus calls

  // ── Incoming notification handler ────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onNotify) return;

    window.electronAPI.onNotify(({ state, title, message, meta }) => {
      const internalState = STATE_MAP[state];
      if (!internalState) return;

      const normMeta = meta == null
        ? undefined
        : Array.isArray(meta) ? meta : [meta];

      // Cancel any pending auto-hide from the previous notification
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
        autoHideTimer.current = null;
      }

      setActiveState(internalState);
      setNotifyOverride({ title, subtitle: message, meta: normMeta });
      setVisible(true);

      // Play notification sound (not on theme toggle, not on restore)
      playSound(internalState);

      // Schedule auto-hide if this state is non-persistent
      const delay = AUTO_HIDE[internalState];
      if (delay !== null) {
        autoHideTimer.current = setTimeout(() => {
          setVisible(false);
          window.electronAPI?.hideBubble();
          autoHideTimer.current = null;
        }, delay);
      }
    });

    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, []);

  // ── Derived display values ────────────────────────────────────────────────
  const demo          = DEMOS[activeState];
  const displayTitle    = notifyOverride?.title    ?? demo.title;
  const displaySubtitle = notifyOverride?.subtitle ?? demo.subtitle;
  const displayMeta     = notifyOverride?.meta     ?? demo.meta;

  // ── Dismiss (X button or after auto-hide) ────────────────────────────────
  const handleDismiss = () => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
    setVisible(false);
    window.electronAPI?.hideBubble();
  };

  // ── Click on bubble body — focus terminal then dismiss ───────────────────
  // Guard: if a focus call is already in flight (double-click / key repeat),
  // ignore the duplicate. The bubble is hidden only when focus succeeds.
  // On failure the bubble stays visible so the user can retry or use ×.
  const handleFocusTerminal = async () => {
    if (isFocusingRef.current) return;
    isFocusingRef.current = true;

    try {
      if (!window.electronAPI?.focusTerminal) {
        console.log('[ping-balloon] focus terminal (no IPC bridge)');
        handleDismiss();
        return;
      }
      const result = await window.electronAPI.focusTerminal();
      if (result?.ok) {
        console.log(`[ping-balloon] focused ${result.app}`);
        handleDismiss();
      } else {
        console.warn('[ping-balloon] terminal focus failed:', result?.error);
      }
    } finally {
      isFocusingRef.current = false;
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
