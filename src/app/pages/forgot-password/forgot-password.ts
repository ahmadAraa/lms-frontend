import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private passwordResetService: PasswordResetService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

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
