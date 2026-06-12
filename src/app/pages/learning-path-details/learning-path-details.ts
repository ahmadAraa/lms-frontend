import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LearningPathService, LearningPathResponseDto, CourseResponseDTO } from '../../core/services/learning-path.service';
import { ProgressService } from '../../core/services/progress.service';
import { AuthService } from '../../core/services/auth';
import { ToastService } from '../../core/services/toast.service';
import { BASE_URL } from '../../types/course-builder.types';

/**
 * Component displaying details of a specific learning path.
 *
 * Shows path metadata, nested courses sequencing, individual course completion
 * statuses, and supports conditional course navigation access checks for employees.
 */
@Component({
  selector: 'app-learning-path-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './learning-path-details.html',
  styleUrl: './learning-path-details.css'
})
export class LearningPathDetails implements OnInit {
  /**
   * Signal carrying the unique numeric identifier of the learning path.
   */
  pathId = signal<number | null>(null);

  /**
   * Signal carrying the resolved detailed learning path payload structure.
   */
  path = signal<LearningPathResponseDto | null>(null);

  /**
   * Signal containing the completion progress percentage of courses within the path, keyed by course ID.
   */
  courseProgressMap = signal<Map<number, number>>(new Map());

  /**
   * Signal tracking whether the path details API request is active.
   */
  isLoading = signal(true);

  /**
   * Signal carrying the description of active API communication errors.
   */
  error = signal('');

  /**
   * Base local backend server URL for relative graphic payloads.
   * @private
   */
  private readonly baseUrl = BASE_URL;

  /**
   * Constructs the LearningPathDetails component.
   *
   * @param route - The ActivatedRoute containing snapshot parameters for ID parsing.
   * @param router - The router used to go back to dashboards or navigate to lessons/courses.
   * @param learningPathService - Service executing detailed path fetches.
   * @param progressService - Service managing dynamic course locks and course progress mapping.
   * @param authService - Service identifying the active user role claims context.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningPathService: LearningPathService,
    private progressService: ProgressService,
    private authService: AuthService,
    private toast: ToastService,
  ) {}

  /**
   * Dynamic navigation function returning users to the correct dashboard based on administrative permissions.
   */
  goBack() {
    void this.router.navigate(this.isStaffPreview() ? ['/learning-paths'] : ['/employee/dashboard']);
  }

  /**
   * Triggers the course viewer workflow. Verifies authorization locks dynamically for employees.
   * Routes the user straight to the first available lesson in the course if access is permitted.
   *
   * @param course - The course payload.
   */
  async openCourse(course: CourseResponseDTO) {
    if (!this.isStaffPreview()) {
      const access = await this.progressService.canAccess(course.id);
      if (!access.canAccess) {
        this.toast.error(access.reason || 'This course is locked. Please complete the previous course to unlock.');
        return;
      }
    }

    if (course.sections && course.sections.length > 0) {
      for (const section of course.sections) {
        if (section.lessons && section.lessons.length > 0) {
          const firstLesson = section.lessons[0] as { id?: number };
          if (firstLesson.id) {
            void this.router.navigate(['/lesson', firstLesson.id], {
              state: { courseId: course.id, pathId: this.pathId() },
            });
            return;
          }
        }
      }
    }

    if (this.isStaffPreview()) {
      void this.router.navigate(['/course', course.id], {
        state: { course, pathId: this.pathId() }
      });
    } else {
      this.toast.error('This course does not have any lessons available.');
    }
  }

  /**
   * Resolves the proper relative or absolute URL string for the course cover graphic.
   *
   * @param course - The course DTO.
   * @returns The fully qualified image URL string.
   */
  getCourseImageUrl(course: CourseResponseDTO): string {
    if (!course.image) return '';
    if (course.image.startsWith('http')) return course.image;
    return `${this.baseUrl}/${course.image.replace(/^\//, '')}`;
  }

  /**
   * Calculates the total number of lessons aggregated across all sections inside a course.
   *
   * @param course - The course DTO.
   * @returns The integer lesson count.
   */
  getLessonCount(course: CourseResponseDTO): number {
    if (!course.sections) return 0;
    return course.sections.reduce((sum, s) => sum + (s.lessons?.length ?? 0), 0);
  }

  /**
   * Returns the count of sections defined directly inside a course.
   *
   * @param course - The course DTO.
   * @returns The section count.
   */
  getSectionCount(course: CourseResponseDTO): number {
    return course.sections?.length ?? 0;
  }

  /**
   * Returns the completion progress of a course from the local course progress cache map.
   *
   * @param courseId - The unique identifier of the course.
   * @returns The progress percentage integer from 0 to 100.
   */
  getCourseProgress(courseId: number): number {
    return this.courseProgressMap().get(courseId) ?? 0;
  }

  /**
   * Maps a course progress ratio to a user-friendly string state identifier.
   *
   * @param courseId - The unique identifier of the course.
   * @returns 'Completed' if progress is 100, 'In Progress' if > 0, otherwise 'Available'.
   */
  getCourseStatus(courseId: number): string {
    const progress = this.getCourseProgress(courseId);
    if (progress >= 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Available';
  }

  /**
   * Angular initialization hook. Extracts the ID parameter from the active routing parameters
   * and triggers the path details payload fetch.
   */
  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.pathId.set(parseInt(idParam, 10));
      this.loadPathDetails();
    } else {
      this.isLoading.set(false);
      this.error.set('No path ID found in the URL.');
    }
  }

  /**
   * Queries the LearningPathService to retrieve details for the specified pathId.
   */
  loadPathDetails() {
    if (!this.pathId()) return;

    this.isLoading.set(true);
    this.learningPathService.getPathById(this.pathId()!).subscribe({
      next: (data) => {
        this.path.set(data);
        this.isLoading.set(false);
        void this.loadCourseProgress(data.courses ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(`Error ${err.status}: ${err.message}`);
        this.isLoading.set(false);
        console.error('loadPathDetails failed:', err);
      }
    });
  }

  /**
   * Populates the course progress cache map by executing parallel progress checks
   * on all courses contained in the learning path. Staff previews bypass progress checks.
   *
   * @param courses - The list of courses to query.
   */
  async loadCourseProgress(courses: CourseResponseDTO[]) {
    if (this.isStaffPreview()) {
      this.courseProgressMap.set(new Map());
      return;
    }

    const courseIds = [...new Set(courses.map((course) => course.id).filter(Boolean))];

    if (courseIds.length === 0) {
      this.courseProgressMap.set(new Map());
      return;
    }

    const results = await Promise.all(
      courseIds.map((courseId) => this.progressService.getCourseProgress(courseId))
    );
    const progressMap = new Map<number, number>();
    results.forEach((result) => progressMap.set(result.courseId, result.progress));
    this.courseProgressMap.set(progressMap);
  }

  /**
   * Returns whether the active user possesses administrative permissions,
   * which enables full course unlocking previews.
   *
   * @returns True if the user is staff, otherwise false.
   */
  isStaffPreview(): boolean {
    const role = this.authService.getUserRole();

    return role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER';
  }
}
