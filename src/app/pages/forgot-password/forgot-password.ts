import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';

/**
 * Component managing the initial triggers of the forgot-password flow.
 *
 * Captures user emails, requests a secure reset token via PasswordResetService,
 * and displays success/error statuses indicating transmission results.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  /**
   * The user-entered email address to send the password reset link to.
   */
  email = '';

  /**
   * Error message displayed if the request fails.
   */
  errorMessage = '';

  /**
   * Success feedback message shown upon successfully requesting a reset link.
   */
  successMessage = '';

  /**
   * Flag indicating if the reset request is currently executing in the background.
   */
  isLoading = false;

  /**
   * Constructs the ForgotPassword component.
   *
   * @param passwordResetService - The service handling reset emails.
   * @param router - The router used for standard dashboard redirects.
   * @param cdr - The ChangeDetectorRef to force view updates.
   */
  constructor(
    private passwordResetService: PasswordResetService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Validates input presence and requests the reset password payload link via PasswordResetService.
   */
  onForgot() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    this.isLoading = true;
    this.passwordResetService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'A password reset link has been sent to your email. You can safely close this page or return to login.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || err.error || 'Failed to send reset link. Please verify your email.';
        this.cdr.detectChanges();
      }
    });
  }
}
