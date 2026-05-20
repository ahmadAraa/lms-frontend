import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { PasswordResetService } from '../../core/services/password-reset.service';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword implements OnInit {
  email = '';
  token = '';
  newPassword = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private passwordResetService: PasswordResetService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.email = this.decodeBase64UrlParam(params['email'] || '');
      this.token = params['token'] ? params['token'].replace(/ /g, '+') : '';
    });
  }

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
