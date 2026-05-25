import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CoursesApiService } from '../../core/services/courses-api.service';
import { SectionsApiService } from '../../core/services/sections-api.service';
import { ProgressService } from '../../core/services/progress.service';
import { AuthService } from '../../core/services/auth';
import { CourseResponseDTO, SectionResponseDTO } from '../../types/course-builder.types';

/**
 * Component displaying details for a specific course.
 *
 * Shows course description, locked/unlocked state with lock details,
 * lists sections and nested lessons, and dynamically handles staff bypass triggers.
 */
@Component({
  selector: 'app-course-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './course-details.html',
  styleUrl: './course-details.css',
})
export class CourseDetails implements OnInit {
  /**
   * Signal carrying the course response details payload.
   */
  course = signal<CourseResponseDTO | null>(null);

  /**
   * Signal storing the active course section and nested lesson records.
   */
  sections = signal<SectionResponseDTO[]>([]);

  /**
   * Signal indicating if a course data loading transaction is active.
   */
  isLoading = signal(true);

  /**
   * Signal indicating if the course is currently locked by a prerequisite constraint rule.
   */
  isLocked = signal(false);

  /**
   * Signal displaying the reason explanation if the course is locked.
   */
  lockReason = signal('Complete the previous course to at least 85% to unlock this one.');

  /**
   * Signal carrying active API transaction error messages.
   */
  error = signal('');

  /**
   * Signal carrying the set of expanded section IDs in the details listing template.
   */
  expandedSections = signal<Set<number>>(new Set());

  /**
   * Parent learning path ID context (can be null if directly assigned).
   */
  pathId: number | null = null;

  /**
   * Temporarily stores the pending lock reason transferred from router navigation states.
   * @private
   */
  private pendingLockReason = '';

  /**
   * Constructs the CourseDetails component.
   *
   * @param route - ActivatedRoute to read parameter snapshot IDs.
   * @param router - Router to trigger path redirects.
   * @param coursesApi - Service managing course queries.
   * @param sectionsApi - Service managing course sections.
   * @param progressService - Service managing dynamic course locks and course progress mapping.
   * @param authService - Service managing local authentication contexts.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private coursesApi: CoursesApiService,
    private sectionsApi: SectionsApiService,
    private progressService: ProgressService,
    private authService: AuthService,
  ) {}

  /**
   * Angular initialization hook. Extracts course details from navigation state history (if available)
   * or parses parameter IDs directly to fire backend loads.
   */
  ngOnInit() {
    const state = history.state as Record<string, unknown>;

    if (state?.['course']) {
      const course = state['course'] as CourseResponseDTO;
      this.course.set(course);
      this.pathId = (state['pathId'] as number) ?? null;
      this.pendingLockReason = (state['lockReason'] as string) ?? '';
      void this.checkAccessThenLoad(course.id);
    } else {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.pathId = (state?.['pathId'] as number) ?? null;
      this.pendingLockReason = (state?.['lockReason'] as string) ?? '';
      if (id) {
        void this.loadCourse(id);
      } else {
        this.error.set('Course not found.');
        this.isLoading.set(false);
      }
    }
  }

  /**
   * Queries the database to retrieve full course details.
   *
   * @param id - The unique identifier of the course.
   */
  async loadCourse(id: number) {
    try {
      const course = await this.coursesApi.getCourseById(id);
      this.course.set(course);
      await this.checkAccessThenLoad(id);
    } catch (err) {
      if (this.pendingLockReason || this.isAccessDeniedError(err)) {
        this.isLocked.set(true);
        this.lockReason.set(
          this.pendingLockReason
            ? this.cleanReason(this.pendingLockReason)
            : 'Complete the previous course to at least 85% to unlock this one.'
        );
      } else {
        this.error.set('Failed to load course.');
      }
      this.isLoading.set(false);
    }
  }

  /**
   * Evaluates dynamic access rules before attempting to load nested sections.
   * Administrative previews bypass lock checks and load directly.
   *
   * @param courseId - The unique identifier of the course.
   */
  async checkAccessThenLoad(courseId: number) {
    if (this.isStaffPreview()) {
      await this.loadSections(courseId);
      return;
    }

    const result = await this.progressService.canAccess(courseId);
    if (!result.canAccess) {
      this.isLocked.set(true);
      const reason = result.reason ?? this.pendingLockReason;
      if (reason) this.lockReason.set(this.cleanReason(reason));
      this.isLoading.set(false);
      return;
    }
    await this.loadSections(courseId);
  }

  /**
   * Fetches nested sections and lesson models. Performs an automatic redirection
   * straight to the first lesson if the view is loaded as an administrative staff preview.
   *
   * @param courseId - The unique identifier of the course.
   */
  async loadSections(courseId: number) {
    this.isLoading.set(true);
    try {
      const sections = await this.sectionsApi.getSectionsByCourse(courseId);
      this.sections.set(sections);
      if (this.isStaffPreview()) {
        const firstLessonId = this.getFirstLessonId(sections);
        if (firstLessonId) {
          void this.router.navigate(['/lesson', firstLessonId], {
            state: { courseId, pathId: this.pathId },
            replaceUrl: true,
          });
          return;
        }
      }
    } catch {
      this.error.set('Failed to load course content.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Extracts clean error descriptions by removing raw HTTP code prefixes.
   *
   * @param raw - The raw error string.
   * @returns The sanitized readable reason.
   * @private
   */
  private cleanReason(raw: string): string {
    const match = raw.match(/Complete previous course.*$/i);
    if (match) return match[0];
    if (raw.toLowerCase().includes('403')) {
      return 'Complete the previous course to at least 85% to unlock this one.';
    }
    return raw;
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
   * Checks whether a section is expanded.
   *
   * @param sectionId - The unique section ID.
   * @returns True if expanded, otherwise false.
   */
  isSectionExpanded(sectionId: number): boolean {
    return this.expandedSections().has(sectionId);
  }

  /**
   * Routes the user directly to the selected lesson screen.
   *
   * @param lessonId - The unique identifier of the lesson to open.
   */
  openLesson(lessonId: number) {
    this.router.navigate(['/lesson', lessonId], {
      state: { courseId: this.course()?.id, pathId: this.pathId },
    });
  }

  /**
   * Evaluates the proper back routing path string array based on user roles and path context.
   *
   * @returns An array containing back routes.
   */
  backLink(): string[] {
    if (this.isStaffPreview()) {
      return this.pathId ? ['/learning-paths', String(this.pathId)] : ['/learning-paths'];
    }

    return this.pathId ? ['/learning-path', String(this.pathId)] : ['/employee/dashboard'];
  }

  /**
   * Triggers navigation back to the corresponding dashboard or learning path.
   */
  goDashboard() {
    void this.router.navigate(this.backLink());
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

  /**
   * Retrieves the first lesson ID contained in a list of sections.
   * Sorts sections and lessons by their order index to locate the earliest one.
   *
   * @param sections - The list of sections to parse.
   * @returns The first valid lesson ID found, or null.
   * @private
   */
  private getFirstLessonId(sections: SectionResponseDTO[]): number | null {
    const sortedSections = [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const section of sortedSections) {
      const firstLesson = [...(section.lessons ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      if (firstLesson?.id) return firstLesson.id;
    }

    return null;
  }
}
