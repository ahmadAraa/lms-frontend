import { Injectable } from '@angular/core';
import { BASE_URL } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Represents a notification sent to the user.
 */
export interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely converts any value to an object.
 * Prevents runtime crashes when backend returns unexpected shapes.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Extracts array data from:
 * - normal arrays
 * - .NET wrapped arrays ($values, Items, etc.)
 */
function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const values =
    node['$values'] ??
    node['values'] ??
    node['Items'] ??
    node['items'];

  return Array.isArray(values) ? values : [];
}

/**
 * Gets a value supporting both camelCase and PascalCase keys.
 * Useful for inconsistent backend naming.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Safely converts a value to a number.
 * Returns fallback if conversion fails.
 */
function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/**
 * Normalizes raw backend data into AppNotification model.
 */
function normalizeNotification(raw: unknown): AppNotification {
  const node = asObject(raw);
  const createdAt =
    getValue(node, 'createdAt', 'CreatedAt') ??
    getValue(node, 'createdOn', 'CreatedOn') ??
    getValue(node, 'createdDate', 'CreatedDate') ??
    getValue(node, 'timestamp', 'Timestamp');

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: String(getValue(node, 'title', 'Title') ?? ''),
    body: String(getValue(node, 'body', 'Body') ?? ''),
    type: String(getValue(node, 'type', 'Type') ?? ''),
    isRead: Boolean(getValue(node, 'isRead', 'IsRead') ?? false),
    createdAt: String(createdAt ?? ''),
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Service responsible for handling user notifications.
 *
 * Features:
 * - Fetch user notifications
 * - Get unread count
 * - Mark single notification as read
 * - Mark all notifications as read
 *
 * Notes:
 * - Handles inconsistent backend responses (.NET wrapping)
 * - Safely normalizes all data
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  /**
   * Fetch all notifications for the current user.
   *
   * @returns Promise<AppNotification[]>
   */
  async getMyNotifications(): Promise<AppNotification[]> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Notification/my`);
    return readArray(data).map(normalizeNotification);
  }

  /**
   * Fetch the number of unread notifications.
   *
   * @returns Promise<number>
   */
  async getUnreadCount(): Promise<number> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Notification/count`);
    return toNumber(data, 0);
  }

  /**
   * Marks a specific notification as read.
   *
   * @param id - Notification ID
   */
  async markRead(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Notification/read/${id}`, {
      method: 'POST',
    });
  }

  /**
   * Marks all notifications as read.
   */
  async markAllRead(): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Notification/read-all`, {
      method: 'POST',
    });
  }
}
