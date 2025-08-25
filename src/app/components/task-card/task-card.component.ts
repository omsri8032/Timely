import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.css']
})
export class TaskCardComponent {
  @Input() task!: Task;
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();

  public showActions = signal(false);

  getPriorityColor(): string {
    switch (this.task.priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }

  getPriorityLabel(): string {
    return this.task.priority.charAt(0).toUpperCase() + this.task.priority.slice(1);
  }

  onEdit(): void {
    this.editTask.emit(this.task);
  }

  onDelete(): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.deleteTask.emit(this.task.id);
    }
  }

  toggleActions(): void {
    this.showActions.set(!this.showActions());
  }
}
