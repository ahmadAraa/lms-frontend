import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getUserRole();
      if (role === 'HR' || role === 'MANAGER') {
        this.router.navigate(['/hr/dashboard']);
      } else {
        this.router.navigate(['/employee/dashboard']);
      }
    }
  }

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
        this.authService.saveToken(token);
        const role = this.authService.getUserRole();

        if (!role) {
          this.authService.logout();
          this.errorMessage = 'Login succeeded, but your account role is not recognized.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        const target = role === 'HR' || role === 'MANAGER'
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
      error: (err) => {
        this.errorMessage = err.error || 'Login failed. Please check your credentials.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
