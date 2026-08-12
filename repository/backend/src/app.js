require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const pool = require('./config/db');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const topicsRoutes = require('./modules/topics/topics.routes');
const projectsRoutes = require('./modules/projects/projects.routes');
const proposalsRoutes = require('./modules/projects/proposals.routes');
const allocationsRoutes = require('./modules/allocations/allocations.routes');
const defenseRoutes = require('./modules/defense/defense.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const repositoryRoutes = require('./modules/repository/repository.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const registerSocketHandlers = require('./sockets');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/topics', topicsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/proposals', proposalsRoutes);
app.use('/api/v1/allocations', allocationsRoutes);
app.use('/api/v1/defense', defenseRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/repository', repositoryRoutes);
app.use('/api/v1/reports', reportsRoutes);

app.get('/api/v1/health', async (req, res) => {
  let dbStatus = 'unreachable';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'unreachable';
  }

  res.json({
    status: 'ok',
    service: 'project-coordination-backend',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Errors thrown with a `statusCode` (e.g. "AI service unavailable") carry their own status/message;
// anything else is treated as unexpected and gets a generic message so internals aren't leaked.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (err.statusCode) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});

registerSocketHandlers(io);

app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

module.exports = app;
