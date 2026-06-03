import { Injectable } from '@angular/core';
import {
  BASE_URL,
  CourseResponseDTO,
  LearningPathResponseDto,
  LessonResponseDTO,
  SectionResponseDTO,
} from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Service responsible for managing administrative learning path CRUD operations.
 *
 * Utilizes native `fetch` requests with manual headers to handle file uploads
 * via `FormData` templates, and wraps response payloads into normalized type-safe structures.
 */
@Injectable({
  providedIn: 'root',
})
export class LearningPathsApiService {
  /**
   * Fetches all learning paths in the system.
   *
   * @returns A promise resolving to an array of normalized `LearningPathResponseDto` objects.
   */
  async getPaths(): Promise<LearningPathResponseDto[]> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/LearningPath/GetPaths`);

    return readArray(data).map((item) => this.normalizePath(item));
  }

  /**
   * Fetches a single learning path details by ID.
   * Supports wrapped collections or plain object responses.
   *
   * @param id - The unique database identifier of the learning path.
   * @returns A promise resolving to the normalized `LearningPathResponseDto` details.
   */
  async getPathById(id: number): Promise<LearningPathResponseDto> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/LearningPath/GetPathById/${id}`);

    const list = readArray(data);

    if (list.length > 0) {
      return this.normalizePath(list[0]);
    }

    return this.normalizePath(data);
  }

  /**
   * Submits a request to create a new learning path.
   *
   * @param dto - Container object representing form configurations.
   * @param dto.title - Desired learning path title.
   * @param dto.description - Optional description text, or null.
   * @param dto.picture - Optional banner/cover image file.
   * @returns A promise resolving when the path is successfully created.
   */
  async addPath(dto: {
    title: string;
    description: string | null;
    picture?: File | null;
  }): Promise<void> {
    await this.sendFormData(`${BASE_URL}/api/LearningPath/AddPath`, 'POST', dto);
  }

  /**
   * Submits a request to update an existing learning path.
   *
   * @param id - Unique database ID of the learning path to revise.
   * @param dto - Object representing updated configurations.
   * @param dto.title - Updated title.
   * @param dto.description - Updated description, or null.
   * @param dto.picture - Optional replacement banner/cover image file.
   * @returns A promise resolving when the update is complete.
   */
  async updatePath(
    id: number,
    dto: {
      title: string;
      description: string | null;
      picture?: File | null;
    },
  ): Promise<void> {
    await this.sendFormData(`${BASE_URL}/api/LearningPath/UpdatePath/${id}`, 'PUT', dto);
  }

  /**
   * Deletes a learning path from the database.
   *
   * @param id - The unique database ID of the path to remove.
   * @returns A promise resolving once the deletion succeeds.
   */
  async deletePath(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/LearningPath/DeletePath/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Private utility method dispatching multipart FormData requests for creation/updation endpoints.
   * Automatically sets active Bearer tokens and handles fetch responses.
   *
   * @param url - Destination endpoint API string.
   * @param method - HTTP verb method (POST or PUT).
   * @param dto - Configuration input details.
   */
  private async sendFormData(
    url: string,
    method: 'POST' | 'PUT',
    dto: {
      title: string;
      description: string | null;
      picture?: File | null;
    },
  ): Promise<void> {
    const formData = new FormData();

    formData.append('Title', dto.title);

    if (dto.description) {
      formData.append('Description', dto.description);
    }

    if (dto.picture) {
      formData.append('Image', dto.picture);
    }

    const headers = new Headers();
    const token = localStorage.getItem('token');

    if (token && token !== 'undefined' && token !== 'null') {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
  }

  /**
   * Normalizes raw backend learning path records, mapping nested course records.
   *
   * @param raw - Unprocessed candidate record.
   * @returns Formatted type-safe LearningPathResponseDto.
   */
  private normalizePath(raw: unknown): LearningPathResponseDto {
    const node = asObject(raw);

    return {
      id: toNumber(getValue(node, 'id', 'Id')),
      title: toString(getValue(node, 'title', 'Title')),
      description: toNullableString(getValue(node, 'description', 'Description')),
      pictureUrl: toNullableString(getValue(node, 'image', 'Image')),
      courses: readArray(getValue(node, 'courses', 'Courses')).map((course) =>
        this.normalizeCourse(course),
      ),
    };
  }

  /**
   * Normalizes raw backend course structures into clean CourseResponseDTO models.
   *
   * @param raw - Unprocessed course record.
   * @returns Formatted course object.
   */
  private normalizeCourse(raw: unknown): CourseResponseDTO {
    const node = asObject(raw);

    return {
      id: toNumber(getValue(node, 'id', 'Id')),
      title: toString(getValue(node, 'title', 'Title')),
      description: toNullableString(getValue(node, 'description', 'Description')),
      order: toNumber(getValue(node, 'order', 'Order')),
      learningPathId: toNumber(getValue(node, 'learningPathId', 'LearningPathId')),
      pictureUrl: toNullableString(getValue(node, 'image', 'Image')),
      sections: readArray(getValue(node, 'sections', 'Sections')).map((section) =>
        this.normalizeSection(section),
      ),
    };
  }

  /**
   * Normalizes raw backend section records, mapping nested lessons.
   *
   * @param raw - Unprocessed section payload.
   * @returns Formatted section object.
   */
  private normalizeSection(raw: unknown): SectionResponseDTO {
    const node = asObject(raw);

    return {
      id: toNumber(getValue(node, 'id', 'Id')),
      title: toString(getValue(node, 'title', 'Title')),
      description: toNullableString(getValue(node, 'description', 'Description')),
      order: toNumber(getValue(node, 'order', 'Order')),
      courseId: toNumber(getValue(node, 'courseId', 'CourseId')),
      lessons: readArray(getValue(node, 'lessons', 'Lessons')).map((lesson) =>
        this.normalizeLesson(lesson),
      ),
    };
  }

  /**
   * Normalizes raw backend lesson records.
   *
   * @param raw - Unprocessed lesson record.
   * @returns Structured LessonResponseDTO object.
   */
  private normalizeLesson(raw: unknown): LessonResponseDTO {
    const node = asObject(raw);

    return {
      id: toNumber(getValue(node, 'id', 'Id')),
      title: toString(getValue(node, 'title', 'Title')),
      description: toNullableString(getValue(node, 'description', 'Description')),
      content: toNullableString(getValue(node, 'content', 'Content')),
      videoUrl: toNullableString(getValue(node, 'videoUrl', 'VideoUrl')),
      order: toNumber(getValue(node, 'order', 'Order')),
      sectionId: toNumber(getValue(node, 'sectionId', 'SectionId')),
      type: toNumber(getValue(node, 'type', 'Type')),
      isComplete: Boolean(getValue(node, 'isComplete', 'IsComplete') ?? false),
    };
  }
}

/**
 * Utility helper extracting lists from collections or wrapped .NET structures.
 *
 * @param value - Candidate input.
 * @returns Clean list.
 */
function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const values = node['$values'] ?? node['values'] ?? node['Items'] ?? node['items'];

  return Array.isArray(values) ? values : [];
}

