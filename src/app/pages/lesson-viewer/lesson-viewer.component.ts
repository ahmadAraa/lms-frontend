import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonsApiService } from '../../core/services/lessons-api.service';
import { SectionsApiService } from '../../core/services/sections-api.service';
import { CoursesApiService } from '../../core/services/courses-api.service';
import { ProgressService } from '../../core/services/progress.service';
import { AuthService } from '../../core/services/auth';
import {
  LessonResponseDTO,
  SectionResponseDTO,
  CourseResponseDTO,
} from '../../types/course-builder.types';

import { LessonSidebarComponent } from './components/lesson-sidebar/lesson-sidebar.component';
import { LessonContentComponent } from './components/lesson-content/lesson-content.component';

/**
 * Component representing the rich Lesson Viewer layout view.
 *
 * Implements sidebar accordions with curriculum layout navigation, marks lessons complete,
 * performs live API authorization lock checks, and plays video files inside the content frame.
 */
@Component({
  selector: 'app-lesson-viewer',
  standalone: true,
  imports: [CommonModule, LessonSidebarComponent, LessonContentComponent],
  templateUrl: './lesson-viewer.component.html',
  styleUrl: './lesson-viewer.component.css',
})
export class LessonViewerComponent implements OnInit {
  /**
   * Signal carrying the currently active lesson response payload.
   */
  lesson = signal<LessonResponseDTO | null>(null);

  /**
   * Signal carrying the parent course details metadata structure.
   */
  course = signal<CourseResponseDTO | null>(null);

  /**
   * Signal storing the list of sections and their associated lessons under the active course.
   */
  sections = signal<SectionResponseDTO[]>([]);

  /**
   * Signal holding the set of expanded section ID values in the sidebar.
   */
  expandedSections = signal<Set<number>>(new Set());

  /**
   * Signal holding the set of unique IDs of completed lessons in the course curriculum.
   */
  completedLessons = signal<Set<number>>(new Set());

  /**
   * Computed signal mapping expanded section IDs into a standard array format.
   */
  expandedSectionIds = computed(() => Array.from(this.expandedSections()));

  /**
   * Computed signal mapping completed lesson IDs into a standard array format.
   */
  completedLessonIds = computed(() => Array.from(this.completedLessons()));

  /**
   * Signal indicating if a curriculum load transaction is currently active in the background.
   */
  isLoading = signal(true);

  /**
   * Signal indicating if a lesson completion update submission is active.
   */
  isCompleting = signal(false);

  /**
   * Signal carrying active API transaction error messages.
   */
  error = signal('');

  /**
   * Parent learning path ID context (can be null if directly assigned).
   */
  pathId: number | null = null;

  /**
   * Cached parent course ID parsed from routing parameters.
   * @private
   */
  private routeCourseId: number | null = null;

  /**
   * Signal representing whether the viewer is running as a staff preview mode (HR or MANAGER).
   */
  isPreviewMode = signal(false);

