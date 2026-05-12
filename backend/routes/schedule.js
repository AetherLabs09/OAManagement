const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { start_date, end_date, status } = req.query;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  let sql = `
    SELECT s.*, e.name as employee_name
    FROM schedules s
    LEFT JOIN employees e ON s.employee_id = e.id
    WHERE s.employee_id = ?
  `;
  const params = [employee.id];
  
  if (start_date) {
    sql += ' AND s.start_time >= ?';
    params.push(start_date);
  }
  
  if (end_date) {
    sql += ' AND s.end_time <= ?';
    params.push(end_date);
  }
  
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY s.start_time';
  
  const schedules = db.prepare(sql).all(...params);
  res.json(schedules);
});

router.get('/month/:year/:month', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { year, month } = req.params;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const startDate = `${year}-${month.padStart(2, '0')}-01`;
  const endDate = `${year}-${month.padStart(2, '0')}-31`;
  
  const schedules = db.prepare(`
    SELECT s.*, e.name as employee_name
    FROM schedules s
    LEFT JOIN employees e ON s.employee_id = e.id
    WHERE s.employee_id = ?
      AND s.start_time >= ?
      AND s.start_time <= ?
    ORDER BY s.start_time
  `).all(employee.id, startDate, endDate);
  
  res.json(schedules);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const schedule = db.prepare(`
    SELECT s.*, e.name as employee_name
    FROM schedules s
    LEFT JOIN employees e ON s.employee_id = e.id
    WHERE s.id = ?
  `).get(req.params.id);
  
  if (!schedule) {
    return res.status(404).json({ error: '日程不存在' });
  }
  
  if (schedule.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限查看此日程' });
  }
  
  res.json(schedule);
});

router.post('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { title, content, start_time, end_time, location, reminder, status } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!title || !start_time || !end_time) {
    return res.status(400).json({ error: '标题、开始时间和结束时间不能为空' });
  }
  
  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: '结束时间必须晚于开始时间' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO schedules (employee_id, title, content, start_time, end_time, location, reminder, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(employee.id, title, content, start_time, end_time, location, reminder || 0, status || 'scheduled');
  
  res.status(201).json({ id: result.lastInsertRowid, message: '日程创建成功' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { title, content, start_time, end_time, location, reminder, status } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: '日程不存在' });
  }
  
  if (schedule.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限修改此日程' });
  }
  
  if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ error: '结束时间必须晚于开始时间' });
  }
  
  db.prepare(`
    UPDATE schedules 
    SET title = ?, content = ?, start_time = ?, end_time = ?, location = ?, reminder = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || schedule.title,
    content,
    start_time || schedule.start_time,
    end_time || schedule.end_time,
    location,
    reminder !== undefined ? reminder : schedule.reminder,
    status || schedule.status,
    req.params.id
  );
  
  res.json({ message: '日程更新成功' });
});

router.delete('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: '日程不存在' });
  }
  
  if (schedule.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限删除此日程' });
  }
  
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
  
  res.json({ message: '日程删除成功' });
});

router.put('/:id/complete', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
  if (!schedule) {
    return res.status(404).json({ error: '日程不存在' });
  }
  
  if (schedule.employee_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限操作此日程' });
  }
  
  db.prepare('UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run('completed', req.params.id);
  
  res.json({ message: '日程已标记为完成' });
});

module.exports = router;
