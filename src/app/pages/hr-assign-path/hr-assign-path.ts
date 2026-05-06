import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of } from 'rxjs';
import { LearningPathService, LearningPathResponseDto } from '../../services/learning-path.service';
import { EnrollmentService, UserSearchResult } from '../../services/enrollment.service';
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
  selectedUser = signal<UserSearchResult | null>(null);
  showDropdown = signal(false);

  // Paths
  paths = signal<LearningPathResponseDto[]>([]);
  selectedPathId = signal<number | null>(null);

  // Submit state
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  private search$ = new Subject<string>();

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
    this.searchQuery.set(value);
    this.selectedUser.set(null);
    this.search$.next(value);
    if (value.trim().length < 2) {
      this.showDropdown.set(false);
    }
  }

  selectUser(user: UserSearchResult) {
    this.selectedUser.set(user);
    this.searchQuery.set(user.userName);
    this.showDropdown.set(false);
    this.searchResults.set([]);
  }

  clearUser() {
    this.selectedUser.set(null);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  selectPath(id: number) {
    this.selectedPathId.set(this.selectedPathId() === id ? null : id);
  }

  canSubmit(): boolean {
    return !!this.selectedUser() && !!this.selectedPathId() && !this.isSubmitting();
  }

  assign() {
    if (!this.canSubmit()) return;
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const managerId = this.authService.getUserId();
    this.enrollmentService.enroll(this.selectedUser()!.id, this.selectedPathId()!, managerId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        const userName = this.selectedUser()!.userName;
        const pathTitle = this.paths().find(p => p.id === this.selectedPathId())?.title ?? '';
        this.successMessage.set(`✓ ${userName} has been enrolled in "${pathTitle}"`);
        this.enrollmentService.incrementEnrollCount(this.selectedPathId()!);
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

  goBack() {
    this.location.back();
  }
}
