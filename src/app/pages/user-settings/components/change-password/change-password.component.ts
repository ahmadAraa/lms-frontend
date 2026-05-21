import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSettingsService } from '../../../../core/services/user-settings.service';
import { ToastService } from '../../../../core/services/toast.service';

/**
 * Component representing the password update form card.
 *
 * Implements toggle controls for input visibility (show/hide password text),
 * enforces local password strength checks (minimum length, matching confirmation checks),
 * and submits security updates through UserSettingsService.
 */
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  /**
   * Bound input value for the user's active/current password.
   */
  currentPassword = '';

  /**
   * Bound input value for the proposed new password.
   */
  newPassword = '';

  /**
   * Bound confirmation value for the proposed new password.
   */
  confirmPassword = '';

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
   * Toggle state for masking/unmasking the current password input text.
   */
  showCurrent = false;

  /**
   * Toggle state for masking/unmasking the new password input text.
   */
  showNew = false;

  /**
   * Toggle state for masking/unmasking the confirmation password input text.
   */
  showConfirm = false;

  /**
   * Constructs the ChangePasswordComponent.
   *
   * @param userSettingsService - The service responsible for sending password changes to the backend.
   * @param toast - The service triggering global toast alert banners.
   */
  constructor(
    private userSettingsService: UserSettingsService,
    private toast: ToastService
  ) {}

  /**
   * Submits the password update request after verifying current existence, minimum character
   * constraints, and matching validations. Clears values on success.
   */
  onSubmit(): void {
    this.successMsg = '';
    this.errorMsg = '';

    if (!this.currentPassword) {
      this.errorMsg = 'Current password is required.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.errorMsg = 'New password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }

    this.isLoading = true;
    this.userSettingsService
      .changePassword(this.currentPassword, this.newPassword, this.confirmPassword)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.successMsg = 'Password changed successfully!';
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.toast.success('Password changed!');
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMsg = err?.error || 'Failed to change password. Please try again.';
          this.toast.error(this.errorMsg);
        },
      });
  }
}
