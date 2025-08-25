import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { TaskService } from './services/task.service';
import { Task } from './models/task.model';
import { KanbanColumnComponent } from './components/kanban-column/kanban-column.component';
import { TaskFormComponent } from './components/task-form/task-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CdkDropListGroup, KanbanColumnComponent, TaskFormComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  public showTaskForm = signal(false);
  public editingTask = signal<Task | undefined>(undefined);

  constructor(public taskService: TaskService) {}

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
    } else {
      this.taskService.addTask(taskData);
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
  }

  onTaskMoved(event: { taskId: string, newStatus: Task['status'] }): void {
    this.taskService.moveTask(event.taskId, event.newStatus);
  }
}
