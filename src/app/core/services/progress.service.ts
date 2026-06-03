import { Injectable } from '@angular/core';
import { BASE_URL } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';
import { AuthService } from './auth';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Result interface indicating whether a user can access a specific course.
 */
export interface CanAccessResult {
  /** The unique identifier of the course. */
  courseId: number;
  /** True if the user is authorized to access the course; otherwise false. */
  canAccess: boolean;
  /** An optional reason explanation if access is denied. */
  reason?: string;
}

/**
 * Result interface containing a user's progress percentage in a specific course.
 */
export interface CourseProgressResult {
  /** The unique identifier of the course. */
  courseId: number;
  /** The completion progress percentage, from 0 to 100. */
  progress: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely casts an unknown value to a record object.
 * Returns an empty object if the input is null, undefined, or not an object.
 *
 * @param value - The value to cast.
 * @returns A record mapping string keys to unknown values.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Converts an unknown value to a finite number.
 * Returns the fallback value if the conversion results in a non-finite number.
 *
 * @param value - The value to convert.
 * @param fallback - The default value to return if conversion fails (defaults to 0).
 * @returns The converted finite number or the fallback.
 */
function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Normalizes an unknown numeric progress value to a rounded percentage between 0 and 100.
 * Handles decimal values (e.g. 0.75 becomes 75) as well as absolute percentages.
 *
 * @param value - The progress value to normalize.
 * @returns A rounded integer percentage between 0 and 100.
 */
function toPercent(value: unknown): number {
  const n = toNumber(value, 0);
  const percent = n > 0 && n < 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * Extracts a property value from a record object, checking both camelCase and PascalCase variations.
 * This is useful for dealing with inconsistent API response formats (e.g., C# PascalCase serialization).
 *
 * @param node - The record object to extract from.
 * @param camel - The camelCase representation of the property key.
 * @param pascal - The PascalCase representation of the property key.
 * @returns The value of the property if found; otherwise undefined.
 */
function getValue(
  node: Record<string, unknown>,
  camel: string,
  pascal: string
): unknown {
  return node[camel] ?? node[pascal];
}

/**
 * Searches a record object for the first defined value matching a list of candidate keys.
 *
 * @param node - The record object to search.
 * @param keys - A list of potential property keys.
 * @returns The first defined value found, or undefined if none match.
 */
function getAnyValue(node: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (node[key] !== undefined) return node[key];
  }

  return undefined;
}

/**
 * Converts an unknown value to a boolean, providing a fallback option if evaluation is ambiguous.
 * Evaluates string values ('true', 'false'), numeric values, and standard truthiness.
 *
 * @param value - The value to convert.
 * @param fallback - The default boolean to return if the value is null or undefined (defaults to false).
 * @returns The evaluated boolean representation of the value.
 */
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

/**
 * Normalizes an unknown value to a string or undefined.
 * Empty strings, nulls, and undefined values map to undefined.
 *
 * @param value - The value to normalize.
 * @returns The normalized string or undefined.
 */
function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;

  return typeof value === 'string' ? value : String(value);
}

/**
 * Determines whether an unknown value acts like a boolean representation.
 * Recognizes actual booleans, numbers, and case-insensitive strings 'true'/'false'.
 *
 * @param value - The value to evaluate.
 * @returns True if the value is boolean-like, otherwise false.
 */
function isBooleanLike(value: unknown): boolean {
  if (typeof value === 'boolean' || typeof value === 'number') return true;
  if (typeof value !== 'string') return false;

  const lower = value.trim().toLowerCase();
  return lower === 'true' || lower === 'false';
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * ProgressService handles checking course access permissions and fetching course completion progress metrics.
 *
 * This service implements intelligent fallbacks and normalizes .NET/PascalCase backend APIs and HTTP status codes
 * to support robust course navigation and UI tracking.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  /**
   * Constructs the ProgressService.
   *
   * @param authService - The AuthService used to fetch user roles and claims.
   */
  constructor(private authService: AuthService) {}

  /**
   * Queries the backend API to determine if the current user is authorized to access a given course.
   * Staff users (SUPERADMIN/HR/MANAGER) bypass the backend check and are granted access automatically.
   *
   * Handles HTTP 403 (blocked by prerequisite validation) and HTTP 401 (unauthenticated) gracefully
   * by returning descriptive reason strings. Implements a fail-open strategy for other errors.
   *
   * @param courseId - The unique identifier of the course.
   * @returns A promise resolving to a CanAccessResult specifying access status and optional reason details.
   */
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

  /**
   * Fetches the completion progress percentage for the current user in a specific course.
   * Staff users (SUPERADMIN/HR/MANAGER) do not have course progress tracking, so they default to 0%.
   *
   * Supports various serialized progress properties (e.g. progress, percentage, percent) to
   * ensure compatibility with different API schemas.
   *
   * @param courseId - The unique identifier of the course.
   * @returns A promise resolving to a CourseProgressResult holding the normalized progress metric.
   */
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

    } catch (err) {
      return { courseId, progress: 0 };
    }
  }

  /**
   * Determines if the current user has administrative/staff permissions.
   *
   * @returns True if the user is SUPERADMIN, HR, or MANAGER, otherwise false.
   */
  private isStaffUser(): boolean {
    const role = this.authService.getUserRole();

    return role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER';
  }
}
