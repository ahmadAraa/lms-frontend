import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Supported authorization roles in the application.
 * - 'SUPERADMIN': Highest-level administrator with HR account management access.
 * - 'HR': Human Resources/Admin user.
 * - 'MANAGER': Department or team manager.
 * - 'EMPLOYEE': General team employee.
 */
export type UserRole = 'SUPERADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE';

/**
 * Backend response structure for a successful login request.
 */
export type LoginResponse = {
  /** The JWT authentication token (PascalCase from some backends) */
  Token?: string;
  /** The JWT authentication token (camelCase from some backends) */
  token?: string;
  /** Token expiration date string (PascalCase) */
  Expiration?: string;
  /** Token expiration date string (camelCase) */
  expiration?: string;
};

/**
 * Service responsible for user authentication, registration, role management,
 * and parsing claims from local JWT tokens stored in `localStorage`.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /** Base URL for user and authentication API endpoints */
  private baseUrl = `${environment.apiUrl}/api/User`;
  
  /** In-memory cache of the JWT string */
  private token: string | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Registers a new user/employee in the system.
   *
   * @param userName - The chosen unique identifier username.
   * @param email - The user's registration email address.
   * @param password - The desired password.
   * @param passwordConfirm - Password confirmation, must match the password.
   * @param fullName - The real name of the user.
   * @returns An `Observable` corresponding to the HTTP POST registration request.
   */
  register(
    userName: string,
    email: string,
    password: string,
    passwordConfirm: string,
    fullName: string,
  ) {
    return this.http.post(`${this.baseUrl}/Register`, {
      userName,
      email,
      password,
      confirmPassword: passwordConfirm,
      fullName,
    });
  }

  /**
   * Performs a login request.
   *
   * @param email - User's email credential.
   * @param password - User's password credential.
   * @returns An `Observable` containing the JWT token inside a `LoginResponse`.
   */
  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${this.baseUrl}/Login`, {
      email,
      password,
    });
  }

  /**
   * Administrative method for creating a user (specifically used by HR/Admins).
   *
   * @param payload - Object detailing the new user properties.
   * @param payload.userName - Unique username.
   * @param payload.email - Email address.
   * @param payload.password - Auth password.
   * @param payload.confirmPassword - Matching confirmation password.
   * @param payload.fullName - Real name of the new user.
   * @param payload.role - Optional system authorization level.
   * @returns An `Observable` representing the raw text response of the HTTP POST request.
   */
  createUser(payload: {
    userName: string;
    email: string;
    password: string;
    confirmPassword: string;
    fullName?: string;
    role?: UserRole;
  }) {
    return this.http.post(`${this.baseUrl}/create-user`, payload, {
      responseType: 'text',
    });
  }

  /**
   * Administrative method for deleting an existing user account.
   *
   * @param id - The unique GUID/Identifier of the user.
   * @returns An `Observable` corresponding to the HTTP DELETE request with text response.
   */
  deleteUser(id: string, replacementManagerId?: string) {
    let url = `${this.baseUrl}/DeleteUser/${id}`;
    if (replacementManagerId) {
      url += `?replacementManagerId=${encodeURIComponent(replacementManagerId)}`;
    }
    return this.http.delete(url, { responseType: 'text' });
  }

  /**
   * Saves a valid JWT string in memory and persists it to the browser's local storage.
   *
   * @param token - The raw JWT token or undefined/null.
   */
  saveToken(token: string | undefined | null) {
    if (!this.isValidToken(token)) return;

    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Retrieves the current JWT from in-memory cache or, as a fallback, from `localStorage`.
   *
   * @returns The active token string if valid, otherwise `null`.
   */
  getToken(): string | null {
    const token = this.token || localStorage.getItem('token');

    if (!this.isValidToken(token)) return null;

    return token;
  }

  /**
   * Checks whether the current JWT is expired by reading the `exp` claim.
   *
   * @returns `true` if the token is expired or payload is unparsable, otherwise `false`.
   */
  isTokenExpired(): boolean {
    const payload = this.getTokenPayload();
    if (!payload || !payload['exp']) return true;

    const expirationTime = Number(payload['exp']) * 1000;
    return Date.now() > expirationTime;
  }

  /**
   * Checks if a user is authenticated with a valid, non-expired token.
   * Logs out the user internally if the token is found to be expired.
   *
   * @returns `true` if logged in, `false` otherwise.
   */
  isLoggedIn(): boolean {
    if (!this.getToken()) return false;

    if (this.isTokenExpired()) {
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Clears the current login state by removing memory references and local storage token records.
   */
  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }

  /**
   * Decodes the current token payload and maps JWT role claims to a structured `UserRole`.
   * Maps 'admin' to 'HR' for legacy backend compatibility.
   *
   * Supports standard XML schema role claims and standard OAuth `role`/`roles` fields.
   *
   * @returns The mapped `UserRole` or `null` if not authenticated or matching.
   */
  getUserRole(): UserRole | null {
    const payload = this.getTokenPayload();

    if (!payload) return null;

    const roles: string[] = [];

    for (const [key, value] of Object.entries(payload)) {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey === 'role' ||
        normalizedKey === 'roles' ||
        normalizedKey.endsWith('/role') ||
        normalizedKey.includes('claims/role')
      ) {
        if (Array.isArray(value)) {
          roles.push(...value.map(String));
        } else if (typeof value === 'string') {
          roles.push(...value.split(','));
        }
      }
    }

    const normalizedRoles = roles.map((r) => r.trim().toLowerCase());

    if (normalizedRoles.includes('superadmin')) return 'SUPERADMIN';
    if (normalizedRoles.includes('super_admin')) return 'SUPERADMIN';
    if (normalizedRoles.includes('super admin')) return 'SUPERADMIN';
    if (normalizedRoles.includes('admin')) return 'HR';
    if (normalizedRoles.includes('hr')) return 'HR';
    if (normalizedRoles.includes('manager')) return 'MANAGER';
    if (normalizedRoles.includes('employee')) return 'EMPLOYEE';

    return null;
  }

  /**
   * Extracts the unique user ID from JWT payload claims (`sub`, `nameid`, etc.).
   *
   * @returns The user's ID string, or an empty string if not found.
   */
  getUserId(): string {
    const payload = this.getTokenPayload();

    if (!payload) return '';

    return String(
      payload['sub'] ??
        payload['nameid'] ??
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
        '',
    );
  }

  /**
   * Extracts a readable display name from the JWT payload claims (`name`, `unique_name`, `email`, etc.).
   * Capitalizes the first letter of the name prefix.
   *
   * @returns The parsed and formatted display name.
   */
  getUserName(): string {
    const payload = this.getTokenPayload();

    if (!payload) return '';

    const nameClaim = String(
      payload['name'] ??
        payload['unique_name'] ??
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ??
        payload['email'] ??
        '',
    );

    const rawName = nameClaim.includes('@') ? nameClaim.split('@')[0] : nameClaim;

    return rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
  }

  /**
   * Verifies if the logged-in user possesses any of the accepted roles.
   *
   * @param roles - Array of `UserRole` options to validate against.
   * @returns `true` if user role is in the list, otherwise `false`.
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const userRole = this.getUserRole();

    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Extracts and decodes the JSON payload middle segment of the JWT token string.
   *
   * @returns Decoded claims mapping object or `null` if unparsable or no token.
   */
  private getTokenPayload(): Record<string, unknown> | null {
    const token = this.getToken();

    if (!token) return null;

    try {
      const payloadPart = token.split('.')[1];

      if (!payloadPart) return null;

      const decodedPayload = this.decodeBase64Url(payloadPart);

      return JSON.parse(decodedPayload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Base64URL-decodes a URL-safe base64 string back into standard UTF-8 string.
   * Replaces URL-safe characters and pads properly.
   *
   * @param base64Url - The raw segment from JWT.
   * @returns The original JSON string representation.
   */
  private decodeBase64Url(base64Url: string): string {
    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(base64Url.length / 4) * 4, '=');

    return atob(base64);
  }

  /**
   * Helper utility checking that the given token is not undefined, null, or matching "undefined"/"null" strings.
   *
   * @param token - Input to check.
   * @returns `true` if valid token string, else `false`.
   */
  private isValidToken(token: string | null | undefined): token is string {
    return !!token && token !== 'undefined' && token !== 'null';
  }
}
