# Kanban Task Manager

A modern, responsive web-based Kanban task management application built with Angular 18 and Angular CDK for drag-and-drop functionality.

## Features

### ✅ Completed Features (Milestone 1)

1. **Project Setup & Environment**
   - Angular 18 project with Angular CLI
   - Angular CDK for drag-and-drop functionality
   - Organized folder structure (components, services, models)
   - Basic Kanban layout with three columns: To-Do, In Progress, Done
   - Task model with id, title, description, priority, status, and timestamps

2. **Task Creation Functionality**
   - Task Form Component with title, description, and priority dropdown
   - Add Task feature with form validation
   - Dynamic task display in appropriate columns
   - Modern modal-based form interface

3. **Edit & Delete Task**
   - Edit Task functionality with inline form editing
   - Delete Task with confirmation prompt
   - Instant UI updates for all task operations
   - Centralized task management through Task Service

4. **Column Management & Task Status Update**
   - Drag-and-drop functionality to move tasks between columns
   - Automatic task re-rendering based on status changes
   - Priority-based visual indicators with color-coded badges
   - Responsive column layout

5. **Data Persistence & Testing**
   - LocalStorage integration for task persistence
   - Automatic data loading on app startup
   - Data persistence after page refresh
   - Basic testing and validation

## Technical Stack

- **Framework**: Angular 18 (Standalone Components)
- **UI Library**: Angular CDK (Drag & Drop)
- **Styling**: CSS3 with modern design patterns
- **State Management**: Angular Signals
- **Data Persistence**: LocalStorage
- **Build Tool**: Angular CLI

## Project Structure

```
src/app/
├── components/
│   ├── task-form/          # Task creation/editing form
│   ├── task-card/          # Individual task display
│   └── kanban-column/      # Kanban column with drag-drop
├── services/
│   └── task.service.ts     # Central task management
├── models/
│   └── task.model.ts       # Task interface definition
└── app.ts                  # Main application component
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd kanban-task-manager
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

## Usage

### Adding Tasks
1. Click the "Add Task" button in the header
2. Fill in the task details (title is required)
3. Select priority and initial status
4. Click "Add Task" to save

### Managing Tasks
- **Edit**: Hover over a task card and click the edit icon
- **Delete**: Hover over a task card and click the delete icon
- **Move**: Drag and drop tasks between columns to change their status

### Task Properties
- **Title**: Required field for task identification
- **Description**: Optional detailed description
- **Priority**: Low (Green), Medium (Yellow), High (Red)
- **Status**: To Do, In Progress, Done

## Features in Detail

### Drag and Drop
- Smooth drag and drop between columns
- Visual feedback during drag operations
- Automatic status updates on drop

### Responsive Design
- Mobile-friendly interface
- Adaptive column layout
- Touch-friendly interactions

### Data Persistence
- All tasks are automatically saved to LocalStorage
- Data persists across browser sessions
- No data loss on page refresh

### Modern UI/UX
- Clean, modern design with gradient backgrounds
- Smooth animations and transitions
- Intuitive user interface
- Accessibility considerations

## Development

### Building for Production
```bash
npm run build
```

### Running Tests
```bash
npm test
```

### Code Structure
- **Standalone Components**: All components are standalone for better tree-shaking
- **Signals**: Modern reactive state management with Angular Signals
- **TypeScript**: Full type safety throughout the application
- **CSS**: Modern CSS with flexbox and grid layouts

## Future Enhancements

### Planned Features (Next Milestones)
- User authentication and multi-user support
- Task categories and labels
- Due dates and reminders
- Task search and filtering
- Export/import functionality
- Real-time collaboration
- Advanced analytics and reporting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built as part of the Infosys Internship program
- Inspired by modern Kanban board applications
- Uses Angular CDK for enhanced user experience
