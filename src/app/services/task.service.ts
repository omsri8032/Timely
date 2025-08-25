import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly STORAGE_KEY = 'kanban-tasks';
  private platformId = inject(PLATFORM_ID);
  
  // Signals for reactive state management
  public tasks = signal<Task[]>([]);
  public todoTasks = signal<Task[]>([]);
  public inProgressTasks = signal<Task[]>([]);
  public doneTasks = signal<Task[]>([]);

  constructor() {
    this.loadTasksFromStorage();
  }

  private loadTasksFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedTasks = localStorage.getItem(this.STORAGE_KEY);
      if (storedTasks) {
        const tasks = JSON.parse(storedTasks).map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt)
        }));
        this.tasks.set(tasks);
        this.updateColumnTasks();
      }
    }
  }

  private saveTasksToStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tasks()));
    }
  }

  private updateColumnTasks(): void {
    const tasks = this.tasks();
    this.todoTasks.set(tasks.filter(task => task.status === 'todo'));
    this.inProgressTasks.set(tasks.filter(task => task.status === 'in-progress'));
    this.doneTasks.set(tasks.filter(task => task.status === 'done'));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  addTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): void {
    const newTask: Task = {
      ...taskData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const currentTasks = this.tasks();
    this.tasks.set([...currentTasks, newTask]);
    this.updateColumnTasks();
    this.saveTasksToStorage();
  }

  updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
    const currentTasks = this.tasks();
    const taskIndex = currentTasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      const updatedTask = {
        ...currentTasks[taskIndex],
        ...updates,
        updatedAt: new Date()
      };
      
      currentTasks[taskIndex] = updatedTask;
      this.tasks.set([...currentTasks]);
      this.updateColumnTasks();
      this.saveTasksToStorage();
    }
  }

  deleteTask(taskId: string): void {
    const currentTasks = this.tasks();
    const filteredTasks = currentTasks.filter(task => task.id !== taskId);
    this.tasks.set(filteredTasks);
    this.updateColumnTasks();
    this.saveTasksToStorage();
  }

  moveTask(taskId: string, newStatus: Task['status']): void {
    this.updateTask(taskId, { status: newStatus });
  }

  getTaskById(taskId: string): Task | undefined {
    return this.tasks().find(task => task.id === taskId);
  }
}
