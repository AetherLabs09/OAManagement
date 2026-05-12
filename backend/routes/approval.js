const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

router.get('/types', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const types = db.prepare('SELECT * FROM approval_types ORDER BY id').all();
  res.json(types);
});

router.get('/flows', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type_id } = req.query;
  
  let sql = `
    SELECT af.*, at.name as type_name
    FROM approval_flows af
    LEFT JOIN approval_types at ON af.type_id = at.id
    WHERE 1=1
  `;
  const params = [];
  
  if (type_id) {
    sql += ' AND af.type_id = ?';
    params.push(type_id);
  }
  
  sql += ' ORDER BY af.id';
  
  const flows = db.prepare(sql).all(...params);
  res.json(flows);
});

router.post('/flows', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type_id, name, steps } = req.body;
  
  if (!type_id || !name || !steps) {
    return res.status(400).json({ error: '必填字段不能为空' });
  }
  
  const stmt = db.prepare('INSERT INTO approval_flows (type_id, name, steps) VALUES (?, ?, ?)');
  const result = stmt.run(type_id, name, JSON.stringify(steps));
  
  res.status(201).json({ id: result.lastInsertRowid, message: '审批流程创建成功' });
});

router.get('/requests', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { status, type_id, applicant_id } = req.query;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  let sql = `
    SELECT ar.*, 
           at.name as type_name,
           e.name as applicant_name,
           e.employee_no
    FROM approval_requests ar
    LEFT JOIN approval_types at ON ar.type_id = at.id
    LEFT JOIN employees e ON ar.applicant_id = e.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += ' AND ar.status = ?';
    params.push(status);
  }
  
  if (type_id) {
    sql += ' AND ar.type_id = ?';
    params.push(type_id);
  }
  
  if (applicant_id) {
    sql += ' AND ar.applicant_id = ?';
    params.push(applicant_id);
  } else if (req.user.role !== 'admin') {
    sql += ' AND ar.applicant_id = ?';
    params.push(employee.id);
  }
  
  sql += ' ORDER BY ar.created_at DESC';
  
  const requests = db.prepare(sql).all(...params);
  res.json(requests);
});

router.get('/requests/pending', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id, department_id, position_id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const pendingRequests = db.prepare(`
    SELECT ar.*, 
           at.name as type_name,
           e.name as applicant_name,
           e.employee_no,
           d.name as department_name
    FROM approval_requests ar
    LEFT JOIN approval_types at ON ar.type_id = at.id
    LEFT JOIN employees e ON ar.applicant_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ar.status = 'pending'
    ORDER BY ar.created_at DESC
  `).all();
  
  res.json(pendingRequests);
});

router.get('/requests/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const request = db.prepare(`
    SELECT ar.*, 
           at.name as type_name,
           e.name as applicant_name,
           e.employee_no,
           d.name as department_name
    FROM approval_requests ar
    LEFT JOIN approval_types at ON ar.type_id = at.id
    LEFT JOIN employees e ON ar.applicant_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE ar.id = ?
  `).get(req.params.id);
  
  if (!request) {
    return res.status(404).json({ error: '申请不存在' });
  }
  
  const records = db.prepare(`
    SELECT ar.*, e.name as approver_name
    FROM approval_records ar
    LEFT JOIN employees e ON ar.approver_id = e.id
    WHERE ar.request_id = ?
    ORDER BY ar.step
  `).all(req.params.id);
  
  res.json({ ...request, records });
});

router.post('/requests', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { type_id, title, content } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!type_id || !title) {
    return res.status(400).json({ error: '申请类型和标题不能为空' });
  }
  
  const stmt = db.prepare('INSERT INTO approval_requests (type_id, title, applicant_id, content, status, current_step) VALUES (?, ?, ?, ?, ?, ?)');
  const result = stmt.run(type_id, title, employee.id, content, 'pending', 0);
  
  res.status(201).json({ id: result.lastInsertRowid, message: '申请提交成功' });
});

router.post('/requests/:id/approve', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const { action, comment } = req.body;
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  if (!['approve', 'reject', 'transfer'].includes(action)) {
    return res.status(400).json({ error: '无效的操作' });
  }
  
  const request = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
  if (!request) {
    return res.status(404).json({ error: '申请不存在' });
  }
  
  if (request.status !== 'pending') {
    return res.status(400).json({ error: '该申请已处理' });
  }
  
  const actionText = action === 'approve' ? 'approved' : (action === 'reject' ? 'rejected' : 'transferred');
  
  db.prepare('INSERT INTO approval_records (request_id, approver_id, step, action, comment) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, employee.id, request.current_step, actionText, comment);
  
  if (action === 'reject') {
    db.prepare('UPDATE approval_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('rejected', req.params.id);
  } else if (action === 'approve') {
    const flow = db.prepare('SELECT steps FROM approval_flows WHERE type_id = ? AND is_active = 1').get(request.type_id);
    
    if (flow) {
      const steps = JSON.parse(flow.steps);
      if (request.current_step + 1 >= steps.length) {
        db.prepare('UPDATE approval_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('approved', req.params.id);
      } else {
        db.prepare('UPDATE approval_requests SET current_step = current_step + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(req.params.id);
      }
    } else {
      db.prepare('UPDATE approval_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('approved', req.params.id);
    }
  }
  
  res.json({ message: '处理成功' });
});

router.delete('/requests/:id', authMiddleware, (req, res) => {
  const db = req.app.get('db');
  const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
  
  const request = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(req.params.id);
  if (!request) {
    return res.status(404).json({ error: '申请不存在' });
  }
  
  if (request.applicant_id !== employee.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权限删除此申请' });
  }
  
  if (request.status !== 'pending') {
    return res.status(400).json({ error: '只能撤销待审批的申请' });
  }
  
  db.prepare('DELETE FROM approval_records WHERE request_id = ?').run(req.params.id);
  db.prepare('DELETE FROM approval_requests WHERE id = ?').run(req.params.id);
  
  res.json({ message: '申请已撤销' });
});

module.exports = router;
