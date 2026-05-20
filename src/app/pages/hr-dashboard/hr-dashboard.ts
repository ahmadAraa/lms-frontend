import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { Router } from '@angular/router';
import { LearningPathService, LearningPathResponseDto } from '../../core/services/learning-path.service';
import { ActivityService, AdminActivity } from '../../core/services/activity.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';

import { LearningPathDistributionComponent } from './components/learning-path-distribution/learning-path-distribution.component';
import { RecentActivityComponent } from './components/recent-activity/recent-activity.component';
import { QuickActionsComponent } from './components/quick-actions/quick-actions.component';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NotificationBellComponent,
    LearningPathDistributionComponent,
    RecentActivityComponent,
    QuickActionsComponent,
  ],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboard implements OnInit {
  userName = signal('');
  paths = signal<LearningPathResponseDto[]>([]);
  enrolledCounts = signal<Record<number, number>>({});
  activities = signal<AdminActivity[]>([]);

  constructor(
    private authService: AuthService,
    private router: Router,
    private learningPathService: LearningPathService,
    private activityService: ActivityService,
    private enrollmentService: EnrollmentService,
  ) {}

  ngOnInit() {
    this.userName.set(this.authService.getUserName());

    this.learningPathService.getPaths().subscribe({
      next: (data) => {
        this.paths.set(data);
        this.loadEnrolledCounts(data);
      },
      error: () => {},
    });

    this.activities.set(this.activityService.getRecent(8));
  }

  private loadEnrolledCounts(paths: LearningPathResponseDto[]) {
    if (paths.length === 0) {
      this.enrolledCounts.set({});
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
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
