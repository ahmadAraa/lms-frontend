import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';

/**
 * Component handling password reset confirmations.
 *
 * Extracting reset emails (base64url decoded) and secure transaction tokens from the query parameters,
 * validates matching user password credentials, and submits updates to the backend API.
 */
@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  /**
   * The decoded email address of the account being reset.
   */
  email = '';

  /**
   * The secure transactional password reset token string.
   */
  token = '';

  /**
   * Bound value for the new password input field.
   */
  newPassword = '';

  /**
   * Bound value for confirming the new password.
   */
  confirmPassword = '';

  /**
   * Holds the error message displayed on validation or transmission failure.
   */
  errorMessage = '';

  /**
   * Holds the success feedback message text.
   */
  successMessage = '';

  /**
   * Flag indicating if the reset operation is executing in the background.
   */
  isLoading = false;

  /**
   * Controls new password input visibility toggle.
   */
  showPassword = false;

  /**
   * Controls password confirmation input visibility toggle.
   */
  showConfirmPassword = false;

  /**
   * Constructs the ResetPassword component.
   *
   * @param route - The ActivatedRoute used to inspect active query parameter fields.
   * @param router - The router used to navigate users back to login upon success.
   * @param passwordResetService - The service managing backend reset API communication.
   * @param cdr - ChangeDetectorRef to force template refreshes on state updates.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private passwordResetService: PasswordResetService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Angular initialization hook. Extracts email (decoding base64url parameter strings)
   * and normalizes spacing format representation of the secure reset token.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = this.decodeBase64UrlParam(params['email'] || '');
      this.token = params['token'] ? params['token'].replace(/ /g, '+') : '';
    });
  }

  /**
   * Performs client validation checks on matching new passwords and submits the payload
   * to the backend. Redirects to the login route on success.
   */
  onReset() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please enter both password fields.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!this.email || !this.token) {
      this.errorMessage = 'Invalid password reset link. Missing email or token.';
      return;
    }

    this.isLoading = true;
    this.passwordResetService.resetPassword(this.email, this.token, this.newPassword).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate(['/']);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err.error || 'Failed to reset password. The link might be expired or invalid.';
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Safely decodes base64url parameter values back to standard string representations.
   * Replaces base64url characters ('-', '_') and pads with '=' to ensure compliance.
   *
   * @param value - The base64url encoded parameter string.
   * @returns The decoded plain text string, or the raw input on failure.
   * @private
   */
  private decodeBase64UrlParam(value: string): string {
    if (!value) return '';

    try {
      const base64 = value
         .replace(/-/g, '+')
         .replace(/_/g, '/')
         .padEnd(Math.ceil(value.length / 4) * 4, '=');

      return atob(base64);
    } catch {
      return value;
    }
  }
}
