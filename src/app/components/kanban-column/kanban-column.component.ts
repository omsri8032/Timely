import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { Task } from '../../models/task.model';
import { TaskCardComponent } from '../task-card/task-card.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, CdkDropList, CdkDrag, TaskCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrls: ['./kanban-column.component.css']
})
export class KanbanColumnComponent {
  @Input() title!: string;
  @Input() status!: Task['status'];
  @Input() tasks: Task[] = [];
  @Output() taskMoved = new EventEmitter<{taskId: string, newStatus: Task['status']}>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();

  public isDragOver = signal(false);

  onDrop(event: any): void {
    const taskId = event.item.data.id;
    this.taskMoved.emit({ taskId, newStatus: this.status });
  }

  onEditTask(task: Task): void {
    this.editTask.emit(task);
  }

  onDeleteTask(taskId: string): void {
    this.deleteTask.emit(taskId);
  }

  getColumnColor(): string {
    switch (this.status) {
      case 'todo':
        return '#6b7280';
      case 'in-progress':
        return '#3b82f6';
      case 'done':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }
}
