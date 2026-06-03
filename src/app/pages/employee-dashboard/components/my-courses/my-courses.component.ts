import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseResponseDTO } from '../../../../core/services/learning-path.service';
import { BASE_URL } from '../../../../types/course-builder.types';

/**
 * Represents a single course enrollment mapping back to its parent learning path wrapper.
 */
interface EnrolledCourse {
  /** The course response data payload. */
  course: CourseResponseDTO;
  /** The parent learning path's ID, or 0 if it is a direct course assignment. */
  learningPathId: number;
  /** The parent learning path's title, or 'Direct Assignment' if assigned directly. */
  learningPathTitle: string;
}

/**
 * Presentational component displaying a grid of the employee's active enrolled courses.
 *
 * Details each course with dynamic gradients or custom graphics, showing corresponding progress
 * indicators and trigger event mappings to open detailed views.
 */
@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-courses.component.html',
  styleUrl: './my-courses.component.css',
})
export class MyCoursesComponent {
  /**
   * List of all active enrolled courses.
   */
  @Input({ required: true }) enrolledCourses!: EnrolledCourse[];

  /**
   * Map containing completion progress percentages keyed by course ID.
   */
  @Input({ required: true }) courseProgressMap!: Map<number, number>;

  /**
   * Emits the selected course and its parent learning path ID to trigger course viewer routing.
   */
  @Output() open = new EventEmitter<{ course: CourseResponseDTO; learningPathId: number }>();

  /**
   * Array of vibrant linear gradients used for course card covers.
   * @private
   */
  private readonly gradients = [
    'linear-gradient(135deg, #0f1b3d 0%, #1e3a8a 100%)',
    'linear-gradient(135deg, #065f56 0%, #0d9488 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  ];

  /**
   * Returns the completion progress of a course from the local course progress cache map.
   *
   * @param courseId - The unique identifier of the course.
   * @returns The progress percentage integer from 0 to 100.
   */
  getCourseProgress(courseId: number): number {
    return this.courseProgressMap.get(courseId) ?? 0;
  }

  /**
   * Returns the linear gradient background styling string at the specified sequence index.
   *
   * @param index - The array index.
   * @returns A CSS linear-gradient string.
   */
  getGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  /**
   * Resolves the proper relative or absolute HTTP URL for the course cover picture.
   *
   * @param course - The target course object.
   * @returns The fully qualified image URL string, or empty if undefined.
   */
  getCoursePictureUrl(course: CourseResponseDTO): string {
    if (!course.image) return '';
    if (course.image.startsWith('http')) return course.image;
    return `${BASE_URL}/${course.image.replace(/^\//, '')}`;
  }
}
