import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({ selector: 'app-home', templateUrl: './home.page.html', styleUrls: ['./home.page.scss'], standalone: false })
export class HomePage implements OnInit {
  @ViewChild('songAudio') songAudio?: ElementRef<HTMLAudioElement>;
  readonly title = 'La Víspera de Año Nuevo';
  readonly artist = 'Los 50 de Joselito';
  readonly officialUrl = 'https://www.youtube.com/watch?v=zqAwD8PQQd4';
  readonly audioSrc = 'assets/audio/la-vispera-de-ano-nuevo.mp3';
  isPlaying = false;
  audioAvailable = false;
  liked = false;
  shuffled = false;
  repeated = false;
  showMenu = false;
  currentTime = 0;
  duration = 160;
  message = '';
  loggingOut = false;
  constructor(private auth: AuthService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    // El guard consulta /api/auth/me antes de permitir la entrada a esta pantalla.
    try {
      const response = await fetch(this.audioSrc, { method: 'HEAD' });
      this.audioAvailable = response.ok && (response.headers.get('content-type') || '').startsWith('audio/');
    } catch { this.audioAvailable = false; }
  }
  get currentLabel(): string { return this.format(this.currentTime); }
  get durationLabel(): string { return this.format(this.duration); }
  get percent(): number { return this.duration > 0 ? Math.min(100, this.currentTime / this.duration * 100) : 0; }
  private format(time: number): string {
    const secs = Number.isFinite(time) ? Math.floor(time) : 0;
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }
  metadata(): void {
    const duration = this.songAudio?.nativeElement.duration;
    if (duration && Number.isFinite(duration)) this.duration = duration;
  }
  tick(): void { this.currentTime = this.songAudio?.nativeElement.currentTime || 0; }
  async togglePlay(): Promise<void> {
    if (!this.audioAvailable) {
      // Sin licencia de audio no empaquetamos la grabación comercial.
      this.openOfficial();
      return;
    }
    const audio = this.songAudio?.nativeElement;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
        this.isPlaying = true;
        this.message = '';
      } catch {
        this.message = 'No se pudo reproducir el MP3. Comprueba el archivo y vuelve a intentarlo.';
      }
    } else { audio.pause(); this.isPlaying = false; }
  }
  seek(event: Event): void {
    const audio = this.songAudio?.nativeElement;
    if (!audio || !this.audioAvailable) return;
    audio.currentTime = this.duration * Number((event.target as HTMLInputElement).value) / 100;
    this.tick();
  }
  restart(): void {
    const audio = this.songAudio?.nativeElement;
    if (audio) audio.currentTime = 0;
    this.currentTime = 0;
  }
  ended(): void {
    this.isPlaying = false;
    if (this.repeated && this.songAudio) {
      this.songAudio.nativeElement.currentTime = 0;
      void this.togglePlay();
    }
  }
  openOfficial(): void {
    window.open(this.officialUrl, '_blank', 'noopener,noreferrer');
    this.message = 'Grabación oficial abierta en YouTube. Para escuchar dentro de la app, coloca un MP3 autorizado en assets/audio/.';
  }
  showTrackInfo(): void {
    this.message = 'Playlist: Liked Songs · 1 canción · Los 50 de Joselito.';
  }
  async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.songAudio?.nativeElement.pause();
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/spotify-login', { replaceUrl: true }),
      error: () => {
        this.loggingOut = false;
        this.message = 'No fue posible cerrar la sesión. Revisa la conexión.';
      }
    });
  }
}
