import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { NotificationBellComponent } from '../../../components/notification-bell/notification-bell';

/**
 * Component representing the shell layout for all Admin/HR-level dashboard pages.
 *
 * Implements administrative navigation links, real-time notification integration via the NotificationBell,
 * and a profile dropdown menu with logout and account configuration access.
 */
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  /**
   * Tracks whether the profile settings dropdown menu is currently expanded in the navbar.
   */
  profileOpen = false;

  /**
   * Constructs the AdminLayoutComponent.
   *
   * @param authService - The AuthService used to manage identity status, usernames, and sessions.
   * @param router - The Router used to redirect administrators upon navigation actions or logout.
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
   * Closes the active dropdown and redirects the admin to their user account settings page.
   */
  goToSettings(): void {
    this.profileOpen = false;
    this.router.navigate(['/user-settings']);
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
