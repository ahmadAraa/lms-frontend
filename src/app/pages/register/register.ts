import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

/**
 * Component handling new user registration workflow.
 *
 * Implements input validation checks, submits creation payloads to the backend API,
 * and schedules a deferred redirect to the login screen on a successful response.
 */
@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  /**
   * Bound username string input.
   */
  userName = '';

  /**
   * Bound full name string input.
   */
  fullName = '';

  /**
   * Bound email address string input.
   */
  email = '';

  /**
   * Bound password string input.
   */
  password = '';

  /**
   * Bound password confirmation verification input.
   */
  confirmPassword = '';

  /**
   * Error message displayed during registration errors.
   */
  errorMessage = '';

  /**
   * Success notification message displayed upon successful registration.
   */
  successMessage = '';

  /**
   * Flag indicating if the registration request is currently in flight.
   */
  isLoading = false;

  /**
   * Controls password input visibility toggle.
   */
  showPassword = false;

  /**
   * Controls password confirmation input visibility toggle.
   */
  showConfirmPassword = false;

  /**
   * Constructs the Register component.
   *
   * @param authService - The service responsible for submitting registration data payloads.
   * @param router - The router used to redirect registered users to the login screen.
   * @param cdr - The ChangeDetectorRef to force template refreshes after asynchronous updates.
   */
  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Triggers the registration submission, verifying matching passwords locally before
   * hitting the registration API endpoint. Redirects to the login route after 2 seconds on success.
   */
  onRegister() {
    if (this.isLoading) return;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.authService
      .register(this.userName, this.email, this.password, this.confirmPassword, this.fullName)
      .subscribe({
        next: () => {
          this.successMessage = 'Account created! Redirecting to login...';
          this.cdr.detectChanges();
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (err) => {
          this.errorMessage = err.error || 'Registration failed. Please try again.';
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }
}
