const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Seeding StockSense Odoo-Grade Inventory System...');

  // Reset DB State
  db.save({ users: [], products: [], warehouses: [], operations: [], move_history: [] });

  // 1. Seed Users
  const passwordHashAdmin = await bcrypt.hash('AdminPass123!', 10);
  const passwordHashManager = await bcrypt.hash('ManagerPass123!', 10);
  const passwordHashWorker = await bcrypt.hash('WorkerPass123!', 10);

  const admin = db.addUser({
    name: 'Sarah Connor (Admin)',
    email: 'admin@stocksense.com',
    password_hash: passwordHashAdmin,
    role: 'admin'
  });

  const manager = db.addUser({
    name: 'Michael Scott (Manager)',
    email: 'manager@stocksense.com',
    password_hash: passwordHashManager,
    role: 'manager'
  });

  const worker = db.addUser({
    name: 'Alex Morgan (Staff)',
    email: 'worker@stocksense.com',
    password_hash: passwordHashWorker,
    role: 'worker'
  });

  // 2. Seed Warehouses & Locations
  db.addWarehouse({ code: 'WH/MAIN', name: 'Main Warehouse', location_type: 'Internal' });
  db.addWarehouse({ code: 'WH/PROD', name: 'Production Floor', location_type: 'Internal' });
  db.addWarehouse({ code: 'WH/RACK-A', name: 'Rack A', location_type: 'Internal' });
  db.addWarehouse({ code: 'WH/RACK-B', name: 'Rack B', location_type: 'Internal' });
  db.addWarehouse({ code: 'WH/WH2', name: 'Warehouse 2', location_type: 'Internal' });

  // 3. Seed Products with UoM, Min/Max rules
  const p1 = db.addProduct({
    sku: 'STL-ROD-100',
    name: 'Steel Rods 20mm',
    category: 'Raw Material',
    uom: 'Kg',
    quantity: 150,
    min_threshold: 40,
    max_threshold: 500,
    unit_price: 12.50,
    locations: { 'Main Warehouse': 100, 'Production Floor': 50 }
  });

  const p2 = db.addProduct({
    sku: 'CHR-OFF-20',
    name: 'Ergonomic Office Chairs',
    category: 'Finished Goods',
    uom: 'Units',
    quantity: 48,
    min_threshold: 15,
    max_threshold: 100,
    unit_price: 145.00,
    locations: { 'Main Warehouse': 48 }
  });

  const p3 = db.addProduct({
    sku: 'ELE-SOL-450',
    name: 'Solar Engine Controller',
    category: 'Electronics',
    uom: 'Units',
    quantity: 320,
    min_threshold: 50,
    max_threshold: 600,
    unit_price: 185.00,
    locations: { 'Warehouse 2': 320 }
  });

  const p4 = db.addProduct({
    sku: 'OPT-FIB-500',
    name: 'Optical Fiber Cable',
    category: 'Networking',
    uom: 'Meters',
    quantity: 0,
    min_threshold: 100,
    max_threshold: 2000,
    unit_price: 4.20,
    locations: { 'Main Warehouse': 0 }
  });

  const p5 = db.addProduct({
    sku: 'IND-SEN-90',
    name: 'Hydraulic Pressure Sensor',
    category: 'Industrial',
    uom: 'Boxes',
    quantity: 45,
    min_threshold: 10,
    max_threshold: 200,
    unit_price: 89.00,
    locations: { 'Rack A': 45 }
  });

  // 4. Seed Operations Documents
  // Receipt (Incoming Stock)
  const op1 = db.addOperation({
    doc_type: 'Receipt',
    partner: 'Apex Steel Industries Vendor',
    source_location: 'Vendor Location',
    dest_location: 'Main Warehouse',
    status: 'Ready',
    items: [{ product_id: p1.id, sku: p1.sku, name: p1.name, qty: 50 }],
    created_by: manager.name
  });
  db.validateOperation(op1.id, manager); // Validates: +50 Steel Rods

  // Delivery Order (Outgoing Goods)
  const op2 = db.addOperation({
    doc_type: 'Delivery',
    partner: 'Acme Corp Customer',
    source_location: 'Main Warehouse',
    dest_location: 'Customer Location',
    status: 'Ready',
    items: [{ product_id: p2.id, sku: p2.sku, name: p2.name, qty: 10 }],
    created_by: worker.name
  });
  db.validateOperation(op2.id, worker); // Validates: -10 Chairs

  // Internal Transfer (Main Warehouse -> Production Floor)
  const op3 = db.addOperation({
    doc_type: 'Internal',
    partner: 'Internal Production',
    source_location: 'Main Warehouse',
    dest_location: 'Production Floor',
    status: 'Ready',
    items: [{ product_id: p1.id, sku: p1.sku, name: p1.name, qty: 30 }],
    created_by: worker.name
  });
  db.validateOperation(op3.id, worker);

  // Stock Adjustment (Damaged Items Fix)
  const op4 = db.addOperation({
    doc_type: 'Adjustment',
    partner: 'Quality Inventory Count',
    source_location: 'Main Warehouse',
    dest_location: 'Main Warehouse',
    status: 'Ready',
    items: [{ product_id: p1.id, sku: p1.sku, name: p1.name, qty: 147 }],
    created_by: admin.name
  });
  db.validateOperation(op4.id, admin);

  // Pending Operation for Dashboard Filter Testing
  db.addOperation({
    doc_type: 'Receipt',
    partner: 'Global Electronics Vendor',
    source_location: 'Vendor Location',
    dest_location: 'Warehouse 2',
    status: 'Ready',
    items: [{ product_id: p4.id, sku: p4.sku, name: p4.name, qty: 500 }],
    created_by: manager.name
  });

  console.log('✅ Seeding completed! StockSense system ready.');
}

seed().catch(err => console.error('Seeding error:', err));
