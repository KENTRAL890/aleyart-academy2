require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'aleyart_secret_2024_seekingwisdom';

// ─── DB Connection ────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aleyart_db'}`,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.full_name, assignedClass: user.assigned_class },
    JWT_SECRET, { expiresIn: '24h' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.full_name, assignedClass: user.assigned_class } });
});

// ─── Users Routes ─────────────────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('SELECT id,username,full_name,role,assigned_class,created_at FROM users ORDER BY role,full_name');
  res.json(rows);
});

app.post('/api/users', auth, adminOnly, async (req, res) => {
  const { username, password, full_name, role, assigned_class } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users(username,password_hash,full_name,role,assigned_class) VALUES($1,$2,$3,$4,$5) RETURNING id,username,full_name,role,assigned_class',
    [username, hash, full_name, role || 'teacher', assigned_class || null]
  );
  res.json(rows[0]);
});

app.put('/api/users/:id', auth, adminOnly, async (req, res) => {
  const { full_name, role, assigned_class, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET full_name=$1,role=$2,assigned_class=$3,password_hash=$4 WHERE id=$5',
      [full_name, role, assigned_class, hash, req.params.id]);
  } else {
    await pool.query('UPDATE users SET full_name=$1,role=$2,assigned_class=$3 WHERE id=$4',
      [full_name, role, assigned_class, req.params.id]);
  }
  res.json({ success: true });
});

app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [req.params.id]);
  if (rows[0]?.role === 'admin') return res.status(400).json({ error: 'Cannot delete admin' });
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── Classes Routes ───────────────────────────────────────────────────────────
app.get('/api/classes', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM classes ORDER BY id');
  res.json(rows);
});

app.put('/api/classes/:name', auth, async (req, res) => {
  const { teacher_name, fee_amount, fee_term } = req.body;
  const name = decodeURIComponent(req.params.name);
  await pool.query(
    'UPDATE classes SET teacher_name=COALESCE($1,teacher_name), fee_amount=COALESCE($2,fee_amount), fee_term=COALESCE($3,fee_term) WHERE name=$4',
    [teacher_name, fee_amount, fee_term, name]
  );
  const { rows } = await pool.query('SELECT * FROM classes WHERE name=$1', [name]);
  res.json(rows[0]);
});

// ─── Students Routes ──────────────────────────────────────────────────────────
app.get('/api/students', auth, async (req, res) => {
  const { class_name } = req.query;
  let query = 'SELECT s.*, COALESCE(SUM(fp.amount),0) as fees_paid_calc, MAX(fp.payment_date) as last_payment_date FROM students s LEFT JOIN fee_payments fp ON s.id=fp.student_id';
  const params = [];
  if (class_name) {
    // Teachers can only see their class
    if (req.user.role === 'teacher' && req.user.assignedClass !== class_name) {
      return res.status(403).json({ error: 'Access denied' });
    }
    query += ' WHERE s.class_name=$1';
    params.push(class_name);
  } else if (req.user.role !== 'admin') {
    query += ' WHERE s.class_name=$1';
    params.push(req.user.assignedClass);
  }
  query += ' GROUP BY s.id ORDER BY s.class_name, s.full_name';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/api/students', auth, async (req, res) => {
  const { full_name, class_name, gender, date_of_birth } = req.body;
  if (!full_name || !class_name) return res.status(400).json({ error: 'Name and class required' });
  // Teachers can only add to their class
  if (req.user.role === 'teacher' && req.user.assignedClass !== class_name) {
    return res.status(403).json({ error: 'You can only add to your class' });
  }
  const { rows } = await pool.query(
    'INSERT INTO students(full_name,class_name,gender,date_of_birth) VALUES($1,$2,$3,$4) RETURNING *',
    [full_name, class_name, gender || 'Male', date_of_birth || null]
  );
  res.json(rows[0]);
});

