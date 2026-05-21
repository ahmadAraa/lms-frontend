import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../core/services/notification.service';

/**
 * Component representing the interactive notification bell.
 *
 * It regularly polls (every 30 seconds) for new unread notifications and displays a list
 * of notifications with automated HTML stripping, icon mappings, and relative time formatting.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  /**
   * Signal indicating if the notification dropdown list is currently visible.
   */
  isOpen = signal(false);

  /**
   * Signal indicating if the component is currently fetching notification records.
   */
  isLoading = signal(false);

  /**
   * Signal storing the integer count of unread notifications.
   */
  unreadCount = signal(0);

  /**
   * Signal holding the array of loaded notification objects.
   */
  notifications = signal<AppNotification[]>([]);

  /**
   * Token of the active setInterval scheduling polling requests.
   * @private
   */
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Constructs the NotificationBellComponent.
   *
   * @param notificationService - The service managing CRUD communications for notifications.
   */
  constructor(private notificationService: NotificationService) {}

  /**
   * Angular initialization hook. Sets up periodic polling of unread counts every 30 seconds.
   */
  ngOnInit() {
    void this.loadCount();
    // Poll every 30 s for new notifications
    this.pollInterval = setInterval(() => void this.loadCount(), 30_000);
  }

  /**
   * Angular cleanup hook. Clears the background polling interval.
   */
  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  /**
   * Toggles the dropdown menu's visibility and triggers a notification fetch when expanding.
   */
  async toggle() {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) await this.loadNotifications();
  }

  /**
   * Closes the notification dropdown panel.
   */
  close() {
    this.isOpen.set(false);
  }

  /**
   * Quietly loads the unread count from the server and updates the signal.
   */
  async loadCount() {
    try {
      const count = await this.notificationService.getUnreadCount();
      this.unreadCount.set(count);
    } catch {
      // silently fail — bell just shows no badge
    }
  }

  /**
   * Retrieves the full list of notifications from the server, updates the notifications signal,
   * and recalculates the unread count based on active read states.
   */
  async loadNotifications() {
    this.isLoading.set(true);
    try {
      const list = await this.notificationService.getMyNotifications();
      this.notifications.set(list);
      this.unreadCount.set(list.filter(n => !n.isRead).length);
    } catch {
      // silently fail
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Marks a specific notification as read, updating local state signals on success.
   *
   * @param n - The target notification item.
   */
  async markRead(n: AppNotification) {
    if (n.isRead) return;
    try {
      await this.notificationService.markRead(n.id);
      this.notifications.update(list =>
        list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  }

  /**
   * Marks all notifications for the current user as read on the backend, updating local state signals.
   */
  async markAllRead() {
    try {
      await this.notificationService.markAllRead();
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    } catch {
      // silently fail
    }
  }

  /**
   * Generates a descriptive time-ago relative string representation of an ISO date string.
   *
   * @param iso - The ISO date representation to parse.
   * @returns A readable relative time string, e.g. "just now", "10m ago", "3h ago", "2d ago", or absolute date.
   */
  timeAgo(iso: string): string {
    if (!iso) return '';
    const createdTime = this.parseBackendDate(iso);
    if (!Number.isFinite(createdTime)) return '';

    const diff = Math.max(0, Date.now() - createdTime);
    const m = Math.floor(diff / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(createdTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  /**
   * Safely parses backend date strings, normalizing missing UTC timezones to ensure accurate parsing.
   *
   * @param value - The raw string representation.
   * @returns The parsed numeric timestamp in milliseconds or NaN.
   * @private
   */
  private parseBackendDate(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) return Number.NaN;

    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed);
    const normalized = isIsoDateTime && !hasTimezone ? `${trimmed}Z` : trimmed;

    return new Date(normalized).getTime();
  }

  /**
   * Maps a notification category key to its corresponding Google Material Symbols icon name.
   *
   * @param type - The string category key.
   * @returns The corresponding material icon name string.
   */
  typeIcon(type: string): string {
    switch ((type ?? '').toLowerCase()) {
      case 'assignment': return 'assignment_ind';
      case 'progress':   return 'trending_up';
      case 'completion': return 'check_circle';
      case 'system':     return 'info';
      default:           return 'notifications';
    }
  }

  /**
   * Sanitizes rich HTML email-template payloads by removing head/style tag blocks,
   * stripping out HTML tags, and decoding common entities into plain text for previews.
   *
   * @param html - The raw HTML markup string.
   * @returns The sanitized plain-text preview string.
   */
  stripHtml(html: string): string {
    if (!html) return '';
    // Remove full <html>/<head>/<style> blocks first
    const noHead = html.replace(/<head[\s\S]*?<\/head>/gi, '');
    const noStyle = noHead.replace(/<style[\s\S]*?<\/style>/gi, '');
    // Strip all remaining tags
    const text = noStyle.replace(/<[^>]+>/g, ' ');
    // Decode common HTML entities
    return text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
