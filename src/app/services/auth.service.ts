import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  passwordHash: string; // simple demo, not for production
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USERS_KEY = 'kanban-users';
  private readonly SESSION_KEY = 'kanban-session';
  private platformId = inject(PLATFORM_ID);

  public readonly currentUserEmail = signal<string | null>(null);

  private isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  constructor() {
    if (this.isBrowser()) {
      const email = localStorage.getItem(this.SESSION_KEY);
      if (email) this.currentUserEmail.set(email);
    }
  }

  private loadUsers(): UserAccount[] {
    if (!this.isBrowser()) return [];
    const raw = localStorage.getItem(this.USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveUsers(users: UserAccount[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private hash(password: string): string {
    // very basic hash substitute for demo
    let h = 0;
    for (let i = 0; i < password.length; i++) h = (h * 31 + password.charCodeAt(i)) >>> 0;
    return h.toString(16);
  }

  signup(name: string, email: string, password: string): { ok: boolean; message: string } {
    const users = this.loadUsers();
    if (users.some(u => u.email === email)) return { ok: false, message: 'Email already registered' };
    users.push({ id: Date.now().toString(36), email, name, passwordHash: this.hash(password) });
    this.saveUsers(users);
    return { ok: true, message: 'Account created' };
  }

  login(email: string, password: string): { ok: boolean; message: string } {
    const users = this.loadUsers();
    const found = users.find(u => u.email === email && u.passwordHash === this.hash(password));
    if (!found) return { ok: false, message: 'Invalid credentials' };
    if (this.isBrowser()) localStorage.setItem(this.SESSION_KEY, email);
    this.currentUserEmail.set(email);
    return { ok: true, message: 'Logged in' };
  }

  logout(): void {
    if (this.isBrowser()) localStorage.removeItem(this.SESSION_KEY);
    this.currentUserEmail.set(null);
  }
}


