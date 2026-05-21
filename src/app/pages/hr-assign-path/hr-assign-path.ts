import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, catchError, of, forkJoin, map } from 'rxjs';
import { LearningPathService, LearningPathResponseDto } from '../../core/services/learning-path.service';
import { EnrollmentService, UserInfo, UserSearchResult } from '../../core/services/enrollment.service';
import { ActivityService } from '../../core/services/activity.service';
import { AuthService } from '../../core/services/auth';

/**
 * HR Assign Path Component.
 * Enables HR staff to assign learning paths to individual employees.
 * Features an autocomplete employee search box with RxJS debounce/concurrency protections,
 * selective role filters (only role === 'EMPLOYEE' allowed), catalog selection, and assignment logging.
 */
@Component({
  selector: 'app-hr-assign-path',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-assign-path.html',
  styleUrl: './hr-assign-path.css',
})
export class HrAssignPath implements OnInit {
  // User search
  /**
   * Signal storing the current user-typed search string.
   */
  searchQuery = signal('');

  /**
   * Signal containing the list of search results matching the query.
   */
  searchResults = signal<UserSearchResult[]>([]);

  /**
   * Signal indicating if a search query is actively processing on the server.
   */
  isSearching = signal(false);

  /**
   * Signal indicating if detailed user profile query is in flight.
   */
  isLoadingUserInfo = signal(false);

  /**
   * Signal holding the currently selected employee's UserInfo details.
   */
  selectedUser = signal<UserInfo | null>(null);

  /**
   * Signal determining if the autocomplete dropdown list should be visible.
   */
  showDropdown = signal(false);

  // Paths
  /**
   * Signal storing the complete catalog of active learning paths.
   */
  paths = signal<LearningPathResponseDto[]>([]);

  /**
   * Signal holding the ID of the selected learning path.
   */
  selectedPathId = signal<number | null>(null);

  // Submit state
  /**
   * Signal tracking if the path enrollment request is actively submitting.
   */
  isSubmitting = signal(false);

  /**
   * Signal capturing successful enrollment notifications.
   */
  successMessage = signal('');

  /**
   * Signal capturing errors encountered during assignments.
   */
  errorMessage = signal('');

  /**
   * Subject pipeline routing typed search queries to debounce/switchMap operators.
   */
  private search$ = new Subject<string>();

  /**
   * Concurrency ID to discard out-of-order asynchronous user profile details responses.
   */
  private userInfoRequestId = 0;

  /**
   * Constructs the HrAssignPath component.
   *
   * @param learningPathService - Service to fetch available learning paths.
   * @param enrollmentService - Service to fetch user info, search directories, and perform enrollments.
   * @param location - Angular location provider to perform back browser navigations.
   * @param activityService - Local mock or service logging system activities.
   * @param authService - Service to extract current manager/administrator ID.
   */
  constructor(
    private learningPathService: LearningPathService,
    private enrollmentService: EnrollmentService,
    private location: Location,
    private activityService: ActivityService,
    private authService: AuthService,
  ) {}

  /**
   * Initial component hook. Queries available learning paths, and boots up
   * the reactive user search stream with debounce, filter-by-role, and autocomplete dropdown flags.
   */
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

  /**
   * Handler dispatched when a user types into the search box.
   * Invalidates outdated user profile requests and updates the search query pipe.
   *
   * @param event - The input event.
   */
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

  /**
   * Selects an employee from the autocomplete drop-down, loading their profile info.
   * Asserts that only regular employees can receive learning paths, raising errors otherwise.
   *
   * @param user - The chosen search result item.
   */
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

  /**
   * Clears the autocomplete search box and resets active employee selections.
   */
  clearUser() {
    this.userInfoRequestId++;
    this.selectedUser.set(null);
    this.isLoadingUserInfo.set(false);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  /**
   * Selects or deselects a learning path card in the selection panel.
   *
   * @param id - The learning path ID.
   */
  selectPath(id: number) {
    this.selectedPathId.set(this.selectedPathId() === id ? null : id);
  }

  /**
   * Assesses if form state meets submission prerequisites (i.e. valid employee selected,
   * path selected, and no operations are currently in-flight).
   *
   * @returns True if submit button should be enabled.
   */
  canSubmit(): boolean {
    return (
      this.selectedUser()?.role === 'EMPLOYEE' &&
      !!this.selectedPathId() &&
      !this.isSubmitting() &&
      !this.isLoadingUserInfo()
    );
  }

  /**
   * Enrolls the selected employee into the selected learning path.
   * Triggers a logging transaction in the activity panel and clears form selections upon success.
   */
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

  /**
   * Converts raw database role strings into reader-friendly terminology labels.
   *
   * @param role - The raw role.
   * @returns Dynamic label string.
   */
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

  /**
   * Navigates back one step in browser window history.
   */
  goBack() {
    this.location.back();
  }
}
