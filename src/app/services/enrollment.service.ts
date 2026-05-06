import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/**
 * Basic user data returned when searching for users.
 */
export interface UserSearchResult {
  id: string;
  userName: string;
  email?: string;
}

/**
 * Detailed user information returned from the backend.
 */
export interface UserInfo {
  id: string;
  userName: string;
  email: string;
  createdAt: string;
  enrollments: {
    id?: number;
    learningPathId?: number;
    courseId?: number;
  }[];
  progresses: unknown[];
}

/**
 * LocalStorage key used to store temporary enrollment counters.
 */
const ENROLL_COUNTS_KEY = 'lms_enrollment_counts';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Reads arrays from normal arrays or .NET wrapped responses.
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
 * Safely converts unknown values into objects.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Reads both camelCase and PascalCase backend keys.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Safely converts a value to a number or undefined.
 */
function toOptionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

/**
 * Normalizes one enrollment object from the backend.
 */
function normalizeEnrollment(raw: unknown): {
  id?: number;
  learningPathId?: number;
  courseId?: number;
} {
  const node = asObject(raw);

  return {
    id: toOptionalNumber(getValue(node, 'id', 'Id')),
    learningPathId: toOptionalNumber(
      getValue(node, 'learningPathId', 'LearningPathId')
    ),
    courseId: toOptionalNumber(getValue(node, 'courseId', 'CourseId')),
  };
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Service responsible for user enrollment operations.
 *
 * Features:
 * - Search users
 * - Fetch detailed user info
 * - Enroll users in learning paths
 * - Track local enrollment count
 *
 * Notes:
 * - Local enrollment count is only frontend-side tracking.
 * - Backend remains the real source of truth for enrollment data.
 */
@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private readonly baseUrl = 'http://localhost:5232';

  constructor(private http: HttpClient) {}

  /**
   * Searches users by name, username, or email.
   *
   * @param value - Search text entered by the admin/HR
   */
  searchUsers(value: string): Observable<UserSearchResult[]> {
    return this.http.get<UserSearchResult[]>(
      `${this.baseUrl}/api/User/SearchUsers?value=${encodeURIComponent(value)}`
    );
  }

  /**
   * Fetches full user information by user ID.
   *
   * @param id - User ID
   */
  getUserInfo(id: string): Observable<UserInfo> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/User/GetUserInfo/${id}`)
      .pipe(map((raw) => this.normalizeUserInfo(raw)));
  }

  /**
   * Enrolls a user into a learning path.
   *
   * @param userId - User ID
   * @param learningPathId - Learning path ID
   * @param managerId - Optional manager who performed the enrollment
   */
  enroll(userId: string, learningPathId: number, managerId?: string): Observable<string> {
    return this.http.post(
      `${this.baseUrl}/api/Enrollment`,
      {
        userId,
        managerId: managerId ?? null,
        courseId: 0,
        learningPathId,
      },
      {
        responseType: 'text',
      }
    );
  }

  /**
   * Increments the locally stored enrollment count for a learning path.
   *
   * Use this only after enroll() succeeds.
   *
   * @param learningPathId - Learning path ID
   */
  incrementEnrollCount(learningPathId: number): void {
    const counts = this.getEnrollCounts();

    counts[learningPathId] = (counts[learningPathId] ?? 0) + 1;

    try {
      localStorage.setItem(ENROLL_COUNTS_KEY, JSON.stringify(counts));
    } catch {
      // Ignore localStorage errors.
    }
  }

  /**
   * Gets the locally tracked enrollment count for one learning path.
   *
   * @param learningPathId - Learning path ID
   */
  getEnrollCount(learningPathId: number): number {
    return this.getEnrollCounts()[learningPathId] ?? 0;
  }

  /**
   * Gets all locally tracked enrollment counts.
   *
   * Returns a map where:
   * - key = learningPathId
   * - value = local enrollment count
   */
  getEnrollCounts(): Record<number, number> {
    try {
      const raw = localStorage.getItem(ENROLL_COUNTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  /**
   * Normalizes raw backend user info into UserInfo.
   */
  private normalizeUserInfo(raw: unknown): UserInfo {
    const node = asObject(raw);

    return {
      id: String(getValue(node, 'id', 'Id') ?? ''),
      userName: String(getValue(node, 'userName', 'UserName') ?? ''),
      email: String(getValue(node, 'email', 'Email') ?? ''),
      createdAt: String(getValue(node, 'createdAt', 'CreatedAt') ?? ''),
      enrollments: readArray(
        getValue(node, 'enrollments', 'Enrollments')
      ).map(normalizeEnrollment),
      progresses: readArray(getValue(node, 'progresses', 'Progresses')),
    };
  }
}