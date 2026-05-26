/**
 * Global themed dialog service.
 *
 * Replaces `window.confirm` / `window.alert` (browser default look) and
 * `Alert.alert` (native-only — silently no-ops on react-native-web) with a
 * single API backed by our themed <ConfirmDialog> mounted at the app root.
 *
 * Usage:
 *   import { confirm, alert } from '../services/dialog';
 *
 *   const ok = await confirm({
 *     title: 'Logout', message: 'Are you sure?',
 *     confirmText: 'Logout', destructive: true,
 *   });
 *   if (ok) doLogout();
 *
 *   await alert({ title: 'Saved', message: 'Profile updated.' });
 *
 * Implementation: a tiny pub/sub singleton. <DialogHost> in App.tsx subscribes
 * and renders the modal. Any caller anywhere can `await confirm(...)` without
 * needing context wiring.
 */

export interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface DialogState extends DialogOptions {
  visible: boolean;
  hideCancel?: boolean;
  resolve?: (v: boolean) => void;
}

const INITIAL: DialogState = { visible: false, title: '' };
let state: DialogState = INITIAL;
let listeners: Array<() => void> = [];

const notify = () => listeners.forEach((l) => l());

export const getDialogState = (): DialogState => state;

export const subscribeDialog = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const confirm = (opts: DialogOptions): Promise<boolean> =>
  new Promise((resolve) => {
    state = { ...INITIAL, ...opts, visible: true, resolve };
    notify();
  });

export const alert = (opts: DialogOptions): Promise<void> =>
  new Promise((resolve) => {
    state = {
      ...INITIAL,
      ...opts,
      visible: true,
      hideCancel: true,
      resolve: () => resolve(),
    };
    notify();
  });

// Called by <DialogHost> when the user taps a button.
export const _resolveDialog = (result: boolean) => {
  const prev = state.resolve;
  state = INITIAL;
  notify();
  prev?.(result);
};
