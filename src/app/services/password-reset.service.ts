import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BASE_URL } from '../types/course-builder.types';

/**
 * Service responsible for handling password reset flow.
 *
 * Flow:
 * 1. User requests password reset → forgotPassword(email)
 * 2. Backend sends email with reset token
 * 3. User submits new password with token → resetPassword(...)
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordResetService {
  private readonly apiUrl = `${BASE_URL}/api/Password`;

  constructor(private http: HttpClient) {}

  /**
   * Sends a password reset email to the user.
   *
   * @param email - User's email address
   * @returns Observable<void> (backend usually returns 200 OK)
   */
  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Resets the user's password using a token received via email.
   *
   * @param email - User's email
   * @param token - Reset token from email link
   * @param newPassword - New password chosen by user
   * @returns Observable<string> (backend returns confirmation message)
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
