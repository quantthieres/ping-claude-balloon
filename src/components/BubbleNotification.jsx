import React from "react";
import { STATE_CONFIG, ACCENT } from "./state-config";
import "./BubbleNotification.css";

/**
 * <BubbleNotification />
 *
 * A 312×108 desktop notification bubble for Agent Ping.
 * Pixel-mascot on the left, content on the right.
 *
 * The component is fully presentational — visibility, queueing, and
 * "click to focus terminal" wiring live in the parent. In Electron,
 * the parent typically forwards onClick → ipcRenderer.send('focus-terminal')
 * and onDismiss → window.close() (for a per-notification BrowserWindow).
 *
 * @param {object}  props
 * @param {"task-complete"|"waiting-for-input"|"permission-needed"} props.state
 * @param {string}  props.title
 * @param {React.ReactNode} [props.subtitle]      Short message. Accepts JSX so you can inline <code>.
 * @param {string[]} [props.meta]                 Footer chips, joined with dots. e.g. ["4m 12s", "+184 −96"]
 * @param {"light"|"dark"} [props.theme="light"]
 * @param {() => void} [props.onClick]            Fired when the card body is clicked.
 * @param {() => void} [props.onDismiss]          Fired when the × button is clicked.
 * @param {string}  [props.mascotSrc]             Override the default mascot for this state.
 * @param {string}  [props.className]             Extra classes merged onto the root.
 */
export default function BubbleNotification({
  state,
  title,
  subtitle,
  meta = [],
  theme = "light",
  onToggleTheme,
  onClick,
  onDismiss,
  mascotSrc,
  className = "",
}) {
  const cfg = STATE_CONFIG[state];
  if (!cfg) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`BubbleNotification: unknown state "${state}"`);
    }
    return null;
  }

  const accent = ACCENT[cfg.accent];
  const isDark = theme === "dark";

  // — Shell —
  const shell = isDark
    ? "bg-[#1c1d22] border-white/10 text-[#ecedf1] " +
      "shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_0_0_1px_rgba(0,0,0,0.4),0_10px_26px_-10px_rgba(0,0,0,0.6),0_30px_64px_-20px_rgba(0,0,0,0.75)]"
    : "bg-white border-[rgba(15,18,24,0.08)] text-[#14161c] " +
      "shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_1px_2px_rgba(15,18,24,0.04),0_8px_24px_-8px_rgba(15,18,24,0.18),0_28px_60px_-18px_rgba(15,18,24,0.22)]";

  // — Mascot zone (peach-tinted, gradient + inset divider on the right) —
  const zone = isDark
    ? "bg-[radial-gradient(120%_80%_at_50%_110%,oklch(32%_0.07_50)_0%,oklch(24%_0.05_50)_60%,transparent_100%),linear-gradient(180deg,oklch(22%_0.04_50)_0%,oklch(26%_0.06_50)_100%)] " +
      "shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]"
    : "bg-[radial-gradient(120%_80%_at_50%_110%,oklch(94%_0.06_50)_0%,oklch(97%_0.025_50)_60%,transparent_100%),linear-gradient(180deg,oklch(97%_0.02_50)_0%,oklch(95%_0.04_50)_100%)] " +
      "shadow-[inset_-1px_0_0_rgba(15,18,24,0.05)]";

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKey}
      data-state={state}
      data-theme={theme}
      className={
        "bubble-root group relative isolate select-none cursor-pointer " +
        "grid grid-cols-[104px_1fr] w-[312px] h-[108px] rounded-[14px] border " +
        "font-sans transition-transform duration-200 ease-out hover:-translate-y-px " +
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
        (isDark ? "focus-visible:ring-white/30 focus-visible:ring-offset-[#1c1d22] " : "focus-visible:ring-black/20 focus-visible:ring-offset-white ") +
        shell +
        " " +
        className
      }
      style={{ fontFamily: "Geist, -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ---- mascot zone ---- */}
      <div className={"mascot-zone relative overflow-hidden rounded-l-[14px] flex items-end justify-center " + zone}>
        <span
          className={
            "absolute top-2 right-2 w-2 h-2 rounded-full z-[3] " +
            accent.pip +
            (cfg.pulse ? " pulse-pip" : "")
          }
          aria-hidden="true"
        />
        <img
          src={mascotSrc || cfg.mascot}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={"mascot relative z-[2] w-[92px] h-auto mb-1 " + cfg.animClass}
        />
      </div>

      {/* ---- content ---- */}
      <div className="relative py-3 px-[14px] flex flex-col justify-center gap-[3px] min-w-0">
        <div className="flex items-center gap-2 pr-[22px]">
          <div className="text-[13.5px] font-semibold leading-tight tracking-tight truncate flex-1 min-w-0">
            {title}
          </div>
          <span
            className={
              "inline-flex items-center gap-[5px] font-mono text-[9.5px] font-medium " +
              "tracking-[0.08em] uppercase px-[6px] py-[2px] rounded leading-none flex-shrink-0 " +
              (isDark ? accent.chipDark : accent.chipLight)
            }
            style={{ fontFamily: "Geist Mono, ui-monospace, monospace" }}
          >
            <span className="w-[5px] h-[5px] rounded-full bg-current" />
            {cfg.pillLabel}
          </span>
        </div>

        {subtitle && (
          <div
            className={
              "text-[12px] leading-[1.35] tracking-tight mt-[2px] overflow-hidden " +
              "[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] " +
              (isDark ? "text-[#9aa0ad]" : "text-[#5b6270]")
            }
          >
            {subtitle}
          </div>
        )}

        {meta.length > 0 && (
          <div
            className={
              "mt-1 flex items-center gap-2 font-mono text-[10.5px] " +
              (isDark ? "text-[#6b6f7a]" : "text-[#8a8f99]")
            }
            style={{ fontFamily: "Geist Mono, ui-monospace, monospace" }}
          >
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span className="w-[2px] h-[2px] rounded-full bg-current opacity-60" />}
                <span>{m}</span>
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          className={
            "absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center " +
            "opacity-55 hover:opacity-100 transition-all " +
            (isDark ? "hover:bg-white/5" : "hover:bg-black/[0.05]")
          }
        >
          <svg
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={1.75}
            className="w-[9px] h-[9px]"
            aria-hidden="true"
          >
            <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" />
          </svg>
        </button>

        {onToggleTheme && (
          <button
            type="button"
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleTheme();
            }}
            className={
              "absolute bottom-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center " +
              "opacity-40 hover:opacity-80 transition-all " +
              (isDark ? "hover:bg-white/5" : "hover:bg-black/[0.05]")
            }
          >
            <span className="text-[10px] leading-none" aria-hidden="true">
              {isDark ? "☀" : "☾"}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
