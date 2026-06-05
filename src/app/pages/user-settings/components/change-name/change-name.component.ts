import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSettingsService } from '../../../../core/services/user-settings.service';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Component representing the username modification form card.
 *
 * Implements strict format validations (length checks, alphanumeric characters) on inputs,
 * executes server updates via UserSettingsService, and displays real-time feedback using ToastService.
 */
@Component({
  selector: 'app-change-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-name.component.html',
  styleUrl: './change-name.component.css',
})
export class ChangeNameComponent implements OnInit {
  /**
   * Bound input value for the proposed new full name.
   */
  newFullName = '';

  /**
   * Current cached full name value loaded from active authentication credentials.
   */
  currentFullName = '';

  /**
   * Flag indicating if a submission is currently in progress.
   */
  isLoading = false;

  /**
   * Inline feedback message indicating successful update.
   */
  successMsg = '';

  /**
   * Inline feedback message detailing validation or API failure reason.
   */
  errorMsg = '';

  /**
   * Constructs the ChangeNameComponent.
   *
   * @param userSettingsService - The service responsible for sending username updates to the backend.
   * @param authService - The service managing local authentications and claims mapping.
   * @param toast - The service triggering global toast alert banners.
   */
  constructor(
    private userSettingsService: UserSettingsService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  /**
   * Angular initialization hook. Pre-populates form inputs with the currently active username.
   */
  ngOnInit(): void {
    this.currentFullName = this.authService.getUserName();
    this.newFullName = this.currentFullName;
  }

  /**
   * Submits the updated full name after verifying strict character pattern format
   * and length range checks on client side. Alerts global and inline indicators on outcome.
   */
  onSubmit(): void {
    this.successMsg = '';
    this.errorMsg = '';

    const trimmed = this.newFullName.trim();
    if (!trimmed) {
      this.errorMsg = 'Name cannot be empty.';
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      this.errorMsg = 'Name must be between 3 and 20 characters.';
      return;
    }
    if (!/^[a-zA-Z0-9._ ]+$/.test(trimmed)) {
      this.errorMsg = 'Only letters, numbers, dots, underscores, and spaces are allowed.';
      return;
    }

    this.isLoading = true;
    this.userSettingsService.updateUserName(trimmed).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMsg = 'Name updated successfully!';
        this.toast.success('Name updated!');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error || 'Failed to update name. Please try again.';
        this.toast.error(this.errorMsg);
      },
    });
  }
}
