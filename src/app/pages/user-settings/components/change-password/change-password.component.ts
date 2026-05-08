import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSettingsService } from '../../../../services/user-settings.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css',
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  successMsg = '';
  errorMsg = '';

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(
    private userSettingsService: UserSettingsService,
    private toast: ToastService
  ) {}

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
