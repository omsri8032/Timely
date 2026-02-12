const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kanban')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// --- Schemas & Models ---

const TaskSchema = new mongoose.Schema({
    title: String,
    description: String,
    priority: String,
    status: String,
    owner: String,
    dueDate: String,
    createdAt: { type: Date, default: Date.now }
});

// Map _id to id for frontend compatibility
TaskSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { delete ret._id; }
});

const Task = mongoose.model('Task', TaskSchema);

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

// --- Middleware ---

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});
app.use(express.static(__dirname));

// --- API Routes ---

app.get('/api/tasks', async (req, res) => {
    try {
        const user = req.query.user;
        const query = user ? { owner: user } : {};
        const tasks = await Task.find(query);
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to read data' });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const { title, description, priority, status, owner, dueDate } = req.body;
        if (!owner) {
            return res.status(400).json({ error: 'Task owner is required' });
        }
        const newTask = await Task.create({
            title, description, priority, status, owner,
            dueDate: dueDate || '',
            createdAt: new Date()
        });
        res.status(201).json(newTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(
            req.params.id, req.body, { new: true }
        );
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(updatedTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const result = await Task.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const user = req.query.user;
        if (!user) {
            return res.status(400).json({ error: 'User required' });
        }
        const userTasks = await Task.find({ owner: user });
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
        const recent = await Task.find({ owner: user }).sort({ createdAt: -1 }).limit(5);

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

app.get('/api/dashboard/tasks', async (req, res) => {
    try {
        const { user, type } = req.query;
        if (!user || !type) return res.status(400).json({ error: 'Missing params' });

        const userTasks = await Task.find({ owner: user });
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
        console.error(err);
        res.status(500).json({ error: 'Filter failed' });
    }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const newUser = await User.create({ username, password });
        res.status(201).json({ message: 'User created successfully', user: { username: newUser.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ message: 'Login successful', user: { username: user.username } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
