import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap, map } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';
import { LearningPathService, LearningPathResponseDto } from '../../core/services/learning-path.service';
import { ActivityService, AdminActivity } from '../../core/services/activity.service';
import { EnrollmentService, UserInfo } from '../../core/services/enrollment.service';
import { LearningPathDistributionComponent } from './components/learning-path-distribution/learning-path-distribution.component';
import { RecentActivityComponent } from './components/recent-activity/recent-activity.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';

/**
 * Root HR/Manager Dashboard Component.
 * Orchestrates signals for managing learning paths, enrollments, activities,
 * and user statistics, binding children subcomponents like distribution charts and actions list.
 */
@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LearningPathDistributionComponent,
    RecentActivityComponent,
    QuickActionsComponent,
  ],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboard implements OnInit {
  /**
   * Signal storing the currently logged in HR professional's display name.
   */
  userName = signal('');

  /**
   * Signal storing the catalog of learning paths available.
   */
  paths = signal<LearningPathResponseDto[]>([]);

  /**
   * Signal mapping learning path IDs to the count of enrolled employees.
   */
  enrolledCounts = signal<Record<number, number>>({});

  /**
   * Signal containing the list of recent administration logs/activities.
   */
  activities = signal<AdminActivity[]>([]);

  /**
   * Signals storing system-wide metrics.
   */
  totalEmployees = signal(0);
  totalEnrollments = signal(0);

  /**
   * Constructs the HrDashboard component.
   *
   * @param authService - Service to fetch the user identity and execute logouts.
   * @param router - Navigation controller to trigger router updates.
   * @param learningPathService - Service to fetch active and archived learning paths.
   * @param activityService - Local mock or service logging system activities.
   * @param enrollmentService - Service mapping employee enrollments to paths/courses.
   */
  constructor(
    private authService: AuthService,
    private router: Router,
    private learningPathService: LearningPathService,
    private activityService: ActivityService,
    private enrollmentService: EnrollmentService,
  ) {}

  /**
   * Initial component hook. Fetches user identity, retrieves existing learning paths,
   * triggers enrollment count updates, and queries recent administrative actions.
   */
  ngOnInit() {
    this.userName.set(this.authService.getUserName());

    this.learningPathService.getPaths().subscribe({
      next: (data) => {
        this.paths.set(data);
        this.loadEnrolledCounts(data);
      },
      error: () => {},
    });

    this.loadUserMetrics();

    this.activities.set(this.activityService.getRecent(8));
  }

  private loadEnrolledCounts(paths: LearningPathResponseDto[]) {
    if (paths.length === 0) {
      this.enrolledCounts.set({});
      this.totalEnrollments.set(0);
      return;
    }

    forkJoin(
      paths.map(path =>
        this.enrollmentService.getLearningPathEmployeesCount(path.id).pipe(
          catchError(() => of(0))
        )
      )
    ).subscribe((counts) => {
      this.enrolledCounts.set(
        paths.reduce<Record<number, number>>((acc, path, index) => {
          acc[path.id] = counts[index] ?? 0;
          return acc;
        }, {})
      );

      const total = counts.reduce((sum, count) => sum + (count ?? 0), 0);
      this.totalEnrollments.set(total);
    });
  }

  /**
   * Queries user records to compute active employee metrics.
   */
  private loadUserMetrics() {
    this.enrollmentService.searchUsers('@').pipe(
      catchError(() => of([])),
      switchMap((searchResults) => {
        if (!searchResults || searchResults.length === 0) return of([] as UserInfo[]);
        return forkJoin(
          searchResults.map((u) =>
            this.enrollmentService.getUserInfo(u.id).pipe(catchError(() => of(null)))
          )
        ).pipe(
          map((infos) =>
            (infos as (UserInfo | null)[]).filter((u): u is UserInfo => u !== null)
          )
        );
      })
    ).subscribe((users) => {
      const employees = users.filter(u => u.role === 'EMPLOYEE').length;
      this.totalEmployees.set(employees);
    });
  }

  /**
   * Standard signout. Clears authorization tokens and redirects the user to the landing page.
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
