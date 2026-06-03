import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Payload data structure used when creating a new learning path.
 */
export interface LearningPathProcessDto {
  /** The descriptive title of the learning path */
  title: string;
  /** The detailed description summarizing the path objectives */
  description?: string;
}

/**
 * Course data structure nested inside a learning path API response.
 */
export interface CourseResponseDTO {
  /** Unique database identifier of the course */
  id: number;
  /** Course name title */
  title: string;
  /** Comprehensive summary of the course details */
  description?: string;
  /** Optional header cover image URL of the course */
  image?: string | null;
  /** Display hierarchy ordering index */
  order?: number;
  /** Parent learning path ID associated with the course */
  learningPathId?: number;
  /** Subdivided course syllabus sections list */
  sections?: {
    id: number;
    title: string;
    order?: number;
    lessons?: unknown[];
  }[];
}

/**
 * Learning path details returned by the database.
 */
export interface LearningPathResponseDto {
  /** Unique learning path identifier */
  id: number;
  /** Learning path title name */
  title: string;
  /** Summary of target learning objectives in the path */
  description?: string;
  /** Optional cover image path or URL */
  image?: string | null;
  /** Sequential list of courses included in this path */
  courses: CourseResponseDTO[];
}

/**
 * Data payload format representing the user progress inside a learning path.
 */
export interface LearningPathProgressDto {
  /** Unique learning path identifier */
  learningPathId: number;
  /** Progressive percentage completion value (0 to 100) */
  progress: number;
}

/**
 * Details mapping where the user should resume their learning activity.
 */
export interface ContinueLearningResponseDto {
  /** Flags whether the user has finished all components in the learning path */
  isCompleted: boolean;
  /** Pointer targets representing the recommended resume point */
  data?: {
    /** Target course ID, or null if finished */
    courseId: number | null;
    /** Target lesson ID, or null if finished */
    lessonId: number | null;
    /** Target section ID, or null if finished */
    sectionId: number | null;
  };
  /** Accompanying status message */
  message?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts a robust array from normal collections or .NET nested arrays containing metadata wrappers.
 *
 * @param value - Unprocessed candidate object.
 * @returns Safe list of extracted elements.
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
 * Safely casts an unknown candidate into a record object block.
 *
 * @param value - Raw variable candidate.
 * @returns Secure key-value mapping.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Case-insensitive key reading fallback supporting both camelCase and PascalCase backend JSON formats.
 *
 * @param node - Container record object.
 * @param camelCaseKey - Preferred camelCase lookup.
 * @param pascalCaseKey - Backup PascalCase lookup.
 * @returns Value or undefined if absent.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Scans a list of key options, returning the value of the first key that is present.
 *
 * @param node - Container record object.
 * @param keys - Priority list of lookup strings.
 * @returns Resolved value, or undefined.
 */
function getAnyValue(node: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (node[key] !== undefined) return node[key];
  }

  return undefined;
}

/**
 * Safely converts an unknown candidate value into a valid number or falls back to standard defaults.
 *
 * @param value - Raw variable.
 * @param fallback - The default returned value (defaults to 0).
 * @returns Resulting valid number.
 */
function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/**
 * Sorting utility comparator that orders items sequentially by their defined sequence 'order' order,
 * with database primary 'id' as a reliable secondary ordering fallback.
 *
 * @param a - Left operand.
 * @param b - Right operand.
 * @returns Ordering index (-1, 0, 1).
 */
function byOrderThenId<T extends { id?: number; order?: number }>(
  a: T,
  b: T
): number {
  const orderDiff = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  if (orderDiff !== 0) return orderDiff;

  return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
}

/**
 * Safe conversion utility mapping candidate inputs to a number, or null if unresolvable.
 *
 * @param value - Raw input variable.
 * @returns Parsed number, or null.
 */
function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

/**
 * Translates float decimal progress representations (e.g., 0.85) to standard integer percents (e.g., 85).
 * Clamps output values securely between 0 and 100 percent.
 *
 * @param value - The raw float progress decimal or integer percentage.
 * @returns Secure integer percentage value.
 */
function toPercent(value: unknown): number {
  const n = toNumber(value, 0);
  const percent = n > 0 && n < 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * Safely parses unknown inputs to robust boolean flags.
 * Handles true/false string matches properly.
 *
 * @param value - Raw variable candidate.
 * @param fallback - Default boolean value.
 * @returns Resolved boolean.
 */
function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }

  return value === undefined || value === null ? fallback : Boolean(value);
}

