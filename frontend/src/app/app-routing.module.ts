import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'spotify-login', pathMatch: 'full' },
  { path: 'spotify-login', loadChildren: () => import('./spotify-login/spotify-login.module').then(m => m.SpotifyLoginPageModule) },
  { path: 'home', canActivate: [authGuard], loadChildren: () => import('./home/home.module').then(m => m.HomePageModule) },
  { path: '**', redirectTo: 'spotify-login' }
];

@NgModule({ imports: [RouterModule.forRoot(routes)], exports: [RouterModule] })
export class AppRoutingModule {}
