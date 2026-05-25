import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

/**
 * Component handling authentication requests and session logins for users.
 *
 * Implements login input forms, automated dashboard routing based on decoded
 * user role claims (SUPERADMIN/HR/MANAGER vs. Employee), and handles invalid credentials gracefully.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  /**
   * The bound email input string.
   */
  email = '';

  /**
   * The bound password input string.
   */
  password = '';

  /**
   * Holds the error message displayed on failure.
   */
  errorMessage = '';

  /**
   * Flag indicating if a login transaction is currently pending.
   */
  isLoading = false;

  /**
   * Controls password input visibility toggle.
   */
  showPassword = false;

  /**
   * Controls email local storage credential preservation.
   */
  rememberMe = false;

  /**
   * Constructs the Login component.
   *
   * @param authService - The service responsible for sending credential updates and saving local tokens.
   * @param router - The router used to perform dashboard redirect navigations.
   * @param cdr - The ChangeDetectorRef to force template updates after asynchronous subscription events.
   */
  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Angular initialization hook. If the user is already authenticated, automatically redirects
   * them to their corresponding dashboard page.
   */
  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      if (role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER') {
        this.router.navigate(['/hr/dashboard']);
      } else {
        this.router.navigate(['/employee/dashboard']);
      }
    } else {
      const savedEmail = localStorage.getItem('remembered_email');
      if (savedEmail) {
        this.email = savedEmail;
        this.rememberMe = true;
      }
    }
  }

  /**
   * Triggers the login workflow, executing credentials verification against the AuthService.
   * Saves the JWT token in localStorage on success and redirects the user to the proper page.
   */
  onLogin() {
    if (this.isLoading) return;
    this.errorMessage = '';
    this.isLoading = true;
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        const token = response.Token ?? response.token;
        if (!token) {
          this.errorMessage = 'Login response did not include a token.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }
        
        // Remember Me Email Preservation
        if (this.rememberMe) {
          localStorage.setItem('remembered_email', this.email.trim());
        } else {
          localStorage.removeItem('remembered_email');
        }

        this.authService.saveToken(token);
        const role = this.authService.getUserRole();

        if (!role) {
          this.authService.logout();
          this.errorMessage = 'Login succeeded, but your account role is not recognized.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        const target = role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER'
          ? '/hr/dashboard'
          : '/employee/dashboard';

        this.router.navigate([target]).then((navigated) => {
          if (!navigated) {
            this.errorMessage = 'Login succeeded, but the dashboard could not be opened.';
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        }).catch(() => {
          this.errorMessage = 'Login succeeded, but the dashboard could not be opened.';
          this.isLoading = false;
          this.cdr.markForCheck();
        });
      },
      error: () => {
        this.errorMessage = 'Incorrect email or password';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