/**
 * Safe conversion utility mapping candidates to plain string values.
 *
 * @param value - Raw candidate.
 * @returns Safely extracted string, or empty.
 */
function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Converts candidate inputs into valid strings or null fallbacks.
 *
 * @param value - Raw input.
 * @returns Resolving string, or null.
 */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/**
 * Converts candidate inputs into valid strings or undefined fallbacks.
 *
 * @param value - Raw input.
 * @returns Resolving string, or undefined.
 */
function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

/**
 * Normalizes raw section records fetched from the API database.
 * Formats types and sequences the nested lesson elements by order numbers.
 *
 * @param raw - Unprocessed section payload.
 * @returns Structured section node.
 */
function normalizeSection(raw: unknown): {
  id: number;
  title: string;
  order?: number;
  lessons?: unknown[];
} {
  const node = asObject(raw);

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: toString(getValue(node, 'title', 'Title')),
    order: toNumber(getValue(node, 'order', 'Order'), Number.MAX_SAFE_INTEGER),
    lessons: readArray(getValue(node, 'lessons', 'Lessons')).sort((a, b) =>
      byOrderThenId(
        {
          id: toNumber(getValue(asObject(a), 'id', 'Id'), Number.MAX_SAFE_INTEGER),
          order: toNumber(getValue(asObject(a), 'order', 'Order'), Number.MAX_SAFE_INTEGER),
        },
        {
          id: toNumber(getValue(asObject(b), 'id', 'Id'), Number.MAX_SAFE_INTEGER),
          order: toNumber(getValue(asObject(b), 'order', 'Order'), Number.MAX_SAFE_INTEGER),
        }
      )
    ),
  };
}

/**
 * Normalizes raw course records from the backend database.
 * Orders child sections.
 *
 * @param raw - Unprocessed course record.
 * @returns Formatted and structured CourseResponseDTO.
 */
function normalizeCourse(raw: unknown): CourseResponseDTO {
  const node = asObject(raw);

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: toString(getValue(node, 'title', 'Title')),
    description: toOptionalString(getValue(node, 'description', 'Description')),
    image: toNullableString(getValue(node, 'image', 'Image')),
    order: toNumber(getValue(node, 'order', 'Order'), Number.MAX_SAFE_INTEGER),
    learningPathId: toNumber(getValue(node, 'learningPathId', 'LearningPathId')),
    sections: readArray(getValue(node, 'sections', 'Sections')).map(
      normalizeSection
    ).sort(byOrderThenId),
  };
}

/**
 * Normalizes API learning path records, restructuring courses in correct orders.
 *
 * @param raw - Unprocessed learning path payload.
 * @returns Clean and structured LearningPathResponseDto.
 */
function normalizePath(raw: unknown): LearningPathResponseDto {
  const node = asObject(raw);

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: toString(getValue(node, 'title', 'Title')),
    description: toOptionalString(getValue(node, 'description', 'Description')),
    image: toNullableString(getValue(node, 'image', 'Image')),
    courses: readArray(getValue(node, 'courses', 'Courses')).map(
      normalizeCourse
    ).sort(byOrderThenId),
  };
}

/**
 * Normalizes progress records from the database, parsing float representations to percentage integers.
 * Supports various naming structures of progress properties.
 *
 * @param raw - Raw progress record.
 * @param learningPathId - Contextual learning path ID.
 * @returns Configured learning path progress details.
 */
function normalizeProgress(raw: unknown, learningPathId: number): LearningPathProgressDto {
  if (typeof raw === 'number') {
    return { learningPathId, progress: toPercent(raw) };
  }

  const node = asObject(raw);
  const dataNode = asObject(getValue(node, 'data', 'Data'));
  const progress = getAnyValue(
    node,
    'progress',
    'Progress',
    'percentage',
    'Percentage',
    'percent',
    'Percent',
    'progressPercentage',
    'ProgressPercentage'
  ) ?? getAnyValue(
    dataNode,
    'progress',
    'Progress',
    'percentage',
    'Percentage',
    'percent',
    'Percent',
    'progressPercentage',
    'ProgressPercentage'
  );

  return {
    learningPathId: toNumber(
      getValue(node, 'learningPathId', 'LearningPathId') ??
        getValue(dataNode, 'learningPathId', 'LearningPathId'),
      learningPathId
    ),
    progress: toPercent(progress),
  };
}

