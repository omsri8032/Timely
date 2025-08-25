import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideClientHydration(),
    provideAnimations()
  ]
};
