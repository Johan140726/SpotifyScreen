import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn().pipe(
    map(loggedIn => loggedIn ? true : router.createUrlTree(['/spotify-login'])),
    catchError(() => of(router.createUrlTree(['/spotify-login'])))
  );
};
