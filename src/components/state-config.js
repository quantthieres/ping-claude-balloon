// State configuration for <BubbleNotification />.
// Keep this in one place so the component stays presentational.

import completeMascot from "./mascots/complete.png";
import waitingMascot from "./mascots/waiting.png";
import permissionMascot from "./mascots/permission.png";

/**
 * @typedef {"task-complete" | "waiting-for-input" | "permission-needed"} BubbleState
 */

/**
 * Accent token map. Tailwind reads these as arbitrary values at build time
 * (in JIT/v3 and v4), so they get tree-shaken correctly.
 */
export const ACCENT = {
  emerald: {
    pip: "bg-[oklch(70%_0.14_155)]",
    chipLight: "text-[oklch(48%_0.12_155)] bg-[oklch(96%_0.045_155)]",
    chipDark: "text-[oklch(80%_0.13_155)] bg-[oklch(30%_0.06_155)]",
  },
  sky: {
    pip: "bg-[oklch(70%_0.13_240)]",
    chipLight: "text-[oklch(50%_0.13_240)] bg-[oklch(96%_0.04_240)]",
    chipDark: "text-[oklch(80%_0.12_240)] bg-[oklch(30%_0.06_240)]",
  },
  amber: {
    pip: "bg-[oklch(72%_0.16_70)]",
    chipLight: "text-[oklch(50%_0.14_70)] bg-[oklch(96%_0.04_75)]",
    chipDark: "text-[oklch(80%_0.13_75)] bg-[oklch(30%_0.06_70)]",
  },
};

export const STATE_CONFIG = {
  "task-complete": {
    mascot: completeMascot,
    accent: "emerald",
    pillLabel: "DONE",
    pulse: false,
    animClass: "",
  },
  "waiting-for-input": {
    mascot: waitingMascot,
    accent: "sky",
    pillLabel: "IDLE",
    pulse: true,
    animClass: "mascot-bob",
  },
  "permission-needed": {
    mascot: permissionMascot,
    accent: "amber",
    pillLabel: "HOLD",
    pulse: true,
    animClass: "mascot-shake-hover",
  },
};
