import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BASE_URL, CourseResponseDTO } from '../../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Data payload format representing the form model when creating or updating a course.
 */
interface CourseFormDto {
  /** The course title */
  title: string;
  /** Detailed course description, or null if empty */
  description: string | null;
  /** The unique ID of the parent learning path this course belongs to */
  learningPathId: number;
  /** An optional picture/banner cover image file associated with the course */
  picture?: File | null;
}

/**
 * Data payload used to represent a new ordering placement of a course in a path.
 */
interface ReorderCourseDto {
  /** The unique course identifier */
  id: number;
  /** The new 0-indexed relative display position order */
  order: number;
}

/**
 * Service responsible for managing all course-related CRUD and administration operations.
 *
 * Facilitates:
 * - Fetching course listings by learning path or active enrollment
 * - Retrieval of a single course by unique identifier
 * - Course addition and revision with multipart FormData cover image handling
 * - Course deletion and sequencing within a learning path
 */
@Injectable({
  providedIn: 'root',
})
export class CoursesApiService {
  constructor(private http: HttpClient) {}

  /**
   * Retrieves all courses assigned under a specific learning path.
   *
   * @param learningPathId - The unique ID of the target learning path.
   * @returns A promise resolving to an array of courses (`CourseResponseDTO[]`).
   */
  async getCoursesByPath(learningPathId: number): Promise<CourseResponseDTO[]> {
    return fetchJson<CourseResponseDTO[]>(
      `${BASE_URL}/api/Course/GetCoursesByPath/${learningPathId}`
    );
  }

  /**
   * Retrieves details of a single course.
   *
   * @param id - The unique ID of the course.
   * @returns A promise resolving to the matching `CourseResponseDTO`.
   */
  async getCourseById(id: number): Promise<CourseResponseDTO> {
    return fetchJson<CourseResponseDTO>(`${BASE_URL}/api/Course/${id}`);
  }

  /**
   * Retrieves all courses that the currently logged-in employee is enrolled in directly,
   * bypassing learning path associations.
   *
   * @returns A promise resolving to an array of matching `CourseResponseDTO[]` elements.
   */
  async getMyCourses(): Promise<CourseResponseDTO[]> {
    return fetchJson<CourseResponseDTO[]>(`${BASE_URL}/api/Course/GetMyCourses`);
  }

  /**
   * Creates a new course.
   *
   * Because course creation optionally accepts an image file, the payload is structured
   * as a multipart/form-data payload via browser `FormData`.
   *
   * @param dto - Object detailing the course input values.
   * @returns A promise that resolves when the course creation is complete.
   */
  async createCourse(dto: CourseFormDto): Promise<void> {
    const formData = this.buildFormData(dto);
    const headers = this.authHeaders();

    await firstValueFrom(
      this.http.post(`${BASE_URL}/api/Course/CreateCourses`, formData, {
        headers,
        responseType: 'text',
      })
    );
  }

  /**
   * Updates an existing course.
   *
   * Structures the update fields and optional updated image into multipart `FormData`.
   *
   * @param id - The unique ID of the course to update.
   * @param dto - Object detailing the modified course properties.
   * @returns A promise that resolves when the backend updates are saved.
   */
  async updateCourse(id: number, dto: CourseFormDto): Promise<void> {
    const formData = this.buildFormData(dto);
    const headers = this.authHeaders();

    await firstValueFrom(
      this.http.put(`${BASE_URL}/api/Course/UpdateCourse/${id}`, formData, {
        headers,
        responseType: 'text',
      })
    );
  }

  /**
   * Deletes a course from the system.
   *
   * @param id - The unique course identifier.
   * @returns A promise resolving when the deletion is completed.
   */
  async deleteCourse(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Course/DeleteCourse/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Submits a list of courses and their updated sequence numbers to save re-ordering.
   *
   * @param dto - Array containing course IDs and their target order index values.
   * @returns A promise that resolves once the sequence is persisted.
   */
  async reorderCourses(dto: ReorderCourseDto[]): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Course/reorder`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  /**
   * Helper method that transforms a course form data object into a standard `FormData` payload.
   * Excludes optional values like descriptions or cover pictures if they are not provided.
   *
   * @param dto - The source course form transfer object.
   * @returns An configured browser `FormData` instance.
   */
  private buildFormData(dto: CourseFormDto): FormData {
    const formData = new FormData();

    formData.append('Title', dto.title);
    formData.append('LearningPathId', String(dto.learningPathId));

    if (dto.description) {
      formData.append('Description', dto.description);
    }

    if (dto.picture) {
      formData.append('Image', dto.picture);
    }

    return formData;
  }

  /**
   * Utility helper compiling standard authentication bearer headers from browser local storage.
   * Avoids defining Content-Type headers explicitly to prevent breaking multipart boundaries.
   *
   * @returns An `HttpHeaders` instance configured with the active token or empty.
   */
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');

    if (!token || token === 'undefined' || token === 'null') {
      return new HttpHeaders();
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
