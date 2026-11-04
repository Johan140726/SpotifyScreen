import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface LoggedInUser { email: string; displayName: string; }
export interface AuthResult { authenticated: boolean; user: LoggedInUser; expiresInSeconds?: number; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient) {}
  login(email: string, password: string): Observable<AuthResult> {
    return this.http.post<AuthResult>('/api/auth/login', { email, password }, { withCredentials: true });
  }
  loginWithGoogle(credential: string): Observable<AuthResult> {
    return this.http.post<AuthResult>('/api/auth/google', { credential }, { withCredentials: true });
  }
  googleConfig(): Observable<{ googleClientId: string | null }> {
    return this.http.get<{ googleClientId: string | null }>('/api/auth/config');
  }
  currentUser(): Observable<AuthResult> {
    return this.http.get<AuthResult>('/api/auth/me', { withCredentials: true });
  }
  isLoggedIn(): Observable<boolean> { return this.currentUser().pipe(map(data => data.authenticated)); }
  logout(): Observable<{ok: boolean}> {
    return this.http.post<{ok: boolean}>('/api/auth/logout', {}, { withCredentials: true });
  }
}
