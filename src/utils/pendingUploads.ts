/**
 * pendingUploads.ts
 *
 * Offline queue for failed photo uploads (compliance steps, incident reports).
 * When the upload endpoint is down or the network drops, we save the photo
 * URI locally so the field tech is never blocked. A future `flush()` call
 * (fired-and-forgotten on screen mount) will retry the queue.
 *
 * Storage shape (AsyncStorage key `pending_uploads`):
 *   Array<{ id: string; uri: string; jobId: string; kind: string; createdAt: number; }>
 *
 * Capped at 50 entries to avoid unbounded storage growth.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadAPI } from '../services/api';

const STORAGE_KEY = 'pending_uploads';
const MAX_ENTRIES = 50;

export interface PendingUpload {
  id: string;
  uri: string;
  jobId: string;
  kind: string; // 'compliance' | 'incident' | etc.
  createdAt: number;
}

const safeRead = async (): Promise<PendingUpload[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = async (items: PendingUpload[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ENTRIES)));
  } catch {
    /* swallow — non-fatal */
  }
};

/**
 * Queue a photo for later upload. Never throws.
 */
export const enqueue = async (photoUri: string, jobId: string, kind: string = 'compliance'): Promise<void> => {
  if (!photoUri) return;
  try {
    const list = await safeRead();
    list.unshift({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      uri: photoUri,
      jobId,
      kind,
      createdAt: Date.now(),
    });
    await safeWrite(list);
  } catch {
    /* swallow */
  }
};

/**
 * Attempt to upload all queued photos. Fire-and-forget; returns the count
 * successfully flushed. Never throws.
 */
let flushInFlight = false;
export const flush = async (): Promise<number> => {
  if (flushInFlight) return 0;
  flushInFlight = true;
  let succeeded = 0;
  try {
    const list = await safeRead();
    if (list.length === 0) return 0;
    const remaining: PendingUpload[] = [];
    for (const entry of list) {
      try {
        await uploadAPI.uploadPhoto(entry.uri, entry.kind);
        succeeded += 1;
      } catch {
        // Keep this one for the next retry pass.
        remaining.push(entry);
      }
    }
    await safeWrite(remaining);
  } catch {
    /* swallow */
  } finally {
    flushInFlight = false;
  }
  return succeeded;
};

/**
 * For UI: read current pending count without mutating.
 */
export const getPendingCount = async (): Promise<number> => {
  const list = await safeRead();
  return list.length;
};

/**
 * Clear the queue (debug / settings).
 */
export const clearAll = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow */
  }
};
