import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ChangeNameComponent } from './components/change-name/change-name.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';

/**
 * Component representing the root user settings configuration dashboard view.
 *
 * Imports nested child components for changing the display username and changing passwords,
 * and dynamically calculates the return back-route navigation path based on user roles.
 */
@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, ChangeNameComponent, ChangePasswordComponent],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css',
})
export class UserSettingsComponent implements OnInit {
  /**
   * The currently logged-in user's display username.
   */
  userName = '';

  /**
   * The decoded security role of the user (e.g. 'SUPERADMIN', 'HR', 'EMPLOYEE', 'MANAGER').
   */
  userRole = '';

  /**
   * The dynamic relative routing path to navigate to when returning from the settings page.
   */
  backRoute = '/';

  /**
   * Constructs the UserSettingsComponent.
   *
   * @param authService - The AuthService used to retrieve current user claims and identities.
   */
  constructor(private authService: AuthService) {}

  /**
   * Angular initialization hook. Loads user identity parameters and maps the correct return backRoute link.
   */
  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.userRole = this.authService.getUserRole() ?? '';
    this.backRoute = this.userRole === 'EMPLOYEE' ? '/employee/dashboard' : '/hr/dashboard';
  }

  /**
   * Retrieves the capitalized first initial of the user's name for profile badge display.
   * Defaults to '?' if name claims are not found.
   *
   * @returns A single character string initial.
   */
  getInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : '?';
  }
}
