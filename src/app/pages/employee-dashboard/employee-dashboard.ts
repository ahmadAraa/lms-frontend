import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth';
import { CourseResponseDTO, LearningPathService, LearningPathResponseDto } from '../../core/services/learning-path.service';

import { CoursesApiService } from '../../core/services/courses-api.service';
import { ProgressService } from '../../core/services/progress.service';
import { SectionsApiService } from '../../core/services/sections-api.service';
import { ToastService } from '../../core/services/toast.service';
import { BASE_URL } from '../../types/course-builder.types';

import { ContinueLearningComponent } from './components/continue-learning/continue-learning.component';
import { MyCoursesComponent } from './components/my-courses/my-courses.component';
import { LearningPathCardComponent } from './components/learning-path-card/learning-path-card.component';

/**
 * Interface representing the progress state of the current continue-learning recommendation.
 */
interface ContinueLearningState {
  /** True if the learning path is fully completed. */
  isCompleted: boolean;
  /** The unique identifier of the active learning path. */
  pathId: number;
  /** The title of the active learning path. */
  pathTitle: string;
  /** The identifier of the next lesson to learn (can be null). */
  lessonId: number | null;
  /** The identifier of the next course to learn (can be null). */
  courseId: number | null;
  /** Custom descriptive status messages from the continue-learning tracker. */
  message: string;
}

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
 * Component representing the interactive Employee Dashboard page.
 *
 * Implements search filters, real-time continue-learning suggestions, enrolled paths
 * progress bars, course direct-assignments lists, and complex automated lesson-viewer routing workflows.
 */
