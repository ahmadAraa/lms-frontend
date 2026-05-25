import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const allowedRoles = (route.data?.['roles'] as UserRole[] | undefined) ?? [];

  if (allowedRoles.length === 0 || authService.hasAnyRole(allowedRoles)) {
    return true;
  }

  const userRole = authService.getUserRole();
  router.navigate([
    userRole === 'SUPERADMIN' || userRole === 'HR' || userRole === 'MANAGER'
      ? '/hr/dashboard'
      : '/employee/dashboard',
  ]);
  return false;
};
