const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:hcltTUhRsHfcQfwJcIkmKbmJiqQdLIjP@acela.proxy.rlwy.net:11592/railway',
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin','teacher')),
      assigned_class VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      teacher_name VARCHAR(255) DEFAULT '',
      fee_amount DECIMAL(10,2) DEFAULT 500.00,
      fee_term VARCHAR(100) DEFAULT 'Term 1 2024/2025'
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      class_name VARCHAR(50) NOT NULL,
      gender VARCHAR(10) NOT NULL DEFAULT 'Male',
      date_of_birth DATE,
      fees_paid DECIMAL(10,2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS fee_payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      payment_date DATE NOT NULL,
      recorded_at TIMESTAMP DEFAULT NOW(),
      notes TEXT DEFAULT ''
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      term VARCHAR(50) NOT NULL,
      subject VARCHAR(100) NOT NULL,
      class_score DECIMAL(5,2) DEFAULT 0,
      exam_score DECIMAL(5,2) DEFAULT 0,
      total DECIMAL(5,2) DEFAULT 0,
      grade VARCHAR(5) DEFAULT '',
      remark VARCHAR(100) DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, term, subject)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS report_notes (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      term VARCHAR(50) NOT NULL,
      interest TEXT DEFAULT '',
      teacher_remark TEXT DEFAULT '',
      days_present INTEGER DEFAULT 0,
      days_absent INTEGER DEFAULT 0,
      conduct TEXT DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, term)
    )`);

    await pool.query(`INSERT INTO classes (name, fee_amount, fee_term) VALUES
      ('Basic 1', 500.00, 'Term 1 2024/2025'),
      ('Basic 2', 500.00, 'Term 1 2024/2025'),
      ('Basic 3', 500.00, 'Term 1 2024/2025'),
      ('Basic 4', 500.00, 'Term 1 2024/2025'),
      ('Basic 5', 500.00, 'Term 1 2024/2025'),
      ('Basic 6', 500.00, 'Term 1 2024/2025'),
      ('Basic 7', 600.00, 'Term 1 2024/2025'),
      ('Basic 8', 600.00, 'Term 1 2024/2025')
      ON CONFLICT (name) DO NOTHING`);

    await pool.query(`INSERT INTO users (username, password_hash, full_name, role)
      VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin')
      ON CONFLICT (username) DO NOTHING`);

    console.log('SUCCESS! All tables created and data inserted!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

setup();