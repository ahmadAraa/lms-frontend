import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../types/course-builder.types';

@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  private readonly userUrl = `${BASE_URL}/api/User`;
  private readonly passwordUrl = `${BASE_URL}/api/Password`;

  constructor(private http: HttpClient) {}

  /**
   * Updates the display name (username) of the currently logged-in user.
   * PUT /api/User/UpdateUserName
   */
  updateUserName(newUserName: string): Observable<string> {
    return this.http.put(`${this.userUrl}/UpdateUserName`, { newUserName }, { responseType: 'text' });
  }

  /**
   * Changes the password for the currently logged-in user.
   * POST /api/Password/ChangePassword
   */
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<string> {
    return this.http.post(
      `${this.passwordUrl}/ChangePassword`,
      { currentPassword, newPassword, confirmPassword },
      { responseType: 'text' }
    );
  }
}
