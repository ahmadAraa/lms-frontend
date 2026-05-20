import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserSettingsService } from '../../../../core/services/user-settings.service';
import { AuthService } from '../../../../core/services/auth';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-change-name',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-name.component.html',
  styleUrl: './change-name.component.css',
})
export class ChangeNameComponent implements OnInit {
  newUserName = '';
  currentUserName = '';
  isLoading = false;
  successMsg = '';
  errorMsg = '';

  constructor(
    private userSettingsService: UserSettingsService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUserName = this.authService.getUserName();
    this.newUserName = this.currentUserName;
  }

  onSubmit(): void {
    this.successMsg = '';
    this.errorMsg = '';

    const trimmed = this.newUserName.trim();
    if (!trimmed) {
      this.errorMsg = 'Username cannot be empty.';
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      this.errorMsg = 'Username must be between 3 and 20 characters.';
      return;
    }
    if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) {
      this.errorMsg = 'Only letters, numbers, dots and underscores are allowed.';
      return;
    }

    this.isLoading = true;
    this.userSettingsService.updateUserName(trimmed).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMsg = 'Username updated successfully!';
        this.toast.success('Username updated!');
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error || 'Failed to update username. Please try again.';
        this.toast.error(this.errorMsg);
      },
    });
  }
}
