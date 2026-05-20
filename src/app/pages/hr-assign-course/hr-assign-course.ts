import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, forkJoin, map } from 'rxjs';
import { LearningPathService } from '../../core/services/learning-path.service';
import { EnrollmentService, UserInfo, UserSearchResult } from '../../core/services/enrollment.service';
import { ActivityService } from '../../core/services/activity.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';
import { AuthService } from '../../core/services/auth';

export interface CourseItem {
  id: number;
  title: string;
  description?: string;
  pathId: number;
  pathTitle: string;
  sectionCount: number;
  firstLessonId: number | null;
}

@Component({
  selector: 'app-hr-assign-course',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './hr-assign-course.html',
  styleUrl: './hr-assign-course.css',
})
export class HrAssignCourse implements OnInit {
  // User search
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearching = signal(false);
  isLoadingUserInfo = signal(false);
  selectedUser = signal<UserInfo | null>(null);
  showDropdown = signal(false);

  // Courses
  courses = signal<CourseItem[]>([]);
  selectedCourseId = signal<number | null>(null);

  // Submit state
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  private search$ = new Subject<string>();
  private userInfoRequestId = 0;

  constructor(
    private learningPathService: LearningPathService,
    private enrollmentService: EnrollmentService,
    private location: Location,
    private activityService: ActivityService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.learningPathService.getPaths().subscribe({
      next: (paths) => {
        const courseList: CourseItem[] = [];
        for (const path of paths) {
          for (const course of path.courses ?? []) {
            courseList.push({
              id: course.id,
              title: course.title,
              description: course.description,
              pathId: path.id,
              pathTitle: path.title,
              sectionCount: course.sections?.length ?? 0,
              firstLessonId: this.getFirstLessonId(course),
            });
          }
        }
        this.courses.set(courseList);
      },
      error: () => {},
    });

    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      switchMap(q => {
        if (q.trim().length < 2) {
          this.searchResults.set([]);
          this.isSearching.set(false);
          return of([]);
        }
        this.isSearching.set(true);
        return this.enrollmentService.searchUsers(q).pipe(
          switchMap((users) => {
            if (users.length === 0) return of([]);
            return forkJoin(
              users.map((user) =>
                this.enrollmentService.getUserInfo(user.id).pipe(catchError(() => of(null))),
              ),
            ).pipe(
              map((infos) =>
                infos
                  .filter((info): info is UserInfo => info?.role === 'EMPLOYEE')
                  .map((info) => ({
                    id: info.id,
                    userName: info.userName,
                    email: info.email,
                  })),
              ),
            );
          }),
          catchError(() => of([]))
        );
      })
    ).subscribe(results => {
      this.searchResults.set(results);
      this.isSearching.set(false);
      this.showDropdown.set(results.length > 0);
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.userInfoRequestId++;
    this.isLoadingUserInfo.set(false);
    this.searchQuery.set(value);
    this.selectedUser.set(null);
    this.search$.next(value);
    if (value.trim().length < 2) {
      this.showDropdown.set(false);
    }
  }

  selectUser(user: UserSearchResult) {
    const requestId = ++this.userInfoRequestId;
    this.isLoadingUserInfo.set(true);
    this.selectedUser.set(null);
    this.searchQuery.set(user.userName);
    this.showDropdown.set(false);
    this.searchResults.set([]);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.enrollmentService.getUserInfo(user.id).subscribe({
      next: (info) => {
        if (requestId !== this.userInfoRequestId) return;
        this.isLoadingUserInfo.set(false);
        if (info.role !== 'EMPLOYEE') {
          this.searchQuery.set('');
          this.errorMessage.set(
            `Only employees can be enrolled. ${info.userName || user.userName} is ${this.roleLabel(info.role)}.`,
          );
          return;
        }
        this.selectedUser.set(info);
        this.searchQuery.set(info.userName || user.userName);
      },
      error: () => {
        if (requestId !== this.userInfoRequestId) return;
        this.isLoadingUserInfo.set(false);
        this.searchQuery.set('');
        this.errorMessage.set('Could not verify this user role. Please try another employee.');
      },
    });
  }

  clearUser() {
    this.userInfoRequestId++;
    this.selectedUser.set(null);
    this.isLoadingUserInfo.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  selectCourse(id: number) {
    this.selectedCourseId.set(this.selectedCourseId() === id ? null : id);
  }

  previewCourse(course: CourseItem, event: Event) {
    event.stopPropagation();
    if (course.firstLessonId) {
      void this.router.navigate(['/lesson', course.firstLessonId], {
        state: { courseId: course.id, pathId: course.pathId },
      });
      return;
    }

    void this.router.navigate(['/course', course.id], {
      state: { pathId: course.pathId },
    });
  }

  private getFirstLessonId(course: { sections?: { lessons?: unknown[] }[] }): number | null {
    for (const section of course.sections ?? []) {
      for (const lesson of section.lessons ?? []) {
        const node = lesson && typeof lesson === 'object' ? lesson as Record<string, unknown> : {};
        const id = Number(node['id'] ?? node['Id']);
        if (Number.isFinite(id) && id > 0) return id;
      }
    }

    return null;
  }

  canSubmit(): boolean {
    return (
      this.selectedUser()?.role === 'EMPLOYEE' &&
      !!this.selectedCourseId() &&
      !this.isSubmitting() &&
      !this.isLoadingUserInfo()
    );
  }

  assign() {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const managerId = this.authService.getUserId();
    const selectedUser = this.selectedUser();
    const selectedCourseId = this.selectedCourseId();

    if (!selectedUser || selectedUser.role !== 'EMPLOYEE' || !selectedCourseId) {
      this.isSubmitting.set(false);
      this.errorMessage.set('Only employees can be enrolled in a course.');
      return;
    }

    this.enrollmentService.enrollCourse(selectedUser.id, selectedCourseId, managerId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const userName = selectedUser.userName;
        const courseTitle = this.courses().find(c => c.id === selectedCourseId)?.title ?? '';
        this.successMessage.set(`✓ ${userName} has been enrolled in "${courseTitle}"`);
        this.activityService.log(
          'assignment_ind',
          `<strong>${userName}</strong> was assigned to the <strong>${courseTitle}</strong> course.`,
          'Course Assignments'
        );
        this.clearUser();
        this.selectedCourseId.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error || 'Enrollment failed. Please try again.');
      },
    });
  }

  roleLabel(role: string): string {
    switch ((role ?? '').toUpperCase()) {
      case 'HR': return 'HR';
      case 'MANAGER': return 'a manager';
      case 'EMPLOYEE': return 'an employee';
      default: return 'not an employee';
    }
  }

  goBack() {
    this.location.back();
  }
}
