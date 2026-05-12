const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbPath = process.env.DB_PATH || path.join(__dirname, '../db/oa.db');
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

process.on('SIGINT', () => {
  db.close();
  process.exit();
});

app.set('db', db);

const initDb = require('./database/init');
initDb(db);

const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/department');
const employeeRoutes = require('./routes/employee');
const approvalRoutes = require('./routes/approval');
const noticeRoutes = require('./routes/notice');
const worklogRoutes = require('./routes/worklog');
const scheduleRoutes = require('./routes/schedule');

app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/worklogs', worklogRoutes);
app.use('/api/schedules', scheduleRoutes);

app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OA系统服务器运行在端口 ${PORT}`);
});
