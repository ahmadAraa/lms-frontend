import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BASE_URL, CourseResponseDTO } from '../types/course-builder.types';
import { fetchJson } from './course-builder-api.utils';

/**
 * Payload used when creating or updating a course.
 */
interface CourseFormDto {
  title: string;
  description: string | null;
  learningPathId: number;
  picture?: File | null;
}

/**
 * Service responsible for managing courses.
 *
 * Features:
 * - Fetch courses by learning path
 * - Fetch a single course by ID
 * - Create course with optional image upload
 * - Update course with optional image upload
 * - Delete course
 */
@Injectable({
  providedIn: 'root',
})
export class CoursesApiService {
  constructor(private http: HttpClient) {}

  /**
   * Fetches all courses that belong to a specific learning path.
   */
  async getCoursesByPath(learningPathId: number): Promise<CourseResponseDTO[]> {
    return fetchJson<CourseResponseDTO[]>(
      `${BASE_URL}/api/Course/GetCoursesByPath/${learningPathId}`
    );
  }

  /**
   * Fetches one course by ID.
   */
  async getCourseById(id: number): Promise<CourseResponseDTO> {
    return fetchJson<CourseResponseDTO>(`${BASE_URL}/api/Course/${id}`);
  }

  /**
   * Fetches all courses the current employee is directly enrolled in
   * (not via a learning path).
   */
  async getMyCourses(): Promise<CourseResponseDTO[]> {
    return fetchJson<CourseResponseDTO[]>(`${BASE_URL}/api/Course/GetMyCourses`);
  }

  /**
   * Creates a new course.
   *
   * Uses FormData because course image upload requires multipart/form-data.
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
   * Uses FormData to support optional image replacement.
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
   * Deletes a course by ID.
   */
  async deleteCourse(id: number): Promise<void> {
    await fetchJson<void>(`${BASE_URL}/api/Course/DeleteCourse/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reorders courses within a learning path.
   */
  async reorderCourses(dto: { id: number; order: number }[]): Promise<void> {
    let headers = this.authHeaders();
    headers = headers.set('Content-Type', 'application/json');

    await firstValueFrom(
      this.http.post(`${BASE_URL}/api/Course/reorder`, dto, {
        headers,
      })
    );
  }

  /**
   * Builds FormData for create/update course requests.
   *
   * Important:
   * - Do NOT manually set Content-Type.
   * - Browser automatically sets multipart/form-data boundary.
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
   * Builds authorization headers for protected course endpoints.
   *
   * Only Authorization is set.
   * Content-Type is intentionally omitted for FormData requests.
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