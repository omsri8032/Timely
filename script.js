let columns = [
    { id: "todo", title: "To Do", tasks: [] },
    { id: "inprogress", title: "In Progress", tasks: [] },
    { id: "done", title: "Done", tasks: [] }
];
let draggedTaskId = null;
let draggedColumnId = null;
const boardElement = document.getElementById('board');
const modal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const cancelBtn = document.getElementById('cancel-btn');
const landingPage = document.getElementById('landing-page');
const API_URL = 'http://localhost:3000/api';
let currentUser = localStorage.getItem('kanbanUser');
const authContainer = document.getElementById('auth-container');
const boardContainer = document.getElementById('board-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const pageTitle = document.getElementById('page-title'); 
const authToggleLink = document.getElementById('auth-toggle-link');
const logoutBtn = document.getElementById('logout-btn');
let isLoginMode = true;
function checkAuth() {
    if (currentUser) {
        showBoard();
    } else {
        authContainer.classList.remove('hidden');
        boardContainer.classList.add('hidden');
    }
}
authToggleLink.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    updateAuthUI();
});
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const endpoint = isLoginMode ? '/login' : '/signup';
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) {
            currentUser = data.user.username;
            localStorage.setItem('kanbanUser', currentUser);
            showBoard();
        } else {
            alert(data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Request failed');
    }
});
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('kanbanUser');
    currentUser = null;
    showLanding();
});
let allTasks = []; 
async function fetchTasks() {
    if (!currentUser) return;
    try {
        const response = await fetch(`${API_URL}/tasks?user=${encodeURIComponent(currentUser)}`);
        allTasks = await response.json();   
        applyFilters(); 
    } catch (err) {
        console.error('Error fetching tasks:', err);
        alert('Failed to connect to server. Is it running?');
    }
}
const searchInput = document.getElementById('search-input');
const filterPriority = document.getElementById('filter-priority');
if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
}
if (filterPriority) {
    filterPriority.addEventListener('change', applyFilters);
}
function applyFilters() {
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const priority = filterPriority ? filterPriority.value : 'all';
    const filteredTasks = allTasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query) ||
            (task.description && task.description.toLowerCase().includes(query));
        const matchesPriority = priority === 'all' || task.priority === priority;
        return matchesSearch && matchesPriority;
    });
    columns.forEach(col => col.tasks = []);
    filteredTasks.forEach(task => {
        const column = columns.find(col => col.id === task.status);
        if (column) column.tasks.push(task);
    });
    renderBoard();
    renderListView();
    const isCalendarVisible = !document.getElementById('calendar-view').classList.contains('hidden');
    if (calendar || isCalendarVisible) {
        renderCalendar();
    }
}
function renderBoard() {
    boardElement.innerHTML = '';
    columns.forEach(column => {
        const columnEl = document.createElement('div');
        columnEl.classList.add('column');
        columnEl.dataset.id = column.id;
        const header = document.createElement('div');
        header.classList.add('column-header');
        header.innerHTML = `
      <span class="column-title">${column.title} (${column.tasks.length})</span>
    `;
        columnEl.appendChild(header);
        const taskList = document.createElement('div');
        taskList.classList.add('task-list');
        taskList.dataset.id = column.id;
        taskList.addEventListener('dragover', (e) => {
            e.preventDefault();
            taskList.classList.add('drag-over');
        });
        taskList.addEventListener('dragleave', () => {
            taskList.classList.remove('drag-over');
        });
        taskList.addEventListener('drop', handleDrop);
        column.tasks.forEach(task => {
            const taskEl = createTaskElement(task);
            taskList.appendChild(taskEl);
        });
        columnEl.appendChild(taskList);
        const addBtn = document.createElement('button');
        addBtn.classList.add('add-task-btn');
        addBtn.textContent = '+ Add Task';
        addBtn.onclick = () => openModal(column.id);
        columnEl.appendChild(addBtn);
        boardElement.appendChild(columnEl);
    });
}
function createTaskElement(task) {
    const el = document.createElement('div');
    el.classList.add('task-card');
    el.classList.add(`priority-${task.priority}`);
    el.draggable = true;
    el.dataset.id = task.id;
    el.addEventListener('dragstart', (e) => {
        draggedTaskId = task.id;
        columns.forEach(col => {
            if (col.tasks.find(t => t.id === task.id)) {
                draggedColumnId = col.id;
            }
        });
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        draggedTaskId = null;
        draggedColumnId = null;
    });
    el.innerHTML = `
    <div class="task-header">
      <span class="task-title">${task.title}</span>
      <span class="task-priority">${task.priority}</span>
    </div>
    <div class="task-actions">
        <button class="btn-icon" onclick="openModal(null, '${task.id}')">✎</button>
        <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')">🗑</button>
    </div>
  `;
    return el;
}
async function handleDrop(e) {
    e.preventDefault();
    const targetColumnId = e.currentTarget.dataset.id;
    if (!draggedTaskId || !draggedColumnId || targetColumnId === draggedColumnId) return;
    const sourceCol = columns.find(c => c.id === draggedColumnId);
    const taskIndex = sourceCol.tasks.findIndex(t => t.id === draggedTaskId);
    const [task] = sourceCol.tasks.splice(taskIndex, 1);
    const targetCol = columns.find(c => c.id === targetColumnId);
    targetCol.tasks.push(task);
    task.status = targetColumnId; 
    renderBoard(); 
    try {
        await fetch(`${API_URL}/tasks/${draggedTaskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: targetColumnId })
        });
    } catch (err) {
        console.error('Failed to sync move:', err);
        fetchTasks(); 
    }
}
function openModal(columnId = null, taskId = null) {
    modal.classList.remove('hidden');
    const titleInput = document.getElementById('task-title-input');
    const descInput = document.getElementById('task-desc-input');
    const priorityInput = document.getElementById('task-priority-input');
    const idInput = document.getElementById('task-id');
    const colIdInput = document.getElementById('task-column-id');
    if (taskId) {
        const task = findTask(taskId);
        document.getElementById('modal-title').textContent = 'Edit Task';
        titleInput.value = task.title;
        descInput.value = task.description || '';
        priorityInput.value = task.priority;
        idInput.value = task.id;
    } else {
        document.getElementById('modal-title').textContent = 'Add New Task';
        taskForm.reset();
        idInput.value = '';
        colIdInput.value = columnId || 'todo';
    }
}
function closeModal() {
    modal.classList.add('hidden');
}
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskData = {
        title: document.getElementById('task-title-input').value,
        description: document.getElementById('task-desc-input').value,
        priority: document.getElementById('task-priority-input').value,
        owner: currentUser 
    };
    const id = document.getElementById('task-id').value;
    const columnId = document.getElementById('task-column-id').value;
    try {
        if (id) {
            await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        } else {
            taskData.status = columnId || 'todo'; 
            taskData.dueDate = new Date().toISOString(); 
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
        }
        fetchTasks(); 
        closeModal();
    } catch (err) {
        console.error('Error saving task:', err);
        alert('Failed to save task.');
    }
});
async function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    }
}
function findTask(taskId) {
    for (const col of columns) {
        const task = col.tasks.find(t => t.id === taskId);
        if (task) return task;
    }
    return null;
}
cancelBtn.addEventListener('click', closeModal);
const navItems = document.querySelectorAll('.nav-btn'); 
navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        const viewName = item.dataset.view;
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) targetView.classList.remove('hidden');
        if (viewName === 'dashboard') {
            loadDashboardStats(); 
        }
        if (viewName === 'kanban') {
            renderBoard(); 
        }
        if (viewName === 'calendar') {
            setTimeout(renderCalendar, 0);
        }
        if (viewName === 'list') {
            renderListView();
        }
    });
});
function startClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    function update() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    update();
    setInterval(update, 1000);
}
const addTaskGlobalBtn = document.getElementById('add-task-global-header');
if (addTaskGlobalBtn) {
    addTaskGlobalBtn.addEventListener('click', () => {
        openModal('todo');
    });
}
async function loadDashboardStats() {
    try {
        const user = localStorage.getItem('kanbanUser');
        if (!user) return;
        const res = await fetch(`/api/dashboard/stats?user=${user}`);
        if (!res.ok) throw new Error('Failed to load stats');
        const stats = await res.json();
        document.getElementById('stat-completion-rate').textContent = `${stats.completionRate}%`;
        document.getElementById('stat-progress-bar').style.width = `${stats.completionRate}%`;
        document.getElementById('stat-total-count').textContent = stats.totalCount;
        document.getElementById('stat-overdue-count').textContent = stats.overdueCount;
        document.getElementById('stat-today-count').textContent = stats.dueTodayCount;
        document.getElementById('stat-pending-count').textContent = stats.pendingCount;
        document.getElementById('stat-inprogress-count').textContent = stats.inProgressCount;
        document.getElementById('stat-completed-count').textContent = stats.completedCount;
        document.getElementById('stat-high-count').textContent = stats.highPriorityCount;
        document.getElementById('stat-medium-count').textContent = stats.mediumPriorityCount;
        document.getElementById('stat-low-count').textContent = stats.lowPriorityCount;
        const recentBody = document.getElementById('recent-tasks-body');
        if (recentBody) {
            recentBody.innerHTML = stats.recentTasks.map(t => {
                const date = new Date(t.createdAt).toLocaleDateString();
                let statusClass = 'badge-pending';
                if (t.status === 'inprogress') statusClass = 'badge-in_progress';
                if (t.status === 'completed') statusClass = 'badge-completed';
                let priorityClass = `badge-${t.priority}`; 
                return `
                    <tr onclick="openModal(null, '${t.id}')">
                        <td>${t.title}</td>
                        <td><span class="badge ${statusClass}">${t.status}</span></td>
                        <td><span class="${priorityClass}">${t.priority.toUpperCase()}</span></td>
                        <td>${date}</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}
async function openStatModal(type) {
    try {
        const user = localStorage.getItem('kanbanUser');
        const res = await fetch(`/api/dashboard/tasks?user=${user}&type=${type}`);
        if (!res.ok) return;
        const tasks = await res.json();
        createAndShowTaskModal(type, tasks);
    } catch (err) {
        console.error(err);
    }
}
function createAndShowTaskModal(title, taskList) {
    let modal = document.getElementById('stat-list-modal');
    if (modal) modal.remove();
    const html = `
    <div id="stat-list-modal" class="modal" style="display:flex;">
        <div class="modal-content" style="max-height:80vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h2>${title.toUpperCase()} Tasks</h2>
                <button onclick="document.getElementById('stat-list-modal').remove()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <ul class="modal-list">
                ${taskList.map(t => `
                    <li style="padding:0.5rem; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                        <span><strong>${t.title}</strong> <br> <small>${t.dueDate || 'No Date'}</small></span>
                        <button onclick="openModal(null, '${t.id}'); document.getElementById('stat-list-modal').remove()" class="btn-icon">✎</button>
                    </li>
                `).join('')}
                ${taskList.length === 0 ? '<p>No tasks found.</p>' : ''}
            </ul>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
}
let calendar;
function initCalendar() {
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar library not loaded');
        return;
    }
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        height: '100%',
        editable: false,
        eventDisplay: 'block', 
        events: [],
        eventClick: function (info) {
            const taskId = info.event.extendedProps.taskId;
            openModal(null, taskId);
        }
    });
    calendar.render();
}
function renderCalendar() {
    if (!calendar) {
        initCalendar();
        if (!calendar) return;
    }
    const events = [];
    columns.forEach(col => {
        col.tasks.forEach(task => {
            let color = '#0052cc';
            if (task.priority === 'high') color = '#ff5630'; 
            if (task.priority === 'low') color = '#36b37e';  
            if (task.priority === 'medium') color = '#ffab00'; 
            const dateStr = task.dueDate ? task.dueDate : task.createdAt;
            const dateObj = new Date(dateStr);
            const isoDate = dateObj.toISOString().split('T')[0]; 
            events.push({
                title: task.title,
                start: isoDate,
                color: color,
                extendedProps: { taskId: task.id },
                description: task.description
            });
        });
    });
    calendar.removeAllEvents();
    calendar.addEventSource(events);
    calendar.updateSize();
}
function renderListView() {
    const tbody = document.getElementById('task-table-body');
    if (!tbody) return; 
    tbody.innerHTML = '';
    columns.forEach(col => {
        col.tasks.forEach(task => {
            const tr = document.createElement('tr');
            const date = new Date(task.createdAt).toLocaleDateString();
            tr.innerHTML = `
                <td>${task.title}</td>
                <td><span class="task-priority">${col.title}</span></td>
                <td><span class="task-priority priority-${task.priority}">${task.priority}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="openModal(null, '${task.id}')">✎</button>
                    <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')">🗑</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}
function showLanding() {
    landingPage.classList.remove('hidden');
    authContainer.classList.add('hidden');
    boardContainer.classList.add('hidden');
    isLoginMode = true; 
}
function showBoard() {
    landingPage.classList.add('hidden');
    authContainer.classList.add('hidden');
    boardContainer.classList.remove('hidden');
    const user = localStorage.getItem('kanbanUser');
    const greetingEl = document.getElementById('user-greeting-name');
    if (user && greetingEl) {
        greetingEl.textContent = user;
    }
    startClock(); 
    fetchTasks().then(() => {
        loadDashboardStats();
    });
}
function showAuth() {
    landingPage.classList.add('hidden');
    authContainer.classList.remove('hidden');
    boardContainer.classList.add('hidden');
}
function checkAuth() {
    if (currentUser) {
        showBoard();
    } else {
        showLanding();
    }
}
function updateAuthUI() {
    if (isLoginMode) {
        authTitle.textContent = 'Login';
        authForm.querySelector('button').textContent = 'Login';
        document.getElementById('auth-toggle-text').innerHTML = 'Don\'t have an account? <span id="auth-toggle-link">Sign up</span>';
    } else {
        authTitle.textContent = 'Sign Up';
        authForm.querySelector('button').textContent = 'Sign Up';
        document.getElementById('auth-toggle-text').innerHTML = 'Already have an account? <span id="auth-toggle-link">Login</span>';
    }
    document.getElementById('auth-toggle-link').addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        updateAuthUI();
    });
}
document.getElementById('nav-login-btn').addEventListener('click', () => {
    isLoginMode = true;
    updateAuthUI();
    showAuth();
});
document.getElementById('nav-signup-btn').addEventListener('click', () => {
    isLoginMode = false;
    updateAuthUI();
    showAuth();
});
document.getElementById('hero-cta-btn').addEventListener('click', () => {
    isLoginMode = false;
    updateAuthUI();
    showAuth();
});
const backBtn = document.getElementById('back-to-landing');
if (backBtn) {
    backBtn.addEventListener('click', showLanding);
}
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
