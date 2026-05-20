import { Injectable } from '@angular/core';

export interface AdminActivity {
  icon: string;
  message: string;
  detail: string;
  timestamp: string; // ISO string
}

const STORAGE_KEY = 'lms_admin_activity';
const MAX_ITEMS = 20;
const EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 hours

@Injectable({ providedIn: 'root' })
export class ActivityService {
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

  getRecent(count = 5): AdminActivity[] {
    return this.getAll().slice(0, count);
  }

  /** Human-friendly relative time, e.g. "2 minutes ago" */
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
