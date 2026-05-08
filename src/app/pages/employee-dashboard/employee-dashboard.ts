import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth';
import { LearningPathService, LearningPathResponseDto } from '../../services/learning-path.service';
import { EnrollmentService } from '../../services/enrollment.service';
import { BASE_URL } from '../../types/course-builder.types';

interface ContinueLearningState {
  isCompleted: boolean;
  lessonId: number | null;
  courseId: number | null;
  message: string;
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
  progressMap = signal<Map<number, number>>(new Map());
  continueState = signal<ContinueLearningState | null>(null);

  enrollingPathId = signal<number | null>(null);
  enrollError = signal('');
  enrollSuccess = signal('');

  isLoading = signal(true);
  error = signal('');
  userName = signal('');
  searchQuery = signal('');

  /** Paths the employee is enrolled in */
  enrolledPaths = computed(() =>
    this.allPaths().filter(p => this.enrolledPathIds().has(p.id))
  );

  /** Paths the employee is NOT enrolled in */
  availablePaths = computed(() =>
    this.allPaths().filter(p => !this.enrolledPathIds().has(p.id))
  );

  /** Enrolled paths filtered by search */
  filteredEnrolled = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.enrolledPaths();
    return this.enrolledPaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  /** Available paths filtered by search */
  filteredAvailable = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.availablePaths();
    return this.availablePaths().filter(p =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
    );
  });

  firstEnrolledPath = computed(() => this.enrolledPaths()[0] ?? null);
  lastPathProgress = computed(() => this.getProgress(this.firstEnrolledPath()?.id ?? 0));

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
    private enrollmentService: EnrollmentService,
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
          this.loadContinueLearning(mine[0].id);
        }
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

  loadContinueLearning(pathId: number) {
    this.learningPathService.getContinueLearning(pathId).pipe(
      catchError(() => of(null))
    ).subscribe(result => {
      if (!result) return;
      if (result.isCompleted) {
        this.continueState.set({
          isCompleted: true, lessonId: null, courseId: null,
          message: result.message ?? 'You have completed this learning path!',
        });
      } else if (result.data) {
        this.continueState.set({
          isCompleted: false,
          lessonId: result.data.lessonId,
          courseId: result.data.courseId,
          message: '',
        });
      }
    });
  }

  enroll(path: LearningPathResponseDto, event: Event) {
    event.stopPropagation();
    const userId = this.authService.getUserId();
    if (!userId) {
      this.enrollError.set('Could not identify your account. Please log in again.');
      return;
    }

    this.enrollingPathId.set(path.id);
    this.enrollError.set('');
    this.enrollSuccess.set('');

    this.enrollmentService.enroll(userId, path.id, userId).subscribe({
      next: () => {
        // Add to enrolled set immediately (optimistic UI)
        const updated = new Set(this.enrolledPathIds());
        updated.add(path.id);
        this.enrolledPathIds.set(updated);
        this.enrollingPathId.set(null);
        this.enrollSuccess.set(`You are now enrolled in "${path.title}"!`);
        setTimeout(() => this.enrollSuccess.set(''), 4000);
        // Start continue-learning for this newly enrolled path
        this.loadContinueLearning(path.id);
      },
      error: (err) => {
        this.enrollingPathId.set(null);
        const msg: unknown = err?.error ?? err?.message ?? '';
        if (typeof msg === 'string' && msg.toLowerCase().includes('already')) {
          // Already enrolled — sync the UI
          const updated = new Set(this.enrolledPathIds());
          updated.add(path.id);
          this.enrolledPathIds.set(updated);
          this.enrollSuccess.set(`You are already enrolled in "${path.title}".`);
          setTimeout(() => this.enrollSuccess.set(''), 4000);
        } else {
          this.enrollError.set(
            typeof msg === 'string' && msg
              ? msg
              : 'Enrollment failed. Please contact your HR team.'
          );
          setTimeout(() => this.enrollError.set(''), 5000);
        }
      },
    });
  }

  resume() {
    const state = this.continueState();
    const path = this.firstEnrolledPath();
    if (!state || state.isCompleted) {
      if (path) this.openPath(path.id);
      return;
    }
    if (state.lessonId) {
      this.router.navigate(['/lesson', state.lessonId]);
    } else if (state.courseId) {
      this.router.navigate(['/course', state.courseId]);
    } else {
      if (path) this.openPath(path.id);
    }
  }

  isEnrolling(pathId: number): boolean {
    return this.enrollingPathId() === pathId;
  }

  getProgress(pathId: number): number {
    return this.progressMap().get(pathId) ?? 0;
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

  getPictureUrl(path: LearningPathResponseDto): string {
    if (!path.image) return '';
    if (path.image.startsWith('http')) return path.image;
    return `${BASE_URL}/${path.image.replace(/^\//, '')}`;
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
