import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.css']
})
export class TaskFormComponent {
  @Input() task?: Task;
  @Output() saveTask = new EventEmitter<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>();
  @Output() cancel = new EventEmitter<void>();

  public formData = signal({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as Task['status']
  });

  public isEditing = signal(false);

  ngOnInit(): void {
    if (this.task) {
      this.isEditing.set(true);
      this.formData.set({
        title: this.task.title,
        description: this.task.description,
        priority: this.task.priority,
        status: this.task.status
      });
    }
  }

  onSubmit(): void {
    if (this.formData().title.trim()) {
      this.saveTask.emit(this.formData());
      this.resetForm();
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  private resetForm(): void {
    this.formData.set({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo'
    });
    this.isEditing.set(false);
  }
}
