import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentService, EmployeeProgressDto, EmployeeCourseProgressDto } from '../../core/services/enrollment.service';
import { AuthService } from '../../core/services/auth';

/** Unique employee entry for the main table */
interface UniqueEmployee {
  employeeId: string;
  employeeFullName: string;
  employeeEmail: string;
  pathCount: number;
}

@Component({
  selector: 'app-hr-team-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hr-team-progress.html',
  styleUrl: './hr-team-progress.css'
})
export class HrTeamProgress implements OnInit {
  /** All enrollments from the backend */
  readonly progressList = signal<EmployeeProgressDto[]>([]);
  readonly isLoading = signal(true);

  /** Modal state: which view are we on? */
  readonly modalView = signal<'closed' | 'paths' | 'courses'>('closed');

  /** The employee currently selected */
  readonly selectedEmployee = signal<UniqueEmployee | null>(null);

  /** Learning paths for the selected employee */
  readonly employeePaths = signal<EmployeeProgressDto[]>([]);

  /** The learning path currently drilled into */
  readonly selectedPath = signal<EmployeeProgressDto | null>(null);

  /** Courses for the selected path */
  readonly courseProgress = signal<EmployeeCourseProgressDto[]>([]);
  readonly isLoadingCourses = signal(false);

  /** Deduplicated employee list for the main table */
  readonly uniqueEmployees = computed<UniqueEmployee[]>(() => {
    const map = new Map<string, UniqueEmployee>();
    for (const p of this.progressList()) {
      if (!map.has(p.employeeId)) {
        map.set(p.employeeId, {
          employeeId: p.employeeId,
          employeeFullName: p.employeeFullName,
          employeeEmail: p.employeeEmail,
          pathCount: 0
        });
      }
      map.get(p.employeeId)!.pathCount++;
    }
    return Array.from(map.values());
  });

  constructor(
    private enrollmentService: EnrollmentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    const managerId = this.authService.getUserId();
    if (!managerId) {
      this.isLoading.set(false);
      return;
    }
    this.enrollmentService.getEmployeeProgressWithManagerId(managerId).subscribe({
      next: (data) => {
        this.progressList.set(data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.progressList.set([]);
        this.isLoading.set(false);
      }
    });
  }

  /** Level 1 → 2: Click employee row → open modal showing their learning paths */
  openEmployeeDetails(emp: UniqueEmployee): void {
    this.selectedEmployee.set(emp);
    this.employeePaths.set(
      this.progressList().filter(p => p.employeeId === emp.employeeId)
    );
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.modalView.set('paths');
  }

  /** Level 2 → 3: Click a learning path → drill into its courses */
  openPathCourses(path: EmployeeProgressDto): void {
    this.selectedPath.set(path);
    this.isLoadingCourses.set(true);
    this.courseProgress.set([]);
    this.modalView.set('courses');

    this.enrollmentService
      .getEmployeeCoursesProgress(path.employeeId, path.learningPathId)
      .subscribe({
        next: (data) => {
          this.courseProgress.set(data ?? []);
          this.isLoadingCourses.set(false);
        },
        error: () => {
          this.courseProgress.set([]);
          this.isLoadingCourses.set(false);
        }
      });
  }

  /** Level 3 → 2: Go back to learning paths view */
  backToPaths(): void {
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.modalView.set('paths');
  }

  /** Close modal entirely */
  closeModal(): void {
    this.modalView.set('closed');
    this.selectedEmployee.set(null);
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.employeePaths.set([]);
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
}
