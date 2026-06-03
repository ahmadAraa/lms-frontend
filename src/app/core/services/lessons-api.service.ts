import { Injectable } from '@angular/core';
import { BASE_URL, LessonResponseDTO } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Service responsible for managing lesson items inside course sections.
 *
 * Provides CRUD capabilities for lessons, sequences them, supports file uploads
 * for video content via multi-part form requests, and allows users to check
 * off lesson completion states.
 */
@Injectable({
  providedIn: 'root',
})
export class LessonsApiService {
  /**
   * Retrieves all lessons associated under a specific course section.
   *
   * @param sectionId - The unique section ID.
   * @returns A promise resolving to an array of `LessonResponseDTO` elements.
   */
  async getLessonsBySection(sectionId: number): Promise<LessonResponseDTO[]> {
    return fetchJson<LessonResponseDTO[]>(
      `${BASE_URL}/api/Lessons/GetLessonsBySection/${sectionId}`,
    );
  }

  /**
   * Retrieves full details of a single lesson.
   *
   * @param id - Unique database ID of the lesson.
   * @returns A promise resolving to the corresponding `LessonResponseDTO` details.
   */
  async getLessonById(id: number): Promise<LessonResponseDTO> {
    return fetchJson<LessonResponseDTO>(`${BASE_URL}/api/Lessons/GetLessonById/${id}`);
  }

  /**
   * Publishes a new lesson.
   *
   * Accommodates text content, video uploads, or reference hyperlinks.
   * Compiles elements into browser `FormData` multi-part structure to properly upload video files.
   *
   * @param dto - Configuration arguments for lesson addition.
   * @param dto.title - Desired lesson title.
   * @param dto.description - Optional lesson description.
   * @param dto.content - Optional text content of the lesson.
   * @param dto.videoUrl - Optional video file for streaming lessons.
   * @param dto.linkUrl - Optional external hyperlink reference.
   * @param dto.materialType - Numerical enum ID representing material type (e.g. video, article, link).
   * @param dto.sectionId - Target section ID this lesson belongs to.
   * @param dto.order - Sequential order position index.
   * @returns A promise resolving once the lesson is added.
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
   * Updates text properties (title, description, content) of an existing lesson.
   * Does not support re-uploading video files here.
   *
   * @param id - Unique database identifier of the lesson.
   * @param dto - Object detailing updated text properties.
   * @returns A promise resolving when the lesson update is complete.
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
   * Deletes a lesson from the section database.
   *
   * @param id - Unique database ID of the lesson.
   * @returns A promise resolving once the deletion completes.
   */
  async deleteLesson(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Sets the completion state of a lesson to true for the currently logged-in user.
   *
   * @param lessonId - Unique database ID of the lesson completed.
   * @returns A promise resolving when the completion is successfully updated.
   */
  async completeLesson(lessonId: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/CompleteLesson/${lessonId}`, {
      method: 'POST',
    });
  }

  /**
   * Submits a batch of lesson sequences to save the updated ordering.
   *
   * @param dto - List containing lesson IDs and their target order indices.
   * @returns A promise resolving once the sequencing is completed.
   */
  async reorderLessons(dto: { id: number; order: number }[]): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Lessons/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}
