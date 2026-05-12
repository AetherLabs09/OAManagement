const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { department_id, status, keyword } = req.query;
  
  let sql = `
    SELECT e.*, 
           d.name as department_name, 
           p.name as position_name,
           u.username, u.role
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (department_id) {
    sql += ' AND e.department_id = ?';
    params.push(department_id);
  }
  
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  
  if (keyword) {
    sql += ' AND (e.name LIKE ? OR e.employee_no LIKE ? OR e.phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  
  sql += ' ORDER BY e.id';
  
  const employees = db.prepare(sql).all(...params);
  res.json(employees);
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare(`
    SELECT e.*, 
           d.name as department_name, 
           p.name as position_name,
           u.username, u.role
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    LEFT JOIN users u ON e.user_id = u.id
    WHERE e.id = ?
  `).get(req.params.id);
  
  if (!employee) {
    return res.status(404).json({ error: '员工不存在' });
  }
  
  res.json(employee);
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { name, employee_no, department_id, position_id, phone, email, gender, birth_date, hire_date, address, emergency_contact, emergency_phone } = req.body;
  
  if (!name || !employee_no) {
    return res.status(400).json({ error: '姓名和工号不能为空' });
  }
  
  const existing = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(employee_no);
  if (existing) {
    return res.status(400).json({ error: '工号已存在' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO employees (name, employee_no, department_id, position_id, phone, email, gender, birth_date, hire_date, address, emergency_contact, emergency_phone, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, employee_no, department_id || null, position_id || null, phone, email, gender, birth_date, hire_date, address, emergency_contact, emergency_phone, 'active');
  
  res.status(201).json({ id: result.lastInsertRowid, message: '员工创建成功' });
});

router.put('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  
  if (!employee) {
    return res.status(404).json({ error: '员工不存在' });
  }
  
  if (req.user.role !== 'admin' && employee.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权限修改此员工信息' });
  }
  
  const { name, department_id, position_id, phone, email, gender, birth_date, hire_date, address, emergency_contact, emergency_phone, status } = req.body;
  
  db.prepare(`
    UPDATE employees 
    SET name = ?, department_id = ?, position_id = ?, phone = ?, email = ?, gender = ?, birth_date = ?, hire_date = ?, address = ?, emergency_contact = ?, emergency_phone = ?, status = ?
    WHERE id = ?
  `).run(name || employee.name, department_id, position_id, phone, email, gender, birth_date, hire_date, address, emergency_contact, emergency_phone, status || employee.status, req.params.id);
  
  res.json({ message: '员工信息更新成功' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) {
    return res.status(404).json({ error: '员工不存在' });
  }
  
  if (employee.user_id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(employee.user_id);
  }
  
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  
  res.json({ message: '员工删除成功' });
});

router.get('/:id/subordinates', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  const employee = db.prepare('SELECT department_id, position_id FROM employees WHERE id = ?').get(req.params.id);
  if (!employee) {
    return res.status(404).json({ error: '员工不存在' });
  }
  
  const subordinates = db.prepare(`
    SELECT e.*, d.name as department_name, p.name as position_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.department_id = ? AND e.position_id IN (
      SELECT id FROM positions WHERE level > (SELECT level FROM positions WHERE id = ?)
    )
  `).all(employee.department_id, employee.position_id);
  
  res.json(subordinates);
});

router.post('/positions', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { name, department_id, level, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '岗位名称不能为空' });
  }
  
  const stmt = db.prepare('INSERT INTO positions (name, department_id, level, description) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, department_id || null, level || 1, description);
  
  res.status(201).json({ id: result.lastInsertRowid, message: '岗位创建成功' });
});

router.get('/positions/list', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { department_id } = req.query;
  
  let sql = 'SELECT p.*, d.name as department_name FROM positions p LEFT JOIN departments d ON p.department_id = d.id WHERE 1=1';
  const params = [];
  
  if (department_id) {
    sql += ' AND p.department_id = ?';
    params.push(department_id);
  }
  
  sql += ' ORDER BY p.level, p.id';
  
  const positions = db.prepare(sql).all(...params);
  res.json(positions);
});

module.exports = router;
