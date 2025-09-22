import { Injectable, signal } from '@angular/core';

export type SnackbarType = 'success' | 'info' | 'warning' | 'error';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  public readonly isVisible = signal(false);
  public readonly message = signal<string>('');
  public readonly type = signal<SnackbarType>('info');

  private hideTimer: any = null;

  show(message: string, type: SnackbarType = 'info', durationMs: number = 3000): void {
    this.message.set(message);
    this.type.set(type);
    this.isVisible.set(true);

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.hideTimer = setTimeout(() => this.hide(), durationMs);
  }

  hide(): void {
    this.isVisible.set(false);
  }
}


