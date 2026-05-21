import { Injectable } from '@angular/core';

/**
 * Represents an individual administrative activity log entry.
 */
export interface AdminActivity {
  /** The icon representation for the activity type (e.g., 'edit', 'plus') */
  icon: string;
  /** A concise summary message describing the activity */
  message: string;
  /** Detailed contextual information about the activity */
  detail: string;
  /** The timestamp when the activity occurred, stored in ISO format */
  timestamp: string;
}

/** LocalStorage key used to persist administrative logs */
const STORAGE_KEY = 'lms_admin_activity';

/** Maximum number of activity logs to keep in local storage */
const MAX_ITEMS = 20;

/** Log expiry duration: 2 hours in milliseconds */
const EXPIRY_MS = 2 * 60 * 60 * 1000;

/**
 * Service responsible for managing, persisting, and retrieving administrative activity logs.
 *
 * This service caches activity items in the browser's `localStorage` and automatically
 * prunes entries that exceed the maximum capacity or 2-hour expiration window.
 */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  
  /**
   * Logs a new administrative activity.
   *
   * Creates an `AdminActivity` entry, prepends it to the existing log array,
   * prunes items exceeding `MAX_ITEMS`, and saves the updated array to `localStorage`.
   * If local storage is full, the error is caught and ignored.
   *
   * @param icon - Graphic or symbol indicator representing the action category.
   * @param message - High-level description of what action took place.
   * @param detail - In-depth information or metadata associated with the event.
   */
  log(icon: string, message: string, detail: string): void {
    const activity: AdminActivity = {
      icon,
      message,
      detail,
      timestamp: new Date().toISOString(),
    };
    const existing = this.getAll();
    const updated = [activity, ...existing].slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      /* storage full — ignore */
    }
  }

  /**
   * Retrieves all fresh administrative activities from local storage.
   *
   * Fetches stored activities, filters out entries older than `EXPIRY_MS` (2 hours),
   * updates the local storage cache to reflect the pruned list if any stale items
   * were removed, and returns the list of remaining fresh activities.
   *
   * @returns An array of non-expired `AdminActivity` logs.
   */
  getAll(): AdminActivity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const all = JSON.parse(raw) as AdminActivity[];
      const cutoff = Date.now() - EXPIRY_MS;
      const fresh = all.filter((a) => new Date(a.timestamp).getTime() > cutoff);

      // Persist the pruned list so stale entries don't accumulate
      if (fresh.length !== all.length) {
        if (fresh.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
      }

      return fresh;
    } catch {
      return [];
    }
  }

  /**
   * Returns a slice of the most recent administrative activities.
   *
   * @param count - The maximum number of entries to retrieve (defaults to 5).
   * @returns A subset array of the latest `AdminActivity` logs.
   */
  getRecent(count = 5): AdminActivity[] {
    return this.getAll().slice(0, count);
  }

  /**
   * Calculates a human-friendly relative time string representing the duration
   * between the activity's timestamp and the current time.
   *
   * @param isoString - The ISO 8601 string representation of the activity's timestamp.
   * @returns A relative duration text, e.g., "Just now", "5 minutes ago", "2 hours ago", "1 day ago".
   */
  timeAgo(isoString: string): string {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return `${m} minute${m > 1 ? 's' : ''} ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return `${h} hour${h > 1 ? 's' : ''} ago`;
    }
    const d = Math.floor(diff / 86400);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  }
}
