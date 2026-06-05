import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentService, EmployeeProgressDto, EmployeeCourseProgressDto } from '../../core/services/enrollment.service';
import { AuthService } from '../../core/services/auth';

/**
 * Unique employee entry representing a single row in the main team list.
 */
interface UniqueEmployee {
  /**
   * The unique employee user GUID.
   */
  employeeId: string;

  /**
   * The employee's full display name.
   */
  employeeFullName: string;

  /**
   * The employee's primary email address.
   */
  employeeEmail: string;

  /**
   * Count of active learning paths the employee is enrolled in.
   */
  pathCount: number;
}

/**
 * HR/Manager Team Progress Tracking Component.
 * Implements a hierarchical tracking system for employee progress:
 * - Level 1: Main deduplicated roster showing active paths count.
 * - Level 2: Detailed modal view showing a breakdown of each path the employee is in (overall percentage).
 * - Level 3: Drill-down view into a specific path showing completion percentages for each of its child courses.
 */
@Component({
  selector: 'app-hr-team-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hr-team-progress.html',
  styleUrl: './hr-team-progress.css'
})
export class HrTeamProgress implements OnInit {
  /**
   * Signal storing all enrollments and path progress entries returned by the API.
   */
  readonly progressList = signal<EmployeeProgressDto[]>([]);

  /**
   * Signal indicating if initial enrollment list is loading from backend services.
   */
  readonly isLoading = signal(true);

  /**
   * Signal representing the current state/level of the progress drill-down modal interface.
   */
  readonly modalView = signal<'closed' | 'paths' | 'courses'>('closed');

  /**
   * Signal holding the UniqueEmployee record currently clicked and loaded in the modal context.
   */
  readonly selectedEmployee = signal<UniqueEmployee | null>(null);

  /**
   * Signal containing the list of learning path progress records for the selected employee.
   */
  readonly employeePaths = signal<EmployeeProgressDto[]>([]);

  /**
   * Signal representing the learning path drilled into in the course progress details view.
   */
  readonly selectedPath = signal<EmployeeProgressDto | null>(null);

  /**
   * Signal storing the specific course completion progress objects under the drilled path.
   */
  readonly courseProgress = signal<EmployeeCourseProgressDto[]>([]);

  /**
   * Signal indicating if courses completion list is loading from backend.
   */
  readonly isLoadingCourses = signal(false);

  /**
   * Computed signal that analyzes `progressList` and deduplicates individual employee accounts
   * to prepare an aggregate roster mapping their corresponding path enrollment counts.
   */
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

  /**
   * Constructs the HrTeamProgress component.
   *
   * @param enrollmentService - Service providing endpoint calls to query and drill-down into employee progress.
   * @param authService - Service to resolve the manager ID.
   */
  constructor(
    private enrollmentService: EnrollmentService,
    private authService: AuthService
  ) {}

  /**
   * Initial component hook. Resolves manager identity and queries employee progress.
   */
  ngOnInit(): void {
    this.loadProgress();
  }

  /**
   * Triggers the service request to retrieve all enrollments and completions for employees
   * managed by the currently logged in supervisor.
   */
  loadProgress(): void {
    const managerId = this.authService.getUserId();
    if (!managerId) {
      this.isLoading.set(false);
      return;
    }

    const role = this.authService.getUserRole();
    const queryId = (role === 'HR' || role === 'SUPERADMIN') ? 'all' : managerId;

    this.enrollmentService.getEmployeeProgressWithManagerId(queryId).subscribe({
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

  /**
   * Handles Level 1 → Level 2 drill-down.
   * Clicking on an employee row initializes details and shifts modal to the paths index list.
   *
   * @param emp - The selected employee row data.
   */
  openEmployeeDetails(emp: UniqueEmployee): void {
    this.selectedEmployee.set(emp);
    this.employeePaths.set(
      this.progressList().filter(p => p.employeeId === emp.employeeId)
    );
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.modalView.set('paths');
  }

  /**
   * Handles Level 2 → Level 3 drill-down.
   * Clicking a path in the modal opens course breakdowns and queries course completion metrics.
   *
   * @param path - The chosen learning path progress data.
   */
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

  /**
   * Navigates back from course progress details (Level 3) to paths list (Level 2).
   */
  backToPaths(): void {
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.modalView.set('paths');
  }

  /**
   * Closes the progress modal window and resets active drill-down references.
   */
  closeModal(): void {
    this.modalView.set('closed');
    this.selectedEmployee.set(null);
    this.selectedPath.set(null);
    this.courseProgress.set([]);
    this.employeePaths.set([]);
  }

  /**
   * Parses initials (e.g. "John Doe" -> "JD") to populate visual letter avatar bubbles.
   *
   * @param name - The full name string.
   * @returns Initials string (upper-cased).
   */
  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
}
