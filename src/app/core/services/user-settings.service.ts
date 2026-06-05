import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../../types/course-builder.types';

/**
 * UserSettingsService manages HTTP communications for updating user account details.
 *
 * This includes updating the display username and changing passwords.
 */
@Injectable({
  providedIn: 'root',
})
export class UserSettingsService {
  /**
   * Base API endpoint URL for general user account management operations.
   * @private
   */
  private readonly userUrl = `${BASE_URL}/api/User`;

  /**
   * Base API endpoint URL for password update operations.
   * @private
   */
  private readonly passwordUrl = `${BASE_URL}/api/Password`;

  /**
   * Constructs the UserSettingsService.
   *
   * @param http - The Angular HttpClient used to execute REST requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Updates the full name of the currently logged-in user.
   * Sends a PUT request to `/api/User/UpdateUserName`.
   *
   * @param fullName - The new full name string to be set.
   * @returns An observable emitting the response text from the backend API.
   */
  updateUserName(fullName: string): Observable<string> {
    return this.http.put(`${this.userUrl}/UpdateUserName`, { fullName }, { responseType: 'text' });
  }

  /**
   * Changes the password for the currently logged-in user.
   * Sends a POST request to `/api/Password/ChangePassword`.
   *
   * @param currentPassword - The user's current password.
   * @param newPassword - The new password choice.
   * @param confirmPassword - Confirmation matching the new password.
   * @returns An observable emitting the response text from the backend API.
   */
  changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<string> {
    return this.http.post(
      `${this.passwordUrl}/ChangePassword`,
      { currentPassword, newPassword, confirmPassword },
      { responseType: 'text' }
    );
  }
}
