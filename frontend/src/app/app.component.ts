
import { Component } from '@angular/core';
import { addIcons } from 'ionicons';

import {
  mailOutline,
  eyeOutline,
  eyeOffOutline,
  logoGoogle,
  logoApple,
  chevronDownOutline,
  ellipsisHorizontal,
  musicalNotes,
  heart,
  heartOutline,
  shuffleOutline,
  playSkipBack,
  playSkipForward,
  play,
  pause,
  repeatOutline,
  phonePortraitOutline,
  shareOutline,
  listOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false
})
export class AppComponent {

  constructor() {

    // Registrar los íconos de ambas pantallas
    addIcons({
      mailOutline,
      eyeOutline,
      eyeOffOutline,
      logoGoogle,
      logoApple,
      chevronDownOutline,
      ellipsisHorizontal,
      musicalNotes,
      heart,
      heartOutline,
      shuffleOutline,
      playSkipBack,
      playSkipForward,
      play,
      pause,
      repeatOutline,
      phonePortraitOutline,
      shareOutline,
      listOutline
    });

  }
}
