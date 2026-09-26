const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Record Stock Movement (Accessible by: admin, manager, worker)
router.post('/movement', authenticateToken, authorizeRoles('admin', 'manager', 'worker'), (req, res) => {
  try {
    const { productId, action, quantity, notes } = req.body;

    if (!productId || !action || !quantity) {
      return res.status(400).json({ error: 'Validation Error', message: 'productId, action, and quantity are required.' });
    }

    const validActions = ['IN', 'OUT', 'ADJUSTMENT'];
    if (!validActions.includes(action.toUpperCase())) {
      return res.status(400).json({ error: 'Validation Error', message: 'Action must be IN, OUT, or ADJUSTMENT.' });
    }

    const result = db.recordStockMovement(productId, action.toUpperCase(), quantity, req.user, notes || '');
    if (!result) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }

    res.json({
      message: `Stock ${action.toUpperCase()} recorded successfully.`,
      product: result.product,
      auditLog: result.logEntry
    });

  } catch (err) {
    res.status(400).json({ error: 'Stock Error', message: err.message || 'Stock operation failed.' });
  }
});

// GET Audit Logs (Accessible by: admin, manager)
router.get('/logs', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const logs = db.getAuditLogs();
    res.json({ count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ error: 'Database Error', message: 'Failed to retrieve audit logs.' });
  }
});

module.exports = router;
