import { Injectable } from '@angular/core';
import { BASE_URL } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Represents a notification model item delivered to a user.
 */
export interface AppNotification {
  /** Unique database identifier of the notification */
  id: number;
  /** Title header summarizing the notification source or action */
  title: string;
  /** Descriptive body paragraph containing the notification message details */
  body: string;
  /** Graphic category indicator class (e.g. system alert, info) */
  type: string;
  /** Completion flag checking if the notification has been marked as read */
  isRead: boolean;
  /** Account creation timestamp string representation */
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely converts any unknown value input into a structured record object block.
 * Prevents runtime crashes when backend returns unexpected data shapes.
 *
 * @param value - Candidate input.
 * @returns Structured record object.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Extracts array collections from plain lists or wrapped .NET serialized object structures.
 *
 * @param value - Unprocessed candidate input.
 * @returns Safe list of parsed elements.
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
 * Key lookup reading support for camelCase and PascalCase backend configurations.
 * Useful for resolving inconsistent casing from API layers.
 *
 * @param node - Container record object.
 * @param camelCaseKey - Ideal camelCase string.
 * @param pascalCaseKey - Backup PascalCase string.
 * @returns Value or undefined.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Safely translates candidate variables to numbers, returning default fallbacks if mapping fails.
 *
 * @param value - Candidate raw variable.
 * @param fallback - The numeric default value (defaults to 0).
 * @returns Safe numeric value.
 */
function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/**
 * Transforms raw notification items from the API layer into formatted, robust `AppNotification` structures.
 *
 * @param raw - Unprocessed JSON payload item.
 * @returns The structured and safe `AppNotification`.
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
 * Service responsible for fetching user notifications, tracking unread counts,
 * and marking alert items as read in the database.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  /**
   * Retrieves all notifications assigned to the currently authenticated employee.
   *
   * @returns A promise resolving to an array of normalized `AppNotification` logs.
   */
  async getMyNotifications(): Promise<AppNotification[]> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Notification/my`);
    return readArray(data).map(normalizeNotification);
  }

  /**
   * Retrieves the count of unread notifications for the currently logged-in user.
   *
   * @returns A promise resolving to the total integer unread headcount count.
   */
  async getUnreadCount(): Promise<number> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Notification/count`);
    return toNumber(data, 0);
  }

  /**
   * Submits a request to mark a specific notification item as read.
   *
   * @param id - Unique database ID of the target notification.
   * @returns A promise resolving once the completion status is persisted.
   */
  async markRead(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Notification/read/${id}`, {
      method: 'POST',
    });
  }

  /**
   * Submits a request to mark all active notifications as read.
   *
   * @returns A promise resolving once the bulk read statuses are persisted.
   */
  async markAllRead(): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Notification/read-all`, {
      method: 'POST',
    });
  }
}
