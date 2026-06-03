import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Basic user data structure returned when executing user search queries.
 */
export interface UserSearchResult {
  /** The unique GUID or database identifier of the user */
  id: string;
  /** The registered login username of the user */
  userName: string;
  /** The optional registered email address of the user */
  email?: string;
}

/**
 * Progress details representing an employee's status within an assigned learning path.
 */
export interface EmployeeProgressDto {
  /** The unique database identifier of the employee */
  employeeId: string;
  /** The email address of the employee */
  employeeEmail: string;
  /** The complete full name of the employee */
  employeeFullName: string;
  /** The unique identifier of the assigned learning path */
  learningPathId: number;
  /** The title name of the learning path */
  learningPathTitle: string;
  /** Completion progress of the employee represented as a percentage (0 to 100) */
  progressPercentage: number;
  /** Status indicating whether the employee has fully completed the learning path */
  isCompleted: boolean;
}

/**
 * Detailed progress information for an employee on an individual course level.
 */
export interface EmployeeCourseProgressDto {
  /** The unique identifier of the course */
  courseId: number;
  /** The title name of the course */
  courseTitle: string;
  /** The title name of the parent learning path this course belongs to */
  learningPathTitle: string;
  /** Completion progress of the employee in this course as a percentage (0 to 100) */
  progressPercentage: number;
  /** Status indicating whether the employee has completed all lessons in this course */
  isCompleted: boolean;
}

/**
 * Detailed comprehensive user profile records fetched from the database.
 */
export interface UserInfo {
  /** The unique GUID or identifier of the user */
  id: string;
  /** The login username of the user */
  userName: string;
  /** The user's primary email address */
  email: string;
  /** The system authorization role assigned to this user */
  role: string;
  /** The account creation timestamp ISO string */
  createdAt: string;
  /** Listing of active course and learning path enrollments associated with this user */
  enrollments: {
    id?: number;
    learningPathId?: number;
    courseId?: number;
  }[];
  /** Raw progressive records retrieved for specific lessons or courses */
  progresses: unknown[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Utility helper to safely extract arrays from standard lists or backend .NET wrapped collections.
 * Handles nested JSON structures with metadata fields like `$values` or `items`.
 *
 * @param value - The raw candidate value to parse.
 * @returns A safe TypeScript array of items.
 */
function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const values = node['$values'] ?? node['values'] ?? node['Items'] ?? node['items'];

  return Array.isArray(values) ? values : [];
}

/**
 * Safely casts or converts an unknown input value into a typed record object.
 *
 * @param value - Candidate input.
 * @returns A structured record object mapping keys to values or an empty object fallback.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * Multi-case key reading utility supporting both camelCase and PascalCase backend models.
 *
 * @param node - The data record object.
 * @param camelCaseKey - The expected key string in camelCase.
 * @param pascalCaseKey - The expected key string in PascalCase.
 * @returns The associated value or undefined.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string,
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Conversational numeric helper converting unknown values into valid numbers or undefined.
 *
 * @param value - Raw input value.
 * @returns A valid number if parsing succeeded, else undefined.
 */
function toOptionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
}

/**
 * Numeric fallback helper converting inputs into numbers, defaulting to the fallback if invalid.
 *
 * @param value - Candidate raw input.
 * @param fallback - The numeric default value (defaults to 0).
 * @returns The resulting number.
 */
function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/**
 * Normalizes a single enrollment node from the backend.
 *
 * @param raw - Raw enrollment record object.
 * @returns Normalized enrollment structure.
 */
