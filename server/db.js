const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'stocksense_db.json');

const defaultState = {
  users: [],
  products: [],
  warehouses: [],
  operations: [],
  move_history: []
};

class Database {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(DB_FILE)) {
      this.save(defaultState);
    }
  }

  load() {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return {
        users: parsed.users || [],
        products: parsed.products || [],
        warehouses: parsed.warehouses || [],
        operations: parsed.operations || [],
        move_history: parsed.move_history || [],
        pending_otps: parsed.pending_otps || {}
      };
    } catch (err) {
      console.error('Error reading DB:', err);
      return defaultState;
    }
  }

  save(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error writing DB:', err);
    }
  }

  // --- USER & OTP OPERATIONS ---
  getUsers() { 
    return this.load().users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at
    })); 
  }

  getUserByEmail(email) {
    if (!email) return null;
    return this.load().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user) {
    const db = this.load();
    user.id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    user.created_at = new Date().toISOString();
    db.users.push(user);
    this.save(db);
    return user;
  }

  updateUserRole(userId, newRole) {
    const db = this.load();
    const user = db.users.find(u => u.id === userId);
    if (!user) return null;
    user.role = newRole;
    this.save(db);
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  setOTP(email, otpCode) {
    const db = this.load();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return false;

    user.otp_code = otpCode;
    user.otp_expires = Date.now() + 10 * 60 * 1000;
    this.save(db);
    return true;
  }

  verifyOTPAndResetPassword(email, otpCode, newPasswordHash) {
    const db = this.load();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('Account not found.');

    if (!user.otp_code || user.otp_code !== otpCode) {
      throw new Error('Invalid OTP code.');
    }

    if (Date.now() > user.otp_expires) {
      throw new Error('OTP has expired. Please request a new one.');
    }

    user.password_hash = newPasswordHash;
    user.otp_code = null;
    user.otp_expires = null;
    this.save(db);
    return true;
  }

  verifyOTPOnly(email, otpCode) {
    const db = this.load();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No registered account found with this email.');

    if (!user.otp_code || user.otp_code !== otpCode) {
      throw new Error('Invalid OTP code. Please check and try again.');
    }

    if (Date.now() > user.otp_expires) {
      throw new Error('OTP has expired. Please request a new OTP code.');
    }

    user.otp_code = null;
    user.otp_expires = null;
    this.save(db);
    return user;
  }

  // Pending Signup OTP Operations
  setSignupOTP(email, otpCode) {
    const db = this.load();
    if (!db.pending_otps) db.pending_otps = {};
    db.pending_otps[email.toLowerCase()] = {
      otp: otpCode,
      expires: Date.now() + 10 * 60 * 1000
    };
    this.save(db);
    return true;
  }

  verifySignupOTP(email, otpCode) {
    const db = this.load();
    const key = email.toLowerCase();
    if (!db.pending_otps || !db.pending_otps[key]) {
      throw new Error('No OTP code requested for this Gmail address. Please click "Verify Email" first.');
    }

    const record = db.pending_otps[key];
    if (record.otp !== otpCode) {
      throw new Error('Invalid OTP code. Please check your Gmail and try again.');
    }

    if (Date.now() > record.expires) {
      delete db.pending_otps[key];
      this.save(db);
      throw new Error('OTP code has expired. Please request a new code.');
    }

    delete db.pending_otps[key];
    this.save(db);
    return true;
  }

  // --- WAREHOUSE & LOCATIONS ---
  getWarehouses() { return this.load().warehouses; }

  addWarehouse(wh) {
    const db = this.load();
    wh.id = 'wh_' + Date.now();
    db.warehouses.push(wh);
    this.save(db);
    return wh;
  }

  // --- PRODUCT MANAGEMENT ---
  getProducts() { return this.load().products; }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  getProductBySKU(sku) {
    return this.getProducts().find(p => p.sku.toUpperCase() === sku.toUpperCase());
  }

  addProduct(product) {
    const db = this.load();
    product.id = 'prd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    product.sku = product.sku.trim().toUpperCase();
    product.quantity = parseInt(product.quantity, 10) || 0;
    product.min_threshold = parseInt(product.min_threshold, 10) || 10;
    product.max_threshold = parseInt(product.max_threshold, 10) || 500;
    product.uom = product.uom || 'Units';
    product.unit_price = parseFloat(product.unit_price) || 0;
    product.locations = product.locations || { 'Main Warehouse': product.quantity };
    product.status = this.calculateStatus(product.quantity, product.min_threshold);
    product.updated_at = new Date().toISOString();

    db.products.push(product);
    this.save(db);
    return product;
  }

  updateProduct(id, updates) {
    const db = this.load();
    const idx = db.products.findIndex(p => p.id === id);
    if (idx === -1) return null;

    db.products[idx] = { ...db.products[idx], ...updates, updated_at: new Date().toISOString() };
    const p = db.products[idx];
    p.quantity = parseInt(p.quantity, 10) || 0;
    p.status = this.calculateStatus(p.quantity, p.min_threshold);

    this.save(db);
    return db.products[idx];
  }

  deleteProduct(id) {
    const db = this.load();
    const len = db.products.length;
    db.products = db.products.filter(p => p.id !== id);
    if (db.products.length !== len) {
      this.save(db);
      return true;
    }
    return false;
  }

  // --- OPERATIONS (Receipts, Deliveries, Internal Transfers, Adjustments) ---
  getOperations() { return this.load().operations; }

  addOperation(op) {
    const db = this.load();
    const count = db.operations.length + 1;
    const prefixMap = {
      'Receipt': 'WH/IN/',
      'Delivery': 'WH/OUT/',
      'Internal': 'WH/INT/',
      'Adjustment': 'WH/ADJ/'
    };

    op.id = 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    op.reference = (prefixMap[op.doc_type] || 'WH/OP/') + String(count).padStart(4, '0');
    op.status = op.status || 'Draft';
    op.date = new Date().toISOString();
    
    db.operations.unshift(op);
    this.save(db);
    return op;
  }

  validateOperation(opId, user) {
    const db = this.load();
    const op = db.operations.find(o => o.id === opId);
    if (!op) throw new Error('Operation document not found.');
    if (op.status === 'Done') throw new Error('Operation is already validated and marked Done.');

    op.items.forEach(item => {
      const product = db.products.find(p => p.id === item.product_id || p.sku === item.sku);
      if (!product) return;

      const qty = parseInt(item.qty, 10) || 0;
      let qtyChangeText = '';

      if (op.doc_type === 'Receipt') {
        product.quantity += qty;
        product.locations = product.locations || {};
        product.locations[op.dest_location] = (product.locations[op.dest_location] || 0) + qty;
        qtyChangeText = `+${qty}`;
      } else if (op.doc_type === 'Delivery') {
        if (product.quantity < qty) {
          throw new Error(`Insufficient stock for ${product.name}. Required ${qty}, available: ${product.quantity}`);
        }
        product.quantity -= qty;
        product.locations = product.locations || {};
        product.locations[op.source_location] = Math.max(0, (product.locations[op.source_location] || 0) - qty);
        qtyChangeText = `-${qty}`;
      } else if (op.doc_type === 'Internal') {
        product.locations = product.locations || {};
        product.locations[op.source_location] = Math.max(0, (product.locations[op.source_location] || 0) - qty);
        product.locations[op.dest_location] = (product.locations[op.dest_location] || 0) + qty;
        qtyChangeText = `Transfer ${qty} (${op.source_location} ➔ ${op.dest_location})`;
      } else if (op.doc_type === 'Adjustment') {
        const oldQty = product.quantity;
        product.quantity = qty;
        product.locations = product.locations || {};
        product.locations[op.dest_location || 'Main Warehouse'] = qty;
        const diff = qty - oldQty;
        qtyChangeText = `Adjusted (${diff >= 0 ? '+' : ''}${diff})`;
      }

      product.status = this.calculateStatus(product.quantity, product.min_threshold);

      db.move_history.unshift({
        id: 'move_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: new Date().toISOString(),
        reference: op.reference,
        doc_type: op.doc_type,
        product_name: product.name,
        sku: product.sku,
        source_location: op.source_location || 'Vendor',
        dest_location: op.dest_location || 'Customer',
        qty_change: qtyChangeText,
        user: user.name,
        status: 'Done'
      });
    });

    op.status = 'Done';
    op.validated_by = user.name;
    op.validated_at = new Date().toISOString();

    this.save(db);
    return op;
  }

  getMoveHistory() { return this.load().move_history; }

  calculateStatus(qty, minThreshold) {
    if (qty <= 0) return 'Out of Stock';
    if (qty <= minThreshold) return 'Low Stock';
    return 'In Stock';
  }
}

module.exports = new Database();
