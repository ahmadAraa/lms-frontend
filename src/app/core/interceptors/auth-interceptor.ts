import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // isLoggedIn() checks if a token exists and if it's expired.
  // If it's expired, it will automatically call logout().
  if (authService.isLoggedIn()) {
    const token = authService.getToken();
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(cloned);
  }

  // We do not redirect here because login/register requests 
  // also go through this interceptor without a token.
  // We just pass the request without a token.
  return next(req);
};

