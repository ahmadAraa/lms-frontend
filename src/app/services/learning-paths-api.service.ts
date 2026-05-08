import { Injectable } from '@angular/core';
import {
  BASE_URL,
  CourseResponseDTO,
  LearningPathResponseDto,
  LessonResponseDTO,
  SectionResponseDTO,
} from '../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Service responsible for managing learning paths.
 *
 * Features:
 * - Fetch all learning paths
 * - Fetch one learning path by ID
 * - Create learning path with optional image upload
 * - Update learning path with optional image upload
 * - Delete learning path
 * - Normalize backend response shapes
 */
@Injectable({
  providedIn: 'root',
})
export class LearningPathsApiService {
  /**
   * Fetches all learning paths.
   */
  async getPaths(): Promise<LearningPathResponseDto[]> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/LearningPath/GetPaths`);

    return readArray(data).map((item) => this.normalizePath(item));
  }

  /**
   * Fetches a learning path by ID.
   *
   * Handles both:
   * - Direct object response
   * - Wrapped/list response
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
   * Creates a new learning path.
   *
   * Uses FormData because image upload requires multipart/form-data.
   */
  async addPath(dto: {
    title: string;
    description: string | null;
    picture?: File | null;
  }): Promise<void> {
    await this.sendFormData(`${BASE_URL}/api/LearningPath/AddPath`, 'POST', dto);
  }

  /**
   * Updates an existing learning path.
   *
   * Uses FormData to support optional image replacement.
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
   * Deletes a learning path by ID.
   */
  async deletePath(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/LearningPath/DeletePath/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Sends a FormData request for creating/updating learning paths.
   *
   * Important:
   * - Do NOT manually set Content-Type.
   * - Browser automatically adds multipart/form-data boundary.
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
   * Converts raw backend learning path data into LearningPathResponseDto.
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
   * Converts raw backend course data into CourseResponseDTO.
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
   * Converts raw backend section data into SectionResponseDTO.
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
   * Converts raw backend lesson data into LessonResponseDTO.
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
 * Reads arrays from normal or .NET-wrapped responses.
 */
function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const values = node['$values'] ?? node['values'] ?? node['Items'] ?? node['items'];

  return Array.isArray(values) ? values : [];
}

/**
 * Safely converts any unknown value into an object.
 */
function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

/**
 * Reads both camelCase and PascalCase backend keys.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string,
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Safely converts a value into a number.
 */
function toNumber(value: unknown): number {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

/**
 * Safely converts a value into a string.
 */
function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Converts a value into a nullable string.
 */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : String(value);
}

/**
 * Extracts a useful error message from a failed fetch response.
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
