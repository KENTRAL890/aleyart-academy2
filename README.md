# Aleyart Academy — School Management System
"Seeking Wisdom" | Odokor-Official Town | P.O BOX 4183 | 0553797233

Full-stack multi-user system: Node.js + PostgreSQL backend, single HTML frontend.

## PROJECT STRUCTURE
aleyart-academy/
├── backend/
│   ├── server.js        ← Node.js Express API
│   ├── schema.sql       ← PostgreSQL setup (run this first)
│   ├── package.json     ← Dependencies
│   └── .env             ← DB config (EDIT THIS)
├── frontend/
│   └── index.html       ← Open in any browser
├── .vscode/             ← VS Code settings & debug config
├── aleyart-academy.code-workspace
├── START-SERVER-WINDOWS.bat
├── start-server-mac-linux.sh
└── README.md

## QUICK START

### 1. Install Prerequisites
- Node.js: https://nodejs.org (LTS version)
- PostgreSQL: https://www.postgresql.org/download/

### 2. Create Database
  Windows CMD / Mac Terminal:
    psql -U postgres -c "CREATE DATABASE aleyart_db;"
    psql -U postgres -d aleyart_db -f backend/schema.sql

### 3. Edit backend/.env
  DB_PASSWORD=your_postgres_password_here

### 4. Start Backend
  Windows: double-click START-SERVER-WINDOWS.bat
  Mac/Linux: ./start-server-mac-linux.sh
  VS Code: press F5 (uses launch.json)
  Manual:  cd backend && npm install && node server.js

### 5. Open Frontend
  Open frontend/index.html in Chrome/Firefox/Edge
  Login: admin / admin123

## MULTI-USER NETWORK SETUP
1. Get server IP: ipconfig (Windows) or ifconfig (Mac)
2. Edit frontend/index.html line 1:
   const API_BASE = 'http://192.168.1.X:4000/api';
3. Share index.html with teachers on same network
4. All data is shared via PostgreSQL in real-time

## DEFAULT LOGIN
  Admin:   username=admin    password=admin123
  Teacher: created by admin in Administration panel

## GRADING
  A  = 80-100  (Advance)
  P  = 68-79   (Proficient)
  AP = 54-67   (Approaching Proficiency)
  D  = 40-53   (Developing)
  B  = 0-39    (Beginning)
  Class score: 50 | Exam score: 50 | Total: 100

## BECE AGGREGATE (Basic 7-8)
  Core: English, Mathematics, Science, Social Studies
  + Best 2 electives
  Grade 1=90-100 | 2=80-89 | 3=70-79 | 4=60-69
  Grade 5=55-59  | 6=50-54 | 7=40-49 | 8=35-39 | 9=0-34

## TROUBLESHOOT
  "Cannot connect to DB" -> check .env password, PostgreSQL running
  "Port in use"          -> change PORT in .env and API_BASE in index.html
  "Login fails"          -> confirm server is running at localhost:4000
  Test server:           -> visit http://localhost:4000/api/health
