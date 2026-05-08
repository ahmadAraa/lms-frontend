import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell';

@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './employee-layout.component.html',
  styleUrl: './employee-layout.component.css',
})
export class EmployeeLayoutComponent {
  profileOpen = false;

  constructor(public authService: AuthService, private router: Router) {}

  getInitial(): string {
    const name = this.authService.getUserName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileOpen = false;
  }

  goToSettings(): void {
    this.profileOpen = false;
    this.router.navigate(['/employee/user-settings']);
  }

  logout(): void {
    this.profileOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
