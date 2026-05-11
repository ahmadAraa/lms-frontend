import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { LearningPathService, LearningPathResponseDto } from '../../services/learning-path.service';
import { ActivityService, AdminActivity } from '../../services/activity.service';
import { EnrollmentService } from '../../services/enrollment.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './hr-dashboard.html',
  styleUrl: './hr-dashboard.css',
})
export class HrDashboard implements OnInit {
  private readonly maxStudentsPerPath = 20;

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

  getCourseCount(path: LearningPathResponseDto): number {
    return path.courses?.length ?? 0;
  }

  /** Width % for the path bar, scaled against the expected max students per path. */
  getEnrolledCount(pathId: number): number {
    return this.enrolledCounts()[pathId] ?? 0;
  }

  getBarWidth(path: LearningPathResponseDto): number {
    const count = this.getEnrolledCount(path.id);
    if (count <= 0) return 0;

    return Math.min(Math.round((count / this.maxStudentsPerPath) * 100), 100);
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

  timeAgo(iso: string): string {
    return this.activityService.timeAgo(iso);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
