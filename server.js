const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs'); 
const path = require('path');
const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'kanban.json');
const USERS_FILE = path.join(__dirname, 'users.json');
app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use(express.static(__dirname));
function readData(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
}
function writeData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
app.get('/api/tasks', (req, res) => {
    try {
        const tasks = readData(DB_FILE);
        const user = req.query.user;
        if (user) {
            const userTasks = tasks.filter(t => t.owner === user);
            res.json(userTasks);
        } else {
            res.json(tasks);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});
app.post('/api/tasks', (req, res) => {
    try {
        const tasks = readData(DB_FILE);
        const { title, description, priority, status, owner } = req.body;
        if (!owner) {
            return res.status(400).json({ error: 'Task owner is required' });
        }
        const newTask = {
            id: Date.now().toString(),
            title,
            description,
            priority,
            status,
            owner, 
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        writeData(DB_FILE, tasks);
        res.status(201).json(newTask);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save task' });
    }
});
app.put('/api/tasks/:id', (req, res) => {
    try {
        const tasks = readData(DB_FILE);
        const index = tasks.findIndex(t => t.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }
        tasks[index] = { ...tasks[index], ...req.body };
        writeData(DB_FILE, tasks);
        res.json(tasks[index]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update task' });
    }
});
app.delete('/api/tasks/:id', (req, res) => {
    try {
        let tasks = readData(DB_FILE);
        const newTasks = tasks.filter(t => t.id !== req.params.id);
        writeData(DB_FILE, newTasks);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});
app.get('/api/dashboard/stats', (req, res) => {
    try {
        const tasks = readData(DB_FILE);
        const user = req.query.user;
        if (!user) {
            return res.status(400).json({ error: 'User required' });
        }
        const userTasks = tasks.filter(t => t.owner === user);
        const todayStr = new Date().toISOString().split('T')[0];
        const completed = userTasks.filter(t => t.status === 'done' || t.status === 'completed');
        const pending = userTasks.filter(t => t.status === 'todo'); 
        const inProgress = userTasks.filter(t => t.status === 'inprogress');
        const overdue = userTasks.filter(t => {
            const isDone = t.status === 'done' || t.status === 'completed';
            if (isDone || !t.dueDate) return false;
            return t.dueDate < todayStr;
        });
        const dueToday = userTasks.filter(t => {
            const isDone = t.status === 'done' || t.status === 'completed';
            return t.dueDate === todayStr && !isDone;
        });
        const priorityHigh = userTasks.filter(t => t.priority === 'high' && t.status !== 'done' && t.status !== 'completed');
        const priorityMed = userTasks.filter(t => t.priority === 'medium' && t.status !== 'done' && t.status !== 'completed');
        const priorityLow = userTasks.filter(t => t.priority === 'low' && t.status !== 'done' && t.status !== 'completed');
        const recent = [...userTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        const total = userTasks.length;
        const rate = total === 0 ? 0 : Math.round((completed.length / total) * 100);
        res.json({
            totalCount: total,
            completedCount: completed.length,
            pendingCount: pending.length,
            inProgressCount: inProgress.length,
            overdueCount: overdue.length,
            completionRate: rate,
            dueTodayCount: dueToday.length,
            highPriorityCount: priorityHigh.length,
            mediumPriorityCount: priorityMed.length,
            lowPriorityCount: priorityLow.length,
            recentTasks: recent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calc stats' });
    }
});
app.get('/api/dashboard/tasks', (req, res) => {
    try {
        const tasks = readData(DB_FILE);
        const { user, type } = req.query;
        if (!user || !type) return res.status(400).json({ error: 'Missing params' });
        const userTasks = tasks.filter(t => t.owner === user);
        let filtered = [];
        const todayStr = new Date().toISOString().split('T')[0];
        const isNotDone = (t) => t.status !== 'done' && t.status !== 'completed';
        switch (type) {
            case 'completed':
                filtered = userTasks.filter(t => t.status === 'done' || t.status === 'completed'); break;
            case 'pending':
                filtered = userTasks.filter(t => t.status === 'todo'); break;
            case 'inprogress':
                filtered = userTasks.filter(t => t.status === 'inprogress'); break;
            case 'overdue':
                filtered = userTasks.filter(t => t.dueDate && t.dueDate < todayStr && isNotDone(t)); break;
            case 'today':
                filtered = userTasks.filter(t => t.dueDate === todayStr && isNotDone(t)); break;
            case 'high':
                filtered = userTasks.filter(t => t.priority === 'high' && isNotDone(t)); break;
            case 'medium':
                filtered = userTasks.filter(t => t.priority === 'medium' && isNotDone(t)); break;
            case 'low':
                filtered = userTasks.filter(t => t.priority === 'low' && isNotDone(t)); break;
            default:
                filtered = userTasks;
        }
        res.json(filtered);
    } catch (err) {
        res.status(500).json({ error: 'Filter failed' });
    }
});
app.post('/api/signup', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const users = readData(USERS_FILE);
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const newUser = { id: Date.now().toString(), username, password };
        users.push(newUser);
        writeData(USERS_FILE, users);
        res.status(201).json({ message: 'User created successfully', user: { username } });
    } catch (err) {
        res.status(500).json({ error: 'Signup failed' });
    }
});
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readData(USERS_FILE);
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            res.json({ message: 'Login successful', user: { username } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Data will be saved to: ${DB_FILE}`);
});
