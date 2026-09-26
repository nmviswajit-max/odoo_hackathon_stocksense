const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const operationsRoutes = require('./routes/operations');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts & external fonts/icons
}));
app.use(cors());
app.use(express.json());

// Rate Limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Rate Limit Exceeded', message: 'Too many requests. Please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Security Rate Limit', message: 'Too many authentication attempts.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static Web Serving
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/operations', operationsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString(), system: 'StockSense IMS Terminal' });
});

// Fallback to login page for root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login page.html'));
});

// Catch-all error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message || 'Server error occurred.' });
});

// Auto-seed if database empty
if (db.getUsers().length === 0) {
  console.log('Database uninitialized. Running auto-seed...');
  require('./seed');
}

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 StockSense IMS Server running on port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