/**
 * Safely converts any unknown value into a record object.
 *
 * @param value - Candidate variable.
 * @returns Struct block.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * Key lookup reading support for camelCase and PascalCase backend configurations.
 *
 * @param node - Container record object.
 * @param camelCaseKey - Ideal camelCase string.
 * @param pascalCaseKey - Backup PascalCase string.
 * @returns Value or undefined.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string,
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Numerical cast utility, returning a fallback 0 if mapping fails.
 *
 * @param value - Raw candidate.
 * @returns Safe parsed number.
 */
function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

/**
 * Safe conversion utility mapping candidates into strings.
 *
 * @param value - Candidate raw variable.
 * @returns Safe string fallback.
 */
function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Converts inputs into valid strings or null.
 *
 * @param value - Candidate variable.
 * @returns Parsed string or null.
 */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/**
 * Parses and maps error descriptions from failed Fetch response payloads.
 *
 * @param response - Active failed fetch response block.
 * @returns Decoded clear message string.
 */
async function readErrorMessage(response: Response): Promise<string> {
  let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

  try {
    const errorBody = await response.json();

    return errorBody?.message || errorBody?.title || JSON.stringify(errorBody) || errorMessage;
  } catch {
    try {
      const text = await response.text();
      return text || errorMessage;
    } catch {
      return errorMessage;
    }
  }
}