  /**
   * Constructs the LessonViewerComponent.
   *
   * @param route - ActivatedRoute to read parameter snapshot IDs.
   * @param router - Router to trigger path redirects.
   * @param lessonsApi - Service managing lesson detail queries and toggles.
   * @param sectionsApi - Service managing section data.
   * @param coursesApi - Service managing course data.
   * @param progressService - Service managing dynamic course locks.
   * @param authService - Service managing local authentication contexts.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private lessonsApi: LessonsApiService,
    private sectionsApi: SectionsApiService,
    private coursesApi: CoursesApiService,
    private progressService: ProgressService,
    private authService: AuthService,
  ) {}

  /**
   * Angular initialization hook. Identifies preview status contexts, decodes parameter states,
   * and triggers the reactive curriculum loader subscription stream.
   */
  ngOnInit() {
    this.isPreviewMode.set(this.isStaffPreview());

    const state = history.state as Record<string, unknown>;
    this.pathId = this.toNullableNumber(state?.['pathId']);
    this.routeCourseId = this.toNullableNumber(state?.['courseId']);

    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        void this.loadLessonAndCurriculum(id);
      } else {
        this.error.set('Lesson not found.');
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Loads the specified lesson detail and its full sibling course curriculum in parallel.
   * Conducts critical access checks for employees and marks lessons as completed in the sidebar.
   *
   * @param lessonId - The unique identifier of the lesson to load.
   */
  async loadLessonAndCurriculum(lessonId: number) {
    this.isLoading.set(true);
    this.error.set('');
    let courseId = this.routeCourseId;

    try {
      if (courseId && !this.isPreviewMode()) {
        const access = await this.progressService.canAccess(courseId);
        if (!access.canAccess) {
          this.redirectToLockedCourse(courseId, access.reason);
          return;
        }
      }

      const lesson = await this.lessonsApi.getLessonById(lessonId);
      this.lesson.set(lesson);

      this.expandedSections.update((set) => new Set(set).add(lesson.sectionId));

      if (!this.course() || !this.sections().some((s) => s.id === lesson.sectionId)) {
        const section = await this.sectionsApi.getSectionById(lesson.sectionId);
        courseId = section.courseId;
        this.routeCourseId = courseId;

        if (!this.isPreviewMode()) {
          const access = await this.progressService.canAccess(courseId);
          if (!access.canAccess) {
            this.redirectToLockedCourse(courseId, access.reason);
            return;
          }
        }

        const [course, allSections] = await Promise.all([
          this.coursesApi.getCourseById(courseId),
          this.sectionsApi.getSectionsByCourse(courseId),
        ]);

        // GetSectionsByCourse doesn't include isComplete on lessons.
        // Fetch lessons per section via GetLessonsBySection (which does) in parallel.
        const lessonGroups = await Promise.all(
          allSections.map((sec) => this.lessonsApi.getLessonsBySection(sec.id)),
        );

        // Merge lesson data (with isComplete) into sections + build completed set
        const completed = new Set<number>();
        const sectionsWithProgress = allSections.map((sec, i) => {
          for (const l of lessonGroups[i]) {
            if (l.isComplete) completed.add(l.id);
          }
          return { ...sec, lessons: lessonGroups[i] };
        });

        this.course.set(course);
        this.sections.set(sectionsWithProgress);
        this.completedLessons.set(completed);
      }
    } catch (e) {
      if (courseId && !this.isPreviewMode() && this.isAccessDeniedError(e)) {
        this.redirectToLockedCourse(courseId);
        return;
      }

      this.error.set('Failed to load lesson or curriculum.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggles the visible expanded state of a section accordion.
   *
   * @param sectionId - The unique section ID to toggle.
   */
  toggleSection(sectionId: number) {
    const current = new Set(this.expandedSections());
    if (current.has(sectionId)) {
      current.delete(sectionId);
    } else {
      current.add(sectionId);
    }
    this.expandedSections.set(current);
  }

  /**
   * Routes the viewer directly to a sibling lesson screen.
   *
   * @param lessonId - The unique identifier of the lesson to open.
   */
  openLesson(lessonId: number) {
    if (this.lesson()?.id === lessonId) return;
    this.router.navigate(['/lesson', lessonId], {
      state: { courseId: this.course()?.id ?? this.routeCourseId, pathId: this.pathId },
    });
  }

  /**
   * Optimistically marks a lesson as completed in the UI and pushes the update to the database.
   * Reverts changes in the UI should the network operation fail.
   *
   * @param eventData - Object containing the unique lesson ID and the mouse trigger event.
   */
  async toggleCompletion(eventData: { lessonId: number; event: Event }) {
    const { lessonId, event } = eventData;
    event.stopPropagation();

    if (this.isPreviewMode()) return;

    const completed = new Set(this.completedLessons());
    if (completed.has(lessonId)) return;

    // Optimistic update: mark complete immediately and persist.
    completed.add(lessonId);
    this.completedLessons.set(completed);

    this.isCompleting.set(true);
    try {
      await this.lessonsApi.completeLesson(lessonId);
    } catch {
      // Revert optimistic update if the API call failed
      const reverted = new Set(this.completedLessons());
      reverted.delete(lessonId);
      this.completedLessons.set(reverted);
    } finally {
      this.isCompleting.set(false);
    }
  }

  /**
   * Navigates back to the parent learning path details or employee dashboard view.
   */
  goBack() {
    if (this.isPreviewMode()) {
      void this.router.navigate(this.pathId ? ['/learning-paths', this.pathId] : ['/learning-paths']);
      return;
    }

    void this.router.navigate(['/employee/dashboard']);
  }

  /**
   * Redirects the user directly to the Course locked detail page.
   *
   * @param courseId - The locked course ID.
   * @param lockReason - The detailed locking explanation message.
   * @private
   */
  private redirectToLockedCourse(courseId: number, lockReason?: string) {
    void this.router.navigate(['/course', courseId], {
      state: {
        course: this.course(),
        pathId: this.pathId,
        lockReason,
      },
    });
  }

  /**
   * Checks if an error object represents an HTTP 403 authorization block.
   *
   * @param error - The raw error details.
   * @returns True if denied, otherwise false.
   * @private
   */
  private isAccessDeniedError(error: unknown): boolean {
    const message = (error as { message?: string })?.message?.toLowerCase() ?? '';

    return message.includes('403') || message.includes('complete previous');
  }

  /**
   * Converts an unknown value to a nullable number.
   *
   * @param value - The input value.
   * @returns The parsed finite number, or null.
   * @private
   */
  private toNullableNumber(value: unknown): number | null {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }

  /**
   * Returns whether the active user possesses administrative permissions (HR or MANAGER),
   * enabling full course unlocking previews.
   *
   * @returns True if the user is staff, otherwise false.
   * @private
   */
  private isStaffPreview(): boolean {
    const role = this.authService.getUserRole();

    return role === 'HR' || role === 'MANAGER';
  }
}
