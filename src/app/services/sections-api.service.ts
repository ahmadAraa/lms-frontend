import { Injectable } from '@angular/core';
import { BASE_URL, LessonResponseDTO, SectionResponseDTO } from '../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  const node = asObject(value);

  const wrappedValues = node['$values'] ?? node['values'] ?? node['Items'] ?? node['items'];

  return Array.isArray(wrappedValues) ? wrappedValues : [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, unknown>;
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'string' ? value : String(value);
}

function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getValue(
  node: Record<string, unknown>,
  camelCaseKey: string,
  pascalCaseKey: string,
): unknown {
  return node[camelCaseKey] ?? node[pascalCaseKey];
}

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

@Injectable({
  providedIn: 'root',
})
export class SectionsApiService {
  async getSectionsByCourse(courseId: number): Promise<SectionResponseDTO[]> {
    const data = await fetchJson<unknown>(
      `${BASE_URL}/api/Sections/GetSectionsByCourse/${courseId}`,
    );

    return readArray(data).map(normalizeSection);
  }

  async getSectionById(id: number): Promise<SectionResponseDTO> {
    const data = await fetchJson<unknown>(`${BASE_URL}/api/Sections/GetSectionById/${id}`);

    return normalizeSection(data);
  }

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

  async deleteSection(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderSections(dto: { id: number; order: number }[]): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Sections/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
