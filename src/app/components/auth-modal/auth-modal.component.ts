import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.css']
})
export class AuthModalComponent {
  @Output() close = new EventEmitter<void>();

  public mode = signal<'login' | 'signup'>('login');
  public name = signal('');
  public email = signal('');
  public password = signal('');

  constructor(private auth: AuthService, private snackbar: SnackbarService) {}

  switchMode(): void {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
  }

  submit(): void {
    if (this.mode() === 'signup') {
      const res = this.auth.signup(this.name(), this.email(), this.password());
      this.snackbar.show(res.message, res.ok ? 'success' : 'error');
      if (res.ok) this.switchMode();
      return;
    }
    const res = this.auth.login(this.email(), this.password());
    this.snackbar.show(res.message, res.ok ? 'success' : 'error');
    if (res.ok) this.close.emit();
  }
}


