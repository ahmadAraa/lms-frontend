import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NotificationBellComponent } from '../../../components/notification-bell/notification-bell';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
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
    this.router.navigate(['/user-settings']);
  }

  logout(): void {
    this.profileOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
