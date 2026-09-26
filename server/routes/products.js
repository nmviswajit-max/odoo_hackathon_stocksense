const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET all products (Accessible by: admin, manager, worker)
router.get('/', authenticateToken, (req, res) => {
  try {
    const products = db.getProducts();
    res.json({ count: products.length, products });
  } catch (err) {
    res.status(500).json({ error: 'Database Error', message: 'Failed to fetch inventory products.' });
  }
});

// GET single product by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Database Error', message: 'Failed to fetch product.' });
  }
});

// POST Add Product (Accessible by: admin, manager)
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { sku, name, category, location, quantity, min_threshold, unit_price } = req.body;

    if (!sku || !name || !category || !location) {
      return res.status(400).json({ error: 'Validation Error', message: 'SKU, name, category, and location are required.' });
    }

    const existingSKU = db.getProductBySKU(sku);
    if (existingSKU) {
      return res.status(400).json({ error: 'Conflict', message: `A product with SKU "${sku}" already exists.` });
    }

    const newProduct = db.addProduct({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim(),
      location: location.trim(),
      quantity: quantity || 0,
      min_threshold: min_threshold || 5,
      unit_price: unit_price || 0
    });

    res.status(201).json({ message: 'Product added successfully', product: newProduct });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to create product.' });
  }
});

// PUT Update Product (Accessible by: admin, manager)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }

    const updated = db.updateProduct(req.params.id, req.body);
    res.json({ message: 'Product updated successfully', product: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to update product.' });
  }
});

// DELETE Product (Accessible by: admin ONLY)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete product.' });
  }
});

module.exports = router;
