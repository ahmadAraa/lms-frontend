import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout, switchMap, catchError, of, forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { EnrollmentService, UserInfo } from '../../core/services/enrollment.service';
import { ActivityService } from '../../core/services/activity.service';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';

import { UserRole } from '../../core/services/auth';

@Component({
  selector: 'app-hr-create-user',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NotificationBellComponent],
  templateUrl: './hr-create-user.html',
  styleUrl: './hr-create-user.css',
})
export class HrCreateUser implements OnInit {
  // ── Employee list ────────────────────────────────────────
  private allUsers = signal<UserInfo[]>([]);
  isLoadingUsers = signal(false);
  listError = signal('');
  userSearch = signal('');

  users = computed(() => {
    const q = this.userSearch().trim().toLowerCase();
    if (!q) return this.allUsers();
    return this.allUsers().filter(
      (u) => u.userName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  });

  // ── Create user form ─────────────────────────────────────
  userName = '';
  email = '';
  password = '';
  confirmPassword = '';
  fullName = '';
  role: UserRole = 'EMPLOYEE';
  currentUserRole = signal<UserRole | null>(null);
  currentUserId = signal('');
  errorMessage = signal('');
  successMessage = signal('');
  isSubmitting = signal(false);

  private submitFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private authService: AuthService,
    private enrollmentService: EnrollmentService,
    private activityService: ActivityService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.currentUserRole.set(this.authService.getUserRole());
    this.currentUserId.set(this.authService.getUserId());
    this.loadAllUsers();
  }

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
          this.listError.set('Failed to load employees.');
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

  onUserSearch(event: Event) {
    this.userSearch.set((event.target as HTMLInputElement).value);
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

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
            `<strong>${this.authService.getUserName() || 'HR'}</strong> created a new user account for <strong>${createdName}</strong>.`,
            'User Management',
          );
          this.successMessage.set('Employee created successfully.');
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
                : httpErr?.message || 'Failed to create employee. Please try again.';
          this.errorMessage.set(msg);
        },
      });
  }

  private sessionExpired() {
    this.authService.logout();
    void this.router.navigate(['/']);
  }

  private resetForm() {
    this.userName = '';
    this.email = '';
    this.password = '';
    this.confirmPassword = '';
    this.fullName = '';
  }

  // ── Delete User Modal ──────────────────────────────────────
  userToDelete = signal<UserInfo | null>(null);
  deleteConfirmationText = signal('');
  isDeleting = signal(false);

  openDeleteModal(user: UserInfo) {
    this.userToDelete.set(user);
    this.deleteConfirmationText.set('');
  }

  closeDeleteModal() {
    this.userToDelete.set(null);
    this.deleteConfirmationText.set('');
    this.isDeleting.set(false);
  }

  canDelete(user: UserInfo): boolean {
    // Never allow deleting yourself
    if (user.id === this.currentUserId()) return false;

    const myRole = this.currentUserRole();
    const targetRole = (user.role ?? '').toUpperCase();

    if (myRole === 'HR') {
      // HR can delete employees and managers only (not other HR accounts)
      return targetRole === 'EMPLOYEE' || targetRole === 'MANAGER';
    }

    if (myRole === 'MANAGER') {
      // Manager can only delete regular employees
      return targetRole === 'EMPLOYEE';
    }

    return false;
  }

  roleBadgeClass(role: string): string {
    switch ((role ?? '').toUpperCase()) {
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

  roleLabel(role: string): string {
    switch ((role ?? '').toUpperCase()) {
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

  confirmDeleteUser() {
    const user = this.userToDelete();
    if (!user || this.deleteConfirmationText().trim().toLowerCase() !== 'delete') return;

    this.isDeleting.set(true);
    this.authService.deleteUser(user.id).subscribe({
      next: () => {
        this.activityService.log(
          'person_remove',
          `<strong>${this.authService.getUserName() || 'HR'}</strong> deleted user account <strong>${user.userName}</strong>.`,
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
        this.listError.set('Failed to delete user.');
        this.closeDeleteModal();
      },
    });
  }
}
