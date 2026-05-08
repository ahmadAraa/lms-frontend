import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  isOpen = signal(false);
  isLoading = signal(false);
  unreadCount = signal(0);
  notifications = signal<AppNotification[]>([]);

  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    void this.loadCount();
    // Poll every 30 s for new notifications
    this.pollInterval = setInterval(() => void this.loadCount(), 30_000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async toggle() {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) await this.loadNotifications();
  }

  close() {
    this.isOpen.set(false);
  }

  async loadCount() {
    try {
      const count = await this.notificationService.getUnreadCount();
      this.unreadCount.set(count);
    } catch {
      // silently fail — bell just shows no badge
    }
  }

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

  async markAllRead() {
    try {
      await this.notificationService.markAllRead();
      this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
      this.unreadCount.set(0);
    } catch {
      // silently fail
    }
  }

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

  private parseBackendDate(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) return Number.NaN;

    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const isIsoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed);
    const normalized = isIsoDateTime && !hasTimezone ? `${trimmed}Z` : trimmed;

    return new Date(normalized).getTime();
  }

  typeIcon(type: string): string {
    switch ((type ?? '').toLowerCase()) {
      case 'assignment': return 'assignment_ind';
      case 'progress':   return 'trending_up';
      case 'completion': return 'check_circle';
      case 'system':     return 'info';
      default:           return 'notifications';
    }
  }

  /** Strip HTML tags and decode entities so email-template bodies render as plain text */
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
