import { Injectable } from '@angular/core';
import { BASE_URL } from '../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';
import { AuthService } from './auth';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanAccessResult {
  courseId: number;
  canAccess: boolean;
  reason?: string;
}

export interface CourseProgressResult {
  courseId: number;
  progress: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPercent(value: unknown): number {
  const n = toNumber(value, 0);
  const percent = n > 0 && n < 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

function getValue(
  node: Record<string, unknown>,
  camel: string,
  pascal: string
): unknown {
  return node[camel] ?? node[pascal];
}

function getAnyValue(node: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (node[key] !== undefined) return node[key];
  }

  return undefined;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }
  if (typeof value === 'number') return value !== 0;

  return value === undefined || value === null ? fallback : Boolean(value);
}

function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  return typeof value === 'string' ? value : String(value);
}

function isBooleanLike(value: unknown): boolean {
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  if (typeof value !== 'string') return false;

  const lower = value.trim().toLowerCase();
  return lower === 'true' || lower === 'false';
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(private authService: AuthService) {}

  async canAccess(courseId: number): Promise<CanAccessResult> {
    if (this.isStaffUser()) {
      return { courseId, canAccess: true };
    }

    try {
      const data = await fetchJson<unknown>(
        `${BASE_URL}/api/Progress/CanAccess/${courseId}`
      );

      const node = asObject(data);
      const wrappedData = getValue(node, 'data', 'Data');
      const dataNode = asObject(wrappedData ?? data);
      const canAccessValue =
        isBooleanLike(data)
          ? data
          : isBooleanLike(wrappedData)
            ? wrappedData
          : getAnyValue(node, 'canAccess', 'CanAccess', 'allowed', 'Allowed', 'isAllowed', 'IsAllowed') ??
            getAnyValue(dataNode, 'canAccess', 'CanAccess', 'allowed', 'Allowed', 'isAllowed', 'IsAllowed');
      const reason = toOptionalString(
        getAnyValue(node, 'reason', 'Reason', 'message', 'Message', 'error', 'Error') ??
          getAnyValue(dataNode, 'reason', 'Reason', 'message', 'Message', 'error', 'Error')
      );

      return {
        courseId: toNumber(
          getValue(node, 'courseId', 'CourseId') ?? getValue(dataNode, 'courseId', 'CourseId'),
          courseId
        ),
        canAccess: toBoolean(canAccessValue, true),
        reason,
      };

    } catch (err) {
      const message = (err as { message?: string })?.message ?? '';
      const lower = message.toLowerCase();

      // 403 → blocked by backend rule
      if (message.includes('403') || lower.includes('complete previous')) {
        return { courseId, canAccess: false, reason: message };
      }

      // 401 → not logged in
      if (message.includes('401')) {
        return {
          courseId,
          canAccess: false,
          reason: 'Please log in to access this course.',
        };
      }

      // Fail-open for unexpected errors
      return { courseId, canAccess: true };
    }
  }

  async getCourseProgress(courseId: number): Promise<CourseProgressResult> {
    if (this.isStaffUser()) {
      return { courseId, progress: 0 };
    }

    try {
      const data = await fetchJson<unknown>(
        `${BASE_URL}/api/Progress/${courseId}`
      );

      const node = asObject(data);
      const dataNode = asObject(getValue(node, 'data', 'Data'));

      const progress =
        typeof data === 'number'
          ? data
          : getValue(node, 'progress', 'Progress') ??
            getValue(node, 'percentage', 'Percentage') ??
            getValue(node, 'percent', 'Percent') ??
            getValue(node, 'progressPercentage', 'ProgressPercentage') ??
            getValue(dataNode, 'progress', 'Progress') ??
            getValue(dataNode, 'percentage', 'Percentage') ??
            getValue(dataNode, 'percent', 'Percent') ??
            getValue(dataNode, 'progressPercentage', 'ProgressPercentage');

      return {
        courseId: toNumber(
          getValue(node, 'courseId', 'CourseId') ?? getValue(dataNode, 'courseId', 'CourseId'),
          courseId
        ),
        progress: toPercent(progress),
      };

    } catch {
      return { courseId, progress: 0 };
    }
  }

  private isStaffUser(): boolean {
    const role = this.authService.getUserRole();

    return role === 'HR' || role === 'MANAGER';
  }
}
