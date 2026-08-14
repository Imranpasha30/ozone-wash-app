/**
 * Offline queue for compliance STEP submissions (spec §12).
 *
 * Photos already queue via pendingUploads; this queues the step payloads
 * themselves when the network drops. Steps flush in order on Job List focus.
 * Safety-gate steps are re-validated server-side on flush — a 4xx/423 drops
 * the item back for manual retry (the server verdict wins, per spec).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { complianceAPI } from '../services/api';

const KEY = 'pending_compliance_steps_v1';

export interface PendingStep {
  id: string;                 // `${job_id}:${step_number}`
  payload: any;               // full logStep body
  queued_at: string;
}

const read = async (): Promise<PendingStep[]> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const write = (items: PendingStep[]) =>
  AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});

/** Queue (or replace) a step submission that failed on network error. */
export const enqueueStep = async (payload: any) => {
  const items = await read();
  const id = `${payload.job_id}:${payload.step_number}`;
  const next = [...items.filter((i) => i.id !== id), { id, payload, queued_at: new Date().toISOString() }];
  await write(next);
  return next.length;
};

export const getPendingStepCount = async () => (await read()).length;

/**
 * Flush the queue in order. Network failures keep the item queued; server
 * rejections (gates/validation) also keep it so the agent sees the error when
 * they reopen the step. Returns { sent, remaining }.
 */
export const flushPendingSteps = async () => {
  const items = await read();
  if (!items.length) return { sent: 0, remaining: 0 };
  const still: PendingStep[] = [];
  let sent = 0;
  for (const item of items) {
    try {
      await complianceAPI.logStep(item.payload);
      sent += 1;
    } catch {
      still.push(item); // offline again OR server gate — retry next focus
    }
  }
  await write(still);
  return { sent, remaining: still.length };
};