function normalizeEnrollment(raw: unknown): {
  id?: number;
  learningPathId?: number;
  courseId?: number;
} {
  const node = asObject(raw);

  return {
    id: toOptionalNumber(getValue(node, 'id', 'Id')),
    learningPathId: toOptionalNumber(getValue(node, 'learningPathId', 'LearningPathId')),
    courseId: toOptionalNumber(getValue(node, 'courseId', 'CourseId')),
  };
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * Service responsible for user enrollment, employee directory queries,
 * progress tracking, and assigning employees to courses and learning paths.
 */
@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  /** API Base URL representing backend server host */
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Searches active users by full name, login username, or email address.
   * Useful for managers or HR selecting users to enroll.
   *
   * @param value - Search text query entered by the user.
   * @returns An `Observable` emitting matching user search results.
   */
  searchUsers(value: string): Observable<UserSearchResult[]> {
    return this.http.get<UserSearchResult[]>(
      `${this.baseUrl}/api/User/SearchUsers?value=${encodeURIComponent(value)}`,
    );
  }

  /**
   * Retrieves every employee account visible to the current administrator.
   * Uses the broad user search endpoint, then resolves roles through detailed user info.
   *
   * @returns An `Observable` emitting employee-only search result records.
   */
  getEmployees(): Observable<UserSearchResult[]> {
    return this.searchUsers('@').pipe(
      switchMap((users) => {
        if (!users || users.length === 0) return of([] as UserSearchResult[]);

        return forkJoin(
          users.map((user) =>
            this.getUserInfo(user.id).pipe(catchError(() => of(null))),
          ),
        ).pipe(
          map((infos) =>
            (infos as (UserInfo | null)[])
              .filter((info): info is UserInfo => info?.role === 'EMPLOYEE')
              .map((info) => ({
                id: info.id,
                userName: info.userName,
                email: info.email,
              })),
          ),
        );
      }),
      catchError(() => of([] as UserSearchResult[])),
    );
  }

  /**
   * Retrieves detailed profile, enrollment, and progress listings of a single user.
   *
   * @param id - The unique identifier of the target user.
   * @returns An `Observable` emitting the normalized `UserInfo` profile.
   */
  getUserInfo(id: string): Observable<UserInfo> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/User/GetUserInfo/${id}`)
      .pipe(map((raw) => this.normalizeUserInfo(raw)));
  }

  /**
   * Enrolls a user/employee into a specific learning path.
   *
   * @param userId - The unique identifier of the user to enroll.
   * @param learningPathId - The unique ID of the learning path.
   * @param managerId - The unique ID of the manager performing the enrollment.
   * @returns An `Observable` of the backend text/string response.
   */
  enroll(userId: string, learningPathId: number, managerId: string): Observable<string> {
    return this.http.post(
      `${this.baseUrl}/api/Enrollment/EnrollUser`,
      {
        userId,
        managerId,
        courseId: 0,
        learningPathId,
      },
      {
        responseType: 'text',
      },
    );
  }

  /**
   * Fetches the array of course IDs that the user is directly enrolled in (not via paths).
   *
   * @param userId - The user's unique identifier.
   * @returns An `Observable` emitting an array of enrolled course IDs.
   */
  getMyDirectCourseIds(userId: string): Observable<number[]> {
    return this.getUserInfo(userId).pipe(
      map(info =>
        info.enrollments
          .filter(e => (e.courseId ?? 0) > 0)
          .map(e => e.courseId as number),
      ),
      catchError(() => of([])),
    );
  }

  /**
   * Enrolls a user/employee directly into an individual course.
   *
   * @param userId - Unique user identifier of the target employee.
   * @param courseId - Unique ID of the course to enroll.
   * @param managerId - Unique ID of the manager performing this action.
   * @returns An `Observable` emitting the text success message response.
   */
  enrollCourse(userId: string, courseId: number, managerId: string): Observable<string> {
    return this.http.post(
      `${this.baseUrl}/api/Enrollment/EnrollUser`,
      {
        userId,
        managerId,
        courseId,
        learningPathId: 0,
      },
      {
        responseType: 'text',
      },
    );
  }

  /**
   * Retrieves the count of employees currently enrolled in a learning path.
   *
   * @param learningPathId - Unique ID of the target learning path.
   * @returns An `Observable` emitting the total headcount number.
   */
  getLearningPathEmployeesCount(learningPathId: number): Observable<number> {
    return this.http
      .get<unknown>(`${this.baseUrl}/api/Enrollment/learningpath/${learningPathId}/employeescount`)
      .pipe(map((raw) => this.normalizeEmployeesCount(raw)));
  }

  /**
   * Retrieves a list of all employees assigned under a specific manager
   * along with their current progress percentages in their assigned learning paths.
   *
   * @param managerId - Unique user identifier of the manager.
   * @returns An `Observable` emitting an array of `EmployeeProgressDto` elements.
   */
  getEmployeeProgressWithManagerId(managerId: string): Observable<EmployeeProgressDto[]> {
    return this.http
      .get<EmployeeProgressDto[]>(`${this.baseUrl}/api/Enrollment/GetEmployeeProgressWithManagerId/${managerId}`);
  }

  /**
   * Retrieves detailed course-by-course status and progress percentages
   * for a specific employee within a specific learning path context.
   *
   * @param employeeId - The unique user ID of the employee.
   * @param learningPathId - The unique ID of the target learning path.
   * @returns An `Observable` emitting an array of `EmployeeCourseProgressDto` entries.
   */
  getEmployeeCoursesProgress(employeeId: string, learningPathId: number): Observable<EmployeeCourseProgressDto[]> {
    return this.http
      .get<EmployeeCourseProgressDto[]>(`${this.baseUrl}/api/Enrollment/GetEmployeeCoursesProgress/${employeeId}/${learningPathId}`);
  }

  /**
   * Normalizes raw backend user information nodes into a formatted, robust `UserInfo` object.
   *
   * @param raw - Unprocessed user JSON record.
   * @returns The structured and safe `UserInfo` profile.
   */
  private normalizeUserInfo(raw: unknown): UserInfo {
    const node = asObject(raw);

    return {
      id: String(getValue(node, 'id', 'Id') ?? ''),
      userName: String(getValue(node, 'userName', 'UserName') ?? ''),
      email: String(getValue(node, 'email', 'Email') ?? ''),
      role: String(getValue(node, 'role', 'Role') ?? '').toUpperCase(),
      createdAt: String(getValue(node, 'createdAt', 'CreatedAt') ?? ''),
      enrollments: readArray(getValue(node, 'enrollments', 'Enrollments')).map(normalizeEnrollment),
      progresses: readArray(getValue(node, 'progresses', 'Progresses')),
    };
  }

  /**
   * Normalizes the count responses from the backend (handling raw numbers, stringified numbers, or wrappers).
   *
   * @param raw - Unprocessed API payload structure.
   * @returns The resolved total count integer.
   */
  private normalizeEmployeesCount(raw: unknown): number {
    if (typeof raw === 'number' || typeof raw === 'string') {
      return toNumber(raw);
    }

    const node = asObject(raw);

    return toNumber(
      getValue(node, 'count', 'Count') ??
        getValue(node, 'employeesCount', 'EmployeesCount') ??
        getValue(node, 'employeeCount', 'EmployeeCount'),
    );
  }
}
