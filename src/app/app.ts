import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { TaskService } from './services/task.service';
import { Task } from './models/task.model';
import { KanbanColumnComponent } from './components/kanban-column/kanban-column.component';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { SnackbarComponent } from './components/snackbar/snackbar.component';
import { SnackbarService } from './services/snackbar.service';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CdkDropListGroup, KanbanColumnComponent, TaskFormComponent, SnackbarComponent, AuthModalComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  public showTaskForm = signal(false);
  public editingTask = signal<Task | undefined>(undefined);
  public showAuth = signal(false);

  constructor(
    public taskService: TaskService,
    public snackbar: SnackbarService,
    public auth: AuthService
  ) {}

  // Helpers for template to avoid complex expressions
  getTasksForColumn(columnId: string): Task[] {
    return this.taskService
      .tasks()
      .filter(t => t.columnId === columnId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getConnectedIds(): string[] {
    return this.taskService.columns().map(c => c.id);
  }

  onAddTask(): void {
    this.editingTask.set(undefined);
    this.showTaskForm.set(true);
  }

  onEditTask(task: Task): void {
    this.editingTask.set(task);
    this.showTaskForm.set(true);
  }

  onSaveTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): void {
    if (this.editingTask()) {
      this.taskService.updateTask(this.editingTask()!.id, taskData);
      this.snackbar.show('Task updated', 'success');
    } else {
      this.taskService.addTask(taskData);
      this.snackbar.show('Task added', 'success');
    }
    this.showTaskForm.set(false);
    this.editingTask.set(undefined);
  }

  onCancelForm(): void {
    this.showTaskForm.set(false);
    this.editingTask.set(undefined);
  }

  onDeleteTask(taskId: string): void {
    this.taskService.deleteTask(taskId);
    this.snackbar.show('Task deleted', 'info');
  }

  onReorder(evt: { columnId: string; previousIndex: number; currentIndex: number }): void {
    this.taskService.reorderWithinColumn(evt.columnId, evt.previousIndex, evt.currentIndex);
  }

  onMoveToColumn(evt: { taskId: string; targetColumnId: string; targetIndex: number }): void {
    this.taskService.moveToAnotherColumn(evt.taskId, evt.targetColumnId, evt.targetIndex);
  }

  onAddColumn(): void {
    const title = prompt('Column title');
    if (title && title.trim()) {
      this.taskService.addColumn(title.trim());
      this.snackbar.show('Column added', 'success');
    }
  }

  onDeleteColumn(columnId: string): void {
    if (confirm('Delete this column and all its tasks?')) {
      this.taskService.deleteColumn(columnId);
      this.snackbar.show('Column deleted', 'warning');
    }
  }

  openAuth(): void { this.showAuth.set(true); }
  closeAuth(): void { this.showAuth.set(false); }
  logout(): void {
    this.auth.logout();
    this.snackbar.show('Logged out', 'info');
  }
}
