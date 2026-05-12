const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const departments = db.prepare(`
    SELECT d.*, 
           p.name as parent_name,
           e.name as manager_name,
           (SELECT COUNT(*) FROM employees WHERE department_id = d.id) as employee_count
    FROM departments d
    LEFT JOIN departments p ON d.parent_id = p.id
    LEFT JOIN employees e ON d.manager_id = e.id
    ORDER BY d.id
  `).all();
  res.json(departments);
});

router.get('/tree', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const departments = db.prepare(`
    SELECT d.*, 
           p.name as parent_name,
           e.name as manager_name,
           (SELECT COUNT(*) FROM employees WHERE department_id = d.id) as employee_count
    FROM departments d
    LEFT JOIN departments p ON d.parent_id = p.id
    LEFT JOIN employees e ON d.manager_id = e.id
    ORDER BY d.id
  `).all();
  
  function buildTree(items, parentId = null) {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }));
  }
  
  res.json(buildTree(departments));
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const department = db.prepare(`
    SELECT d.*, 
           p.name as parent_name,
           e.name as manager_name
    FROM departments d
    LEFT JOIN departments p ON d.parent_id = p.id
    LEFT JOIN employees e ON d.manager_id = e.id
    WHERE d.id = ?
  `).get(req.params.id);
  
  if (!department) {
    return res.status(404).json({ error: '部门不存在' });
  }
  
  res.json(department);
});

router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { name, parent_id, manager_id, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '部门名称不能为空' });
  }
  
  const stmt = db.prepare('INSERT INTO departments (name, parent_id, manager_id, description) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, parent_id || null, manager_id || null, description || null);
  
  res.status(201).json({ id: result.lastInsertRowid, message: '部门创建成功' });
});

router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { name, parent_id, manager_id, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '部门名称不能为空' });
  }
  
  const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: '部门不存在' });
  }
  
  db.prepare('UPDATE departments SET name = ?, parent_id = ?, manager_id = ?, description = ? WHERE id = ?')
    .run(name, parent_id || null, manager_id || null, description || null, req.params.id);
  
  res.json({ message: '部门更新成功' });
});

router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  const db = req.app.get('db');
  
  const employees = db.prepare('SELECT COUNT(*) as count FROM employees WHERE department_id = ?').get(req.params.id);
  if (employees.count > 0) {
    return res.status(400).json({ error: '该部门下还有员工，无法删除' });
  }
  
  const children = db.prepare('SELECT COUNT(*) as count FROM departments WHERE parent_id = ?').get(req.params.id);
  if (children.count > 0) {
    return res.status(400).json({ error: '该部门下还有子部门，无法删除' });
  }
  
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  
  res.json({ message: '部门删除成功' });
});

module.exports = router;
