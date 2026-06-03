import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NotificationBellComponent } from '../../../components/notification-bell/notification-bell';

/**
 * Component representing the shell layout for all Employee-level dashboard pages.
 *
 * Implements navigation links, real-time notification integration via the NotificationBell,
 * and a profile dropdown menu with logout and account configuration access.
 */
@Component({
  selector: 'app-employee-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './employee-layout.component.html',
  styleUrl: './employee-layout.component.css',
})
export class EmployeeLayoutComponent {
  /**
   * Tracks whether the profile settings dropdown menu is currently expanded in the navbar.
   */
  profileOpen = false;

  /**
   * Constructs the EmployeeLayoutComponent.
   *
   * @param authService - The AuthService used to manage identity status, usernames, and sessions.
   * @param router - The Router used to redirect employees upon navigation actions or logout.
   */
  constructor(public authService: AuthService, private router: Router) {}

  /**
   * Returns the capitalized first initial of the current user's display name.
   * Defaults to '?' if the name is not defined or unauthenticated.
   *
   * @returns A single character string representing the profile initial.
   */
  getInitial(): string {
    const name = this.authService.getUserName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  /**
   * Resolves the route for the brand logo. Admins are redirected to the HR dashboard
   * while employees go to the employee dashboard.
   */
  getLogoRoute(): string {
    const role = this.authService.getUserRole();
    if (role === 'SUPERADMIN' || role === 'HR' || role === 'MANAGER') {
      return '/hr/dashboard';
    }
    return '/employee/dashboard';
  }

  /**
   * Toggles the visible expansion state of the user profile navigation menu.
   * Stops event propagation to prevent immediate document-click auto-dismissal.
   *
   * @param event - The trigger mouse event.
   */
  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.profileOpen = !this.profileOpen;
  }

  /**
   * Document-level click listener that automatically closes the open profile dropdown menu
   * when any click is made elsewhere on the screen.
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileOpen = false;
  }

  /**
   * Closes the active dropdown and redirects the employee to their user account settings page.
   */
  goToSettings(): void {
    this.profileOpen = false;
    this.router.navigate(['/employee/user-settings']);
  }

  /**
   * Performs a logout operation by clearing authentications and redirecting to the landing page.
   */
  logout(): void {
    this.profileOpen = false;
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
