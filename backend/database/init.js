module.exports = function(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      manager_id INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES departments(id),
      FOREIGN KEY (manager_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER,
      level INTEGER DEFAULT 1,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      employee_no TEXT UNIQUE NOT NULL,
      department_id INTEGER,
      position_id INTEGER,
      phone TEXT,
      email TEXT,
      gender TEXT,
      birth_date DATE,
      hire_date DATE,
      status TEXT DEFAULT 'active',
      address TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (position_id) REFERENCES positions(id)
    );

    CREATE TABLE IF NOT EXISTS approval_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS approval_flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      steps TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES approval_types(id)
    );

    CREATE TABLE IF NOT EXISTS approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      applicant_id INTEGER NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'pending',
      current_step INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES approval_types(id),
      FOREIGN KEY (applicant_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS approval_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      approver_id INTEGER NOT NULL,
      step INTEGER NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES approval_requests(id),
      FOREIGN KEY (approver_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'company',
      publisher_id INTEGER NOT NULL,
      department_id INTEGER,
      is_popup INTEGER DEFAULT 0,
      status TEXT DEFAULT 'published',
      publish_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (publisher_id) REFERENCES employees(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS notice_reads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notice_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (notice_id) REFERENCES notices(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(notice_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS worklogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT DEFAULT 'daily',
      title TEXT,
      content TEXT NOT NULL,
      work_date DATE NOT NULL,
      week_number INTEGER,
      month_number INTEGER,
      year INTEGER,
      status TEXT DEFAULT 'submitted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS worklog_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worklog_id INTEGER NOT NULL,
      commenter_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (worklog_id) REFERENCES worklogs(id),
      FOREIGN KEY (commenter_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      location TEXT,
      reminder INTEGER DEFAULT 0,
      status TEXT DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_approval_requests_applicant ON approval_requests(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_approval_records_request ON approval_records(request_id);
    CREATE INDEX IF NOT EXISTS idx_notices_publisher ON notices(publisher_id);
    CREATE INDEX IF NOT EXISTS idx_notice_reads_notice ON notice_reads(notice_id);
    CREATE INDEX IF NOT EXISTS idx_worklogs_employee ON worklogs(employee_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_employee ON schedules(employee_id);
  `);

  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const insertUser = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    insertUser.run('admin', hashedPassword, 'admin');
    
    const insertDept = db.prepare('INSERT INTO departments (name, description) VALUES (?, ?)');
    const deptResult = insertDept.run('总经办', '公司最高管理部门');
    
    const insertPosition = db.prepare('INSERT INTO positions (name, department_id, level) VALUES (?, ?, ?)');
    const positionResult = insertPosition.run('总经理', deptResult.lastInsertRowid, 1);
    
    const insertEmployee = db.prepare('INSERT INTO employees (user_id, name, employee_no, department_id, position_id, phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertEmployee.run(1, '系统管理员', 'EMP001', deptResult.lastInsertRowid, positionResult.lastInsertRowid, '13800138000', 'admin@company.com', 'active');
  }

  const approvalTypes = [
    { name: '请假申请', code: 'leave' },
    { name: '加班申请', code: 'overtime' },
    { name: '报销申请', code: 'expense' },
    { name: '采购申请', code: 'purchase' },
    { name: '用车申请', code: 'vehicle' },
    { name: '物品领用', code: 'supplies' }
  ];
  
  const insertType = db.prepare('INSERT OR IGNORE INTO approval_types (name, code) VALUES (?, ?)');
  approvalTypes.forEach(type => {
    insertType.run(type.name, type.code);
  });

  console.log('数据库初始化完成');
};
