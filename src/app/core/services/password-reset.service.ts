import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../../types/course-builder.types';

/**
 * Service responsible for managing user password reset flows.
 *
 * Coordinates request dispatches for forgotten passwords (initiating email token dispatches)
 * and finalizes changes by submitting new passwords along with verification tokens.
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordResetService {
  /** API path representing password reset endpoint host */
  private readonly apiUrl = `${BASE_URL}/api/Password`;

  constructor(private http: HttpClient) {}

  /**
   * Triggers a password reset request. Instructs the backend to send a verification
   * token link to the specified email address if the account exists.
   *
   * @param email - The registered email address of the user who forgot their password.
   * @returns An `Observable` representing the backend response.
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Finalizes the password reset operation by submitting the target verification token
   * alongside the new password credential.
   *
   * @param email - The user's primary email address.
   * @param token - The unique authorization code token received via reset email link.
   * @param newPassword - The new password chosen by the user.
   * @returns An `Observable` emitting the backend text/string confirmation message.
   */
  resetPassword(
    email: string,
    token: string,
    newPassword: string
  ): Observable<string> {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      email,
      token,
      newPassword,
    }, {
      responseType: 'text',
    });
  }
}
