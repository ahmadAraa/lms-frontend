import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { LessonsApiService } from '../../core/services/lessons-api.service';
import { SectionsApiService } from '../../core/services/sections-api.service';
import { CoursesApiService } from '../../core/services/courses-api.service';
import { LearningPathsApiService } from '../../core/services/learning-paths-api.service';
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
   * Flat, ordered list of all lessons across all sections in the active course.
   */
  flatLessons = computed(() =>
    this.sections().flatMap((section) => section.lessons ?? []),
  );

  /**
   * Total number of lessons in the course.
   */
  totalLessons = computed(() => this.flatLessons().length);

  /**
   * The 1-based position of the active lesson within the course (0 when unknown).
   */
  currentLessonNumber = computed(() => {
    const current = this.lesson();
    if (!current) return 0;
    const index = this.flatLessons().findIndex((l) => l.id === current.id);
    return index >= 0 ? index + 1 : 0;
  });

  /**
   * ID of the next lesson in sequence, or null when on the last lesson.
   */
  nextLessonId = computed<number | null>(() => {
    const lessons = this.flatLessons();
    const current = this.lesson();
    if (!current) return null;
    const index = lessons.findIndex((l) => l.id === current.id);
    if (index < 0 || index + 1 >= lessons.length) return null;
    return lessons[index + 1].id;
  });

  /**
   * Whether the currently displayed lesson has been marked complete.
   */
  isCurrentLessonComplete = computed(() => {
    const current = this.lesson();
    return !!current && this.completedLessons().has(current.id);
  });

  /**
   * Course completion percentage, rounded to the nearest whole number.
   */
  progressPercent = computed(() => {
    const total = this.totalLessons();
    if (total === 0) return 0;
    return Math.round((this.completedLessons().size / total) * 100);
  });

  /**
   * Ordered list of sibling courses inside the active learning path (empty when no path context).
   */
  pathCourses = signal<CourseResponseDTO[]>([]);

  /**
   * 1-based index of the active course within the learning path (0 when unknown).
   */
  currentCourseIndex = computed(() => {
    const courses = this.pathCourses();
    const currentCourseId = this.course()?.id;
    if (!currentCourseId || courses.length === 0) return 0;
    const idx = courses.findIndex((c) => c.id === currentCourseId);
    return idx >= 0 ? idx + 1 : 0;
  });

  /**
   * Whether another course follows the current one inside the learning path.
   */
  hasNextCourse = computed(() => {
    const courses = this.pathCourses();
    const idx = this.currentCourseIndex();
    return idx > 0 && idx < courses.length;
  });

  /**
   * First lesson ID of the next course in the learning path, or null when none.
   * Used by the "Next Course" action to deep-link directly into the next course.
   */
  nextCourseFirstLessonId = computed<number | null>(() => {
    if (!this.hasNextCourse()) return null;
    const nextCourse = this.pathCourses()[this.currentCourseIndex()];
    const sections = [...(nextCourse?.sections ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    for (const section of sections) {
      const firstLesson = [...(section.lessons ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      )[0];
      if (firstLesson?.id) return firstLesson.id;
    }
    return null;
  });

  /**
   * Whether the active lesson is the final lesson in the current course.
   */
  isLastLessonOfCourse = computed(() => {
    const lessons = this.flatLessons();
    const current = this.lesson();
    if (!current || lessons.length === 0) return false;
    return lessons[lessons.length - 1].id === current.id;
  });

  /**
   * Whether every lesson in the active course has been completed.
   */
  isCourseComplete = computed(() => {
    const total = this.totalLessons();
    if (total === 0) return false;
    return this.completedLessons().size >= total;
  });

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
   * Signal representing whether the viewer is running as a staff preview mode.
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
    private pathsApi: LearningPathsApiService,
    private progressService: ProgressService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.isPreviewMode.set(this.isStaffPreview());

    const state = history.state as Record<string, unknown>;
    this.pathId = this.toNullableNumber(state?.['pathId']);
    this.routeCourseId = this.toNullableNumber(state?.['courseId']);

    this.route.paramMap.subscribe((params) => {
      const currentState = history.state as Record<string, unknown>;
      if (currentState?.['pathId'] !== undefined) {
        this.pathId = this.toNullableNumber(currentState['pathId']);
      }
      if (currentState?.['courseId'] !== undefined) {
        this.routeCourseId = this.toNullableNumber(currentState['courseId']);
      }

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

    try {
      const lesson = await this.lessonsApi.getLessonById(lessonId);
      this.lesson.set(lesson);

      this.expandedSections.update((set) => new Set(set).add(lesson.sectionId));

      const section = await this.sectionsApi.getSectionById(lesson.sectionId);
      const targetCourseId = section.courseId;
      const isNewCourse = !this.course() || this.course()?.id !== targetCourseId;

      if (isNewCourse) {
        // Clear course and sections immediately to prevent stale sidebar rendering during load
        this.course.set(null);
        this.sections.set([]);
        this.completedLessons.set(new Set());

        this.routeCourseId = targetCourseId;

        if (!this.isPreviewMode()) {
          const access = await this.progressService.canAccess(targetCourseId);
          if (!access.canAccess) {
            this.redirectToLockedCourse(targetCourseId, access.reason);
            return;
          }
        }

        const [courseResult, sectionsResult] = await Promise.all([
          this.coursesApi.getCourseById(targetCourseId).catch(() => null),
          this.sectionsApi
            .getSectionsByCourse(targetCourseId)
            .catch(() => [] as SectionResponseDTO[]),
        ]);

        // Per-course endpoints can come back empty/failed for staff preview or
        // newly-created courses (no enrollment yet). When that happens we fall
        // back to the parent learning-path tree, which already exposes the full
        // curriculum and works in every context.
        let resolvedCourse: CourseResponseDTO | null = courseResult;
        let resolvedSections: SectionResponseDTO[] = sectionsResult;

        const pathIdForFallback =
          this.pathId ??
          (resolvedCourse?.learningPathId ?? null);

        if ((!resolvedCourse || resolvedSections.length === 0) && pathIdForFallback) {
          try {
            const path = await this.pathsApi.getPathById(pathIdForFallback);
            const ordered = [...(path.courses ?? [])].sort(
              (a, b) => (a.order ?? 0) - (b.order ?? 0),
            );
            this.pathCourses.set(ordered);
            const courseInPath = ordered.find((c) => c.id === targetCourseId);
            if (!resolvedCourse && courseInPath) {
              resolvedCourse = courseInPath;
            }
            if (resolvedSections.length === 0 && courseInPath?.sections) {
              resolvedSections = [...courseInPath.sections].sort(
                (a, b) => (a.order ?? 0) - (b.order ?? 0),
              );
            }
          } catch {
            // Path lookup is non-fatal — fall through with whatever we have.
          }
        }

        // GetSectionsByCourse already returns lessons embedded in each section
        // (without the per-user `isComplete` flag). GetLessonsBySection re-fetches
        // them WITH the progress flag for enrolled employees. For admin preview
        // and other un-enrolled contexts the progress endpoint can return empty,
        // so we fall back to the embedded lessons in that case.
        const lessonGroups = await Promise.all(
          resolvedSections.map((sec) =>
            this.lessonsApi
              .getLessonsBySection(sec.id)
              .catch(() => [] as LessonResponseDTO[]),
          ),
        );

        const completed = new Set<number>();
        const sectionsWithProgress = resolvedSections.map((sec, i) => {
          const fetched = lessonGroups[i];
          const lessons = fetched.length > 0 ? fetched : (sec.lessons ?? []);
          for (const l of lessons) {
            if (l.isComplete) completed.add(l.id);
          }
          return { ...sec, lessons };
        });

        this.course.set(resolvedCourse);
        this.sections.set(sectionsWithProgress);
        this.completedLessons.set(completed);
      }

      // Automatically resolve pathId from the course if not set in navigation state
      const currentCourse = this.course();
      if (currentCourse && currentCourse.learningPathId) {
        this.pathId = currentCourse.learningPathId;
      }

      if (this.pathId) {
        if (this.pathCourses().length === 0 || this.pathCourses()[0]?.learningPathId !== this.pathId) {
          await this.loadPathCourses(this.pathId);
        }
      }
    } catch (e) {
      const section = this.lesson() ? await this.sectionsApi.getSectionById(this.lesson()!.sectionId).catch(() => null) : null;
      const targetCourseId = section ? section.courseId : this.routeCourseId;
      if (targetCourseId && !this.isPreviewMode() && this.isAccessDeniedError(e)) {
        this.redirectToLockedCourse(targetCourseId);
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
   * Marks the currently displayed lesson as complete (no-op if already complete or in preview mode).
   *
   * @param event - The originating click event.
   */
  markCurrentComplete(event: Event): void {
    const current = this.lesson();
    if (!current) return;
    void this.toggleCompletion({ lessonId: current.id, event });
  }

  /**
   * Navigates to the next lesson in the course sequence, if one exists.
   */
  goToNextLesson(): void {
    const nextId = this.nextLessonId();
    if (nextId !== null) this.openLesson(nextId);
  }

  /**
   * Navigates to the first lesson of the next course in the active learning path.
   * Falls back to navigating back to the path detail page when no next course exists.
   */
  goToNextCourse(): void {
    const nextLessonId = this.nextCourseFirstLessonId();
    if (nextLessonId === null) {
      this.goBack();
      return;
    }
    const courses = this.pathCourses();
    const nextCourse = courses[this.currentCourseIndex()] ?? null;

    void this.router.navigate(['/lesson', nextLessonId], {
      state: { courseId: nextCourse?.id ?? null, pathId: this.pathId },
    });
  }

  /**
   * Fetches the ordered list of sibling courses inside the parent learning path.
   * Used to power the "Next Course" navigation when the learner finishes a course.
   *
   * @param pathId - The learning path identifier.
   */
  private async loadPathCourses(pathId: number): Promise<void> {
    try {
      const path = await this.pathsApi.getPathById(pathId);
      const ordered = [...(path.courses ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      this.pathCourses.set(ordered);
    } catch {
      // Path lookup is non-fatal — falling back means "Next Course" simply won't render.
      this.pathCourses.set([]);
    }
  }

  /**
   * Routes the user to the home landing page appropriate for their role.
   */
  goHome(): void {
    if (this.isPreviewMode()) {
      void this.router.navigate(['/learning-paths']);
      return;
    }
    void this.router.navigate(['/employee/dashboard']);
  }

  /**
   * Routes the user to the learning paths context (admin list for staff,
   * active path detail for employees, or the dashboard fallback).
   */
  goToLearningPaths(): void {
    if (this.isPreviewMode()) {
      void this.router.navigate(['/learning-paths']);
      return;
    }
    if (this.pathId) {
      void this.router.navigate(['/learning-path', String(this.pathId)]);
      return;
    }
    void this.router.navigate(['/employee/dashboard']);
  }

  /**
   * Routes the user to the parent course detail page.
   */
  goToCourse(): void {
    if (this.isPreviewMode()) {
      const course = this.course();
      if (!course) return;
      void this.router.navigate(['/course', course.id], {
        state: { course, pathId: this.pathId },
      });
    } else {
      this.goToCourseBuilder();
    }
  }

  /**
   * Dispatches a breadcrumb navigation request to the appropriate destination.
   *
   * @param destination - Crumb identifier emitted by the content component.
   */
  onBreadcrumbNavigate(destination: 'home' | 'paths' | 'courses' | 'course'): void {
    switch (destination) {
      case 'home':
        this.goHome();
        return;
      case 'paths':
        this.goToLearningPaths();
        return;
      case 'courses':
        this.goToCourseBuilder();
        return;
      case 'course':
        this.goToCourse();
        return;
    }
  }

  /**
   * Routes the user to the "courses index" for the active learning path.
   * For staff preview this is the course-builder page (`/learning-paths/:pathId`);
   * for employees it's their path detail page (`/learning-path/:pathId`), which
   * lists the courses they have access to.
   */
  goToCourseBuilder(): void {
    if (this.isPreviewMode()) {
      if (this.pathId) {
        void this.router.navigate(['/learning-paths', this.pathId]);
        return;
      }
      void this.router.navigate(['/learning-paths']);
      return;
    }

    if (this.pathId) {
      void this.router.navigate(['/learning-path', String(this.pathId)]);
      return;
    }
    void this.router.navigate(['/employee/dashboard']);
  }

  /**
   * Navigates back to the parent learning path details or employee dashboard view.
   */
  goBack() {
    if (this.isPreviewMode()) {
      void this.router.navigate(this.pathId ? ['/learning-paths', this.pathId] : ['/learning-paths']);
      return;
    }

    void this.router.navigate(this.pathId ? ['/learning-path', String(this.pathId)] : ['/employee/dashboard']);
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
   * Returns whether the active user possesses administrative permissions,
   * enabling full course unlocking previews.
   *
   * @returns True if the user is staff, otherwise false.
   * @private
   */
  private isStaffPreview(): boolean {
    const role = this.authService.getUserRole();

    return role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER';
  }
}