@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ContinueLearningComponent, MyCoursesComponent, LearningPathCardComponent],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit {
  /**
   * Signal carrying all learning paths defined in the system.
   */
  allPaths = signal<LearningPathResponseDto[]>([]);

  /**
   * Signal carrying the unique IDs of learning paths the current employee is enrolled in.
   */
  enrolledPathIds = signal<Set<number>>(new Set());

  /**
   * Signal containing the list of courses directly assigned to this employee.
   */
  directEnrolledCourses = signal<EnrolledCourse[]>([]);

  /**
   * Signal mapping learning path IDs to their overall completion progress percentages.
   */
  progressMap = signal<Map<number, number>>(new Map());

  /**
   * Signal mapping course IDs to their individual completion progress percentages.
   */
  courseProgressMap = signal<Map<number, number>>(new Map());

  /**
   * Signal carrying the computed continue-learning state representation.
   */
  continueState = signal<ContinueLearningState | null>(null);

  /**
   * Signal tracking whether the initial dashboard data loading operations are still in progress.
   */
  isLoading = signal(true);

  /**
   * Signal storing active backend error message descriptions.
   */
  error = signal('');

  /**
   * Signal carrying the currently logged-in user's display name.
   */
  userName = signal('');

  /**
   * Signal storing the active search filter query.
   */
  searchQuery = signal('');

  /**
   * Computed signal returning all learning paths the current employee is enrolled in.
   */
  enrolledPaths = computed(() =>
    this.allPaths().filter(p => this.enrolledPathIds().has(p.id))
  );

  /**
   * Computed signal returning all other paths the employee has not enrolled in.
   */
  availablePaths = computed(() =>
    this.allPaths().filter(p => !this.enrolledPathIds().has(p.id))
  );

  /**
   * Computed signal returning all enrolled courses combined from direct assignments
   * and enrolled learning paths, automatically deduplicated by course ID.
   */
  enrolledCourses = computed(() => {
    const seen = new Set<number>();
    const courses: EnrolledCourse[] = [];

    // Direct course assignments first
    this.directEnrolledCourses().forEach(item => {
      if (seen.has(item.course.id)) return;
      seen.add(item.course.id);
      courses.push(item);
    });

    // Then courses from enrolled learning paths
    this.enrolledPaths().forEach(path => {
      (path.courses ?? []).forEach(course => {
        if (seen.has(course.id)) return;
        seen.add(course.id);
        courses.push({
          course,
          learningPathId: path.id,
          learningPathTitle: path.title,
        });
      });
    });

    return courses;
  });

  /**
   * Computed signal returning the list of enrolled paths filtered by the search query.
   */
  filteredEnrolled = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.enrolledPaths();
    return this.enrolledPaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  /**
   * Computed signal returning the list of available paths filtered by the search query.
   */
  filteredAvailable = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.availablePaths();
    return this.availablePaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  /**
   * Computed signal returning the first enrolled learning path in the user's dashboard.
   */
  firstEnrolledPath = computed(() => this.enrolledPaths()[0] ?? null);

  /**
   * Computed signal returning the learning path that corresponds to the active continue-learning recommendation.
   */
  continuePath = computed(() => {
    const state = this.continueState();
    return this.enrolledPaths().find(path => path.id === state?.pathId) ?? this.firstEnrolledPath();
  });

  /**
   * Computed signal returning the completion progress percentage of the continue-learning path.
   */
  continuePathProgress = computed(() => this.getProgress(this.continuePath()?.id ?? 0));

  /**
   * Computed signal returning whether the continue-learning path is fully completed.
   */
  isContinueCompleted = computed(() =>
    Boolean(this.continueState()?.isCompleted) && this.continuePathProgress() >= 100
  );

  /**
   * Array of vibrant linear gradients used for path card covers.
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
   * Constructs the EmployeeDashboard component.
   *
   * @param learningPathService - Service handling learning path details and progress retrieval.
   * @param coursesApi - Service managing course queries and list updates.
   * @param progressService - Service managing course access and course progress.
   * @param sectionsApi - Service managing nested section and lesson records.
   * @param authService - Service managing local authentication contexts.
   * @param router - Angular router for dashboard redirects.
   */
  constructor(
    private learningPathService: LearningPathService,
    private coursesApi: CoursesApiService,
    private progressService: ProgressService,
    private sectionsApi: SectionsApiService,
    private authService: AuthService,
    private router: Router,
    private toast: ToastService,
  ) {}

  /**
   * Angular initialization hook. Sets user displays and triggers the parallel data fetch.
   */
  ngOnInit() {
    this.userName.set(this.authService.getUserName());
    this.loadData();
  }

  /**
   * Queries the backend APIs in parallel for all system paths and the user's enrolled paths.
   * Initiates progress metrics and direct course assignments load upon completion.
   */
  loadData() {
    this.isLoading.set(true);
    this.error.set('');

    // Load all paths + enrolled paths in parallel
    forkJoin({
      all: this.learningPathService.getPaths().pipe(catchError(() => of([]))),
      mine: this.learningPathService.getMyPaths().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ all, mine }) => {
        this.allPaths.set(all);
        this.enrolledPathIds.set(new Set(mine.map(p => p.id)));
        this.isLoading.set(false);

        if (mine.length > 0) {
          this.loadProgress(mine);
          this.loadContinueLearning(mine);
          void this.loadCourseProgress(mine);
        }

        this.loadDirectCourseEnrollments(all);
      },
      error: () => {
        this.error.set('Failed to load learning paths. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Loads general learning path completion progress percentages for the current user in parallel.
   *
   * @param enrolledPaths - The array of enrolled paths to fetch progress for.
   */
  loadProgress(enrolledPaths: LearningPathResponseDto[]) {
    const requests = enrolledPaths.map(p =>
      this.learningPathService.getMyProgress(p.id).pipe(
        catchError(() => of({ learningPathId: p.id, progress: 0 }))
      )
    );
    forkJoin(requests).subscribe(results => {
      const pMap = new Map<number, number>();
      results.forEach(r => pMap.set(r.learningPathId, Math.round(r.progress)));
      this.progressMap.set(pMap);
    });
  }

  /**
   * Fetches completion metrics for all courses contained in the user's enrolled paths in parallel.
   *
   * @param enrolledPaths - The array of enrolled paths.
   */
  async loadCourseProgress(enrolledPaths: LearningPathResponseDto[]) {
    const courseIds = [
      ...new Set(
        enrolledPaths.flatMap(path => (path.courses ?? []).map(course => course.id))
      ),
    ];

    const results = await Promise.all(
      courseIds.map(courseId => this.progressService.getCourseProgress(courseId))
    );

    const cMap = new Map<number, number>();
    results.forEach(result => cMap.set(result.courseId, Math.round(result.progress)));
    this.courseProgressMap.set(cMap);
  }

  /**
   * Queries the API for continue-learning pointers inside enrolled paths.
   * Evaluates the returned recommended items to select the most relevant active point.
   *
   * @param enrolledPaths - The array of enrolled paths.
   */
  loadContinueLearning(enrolledPaths: LearningPathResponseDto[]) {
    const requests = enrolledPaths.map(path =>
      this.learningPathService.getContinueLearning(path.id).pipe(
        map(result => ({ path, result })),
        catchError(() => of({ path, result: null }))
      )
    );

    forkJoin(requests).subscribe(results => {
      const validResults = results.filter(item => item.result);
      const incompleteResults = validResults.filter(item => !item.result!.isCompleted);
      const selected =
        incompleteResults.sort((a, b) => this.continueScore(b) - this.continueScore(a))[0] ??
        validResults[0];

      if (!selected) return;

      const { path, result } = selected;
      this.continueState.set({
        isCompleted: result!.isCompleted,
        pathId: path.id,
        pathTitle: path.title,
        lessonId: result!.data?.lessonId ?? null,
        courseId: result!.data?.courseId ?? null,
        message: result!.message ?? (result!.isCompleted ? 'You have completed this learning path!' : ''),
      });
    });
  }

  /**
   * Loads direct course assignments from the server (courses assigned individually without a path wrapper).
   * Normalizes payloads and triggers progress loads.
   *
   * @param allPaths - All paths defined in the system.
   */
  loadDirectCourseEnrollments(allPaths: LearningPathResponseDto[]) {
    from(this.coursesApi.getMyCourses()).pipe(
      catchError(() => of([]))
    ).subscribe(courses => {
      const items: EnrolledCourse[] = (courses ?? []).map(raw => {
        const parentPath = allPaths.find(p => p.id === raw.learningPathId);
        const course: CourseResponseDTO = {
          id: raw.id,
          title: raw.title,
          description: raw.description ?? undefined,
          image: (raw as any).image ?? (raw as any).pictureUrl ?? null,
          sections: ((raw as any).sections ?? []).map((s: any) => ({
            id: s.id,
            title: s.title,
            lessons: s.lessons,
          })),
        };
        return {
          course,
          learningPathId: parentPath?.id ?? 0,
          learningPathTitle: parentPath?.title ?? 'Direct Assignment',
        };
      });
      this.directEnrolledCourses.set(items);

      // Load course progress for directly-enrolled courses
      if (items.length > 0) {
        void this.loadDirectCourseProgress(items);
      }
    });
  }

  /**
   * Fetches the completion progress metrics for directly assigned courses in parallel.
   *
   * @param items - The list of directly enrolled courses.
   * @private
   */
  private async loadDirectCourseProgress(items: EnrolledCourse[]) {
    const courseIds = items.map(item => item.course.id);
    const results = await Promise.all(
      courseIds.map(courseId => this.progressService.getCourseProgress(courseId))
    );
    const currentMap = new Map(this.courseProgressMap());
    results.forEach(result => currentMap.set(result.courseId, Math.round(result.progress)));
    this.courseProgressMap.set(currentMap);
  }

  /**
   * Resumes the user's active continue-learning recommendation.
   * Dynamically routes users directly to their next pending lesson, next course, or first incomplete course.
   */
  resume() {
    const state = this.continueState();
    const path = this.continuePath();
    if (!state || this.isContinueCompleted()) {
      if (path) this.openPath(path.id);
      return;
    }
    if (state.lessonId) {
      this.router.navigate(['/lesson', state.lessonId], {
        state: { courseId: state.courseId, pathId: state.pathId },
      });
    } else if (state.courseId) {
      const pathCourses = this.allPaths().find(p => p.id === state.pathId)?.courses ?? [];
      const course = pathCourses.find(c => c.id === state.courseId);
      const firstLessonId = course ? this.getFirstLessonId(course) : null;
      if (firstLessonId) {
        this.router.navigate(['/lesson', firstLessonId], {
          state: { courseId: state.courseId, pathId: state.pathId },
        });
      } else {
        this.openPath(state.pathId);
      }
    } else {
      const incompleteCourse = path ? this.getFirstIncompleteCourse(path) : null;
      if (incompleteCourse && path) {
        void this.openCourse(incompleteCourse, path.id);
        return;
      }

      if (path) this.openPath(path.id);
    }
  }

  /**
   * Computes a relevance weight score for a continue-learning path state item.
   * Prioritizes paths with a direct lesson pointer, followed by a course pointer, adding active completion ratios.
   *
   * @param item - The path recommendation item.
   * @returns A numeric evaluation weight.
   * @private
   */
  private continueScore(item: {
    path: LearningPathResponseDto;
    result: { data?: { lessonId: number | null; courseId: number | null } } | null;
  }): number {
    const hasLesson = item.result?.data?.lessonId ? 1000 : 0;
    const hasCourse = item.result?.data?.courseId ? 500 : 0;
    return hasLesson + hasCourse + this.getProgress(item.path.id);
  }

  /**
   * Evaluates overall progress of a learning path. If all course completion states are loaded,
   * returns the rounded average of all nested courses; otherwise, returns the cached progress metric.
   *
   * @param pathId - The unique identifier of the path.
   * @returns The computed progress percentage integer from 0 to 100.
   */
  getProgress(pathId: number): number {
    const path = this.allPaths().find(p => p.id === pathId);
    const courseProgress = path ? this.getPathProgressFromCourses(path) : null;

    if (courseProgress !== null) return courseProgress;

    return this.progressMap().get(pathId) ?? 0;
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
   * Calculates the overall learning path progress percentage by averaging the completion
   * percentage values of all nested courses.
   *
   * @param path - The learning path object.
   * @returns The rounded integer average percentage, or null if course values are incomplete.
   * @private
   */
  private getPathProgressFromCourses(path: LearningPathResponseDto): number | null {
    const courses = path.courses ?? [];
    if (courses.length === 0) return this.progressMap().get(path.id) ?? 0;

    const courseProgressMap = this.courseProgressMap();
    const hasAllCourseProgress = courses.every(course => courseProgressMap.has(course.id));
    if (!hasAllCourseProgress) return null;

    const total = courses.reduce((sum, course) => sum + (courseProgressMap.get(course.id) ?? 0), 0);
    return Math.round(total / courses.length);
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
   * Returns the total course count contained within a learning path.
   *
   * @param path - The learning path object.
   * @returns The integer count of courses.
   */
  getCourseCount(path: LearningPathResponseDto): number {
    return path.courses?.length ?? 0;
  }

  /**
   * Navigates the router to the detailed view page of a learning path.
   *
   * @param id - The unique identifier of the path.
   */
  openPath(id: number) {
    this.router.navigate(['/learning-path', id]);
  }

  /**
   * Opens a specific course, verifying access status dynamically via the progress service.
   * If authorized, routes straight to the next available lesson; if unauthorized, routes
   * to course details displaying locking details.
   *
   * @param course - The target course to open.
   * @param learningPathId - The unique ID of the learning path context.
   */
  async openCourse(course: CourseResponseDTO, learningPathId: number) {
    const access = await this.progressService.canAccess(course.id);
    if (!access.canAccess) {
      this.toast.error(access.reason || 'This course is locked. Please complete the previous course to unlock.');
      return;
    }

    const lessonId = this.getFirstLessonId(course);
    if (lessonId) {
      void this.router.navigate(['/lesson', lessonId], {
        state: { courseId: course.id, pathId: learningPathId },
      });
      return;
    }

    try {
      const sections = await this.sectionsApi.getSectionsByCourse(course.id);
      const firstLesson = sections
        .flatMap(section => section.lessons ?? [])
        .find(lesson => lesson.id);

      if (firstLesson?.id) {
        void this.router.navigate(['/lesson', firstLesson.id], {
          state: { courseId: course.id, pathId: learningPathId },
        });
        return;
      }
    } catch {
      // Fall back to course details when lessons cannot be loaded.
    }

    this.toast.error('This course does not have any lessons available.');
  }

  /**
   * Utility helper extracting the first lesson ID contained in a course's local template.
   *
   * @param course - The course DTO.
   * @returns The first valid lesson ID found, or null if empty.
   * @private
   */
  private getFirstLessonId(course: CourseResponseDTO): number | null {
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        const lessonId = (lesson as { id?: number }).id;
        if (lessonId) return lessonId;
      }
    }

    return null;
  }

  /**
   * Extracts the first course in a learning path that has a completion progress of less than 100%.
   *
   * @param path - The learning path object.
   * @returns The first incomplete course, or null if all are completed.
   * @private
   */
  private getFirstIncompleteCourse(path: LearningPathResponseDto): CourseResponseDTO | null {
    return (path.courses ?? []).find(course => this.getCourseProgress(course.id) < 100) ?? null;
  }

  /**
   * Triggers upon search input updates, setting the search query signal context.
   *
   * @param event - The input change event.
   */
  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
