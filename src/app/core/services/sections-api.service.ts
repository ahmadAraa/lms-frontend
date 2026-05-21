import { Injectable } from '@angular/core';
import { BASE_URL, LessonResponseDTO, SectionResponseDTO } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely extracts an array from a value. Handles potential wrapper objects from APIs
 * (such as .NET Entity Framework collections wrapped in `$values`, `values`, `Items`, or `items`).
 *
 * @param value - The value to parse as an array.
 * @returns The extracted array or an empty array if invalid.
 */
function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const wrappedValues = node['$values'] ?? node['values'] ?? node['Items'] ?? node['items'];

  return Array.isArray(wrappedValues) ? wrappedValues : [];
}

/**
 * Safely casts an unknown value to a record object.
 * Returns an empty object if the input is null, undefined, or not an object.
 *
 * @param value - The value to cast.
 * @returns A record mapping string keys to unknown values.
 */
function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

/**
 * Converts an unknown value to a string or null.
 *
 * @param value - The value to convert.
 * @returns The converted string or null.
 */
function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'string' ? value : String(value);
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
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

/**
 * Extracts a property value from a record object, checking both camelCase and PascalCase variations.
 * This is useful for dealing with inconsistent API response formats (e.g., C# PascalCase serialization).
 *
 * @param node - The record object to extract from.
 * @param camelCaseKey - The camelCase representation of the property key.
 * @param pascalCaseKey - The PascalCase representation of the property key.
 * @returns The value of the property if found; otherwise undefined.
 */
function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string,
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

/**
 * Normalizes a raw lesson record to a LessonResponseDTO.
 * Sanitizes and checks both camelCase and PascalCase variations of property names.
 *
 * @param raw - The raw lesson object to normalize.
 * @returns The sanitized LessonResponseDTO object.
 */
function normalizeLesson(raw: unknown): LessonResponseDTO {
  const node = asObject(raw);

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: String(getValue(node, 'title', 'Title') ?? ''),
    description: toNullableString(getValue(node, 'description', 'Description')),
    content: toNullableString(getValue(node, 'content', 'Content')),
    videoUrl: toNullableString(getValue(node, 'videoUrl', 'VideoUrl')),
    order: toNumber(getValue(node, 'order', 'Order')),
    sectionId: toNumber(getValue(node, 'sectionId', 'SectionId')),
    type: toNumber(getValue(node, 'type', 'Type')),
    isComplete: Boolean(getValue(node, 'isComplete', 'IsComplete') ?? false),
  };
}

/**
 * Normalizes a raw section record to a SectionResponseDTO, recursively normalizing its lessons array.
 * Sanitizes and checks both camelCase and PascalCase variations of property names.
 *
 * @param raw - The raw section object to normalize.
 * @returns The sanitized SectionResponseDTO object.
 */
function normalizeSection(raw: unknown): SectionResponseDTO {
  const node = asObject(raw);

  return {
    id: toNumber(getValue(node, 'id', 'Id')),
    title: String(getValue(node, 'title', 'Title') ?? ''),
    description: toNullableString(getValue(node, 'description', 'Description')),
    order: toNumber(getValue(node, 'order', 'Order')),
    courseId: toNumber(getValue(node, 'courseId', 'CourseId')),
    lessons: readArray(getValue(node, 'lessons', 'Lessons')).map(normalizeLesson),
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * SectionsApiService manages CRUD operations and sequencing logic for course sections and their nested lessons.
 */
@Injectable({
  providedIn: 'root',
})
export class SectionsApiService {
  /**
   * Fetches all sections associated with a specific course, including nested lessons.
   *
   * @param courseId - The unique identifier of the course.
   * @returns A promise resolving to an array of normalized SectionResponseDTOs.
   */
  async getSectionsByCourse(courseId: number): Promise<SectionResponseDTO[]> {
    const data = await fetchJson<unknown>(
      `${BASE_URL}/api/Sections/GetSectionsByCourse/${courseId}`,
    );

    return readArray(data).map(normalizeSection);
  }

  /**
   * Fetches a specific section's details by its ID.
   *
   * @param id - The unique identifier of the section.
   * @returns A promise resolving to the normalized SectionResponseDTO.
   */
  async getSectionById(id: number): Promise<SectionResponseDTO> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Sections/GetSectionById/${id}`);

    return normalizeSection(data);
  }

  /**
   * Creates a new section within a course.
   *
   * @param dto - The data transfer object for creating a section.
   * @param dto.title - The title of the section.
   * @param dto.description - An optional description of the section.
   * @param dto.courseId - The ID of the course containing this section.
   * @returns A promise resolving when the section creation is completed.
   */
  async createSection(dto: {
    title: string;
    description: string | null;
    courseId: number;
  }): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/CreateSection`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Updates an existing section's details.
   *
   * @param id - The unique identifier of the section to update.
   * @param dto - The data transfer object for updating the section.
   * @param dto.title - The new title of the section.
   * @param dto.description - The new description of the section (can be null).
   * @returns A promise resolving when the section update is completed.
   */
  async updateSection(
    id: number,
    dto: {
      title: string;
      description: string | null;
    },
  ): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Deletes a specific section by its unique identifier.
   *
   * @param id - The unique identifier of the section to delete.
   * @returns A promise resolving when the section is deleted.
   */
  async deleteSection(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reorders sections within a course based on a list of ID and order index mapping pairs.
   *
   * @param dto - An array of section order mappings.
   * @param dto[].id - The unique identifier of the section.
   * @param dto[].order - The target sequence order index.
   * @returns A promise resolving when the reordering is completed.
   */
  async reorderSections(dto: { id: number; order: number }[]): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
