import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { ChangeNameComponent } from './components/change-name/change-name.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, ChangeNameComponent, ChangePasswordComponent],
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.css',
})
export class UserSettingsComponent implements OnInit {
  userName = '';
  userRole = '';
  backRoute = '/';

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userName = this.authService.getUserName();
    this.userRole = this.authService.getUserRole() ?? '';
    this.backRoute = this.userRole === 'EMPLOYEE' ? '/employee/dashboard' : '/hr/dashboard';
  }

  getInitial(): string {
    return this.userName ? this.userName.charAt(0).toUpperCase() : '?';
  }
}
