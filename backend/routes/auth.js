const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { generateToken, authMiddleware } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const db = req.app.get('db');
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  
  const employee = db.prepare('SELECT * FROM employees WHERE user_id = ?').get(user.id);
  
  const token = generateToken(user);
  
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employee: employee
    }
  });
});

router.post('/register', (req, res) => {
  const db = req.app.get('db');
  const { username, password, name, employee_no, department_id, position_id, phone, email } = req.body;
  
  if (!username || !password || !name || !employee_no) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }
  
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    return res.status(400).json({ error: '用户名已存在' });
  }
  
  const existingEmployee = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(employee_no);
  if (existingEmployee) {
    return res.status(400).json({ error: '工号已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  const userResult = insertUser.run(username, hashedPassword, 'employee');
  
  const insertEmployee = db.prepare('INSERT INTO employees (user_id, name, employee_no, department_id, position_id, phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insertEmployee.run(userResult.lastInsertRowid, name, employee_no, department_id, position_id, phone, email, 'active');
  
  res.status(201).json({ message: '注册成功' });
});

router.get('/profile', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare(`
    SELECT e.*, d.name as department_name, p.name as position_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN positions p ON e.position_id = p.id
    WHERE e.user_id = ?
  `).get(req.user.id);
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      employee: employee
    }
  });
});

router.put('/password', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { oldPassword, newPassword } = req.body;
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  
  const isValidPassword = bcrypt.compareSync(oldPassword, user.password);
  if (!isValidPassword) {
    return res.status(400).json({ error: '旧密码错误' });
  }
  
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.user.id);
  
  res.json({ message: '密码修改成功' });
});

module.exports = router;
