import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { isPlatformBrowser } from '@angular/common';
import { Task } from '../models/task.model';
import { Column } from '../models/column.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly TASKS_KEY_BASE = 'kanban-tasks';
  private readonly COLUMNS_KEY_BASE = 'kanban-columns';
  private platformId = inject(PLATFORM_ID);
  private auth = inject(AuthService);
  private db = inject(DatabaseService);
  
  // Reactive state
  public tasks = signal<Task[]>([]);
  public columns = signal<Column[]>([]);
  private lastLoadedUserKey: string | null = null;

  constructor() {
    // One-time migration to consolidated database
    this.db.migrateLegacyIfPresent();
    this.loadForCurrentUser();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private storageKeys(): { tasksKey: string; columnsKey: string } | null { return null; }

  public loadForCurrentUser(): void {
    if (!this.isBrowser()) return;
    // Reset current in-memory state first to avoid mixing boards
    this.tasks.set([]);
    this.columns.set([]);

    const email = this.auth.currentUserEmail();
    if (!email) {
      // Guest: non-persistent default board
      const defaults: Column[] = [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'done', title: 'Done', order: 2 }
      ];
      this.columns.set(defaults);
      this.tasks.set([]);
      this.normalizeOrders();
      return;
    }

    const board = this.db.getCurrentUserBoard();
    const tasks: Task[] = (board.tasks || []).map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    }));

    // Map legacy status -> columnId if needed
    const existingColumns = board.columns || [];
    tasks.forEach(t => {
      if (!t.columnId) {
        const colId = existingColumns.find(c => c.id === t.status)?.id || 'todo';
        t.columnId = colId;
      }
      if (typeof t.order !== 'number') t.order = 0;
    });

    this.columns.set(existingColumns);
    this.tasks.set(tasks);
    this.normalizeOrders();
  }

  // Clear current user's board and reinitialize defaults
  public resetForCurrentUser(): void {
    // initialize defaults in-memory
    const defaults: Column[] = [
      { id: 'todo', title: 'To Do', order: 0 },
      { id: 'in-progress', title: 'In Progress', order: 1 },
      { id: 'done', title: 'Done', order: 2 }
    ];
    this.columns.set(defaults);
    this.tasks.set([]);

    // persist only for logged-in users
    const keys = this.storageKeys();
    if (keys && this.isBrowser()) {
      localStorage.setItem(keys.columnsKey, JSON.stringify(defaults));
      localStorage.setItem(keys.tasksKey, JSON.stringify([]));
    }
  }

  private saveAll(): void {
    if (!this.isBrowser()) return;
    const email = this.auth.currentUserEmail();
    if (!email) return; // Guest: do not persist
    this.db.saveCurrentUserBoard({ tasks: this.tasks(), columns: this.columns() });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // Columns
  addColumn(title: string): void {
    const nextOrder = this.columns().length;
    const col: Column = { id: this.generateId(), title, order: nextOrder };
    this.columns.set([...this.columns(), col]);
    this.saveAll();
  }

  deleteColumn(columnId: string): void {
    // remove tasks in column
    const remainingTasks = this.tasks().filter(t => t.columnId !== columnId);
    this.tasks.set(remainingTasks);
    // remove column and reindex orders
    const remainingCols = this.columns().filter(c => c.id !== columnId)
      .sort((a, b) => a.order - b.order)
      .map((c, idx) => ({ ...c, order: idx }));
    this.columns.set(remainingCols);
    this.normalizeOrders();
    this.saveAll();
  }

  renameColumn(columnId: string, title: string): void {
    this.columns.set(this.columns().map(c => c.id === columnId ? { ...c, title } : c));
    this.saveAll();
  }

  // Tasks CRUD
  addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { columnId?: string; }): void {
    // Determine a safe target column
    let columnId = taskData.columnId ?? taskData.status ?? 'todo';
    const available = this.columns();
    if (!available.some(c => c.id === columnId)) {
      columnId = available.length ? available[0].id : 'todo';
    }
    const order = this.nextOrderForColumn(columnId);
    const newTask: Task = {
      ...taskData,
      id: this.generateId(),
      columnId,
      order,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.tasks.set([...this.tasks(), newTask]);
    this.saveAll();
  }

  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    const updated = this.tasks().map(t => t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t);
    this.tasks.set(updated);
    this.saveAll();
  }

  deleteTask(taskId: string): void {
    this.tasks.set(this.tasks().filter(t => t.id !== taskId));
    this.normalizeOrders();
    this.saveAll();
  }

  getTaskById(taskId: string): Task | undefined {
    return this.tasks().find(t => t.id === taskId);
  }

  // Ordering helpers
  private tasksInColumn(columnId: string): Task[] {
    return this.tasks().filter(t => t.columnId === columnId).sort((a, b) => a.order! - b.order!);
  }

  private nextOrderForColumn(columnId: string): number {
    const colTasks = this.tasksInColumn(columnId);
    return colTasks.length ? Math.max(...colTasks.map(t => t.order || 0)) + 1 : 0;
    }

  private normalizeOrders(): void {
    const grouped = new Map<string, Task[]>();
    this.tasks().forEach(t => {
      const list = grouped.get(t.columnId!) || [];
      list.push(t);
      grouped.set(t.columnId!, list);
    });
    const normalized: Task[] = [];
    grouped.forEach((list, colId) => {
      list.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((t, idx) => {
        normalized.push({ ...t, columnId: colId, order: idx });
      });
    });
    this.tasks.set(normalized);
  }

  // Drag and drop operations
  reorderWithinColumn(columnId: string, previousIndex: number, currentIndex: number): void {
    const list = this.tasksInColumn(columnId);
    if (previousIndex === currentIndex) return;
    if (previousIndex < 0 || previousIndex >= list.length) return;
    if (currentIndex < 0 || currentIndex > list.length) return;

    const [moved] = list.splice(previousIndex, 1);
    list.splice(currentIndex, 0, moved);
    list.forEach((t, idx) => (t.order = idx));

    // Merge back into all tasks
    const others = this.tasks().filter(t => t.columnId !== columnId);
    this.tasks.set([...others, ...list]);
    this.saveAll();
  }

  moveToAnotherColumn(taskId: string, targetColumnId: string, targetIndex: number): void {
    const task = this.getTaskById(taskId);
    if (!task) return;

    const sourceColumnId = task.columnId!;
    const sourceList = this.tasksInColumn(sourceColumnId).filter(t => t.id !== taskId);
    const targetList = this.tasksInColumn(targetColumnId);

    // insert into target
    const movedTask: Task = { ...task, columnId: targetColumnId, updatedAt: new Date() };
    targetList.splice(targetIndex, 0, movedTask);

    // reindex
    sourceList.forEach((t, idx) => (t.order = idx));
    targetList.forEach((t, idx) => (t.order = idx));

    // Merge and save
    const merged = [...sourceList, ...targetList, ...this.tasks().filter(t => t.columnId !== sourceColumnId && t.columnId !== targetColumnId)];
    this.tasks.set(merged);
    this.saveAll();
  }
}
