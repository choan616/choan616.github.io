/**
 * Application-wide constants.
 */

// Session and security constants
export const NEW_THRESHOLD_MS = 5000;
export const UNLOCK_DELAY_MS = 3000;
export const MAX_ATTEMPTS = 5;

// Sync status enum
export const SyncStatus = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',
};