import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Task } from '../models/task.model';
import { Column } from '../models/column.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly TASKS_KEY = 'kanban-tasks';
  private readonly COLUMNS_KEY = 'kanban-columns';
  private platformId = inject(PLATFORM_ID);
  
  // Reactive state
  public tasks = signal<Task[]>([]);
  public columns = signal<Column[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private loadFromStorage(): void {
    if (!this.isBrowser()) return;

    // Columns
    const storedColumns = localStorage.getItem(this.COLUMNS_KEY);
    if (storedColumns) {
      this.columns.set(JSON.parse(storedColumns));
    } else {
      // default columns
      const defaults: Column[] = [
        { id: 'todo', title: 'To Do', order: 0 },
        { id: 'in-progress', title: 'In Progress', order: 1 },
        { id: 'done', title: 'Done', order: 2 }
      ];
      this.columns.set(defaults);
      localStorage.setItem(this.COLUMNS_KEY, JSON.stringify(defaults));
    }

    // Tasks
    const storedTasks = localStorage.getItem(this.TASKS_KEY);
    const parsed: Task[] = storedTasks ? JSON.parse(storedTasks) : [];
    const tasks: Task[] = parsed.map((task: any) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt)
    }));

    // Backward compatibility: map status -> columnId when not present
    const existingColumns = this.columns();
    tasks.forEach(t => {
      if (!t.columnId) {
        const colId = existingColumns.find(c => c.id === t.status)?.id || 'todo';
        t.columnId = colId;
      }
      if (typeof t.order !== 'number') {
        t.order = 0;
      }
    });

    this.tasks.set(tasks);
    this.normalizeOrders();
    this.saveAll();
  }

  private saveAll(): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.TASKS_KEY, JSON.stringify(this.tasks()));
    localStorage.setItem(this.COLUMNS_KEY, JSON.stringify(this.columns()));
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
    const columnId = taskData.columnId ?? taskData.status ?? 'todo';
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
