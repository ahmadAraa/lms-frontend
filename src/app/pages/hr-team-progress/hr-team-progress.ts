import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EnrollmentService, EmployeeProgressDto } from '../../services/enrollment.service';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-hr-team-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hr-team-progress.html',
  styleUrl: './hr-team-progress.css'
})
export class HrTeamProgress implements OnInit {
  progressList: EmployeeProgressDto[] = [];
  isLoading = true;

  constructor(
    private enrollmentService: EnrollmentService,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProgress();
  }

  loadProgress(): void {
    const managerId = this.authService.getUserId();
    if (!managerId) {
      this.toast.error('Manager ID not found. Please log in again.');
      this.isLoading = false;
      return;
    }

    this.enrollmentService.getEmployeeProgressWithManagerId(managerId).subscribe({
      next: (data) => {
        this.progressList = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load team progress:', err);
        this.toast.error('Failed to load team progress.');
        this.isLoading = false;
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  }
}
