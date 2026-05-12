const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type, employee_id, start_date, end_date } = req.query;
  const currentEmployee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  let sql = `
    SELECT w.*, 
           e.name as employee_name,
           e.employee_no,
           d.name as department_name
    FROM worklogs w
    LEFT JOIN employees e ON w.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  
  if (type) {
    sql += ' AND w.type = ?';
    params.push(type);
  }
  
  if (employee_id) {
    sql += ' AND w.employee_id = ?';
    params.push(employee_id);
  } else if (req.user.role !== 'admin') {
    sql += ' AND w.employee_id = ?';
    params.push(currentEmployee.id);
  }
  
  if (start_date) {
    sql += ' AND w.work_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND w.work_date <= ?';
    params.push(end_date);
  }
  
  sql += ' ORDER BY w.work_date DESC, w.created_at DESC';
  
  const worklogs = db.prepare(sql).all(...params);
  res.json(worklogs);
});

router.get('/subordinates', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type, start_date, end_date } = req.query;
  const currentEmployee = db.prepare('SELECT id, department_id FROM employees WHERE user_id = ?').get(req.user.id);
  
  let sql = `
    SELECT w.*, 
           e.name as employee_name,
           e.employee_no,
           d.name as department_name
    FROM worklogs w
    LEFT JOIN employees e ON w.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.department_id = ?
  `;
  const params = [currentEmployee.department_id];
  
  if (type) {
    sql += ' AND w.type = ?';
    params.push(type);
  }
  
  if (start_date) {
    sql += ' AND w.work_date >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND w.work_date <= ?';
    params.push(end_date);
  }
  
  sql += ' ORDER BY w.work_date DESC, w.created_at DESC';
  
  const worklogs = db.prepare(sql).all(...params);
  res.json(worklogs);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const currentEmployee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const worklog = db.prepare(`
    SELECT w.*, 
           e.name as employee_name,
           e.employee_no,
           d.name as department_name
    FROM worklogs w
    LEFT JOIN employees e ON w.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE w.id = ?
  `).get(req.params.id);
  
  if (!worklog) {
    return res.status(404).json({ error: '工作日志不存在' });
  }
  
  const comments = db.prepare(`
    SELECT wc.*, e.name as commenter_name, e.employee_no
    FROM worklog_comments wc
    LEFT JOIN employees e ON wc.commenter_id = e.id
    WHERE wc.worklog_id = ?
    ORDER BY wc.created_at
  `).all(req.params.id);
  
  res.json({ ...worklog, comments });
});

router.post('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type, title, content, work_date } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!content || !work_date) {
    return res.status(400).json({ error: '内容和日期不能为空' });
  }
  
  const date = new Date(work_date);
  const weekNumber = getWeekNumber(date);
  const monthNumber = date.getMonth() + 1;
  const year = date.getFullYear();
  
  const stmt = db.prepare(`
    INSERT INTO worklogs (employee_id, type, title, content, work_date, week_number, month_number, year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(employee.id, type || 'daily', title, content, work_date, weekNumber, monthNumber, year);
  
  res.status(201).json({ id: result.lastInsertRowid, message: '工作日志提交成功' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type, title, content, work_date } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const worklog = db.prepare('SELECT * FROM worklogs WHERE id = ?').get(req.params.id);
  if (!worklog) {
    return res.status(404).json({ error: '工作日志不存在' });
  }
  
  if (worklog.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限修改此工作日志' });
  }
  
  const date = new Date(work_date || worklog.work_date);
  const weekNumber = getWeekNumber(date);
  const monthNumber = date.getMonth() + 1;
  const year = date.getFullYear();
  
  db.prepare(`
    UPDATE worklogs 
    SET type = ?, title = ?, content = ?, work_date = ?, week_number = ?, month_number = ?, year = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(type || worklog.type, title, content, work_date || worklog.work_date, weekNumber, monthNumber, year, req.params.id);
  
  res.json({ message: '工作日志更新成功' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const worklog = db.prepare('SELECT * FROM worklogs WHERE id = ?').get(req.params.id);
  if (!worklog) {
    return res.status(404).json({ error: '工作日志不存在' });
  }
  
  if (worklog.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限删除此工作日志' });
  }
  
  db.prepare('DELETE FROM worklog_comments WHERE worklog_id = ?').run(req.params.id);
  db.prepare('DELETE FROM worklogs WHERE id = ?').run(req.params.id);
  
  res.json({ message: '工作日志删除成功' });
});

router.post('/:id/comments', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { content } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }
  
  const worklog = db.prepare('SELECT * FROM worklogs WHERE id = ?').get(req.params.id);
  if (!worklog) {
    return res.status(404).json({ error: '工作日志不存在' });
  }
  
  const stmt = db.prepare('INSERT INTO worklog_comments (worklog_id, commenter_id, content) VALUES (?, ?, ?)');
  const result = stmt.run(req.params.id, employee.id, content);
  
  res.status(201).json({ id: result.lastInsertRowid, message: '评论添加成功' });
});

router.get('/:id/comments', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  const comments = db.prepare(`
    SELECT wc.*, e.name as commenter_name, e.employee_no
    FROM worklog_comments wc
    LEFT JOIN employees e ON wc.commenter_id = e.id
    WHERE wc.worklog_id = ?
    ORDER BY wc.created_at
  `).all(req.params.id);
  
  res.json(comments);
});

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = router;
