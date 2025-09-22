import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { Task } from '../models/task.model';
import { Column } from '../models/column.model';

export interface BoardData {
  tasks: Task[];
  columns: Column[];
}

interface DatabaseShape {
  version: number;
  users: Record<string, BoardData>; // key: normalized email
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly DB_KEY = 'kanban-db';
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);

  private isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  private readDb(): DatabaseShape {
    if (!this.isBrowser()) return { version: 1, users: {} };
    const raw = localStorage.getItem(this.DB_KEY);
    if (!raw) return { version: 1, users: {} };
    try {
      const parsed = JSON.parse(raw) as DatabaseShape;
      return parsed?.users ? parsed : { version: 1, users: {} };
    } catch {
      return { version: 1, users: {} };
    }
  }

  private writeDb(db: DatabaseShape): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.DB_KEY, JSON.stringify(db));
  }

  // One-time migration from legacy per-user keys
  migrateLegacyIfPresent(): void {
    if (!this.isBrowser()) return;
    try {
      const db = this.readDb();
      // Discover keys like kanban-tasks::<email> and kanban-columns::<email>
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.startsWith('kanban-tasks::')) {
          const email = key.split('kanban-tasks::')[1];
          const tasks = JSON.parse(localStorage.getItem(key) || '[]');
          const colsKey = `kanban-columns::${email}`;
          const columns = JSON.parse(localStorage.getItem(colsKey) || '[]');
          if (!db.users[email]) db.users[email] = { tasks: [], columns: [] };
          db.users[email].tasks = tasks;
          db.users[email].columns = columns;
        }
      }
      // Clean legacy keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith('kanban-tasks') || k.startsWith('kanban-columns')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      this.writeDb(db);
    } catch {}
  }

  getCurrentUserBoard(): BoardData {
    const email = this.auth.currentUserEmail();
    if (!email) {
      // guest: non-persistent ephemeral board
      return {
        columns: [
          { id: 'todo', title: 'To Do', order: 0 },
          { id: 'in-progress', title: 'In Progress', order: 1 },
          { id: 'done', title: 'Done', order: 2 }
        ],
        tasks: []
      };
    }
    const db = this.readDb();
    if (!db.users[email]) {
      db.users[email] = {
        columns: [
          { id: 'todo', title: 'To Do', order: 0 },
          { id: 'in-progress', title: 'In Progress', order: 1 },
          { id: 'done', title: 'Done', order: 2 }
        ],
        tasks: []
      };
      this.writeDb(db);
    }
    return db.users[email];
  }

  saveCurrentUserBoard(data: BoardData): void {
    const email = this.auth.currentUserEmail();
    if (!email) return; // guest: do not persist
    const db = this.readDb();
    db.users[email] = data;
    this.writeDb(db);
  }
}



