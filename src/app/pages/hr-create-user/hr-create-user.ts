import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout, switchMap, catchError, of, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { EnrollmentService, UserInfo } from '../../core/services/enrollment.service';
import { ActivityService } from '../../core/services/activity.service';

import { UserRole } from '../../core/services/auth';

/**
 * HR User Management Component.
 * Implements a dual-pane administrative layout: a user directory listing with filtering,
 * role badge generation, and secure delete actions, alongside a standard user registration form
 * with client-side password matching, fallback request timers, and automatic event logging.
 */
@Component({
  selector: 'app-hr-create-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hr-create-user.html',
  styleUrl: './hr-create-user.css',
})
export class HrCreateUser implements OnInit {
  // ── User list ────────────────────────────────────────────
  /**
   * Private internal signal storing the full list of all system users.
   */
  private allUsers = signal<UserInfo[]>([]);

  /**
   * Signal indicating if user directories are actively loading from the API.
   */
  isLoadingUsers = signal(false);

  /**
   * Signal capturing errors occurring while fetching user records.
   */
  listError = signal('');

  /**
   * Signal holding the user-inputted search query.
   */
  userSearch = signal('');

  /**
   * Computed signal filtering `allUsers` by username or email according to `userSearch`.
   */
  users = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    const visibleUsers = this.allUsers().filter((u) => (u.role ?? '').toUpperCase() !== 'SUPERADMIN');
    if (!q) return visibleUsers;
    return visibleUsers.filter(
      (u) => u.userName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  });

  // ── Create user form ─────────────────────────────────────
  /**
   * Form binding property for user credentials login-handle.
   */
  userName = '';

  /**
   * Form binding property for user email address.
   */
  email = '';

  /**
   * Form binding property for user passwords.
   */
  password = '';

  /**
   * Form binding property to confirm entered passwords.
   */
  confirmPassword = '';

  /**
   * Controls password input visibility toggle in the creation form.
   */
  showPassword = false;

  /**
   * Controls password confirmation input visibility toggle in the creation form.
   */
  showConfirmPassword = false;

  /**
   * Form binding property for user's full name.
   */
  fullName = '';

  /**
   * Form binding property for selecting the target authorization role.
   */
  role: UserRole = 'EMPLOYEE';

  /**
   * Signal representing the role of the logged in administrator.
   */
  currentUserRole = signal<UserRole | null>(null);

  /**
   * Role options the current administrator is allowed to assign to new users.
   */
  allowedCreateRoles = computed<UserRole[]>(() => {
    switch (this.currentUserRole()) {
      case 'SUPERADMIN':
        return ['EMPLOYEE', 'MANAGER', 'HR'];
      case 'HR':
        return ['EMPLOYEE', 'MANAGER'];
      case 'MANAGER':
        return ['EMPLOYEE'];
      default:
        return [];
    }
  });

  /**
   * True when the form should expose a role selector.
   */
  canSelectCreateRole = computed(() => this.allowedCreateRoles().length > 1);

  /**
   * Signal storing the ID of the logged in administrator.
   */
  currentUserId = signal('');

  /**
   * Signal capturing input errors or creation failures.
   */
  errorMessage = signal('');

  /**
   * Signal containing form submission success messages.
   */
  successMessage = signal('');

  /**
   * Signal tracking when a user creation request is in flight.
   */
  isSubmitting = signal(false);

  /**
   * Timeout handle fallback to clear submission status in case of network suspension.
   */
  private submitFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Constructs the HrCreateUser component.
   *
   * @param authService - Authorization service to manage registration, deletion, and role verification.
   * @param enrollmentService - Service to fetch complete user info records and search directories.
   * @param activityService - Administration logging system.
   * @param router - Navigation controller to process session timeouts.
   */
  constructor(
    private authService: AuthService,
    private enrollmentService: EnrollmentService,
    private activityService: ActivityService,
    private router: Router,
  ) {}

  /**
   * Initial component hook. Resolves administrator role credentials
   * and initiates loading the active user directory.
   */
  ngOnInit() {
    this.currentUserRole.set(this.authService.getUserRole());
    this.currentUserId.set(this.authService.getUserId());
    this.ensureAllowedCreateRole();
    this.loadAllUsers();
  }

  /**
   * Fetches all registered system users via EnrollmentService,
   * querying basic info and resolving their profiles in parallel with forkJoin.
   */
  loadAllUsers() {
    this.isLoadingUsers.set(true);
    this.listError.set('');

    this.enrollmentService
      .searchUsers('@')
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            this.sessionExpired();
            return of(null);
          }
          this.listError.set('Failed to load users.');
          return of([]);
        }),
        switchMap((searchResults) => {
          if (searchResults === null) return of([] as UserInfo[]);
          if (!searchResults || searchResults.length === 0) return of([] as UserInfo[]);
          return forkJoin(
            searchResults.map((u) =>
              this.enrollmentService.getUserInfo(u.id).pipe(catchError(() => of(null))),
            ),
          ).pipe(
            switchMap((infos) =>
              of((infos as (UserInfo | null)[]).filter((u): u is UserInfo => u !== null)),
            ),
          );
        }),
      )
      .subscribe((results) => {
        this.allUsers.set(results);
        this.isLoadingUsers.set(false);
      });
  }

  /**
   * Captures search keyboard input events and updates the search query signal.
   *
   * @param event - The input DOM event.
   */
  onUserSearch(event: Event) {
    this.userSearch.set((event.target as HTMLInputElement).value);
  }

  /**
   * Formats ISO date strings into readable British calendar formatting.
   *
   * @param iso - The ISO date-time string.
   * @returns Formatted date string, or a placeholder dash if empty.
   */
  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /**
   * Performs client validation checks and sends a request to register a new user account.
   * On success, logs the creation event in the activity list and re-fetches the user directory.
   */
  onCreateUser() {
    if (this.isSubmitting()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.userName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    if (!this.allowedCreateRoles().includes(this.role)) {
      this.errorMessage.set('You do not have permission to create this role.');
      this.ensureAllowedCreateRole();
      return;
    }

    this.isSubmitting.set(true);
    this.submitFallbackTimer = setTimeout(() => {
      this.isSubmitting.set(false);
      this.errorMessage.set('Request is taking too long. Please try again.');
    }, 20000);

    this.authService
      .createUser({
        userName: this.userName.trim(),
        email: this.email.trim(),
        password: this.password,
        confirmPassword: this.confirmPassword,
        fullName: this.fullName.trim(),
        role: this.role,
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          if (this.submitFallbackTimer) {
            clearTimeout(this.submitFallbackTimer);
            this.submitFallbackTimer = null;
          }
          this.isSubmitting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          const createdName = this.userName.trim();
          this.activityService.log(
            'person_add',
            `<strong>${this.actorLabel()}</strong> created a new user account for <strong>${createdName}</strong>.`,
            'User Management',
          );
          this.successMessage.set(`${this.roleLabel(this.role)} created successfully.`);
          this.resetForm();
          this.loadAllUsers();
        },
        error: (err: unknown) => {
          const httpErr = err as HttpErrorResponse;
          if (httpErr?.status === 401) {
            this.sessionExpired();
            return;
          }
          const asAny = err as Record<string, unknown>;
          const msg =
            asAny?.['name'] === 'TimeoutError'
              ? 'Request timed out. Please try again.'
              : typeof httpErr?.error === 'string' && httpErr.error
                ? httpErr.error
                : httpErr?.message || 'Failed to create user. Please try again.';
          this.errorMessage.set(msg);
        },
      });
  }

  /**
   * Resets authorized sessions upon receiving 401 unauthorized errors, redirecting to login.
   */
  private sessionExpired() {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  /**
   * Clears form input fields to default values after successful submissions.
   */
  private resetForm() {
    this.userName = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.fullName = '';
    this.ensureAllowedCreateRole();
  }

  // ── Delete User Modal ──────────────────────────────────────
  /**
   * Signal referencing the UserInfo record queued for deletion in the modal.
   */
  userToDelete = signal<UserInfo | null>(null);

  /**
   * Text inputted in the confirm field (requires matching literal 'delete').
   */
  deleteConfirmationText = signal('');

  /**
   * Signal indicating if a deletion request is currently executing on the server.
   */
  isDeleting = signal(false);

  /**
   * Tracks whether the user must select a replacement manager.
   */
  requiresReplacement = signal(false);

  /**
   * Stores the ID of the selected replacement manager.
   */
  replacementManagerId = signal('');

  /**
   * Computed list of available replacement managers.
   */
  availableManagers = computed(() => {
    const deletingUser = this.userToDelete();
    return this.allUsers().filter(
      (u) => (u.role ?? '').toUpperCase() === 'MANAGER' && u.id !== deletingUser?.id
    );
  });

  /**
   * Triggers the opening of the deletion verification modal for a specific user.
   *
   * @param user - The user record intended for deletion.
   */
  openDeleteModal(user: UserInfo) {
    this.userToDelete.set(user);
    this.deleteConfirmationText.set('');
    this.requiresReplacement.set(false);
    this.replacementManagerId.set('');
    this.listError.set('');
  }

  /**
   * Closes the deletion verification modal and resets validation states.
   */
  closeDeleteModal() {
    this.userToDelete.set(null);
    this.deleteConfirmationText.set('');
    this.isDeleting.set(false);
    this.requiresReplacement.set(false);
    this.replacementManagerId.set('');
  }

  /**
   * Implements strict server/client privilege safety filters:
   * 1. A user cannot delete their own account.
   * 2. Super admins can delete HR, manager, and employee accounts.
   * 3. HR professionals can delete employees and managers.
   * 4. Managers can only delete employees.
   *
   * @param user - The target user record.
   * @returns True if deletion is allowed, false otherwise.
   */
  canDelete(user: UserInfo): boolean {
    // Never allow deleting yourself
    if (user.id === this.currentUserId()) return false;

    const myRole = this.currentUserRole();
    const targetRole = (user.role ?? '').toUpperCase();

    if (myRole === 'SUPERADMIN') {
      return targetRole === 'HR' || targetRole === 'MANAGER' || targetRole === 'EMPLOYEE';
    }

    if (myRole === 'HR') {
      return targetRole === 'EMPLOYEE' || targetRole === 'MANAGER';
    }

    if (myRole === 'MANAGER') {
      // Manager can only delete regular employees
      return targetRole === 'EMPLOYEE';
    }

    return false;
  }

  /**
   * Matches system roles to standard CSS styling badge selectors.
   *
   * @param role - The string authorization role.
   * @returns CSS class badge styling string.
   */
  roleBadgeClass(role: string): string {
    switch ((role ?? '').toUpperCase()) {
      case 'SUPERADMIN':
        return 'cu-badge badge-admin';
      case 'HR':
        return 'cu-badge badge-hr';
      case 'MANAGER':
        return 'cu-badge badge-manager';
      case 'EMPLOYEE':
        return 'cu-badge badge-employee';
      default:
        return 'cu-badge badge-employee';
    }
  }

  /**
   * Converts raw database role strings into user-friendly display labels.
   *
   * @param role - The raw role.
   * @returns Friendly display label.
   */
  roleLabel(role: string): string {
    switch ((role ?? '').toUpperCase()) {
      case 'SUPERADMIN':
        return 'Super Admin';
      case 'HR':
        return 'HR';
      case 'MANAGER':
        return 'Manager';
      case 'EMPLOYEE':
        return 'Employee';
      default:
        return role || 'Employee';
    }
  }

  /**
   * Dispatches the delete request to the AuthService on confirmed confirmation string matching.
   * On success, filters the deleted user from the local view array and closes the modal window.
   */
  confirmDeleteUser() {
    const user = this.userToDelete();
    if (!user || this.deleteConfirmationText().trim().toLowerCase() !== 'delete') return;

    if (this.requiresReplacement() && !this.replacementManagerId()) {
      return; // Handled by disabled button state
    }

    this.listError.set('');
    this.isDeleting.set(true);

    this.authService.deleteUser(user.id, this.replacementManagerId()).subscribe({
      next: () => {
        this.activityService.log(
          'person_remove',
          `<strong>${this.actorLabel()}</strong> deleted user account <strong>${user.userName}</strong>.`,
          'User Management',
        );
        this.allUsers.update((users) => users.filter((u) => u.id !== user.id));
        this.closeDeleteModal();
      },
      error: (err: HttpErrorResponse) => {
        this.isDeleting.set(false);

        if (err.status === 401) {
          this.sessionExpired();
          return;
        }

        if (err.status === 409 && typeof err.error === 'string' && err.error.includes('Manager has enrolled students')) {
          this.requiresReplacement.set(true);
          return;
        }

        this.listError.set(err.error || 'Failed to delete user.');
        this.closeDeleteModal();
      },
    });
  }

  /**
   * Returns dynamic submit text matching the selected target role.
   */
  createButtonText(): string {
    const label = this.roleLabel(this.role);

    return this.isSubmitting() ? `Creating ${label}...` : `Create ${label}`;
  }

  /**
   * Keeps the selected form role inside the current administrator's allowed role set.
   */
  private ensureAllowedCreateRole() {
    const allowedRoles = this.allowedCreateRoles();
    if (allowedRoles.length === 0) return;
    if (!allowedRoles.includes(this.role)) {
      this.role = allowedRoles[0];
    }
  }

  /**
   * Resolves a readable fallback actor label for local activity messages.
   */
  private actorLabel(): string {
    return this.authService.getUserName() || this.roleLabel(this.currentUserRole() ?? 'HR');
  }
}
