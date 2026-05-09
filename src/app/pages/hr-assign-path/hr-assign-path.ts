import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, forkJoin, map } from 'rxjs';
import { LearningPathService, LearningPathResponseDto } from '../../services/learning-path.service';
import { EnrollmentService, UserInfo, UserSearchResult } from '../../services/enrollment.service';
import { ActivityService } from '../../services/activity.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-hr-assign-path',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './hr-assign-path.html',
  styleUrl: './hr-assign-path.css',
})
export class HrAssignPath implements OnInit {
  // User search
  searchQuery = signal('');
  searchResults = signal<UserSearchResult[]>([]);
  isSearching = signal(false);
  isLoadingUserInfo = signal(false);
  selectedUser = signal<UserInfo | null>(null);
  showDropdown = signal(false);

  // Paths
  paths = signal<LearningPathResponseDto[]>([]);
  selectedPathId = signal<number | null>(null);

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
  ) {}

  ngOnInit() {
    this.learningPathService.getPaths().subscribe({
      next: (data) => this.paths.set(data),
      error: () => {},
    });

    // Debounce search — wait 350ms after user stops typing
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

  selectPath(id: number) {
    this.selectedPathId.set(this.selectedPathId() === id ? null : id);
  }

  canSubmit(): boolean {
    return (
      this.selectedUser()?.role === 'EMPLOYEE' &&
      !!this.selectedPathId() &&
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
    const selectedPathId = this.selectedPathId();

    if (!selectedUser || selectedUser.role !== 'EMPLOYEE' || !selectedPathId) {
      this.isSubmitting.set(false);
      this.errorMessage.set('Only employees can be enrolled in a learning path.');
      return;
    }

    this.enrollmentService.enroll(selectedUser.id, selectedPathId, managerId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const userName = selectedUser.userName;
        const pathTitle = this.paths().find(p => p.id === selectedPathId)?.title ?? '';
        this.successMessage.set(`✓ ${userName} has been enrolled in "${pathTitle}"`);
        this.activityService.log(
          'assignment_ind',
          `<strong>${userName}</strong> was assigned to the <strong>${pathTitle}</strong> learning path.`,
          'Learning Assignments'
        );
        this.clearUser();
        this.selectedPathId.set(null);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error || 'Enrollment failed. Please try again.');
      },
    });
  }

  roleLabel(role: string): string {
    switch ((role ?? '').toUpperCase()) {
      case 'HR':
        return 'HR';
      case 'MANAGER':
        return 'a manager';
      case 'EMPLOYEE':
        return 'an employee';
      default:
        return 'not an employee';
    }
  }

  goBack() {
    this.location.back();
  }
}
