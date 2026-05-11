import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, from } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../services/auth';
import { CourseResponseDTO, LearningPathService, LearningPathResponseDto } from '../../services/learning-path.service';

import { CoursesApiService } from '../../services/courses-api.service';
import { ProgressService } from '../../services/progress.service';
import { SectionsApiService } from '../../services/sections-api.service';
import { BASE_URL } from '../../types/course-builder.types';

interface ContinueLearningState {
  isCompleted: boolean;
  pathId: number;
  pathTitle: string;
  lessonId: number | null;
  courseId: number | null;
  message: string;
}

interface EnrolledCourse {
  course: CourseResponseDTO;
  learningPathId: number;
  learningPathTitle: string;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.css',
})
export class EmployeeDashboard implements OnInit {
  /** All paths available in the system */
  allPaths = signal<LearningPathResponseDto[]>([]);
  /** IDs of paths this employee is enrolled in */
  enrolledPathIds = signal<Set<number>>(new Set());
  /** Courses directly assigned to this employee (not via a learning path) */
  directEnrolledCourses = signal<EnrolledCourse[]>([]);
  progressMap = signal<Map<number, number>>(new Map());
  courseProgressMap = signal<Map<number, number>>(new Map());
  continueState = signal<ContinueLearningState | null>(null);

  isLoading = signal(true);
  error = signal('');
  userName = signal('');
  searchQuery = signal('');

  /** Paths the employee is enrolled in */
  enrolledPaths = computed(() =>
    this.allPaths().filter(p => this.enrolledPathIds().has(p.id))
  );

  /** Other paths the employee is NOT enrolled in */
  availablePaths = computed(() =>
    this.allPaths().filter(p => !this.enrolledPathIds().has(p.id))
  );

  /** Courses inside the employee's enrolled learning paths + directly assigned courses */
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

  /** Enrolled paths filtered by search */
  filteredEnrolled = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.enrolledPaths();
    return this.enrolledPaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  /** Other paths filtered by search */
  filteredAvailable = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.availablePaths();
    return this.availablePaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  firstEnrolledPath = computed(() => this.enrolledPaths()[0] ?? null);
  continuePath = computed(() => {
    const state = this.continueState();
    return this.enrolledPaths().find(path => path.id === state?.pathId) ?? this.firstEnrolledPath();
  });
  continuePathProgress = computed(() => this.getProgress(this.continuePath()?.id ?? 0));
  isContinueCompleted = computed(() =>
    Boolean(this.continueState()?.isCompleted) && this.continuePathProgress() >= 100
  );

  private readonly gradients = [
    'linear-gradient(135deg, #0f1b3d 0%, #1e3a8a 100%)',
    'linear-gradient(135deg, #065f56 0%, #0d9488 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
    'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
  ];

  constructor(
    private learningPathService: LearningPathService,
    private coursesApi: CoursesApiService,
    private progressService: ProgressService,
    private sectionsApi: SectionsApiService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.userName.set(this.authService.getUserName());
    this.loadData();
  }

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

  private async loadDirectCourseProgress(items: EnrolledCourse[]) {
    const courseIds = items.map(item => item.course.id);
    const results = await Promise.all(
      courseIds.map(courseId => this.progressService.getCourseProgress(courseId))
    );
    const currentMap = new Map(this.courseProgressMap());
    results.forEach(result => currentMap.set(result.courseId, Math.round(result.progress)));
    this.courseProgressMap.set(currentMap);
  }

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
      this.router.navigate(['/course', state.courseId], {
        state: { pathId: state.pathId },
      });
    } else {
      const incompleteCourse = path ? this.getFirstIncompleteCourse(path) : null;
      if (incompleteCourse && path) {
        void this.openCourse(incompleteCourse, path.id);
        return;
      }

      if (path) this.openPath(path.id);
    }
  }

  private continueScore(item: {
    path: LearningPathResponseDto;
    result: { data?: { lessonId: number | null; courseId: number | null } } | null;
  }): number {
    const hasLesson = item.result?.data?.lessonId ? 1000 : 0;
    const hasCourse = item.result?.data?.courseId ? 500 : 0;
    return hasLesson + hasCourse + this.getProgress(item.path.id);
  }

  getProgress(pathId: number): number {
    const path = this.allPaths().find(p => p.id === pathId);
    const courseProgress = path ? this.getPathProgressFromCourses(path) : null;

    if (courseProgress !== null) return courseProgress;

    return this.progressMap().get(pathId) ?? 0;
  }

  getCourseProgress(courseId: number): number {
    return this.courseProgressMap().get(courseId) ?? 0;
  }

  private getPathProgressFromCourses(path: LearningPathResponseDto): number | null {
    const courses = path.courses ?? [];
    if (courses.length === 0) return this.progressMap().get(path.id) ?? 0;

    const courseProgressMap = this.courseProgressMap();
    const hasAllCourseProgress = courses.every(course => courseProgressMap.has(course.id));
    if (!hasAllCourseProgress) return null;

    const total = courses.reduce((sum, course) => sum + (courseProgressMap.get(course.id) ?? 0), 0);
    return Math.round(total / courses.length);
  }

  getGradient(index: number): string {
    return this.gradients[index % this.gradients.length];
  }

  getCourseCount(path: LearningPathResponseDto): number {
    return path.courses?.length ?? 0;
  }

  openPath(id: number) {
    this.router.navigate(['/learning-path', id]);
  }

  async openCourse(course: CourseResponseDTO, learningPathId: number) {
    const access = await this.progressService.canAccess(course.id);
    if (!access.canAccess) {
      void this.router.navigate(['/course', course.id], {
        state: {
          course,
          pathId: learningPathId,
          lockReason: access.reason,
        },
      });
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

    void this.router.navigate(['/course', course.id], {
      state: { course, pathId: learningPathId }
    });
  }

  private getFirstLessonId(course: CourseResponseDTO): number | null {
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        const lessonId = (lesson as { id?: number }).id;
        if (lessonId) return lessonId;
      }
    }

    return null;
  }

  private getFirstIncompleteCourse(path: LearningPathResponseDto): CourseResponseDTO | null {
    return (path.courses ?? []).find(course => this.getCourseProgress(course.id) < 100) ?? null;
  }

  getPictureUrl(path: LearningPathResponseDto): string {
    if (!path.image) return '';
    if (path.image.startsWith('http')) return path.image;
    return `${BASE_URL}/${path.image.replace(/^\//, '')}`;
  }

  getCoursePictureUrl(course: CourseResponseDTO): string {
    if (!course.image) return '';
    if (course.image.startsWith('http')) return course.image;
    return `${BASE_URL}/${course.image.replace(/^\//, '')}`;
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
