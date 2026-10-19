import { create } from 'zustand';

/**
 * App-wide toast notifications.
 *
 * Deliberately a store rather than a React context: the things that need to
 * raise a toast are mutation callbacks and event handlers, not render bodies.
 * Reading the store imperatively via `getState()` means `toast.success(...)`
 * works from anywhere without a hook, a provider, or prop-drilling.
 *
 * Render side lives in `<ToastHost />`, mounted once in the root layout.
 */

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: number;
  message: string;
  severity: ToastSeverity;
};

type ToastState = {
  toasts: Toast[];
  push: (message: string, severity: ToastSeverity, durationMs: number) => void;
  dismiss: (id: number) => void;
};

/** Errors stay up longer — they usually carry something worth reading. */
const DEFAULT_DURATION: Record<ToastSeverity, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 8000,
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (message, severity, durationMs) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, severity }] }));

    // Auto-dismiss is scheduled here rather than in the component so a toast
    // raised during a route change still disappears on its own.
    setTimeout(() => get().dismiss(id), durationMs);
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

const show = (severity: ToastSeverity) => (message: string, durationMs?: number) =>
  useToastStore.getState().push(message, severity, durationMs ?? DEFAULT_DURATION[severity]);

/**
 * The API you actually call:
 *
 *   toast.success('Obuka je uspješno kreirana.');
 *   toast.error(errorMessage(error));
 */
export const toast = {
  success: show('success'),
  error: show('error'),
  info: show('info'),
  warning: show('warning'),
};