/**
 * Normalizes response records checking where the employee left off in their lessons.
 *
 * @param raw - Unprocessed API resume tracking payload.
 * @param learningPathId - Contextual learning path ID.
 * @returns Structured resumption parameters.
 */
function normalizeContinueLearning(
  raw: unknown,
  learningPathId: number
): ContinueLearningResponseDto {
  const node = asObject(raw);
  const dataNode = asObject(getValue(node, 'data', 'Data') ?? raw);
  const message = toOptionalString(getValue(node, 'message', 'Message'));
  const lessonId = toNullableNumber(getValue(dataNode, 'lessonId', 'LessonId'));
  const courseId = toNullableNumber(getValue(dataNode, 'courseId', 'CourseId'));
  const sectionId = toNullableNumber(getValue(dataNode, 'sectionId', 'SectionId'));
  const hasTarget = lessonId !== null || courseId !== null || sectionId !== null;

  return {
    isCompleted: toBoolean(getValue(node, 'isCompleted', 'IsCompleted'), !hasTarget),
    data: hasTarget
      ? {
          courseId,
          lessonId,
          sectionId,
        }
      : undefined,
    message:
      message ??
      (hasTarget
        ? undefined
        : `No lesson is available to continue for learning path ${learningPathId}.`),
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * Service responsible for fetching, constructing, and tracing learning paths,
 * employee path progress states, and lesson resumption links.
 */
@Injectable({
  providedIn: 'root',
})
export class LearningPathService {
  /** API path endpoint URL */
  private readonly apiUrl = `${environment.apiUrl}/api/LearningPath`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves all learning paths in the system.
   *
   * @returns An `Observable` emitting an array of normalized `LearningPathResponseDto` objects.
   */
  getPaths(): Observable<LearningPathResponseDto[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/GetPaths`)
      .pipe(map((data) => readArray(data).map(normalizePath)));
  }

  /**
   * Retrieves only the learning paths that the currently authenticated employee is enrolled in.
   * Backend reads user credentials from injected authorization tokens automatically.
   *
   * @returns An `Observable` of matching normalized learning paths list.
   */
  getMyPaths(): Observable<LearningPathResponseDto[]> {
    return this.http
      .get<unknown>(`${this.apiUrl}/GetMyPaths`)
      .pipe(map((data) => readArray(data).map(normalizePath)));
  }

  /**
   * Retrieves detailed specifications of one learning path matching the specified ID.
   *
   * @param id - Unique learning path identifier.
   * @returns An `Observable` emitting the matching `LearningPathResponseDto`.
   */
  getPathById(id: number): Observable<LearningPathResponseDto> {
    return this.http.get<unknown>(`${this.apiUrl}/GetPathById/${id}`).pipe(
      map((data) => {
        const list = readArray(data);
        return normalizePath(list.length > 0 ? list[0] : data);
      })
    );
  }

  /**
   * Submits request to create/publish a new learning path.
   *
   * @param path - Title and description payload parameters.
   * @returns An `Observable` emitting the freshly built path response.
   */
  addPath(path: LearningPathProcessDto): Observable<LearningPathResponseDto> {
    return this.http.post<LearningPathResponseDto>(
      `${this.apiUrl}/AddPath`,
      path
    );
  }

  /**
   * Retrieves the current user's progress percentage inside a target learning path.
   *
   * @param learningPathId - Unique target learning path identifier.
   * @returns An `Observable` emitting `LearningPathProgressDto`.
   */
  getMyProgress(
    learningPathId: number
  ): Observable<LearningPathProgressDto> {
    return this.http
      .get<unknown>(`${this.apiUrl}/MyProgress/${learningPathId}`)
      .pipe(map((data) => normalizeProgress(data, learningPathId)));
  }

  /**
   * Resolves the recommended resume targets (lesson, section, and course IDs)
   * where the employee left off on a given path.
   *
   * @param learningPathId - Unique identifier of the target learning path.
   * @returns An `Observable` emitting resume coordinates payload structure.
   */
  getContinueLearning(learningPathId: number): Observable<ContinueLearningResponseDto> {
    return this.http
      .get<unknown>(`${this.apiUrl}/ContinueLearning/${learningPathId}`)
      .pipe(map((data) => normalizeContinueLearning(data, learningPathId)));
  }
}
