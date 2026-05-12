const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type, status, keyword } = req.query;
  const employee = db.prepare('SELECT id, department_id FROM employees WHERE user_id = ?').get(req.user.id);
  
  let sql = `
    SELECT n.*, 
           e.name as publisher_name,
           d.name as department_name,
           (SELECT COUNT(*) FROM notice_reads WHERE notice_id = n.id) as read_count
    FROM notices n
    LEFT JOIN employees e ON n.publisher_id = e.id
    LEFT JOIN departments d ON n.department_id = d.id
    WHERE 1=1
  `;
  const params = [];
  
  if (type) {
    sql += ' AND n.type = ?';
    params.push(type);
  }
  
  if (status) {
    sql += ' AND n.status = ?';
    params.push(status);
  }
  
  if (keyword) {
    sql += ' AND (n.title LIKE ? OR n.content LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  if (req.user.role !== 'admin') {
    sql += ' AND (n.type = ? OR n.department_id = ? OR n.department_id IS NULL)';
    params.push('company', employee.department_id);
  }
  
  sql += ' ORDER BY n.publish_time DESC';
  
  const notices = db.prepare(sql).all(...params);
  res.json(notices);
});

router.get('/popup', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id, department_id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const popupNotices = db.prepare(`
    SELECT n.*
    FROM notices n
    LEFT JOIN notice_reads nr ON n.id = nr.notice_id AND nr.employee_id = ?
    WHERE n.is_popup = 1 
      AND n.status = 'published'
      AND (n.type = ? OR n.department_id = ? OR n.department_id IS NULL)
      AND nr.id IS NULL
    ORDER BY n.publish_time DESC
  `).all(employee.id, 'company', employee.department_id);
  
  res.json(popupNotices);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const notice = db.prepare(`
    SELECT n.*, 
           e.name as publisher_name,
           d.name as department_name
    FROM notices n
    LEFT JOIN employees e ON n.publisher_id = e.id
    LEFT JOIN departments d ON n.department_id = d.id
    WHERE n.id = ?
  `).get(req.params.id);
  
  if (!notice) {
    return res.status(404).json({ error: '公告不存在' });
  }
  
  const existingRead = db.prepare('SELECT id FROM notice_reads WHERE notice_id = ? AND employee_id = ?').get(req.params.id, employee.id);
  if (!existingRead) {
    db.prepare('INSERT INTO notice_reads (notice_id, employee_id) VALUES (?, ?)').run(req.params.id, employee.id);
  }
  
  res.json(notice);
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { title, content, type, department_id, is_popup, status } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!title || !content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }
  
  const stmt = db.prepare('INSERT INTO notices (title, content, type, publisher_id, department_id, is_popup, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(title, content, type || 'company', employee.id, department_id || null, is_popup ? 1 : 0, status || 'published');
  
  res.status(201).json({ id: result.lastInsertRowid, message: '公告发布成功' });
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { title, content, type, department_id, is_popup, status } = req.body;
  
  const existing = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '公告不存在' });
  }
  
  db.prepare(`
    UPDATE notices 
    SET title = ?, content = ?, type = ?, department_id = ?, is_popup = ?, status = ?
    WHERE id = ?
  `).run(title, content, type, department_id, is_popup ? 1 : 0, status, req.params.id);
  
  res.json({ message: '公告更新成功' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  db.prepare('DELETE FROM notice_reads WHERE notice_id = ?').run(req.params.id);
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  
  res.json({ message: '公告删除成功' });
});

router.get('/:id/read-status', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  const readRecords = db.prepare(`
    SELECT nr.*, e.name as employee_name, e.employee_no, d.name as department_name
    FROM notice_reads nr
    LEFT JOIN employees e ON nr.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE nr.notice_id = ?
    ORDER BY nr.read_at DESC
  `).all(req.params.id);
  
  res.json(readRecords);
});

router.post('/:id/mark-read', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const existing = db.prepare('SELECT id FROM notice_reads WHERE notice_id = ? AND employee_id = ?').get(req.params.id, employee.id);
  if (!existing) {
    db.prepare('INSERT INTO notice_reads (notice_id, employee_id) VALUES (?, ?)').run(req.params.id, employee.id);
  }
  
  res.json({ message: '已标记为已读' });
});

module.exports = router;
