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
  @Input() columnId!: string;
  @Input() tasks: Task[] = [];
  @Input() connectedIds: string[] = [];

  @Output() reorder = new EventEmitter<{ columnId: string; previousIndex: number; currentIndex: number }>();
  @Output() moveToColumn = new EventEmitter<{ taskId: string; targetColumnId: string; targetIndex: number }>();
  @Output() editTask = new EventEmitter<Task>();
  @Output() deleteTask = new EventEmitter<string>();
  @Output() deleteColumn = new EventEmitter<string>();

  public isDragOver = signal(false);

  onDrop(event: any): void {
    // Basic guards
    if (!event || !event.container) return;

    const sameContainer = event.previousContainer?.id === event.container.id;
    const targetIndex = event.currentIndex ?? 0;

    if (sameContainer) {
      if (event.previousIndex === targetIndex) return; // no-op
      this.reorder.emit({ columnId: this.columnId, previousIndex: event.previousIndex, currentIndex: targetIndex });
    } else {
      const taskId = event.item?.data?.id;
      if (!taskId) return;
      this.moveToColumn.emit({ taskId, targetColumnId: this.columnId, targetIndex });
    }
  }

  onEditTask(task: Task): void {
    this.editTask.emit(task);
  }

  onDeleteTask(taskId: string): void {
    this.deleteTask.emit(taskId);
  }

  onDeleteColumn(): void {
    this.deleteColumn.emit(this.columnId);
  }
}
