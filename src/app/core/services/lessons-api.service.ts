import { Injectable } from '@angular/core';
import { BASE_URL, LessonResponseDTO } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Service responsible for managing lessons.
 *
 * Features:
 * - Fetch lessons by section
 * - Fetch single lesson
 * - Create lesson (with file upload support)
 * - Update lesson
 * - Delete lesson
 * - Mark lesson as completed
 */
@Injectable({
  providedIn: 'root',
})
export class LessonsApiService {
  /**
   * Fetch all lessons for a specific section.
   *
   * @param sectionId - Section ID
   * @returns Promise<LessonResponseDTO[]>
   */
  async getLessonsBySection(sectionId: number): Promise<LessonResponseDTO[]> {
    return fetchJson<LessonResponseDTO[]>(
      `${BASE_URL}/api/Lessons/GetLessonsBySection/${sectionId}`,
    );
  }

  /**
   * Fetch a single lesson by its ID.
   *
   * @param id - Lesson ID
   * @returns Promise<LessonResponseDTO>
   */
  async getLessonById(id: number): Promise<LessonResponseDTO> {
    return fetchJson<LessonResponseDTO>(`${BASE_URL}/api/Lessons/GetLessonById/${id}`);
  }

  /**
   * Creates a new lesson.
   *
   * Supports:
   * - Video file upload
   * - External link
   * - Text content
   *
   * Uses FormData because backend expects multipart/form-data.
   *
   * @param dto - Lesson creation payload
   */
  async createLesson(dto: {
    title: string;
    description: string | null;
    content: string | null;
    videoUrl?: File;
    linkUrl?: string;
    materialType: number;
    sectionId: number;
    order: number;
  }): Promise<void> {
    const formData = new FormData();

    formData.append('title', dto.title);

    if (dto.description) formData.append('description', dto.description);
    if (dto.content) formData.append('content', dto.content);
    if (dto.videoUrl) formData.append('videoUrl', dto.videoUrl);
    if (dto.linkUrl) formData.append('linkUrl', dto.linkUrl);

    formData.append('materialType', String(dto.materialType));
    formData.append('sectionId', String(dto.sectionId));
    formData.append('order', String(dto.order));

    // ── Authorization Header ────────────────────────────────────────────────

    const headers = new Headers();

    const token = localStorage.getItem('token');

    if (token && token !== 'undefined' && token !== 'null') {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // ── API Call ────────────────────────────────────────────────────────────

    const response = await fetch(`${BASE_URL}/api/Lessons/CreateLesson`, {
      method: 'POST',
      headers,
      body: formData,
    });

    // ── Error Handling ──────────────────────────────────────────────────────

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

      try {
        const errorBody = await response.json();
        errorMessage =
          errorBody?.message || errorBody?.title || JSON.stringify(errorBody) || errorMessage;
      } catch {
        try {
          const text = await response.text();
          if (text) errorMessage = text;
        } catch {}
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Updates an existing lesson.
   *
   * @param id - Lesson ID
   * @param dto - Updated lesson data
   */
  async updateLesson(
    id: number,
    dto: {
      title: string;
      description: string | null;
      content: string | null;
    },
  ): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Deletes a lesson.
   *
   * @param id - Lesson ID
   */
  async deleteLesson(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Sets the completion state of a lesson for the current user.
   *
   * @param lessonId  - Lesson ID
   */
  async completeLesson(lessonId: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/CompleteLesson/${lessonId}`, {
      method: 'POST',
    });
  }

  async reorderLessons(dto: { id: number; order: number }[]): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