app.put('/api/students/:id', auth, async (req, res) => {
  const { full_name, gender, date_of_birth, class_name } = req.body;
  const { rows: existing } = await pool.query('SELECT * FROM students WHERE id=$1', [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Student not found' });
  if (req.user.role === 'teacher' && req.user.assignedClass !== existing[0].class_name) {
    return res.status(403).json({ error: 'Access denied' });
  }
  await pool.query(
    'UPDATE students SET full_name=$1,gender=$2,date_of_birth=$3,class_name=$4,updated_at=NOW() WHERE id=$5',
    [full_name||existing[0].full_name, gender||existing[0].gender, date_of_birth||existing[0].date_of_birth, class_name||existing[0].class_name, req.params.id]
  );
  const { rows } = await pool.query('SELECT * FROM students WHERE id=$1', [req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/students/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM students WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// ─── Fee Payments Routes ──────────────────────────────────────────────────────
app.get('/api/students/:id/payments', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM fee_payments WHERE student_id=$1 ORDER BY payment_date DESC',
    [req.params.id]
  );
  res.json(rows);
});

app.post('/api/students/:id/payments', auth, async (req, res) => {
  const { amount, payment_date, notes } = req.body;
  if (!amount || !payment_date) return res.status(400).json({ error: 'Amount and date required' });
  const { rows } = await pool.query(
    'INSERT INTO fee_payments(student_id,amount,payment_date,notes) VALUES($1,$2,$3,$4) RETURNING *',
    [req.params.id, amount, payment_date, notes || '']
  );
  // Update student fees_paid
  await pool.query('UPDATE students SET fees_paid=fees_paid+$1,updated_at=NOW() WHERE id=$2', [amount, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/payments/:id', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM fee_payments WHERE id=$1', [req.params.id]);
  if (rows.length) {
    await pool.query('UPDATE students SET fees_paid=fees_paid-$1 WHERE id=$2', [rows[0].amount, rows[0].student_id]);
    await pool.query('DELETE FROM fee_payments WHERE id=$1', [req.params.id]);
  }
  res.json({ success: true });
});

// ─── Assessments Routes ───────────────────────────────────────────────────────
app.get('/api/assessments', auth, async (req, res) => {
  const { class_name, term, student_id } = req.query;
  let query = `
    SELECT a.*, s.full_name, s.class_name 
    FROM assessments a 
    JOIN students s ON a.student_id=s.id 
    WHERE 1=1
  `;
  const params = [];
  let i = 1;
  if (student_id) { query += ` AND a.student_id=$${i++}`; params.push(student_id); }
  if (class_name) { query += ` AND s.class_name=$${i++}`; params.push(class_name); }
  if (term) { query += ` AND a.term=$${i++}`; params.push(term); }
  query += ' ORDER BY s.full_name, a.subject';
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

app.post('/api/assessments/batch', auth, async (req, res) => {
  // batch upsert: [{student_id, term, subject, class_score, exam_score}]
  const { assessments } = req.body;
  const results = [];
  for (const a of assessments) {
    const total = Math.min(parseFloat(a.class_score)||0, 50) + Math.min(parseFloat(a.exam_score)||0, 50);
    const grade = getGrade(total);
    const { rows } = await pool.query(`
      INSERT INTO assessments(student_id,term,subject,class_score,exam_score,total,grade,remark,updated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT(student_id,term,subject) DO UPDATE SET
        class_score=EXCLUDED.class_score, exam_score=EXCLUDED.exam_score,
        total=EXCLUDED.total, grade=EXCLUDED.grade, remark=EXCLUDED.remark, updated_at=NOW()
      RETURNING *`,
      [a.student_id, a.term, a.subject, Math.min(parseFloat(a.class_score)||0,50), Math.min(parseFloat(a.exam_score)||0,50), total, grade.grade, grade.remark]
    );
    results.push(rows[0]);
  }
  res.json(results);
});

// ─── Report Notes Routes ──────────────────────────────────────────────────────
app.get('/api/report-notes/:student_id/:term', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM report_notes WHERE student_id=$1 AND term=$2',
    [req.params.student_id, req.params.term]
  );
  res.json(rows[0] || null);
});

app.post('/api/report-notes', auth, async (req, res) => {
  const { student_id, term, interest, teacher_remark, days_present, days_absent, conduct } = req.body;
  const { rows } = await pool.query(`
    INSERT INTO report_notes(student_id,term,interest,teacher_remark,days_present,days_absent,conduct,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,NOW())
    ON CONFLICT(student_id,term) DO UPDATE SET
      interest=EXCLUDED.interest, teacher_remark=EXCLUDED.teacher_remark,
      days_present=EXCLUDED.days_present, days_absent=EXCLUDED.days_absent,
      conduct=EXCLUDED.conduct, updated_at=NOW()
    RETURNING *`,
    [student_id, term, interest||'', teacher_remark||'', days_present||0, days_absent||0, conduct||'']
  );
  res.json(rows[0]);
});

// ─── Stats / Summary ──────────────────────────────────────────────────────────
app.get('/api/stats', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let classFilter = isAdmin ? '' : `WHERE s.class_name='${req.user.assignedClass}'`;

  const { rows: classStats } = await pool.query(`
    SELECT 
      c.name, c.teacher_name, c.fee_amount, c.fee_term,
      COUNT(s.id) as student_count,
      COALESCE(SUM(s.fees_paid),0) as total_collected,
      COALESCE(SUM(c.fee_amount - s.fees_paid),0) as total_owed
    FROM classes c
    LEFT JOIN students s ON s.class_name=c.name
    GROUP BY c.id, c.name, c.teacher_name, c.fee_amount, c.fee_term
    ORDER BY c.id
  `);
  res.json({ classStats });
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', db: 'connected' }); }
  catch { res.json({ status: 'ok', db: 'disconnected' }); }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGrade(score) {
  if (score >= 80) return { grade: 'A', remark: 'Advance' };
  if (score >= 68) return { grade: 'P', remark: 'Proficient' };
  if (score >= 54) return { grade: 'AP', remark: 'Approaching Proficiency' };
  if (score >= 40) return { grade: 'D', remark: 'Developing' };
  return { grade: 'B', remark: 'Beginning' };
}

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Aleyart Academy API running on port ${PORT}`));
module.exports = app;
