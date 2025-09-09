export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  columnId?: string; // dynamic column linkage
  order?: number; // position within column for stable ordering
  createdAt: Date;
  updatedAt: Date;
}
