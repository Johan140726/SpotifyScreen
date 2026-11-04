import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular/lazy';
import { RouterModule, Routes } from '@angular/router';
import { SpotifyLoginPage } from './spotify-login.page';

const routes: Routes = [{ path: '', component: SpotifyLoginPage }];
@NgModule({
  imports: [CommonModule, ReactiveFormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [SpotifyLoginPage]
})
export class SpotifyLoginPageModule {}
