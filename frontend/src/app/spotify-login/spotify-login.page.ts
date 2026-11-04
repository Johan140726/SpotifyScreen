import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

interface GoogleCredential { credential: string; }
interface GoogleIdentityApi {
  initialize(options: { client_id: string; callback: (result: GoogleCredential) => void; auto_select?: boolean }): void;
  renderButton(target: HTMLElement, options: { theme: string; size: string; shape: string; text: string; width: number; locale: string }): void;
  cancel(): void;
}
interface GoogleWindow extends Window { google?: { accounts: { id: GoogleIdentityApi } } }

@Component({
  selector: 'app-spotify-login',
  templateUrl: './spotify-login.page.html',
  styleUrls: ['./spotify-login.page.scss'],
  standalone: false
})
export class SpotifyLoginPage implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton') googleButton?: ElementRef<HTMLDivElement>;
  private readonly fb = inject(FormBuilder);
  private readonly zone = inject(NgZone);
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  readonly form = this.fb.nonNullable.group({
    email: [localStorage.getItem('pg_demo_email') || '', [Validators.required, Validators.email, Validators.pattern(this.emailPattern)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
    remember: [Boolean(localStorage.getItem('pg_demo_email'))]
  });

  showPassword = false;
  submitted = false;
  loading = false;
  apiError = '';
  notice = '';
  googleReady = false;
  googleConfigured = false;
  private destroyed = false;

  constructor(private auth: AuthService, private router: Router) {}

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get emailInvalid() { return this.email.invalid && (this.email.touched || this.submitted); }
  get passwordInvalid() { return this.password.invalid && (this.password.touched || this.submitted); }
  get checks() {
    const value = this.password.value;
    return {
      length: value.length >= 8 && value.length <= 128,
      upperLower: /[A-Z]/.test(value) && /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value)
    };
  }

  ngAfterViewInit(): void { void this.initializeGoogle(); }
  ngOnDestroy(): void { this.destroyed = true; }

  private async initializeGoogle(): Promise<void> {
    try {
      const config = await firstValueFrom(this.auth.googleConfig());
      const clientId = config.googleClientId;
      if (!clientId || this.destroyed) return;
      this.googleConfigured = true;
      const google = await this.loadGoogleIdentity();
      if (this.destroyed || !this.googleButton) return;
      google.initialize({
        client_id: clientId,
        auto_select: false,
        callback: response => this.zone.run(() => this.handleGoogle(response.credential))
      });
      const target = this.googleButton.nativeElement;
      target.innerHTML = '';
      const width = Math.min(310, Math.max(200, target.parentElement?.clientWidth || 280));
      google.renderButton(target, {
        theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width, locale: 'es'
      });
      this.zone.run(() => { this.googleReady = true; });
    } catch {
      this.googleConfigured = false;
      this.notice = 'Google no está disponible. Puedes ingresar con la cuenta de prueba.';
    }
  }

  private loadGoogleIdentity(): Promise<GoogleIdentityApi> {
    const existing = (window as GoogleWindow).google?.accounts.id;
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        const api = (window as GoogleWindow).google?.accounts.id;
        api ? resolve(api) : reject(new Error('Google no disponible'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar Google'));
      document.head.appendChild(script);
    });
  }

  private handleGoogle(credential: string): void {
    if (!credential || this.loading) return;
    this.apiError = '';
    this.notice = '';
    this.loading = true;
    this.auth.loginWithGoogle(credential).pipe(finalize(() => this.loading = false)).subscribe({
      next: () => void this.router.navigateByUrl('/home', { replaceUrl: true }),
      error: (error: HttpErrorResponse) => {
        this.apiError = error.error?.message || 'No fue posible autenticar con Google.';
      }
    });
  }

  googleHelp(): void {
    this.notice = 'Para iniciar con Google, configura GOOGLE_CLIENT_ID en backend/.env siguiendo el README y reinicia el servidor.';
  }
  otherButton(): void {
    this.notice = 'Facebook y Apple solo se muestran para conservar la referencia visual; no se configuraron accesos de terceros.';
  }
  help(): void {
    this.notice = 'Esta demo no gestiona recuperación ni registro. Utiliza la cuenta de prueba indicada en README.md.';
  }

  submit(): void {
    this.submitted = true;
    this.apiError = '';
    this.notice = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    const { email, password, remember } = this.form.getRawValue();
    this.auth.login(email.trim().toLowerCase(), password)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: async () => {
          if (remember) localStorage.setItem('pg_demo_email', email.trim().toLowerCase());
          else localStorage.removeItem('pg_demo_email');
          this.password.setValue('');
          await this.router.navigateByUrl('/home', { replaceUrl: true });
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 0) this.apiError = 'No se pudo conectar con el backend. Inicia npm run backend en otra terminal.';
          else if (err.status === 429) this.apiError = 'Demasiados intentos. Intenta más tarde.';
          else if (err.status === 401) this.apiError = 'Correo o contraseña incorrectos.';
          else this.apiError = err.error?.message || 'No fue posible iniciar sesión.';
        }
      });
  }
}
