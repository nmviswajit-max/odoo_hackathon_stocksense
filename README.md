# 🛡️ StockSense — Production Inventory & Security Terminal

StockSense is a secure, full-stack inventory management web application built with **Node.js, Express, JWT Authentication, bcrypt password security, and Role-Based Access Control (RBAC)**.

---

## 🚀 Key Features & Security Architecture

1. **Role-Based Access Control (RBAC)**:
   - **`ADMIN`**: Full permissions (Add, Update, Delete products, record stock movements, view security audit logs).
   - **`MANAGER`**: Inventory control (Add & Update products, record stock movements, view audit logs).
   - **`WORKER`**: Operational privileges (View stock telemetry, record stock IN/OUT usage).
2. **Security & Cryptography**:
   - **bcrypt Password Hashing** (10 salt rounds).
   - **JWT Tokens** (`Bearer` schema) with 24-hour expiration.
   - **Helmet.js** HTTP security headers.
   - **Express Rate Limiting** to prevent brute-force login attacks and DoS.
   - **SQL Injection & XSS Immunity**: Parameterized data queries & input sanitization.
3. **Inventory Telemetry**:
   - Live stock valuation calculation.
   - Automated low-stock thresholds and status badges (`In Stock`, `Low Stock`, `Out of Stock`).
   - Transactional audit log history for full warehouse traceability.

---

## 🔑 Pre-Configured Demo Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@stocksense.com` | `AdminPass123!` | Full Admin & Deletion Rights |
| **Manager** | `manager@stocksense.com` | `ManagerPass123!` | Inventory & Audit Log Management |
| **Worker** | `worker@stocksense.com` | `WorkerPass123!` | View Inventory & Record Movements |

---

## 💻 Local Setup & Development Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Database
Initialize the database with default multi-role accounts and initial inventory products:
```bash
npm run seed
```

### 3. Start Local Production Server
```bash
npm start
```
The application will run on **[http://localhost:3000](http://localhost:3000)**.

### 4. Run Automated Security Test Suite
Verify authentication, password hashing, RBAC permissions, and API endpoints:
```bash
npm test
```

---

## ☁️ Deployment Guide (Hosting on Cloud)

### Option A: Hosting on Render / Railway / Fly.io
1. Push this repository to GitHub/GitLab.
2. Connect your repository to **Render** or **Railway**.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_random_secure_production_key_here`

---

## 📁 Repository File Structure
```
c:\StockSense\
├── package.json
├── .env.example
├── README.md
├── test.js
├── server/
│   ├── index.js              # Main Express Server
│   ├── db.js                 # Database Engine & Audit Logs
│   ├── seed.js               # Auto-seeding script
│   ├── middleware/
│   │   └── auth.js           # JWT & RBAC Middleware
│   └── routes/
│       ├── auth.js           # Login & Register Routes
│       ├── products.js       # Product Inventory API Routes
│       └── inventory.js      # Stock Movement & Audit Logs
└── public/
    ├── index.html            # Entry redirect
    ├── login page.html       # UI Login & Signup Terminal
    └── home.html             # UI Inventory Dashboard Terminal
```
