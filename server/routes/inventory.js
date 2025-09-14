const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category, lowStock } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, c.name as category_name, s.name as supplier_name
      FROM inventory i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    let params = [];

    if (search) {
      query += ' AND (i.name LIKE ? OR i.item_code LIKE ? OR i.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND i.category_id = ?';
      params.push(category);
    }

    if (lowStock === 'true') {
      query += ' AND i.current_stock <= i.min_stock_level';
    }

    query += ' ORDER BY i.name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const items = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM inventory WHERE 1=1';
    let countParams = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR item_code LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      countQuery += ' AND category_id = ?';
      countParams.push(category);
    }

    if (lowStock === 'true') {
      countQuery += ' AND current_stock <= min_stock_level';
    }

    const count = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    res.json({
      items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await new Promise((resolve, reject) => {
      db.get(`
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM inventory i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new inventory item
router.post('/', authenticateToken, requireRole(['admin', 'manager']), [
  body('item_code').notEmpty().withMessage('Item code required'),
  body('name').notEmpty().withMessage('Name required'),
  body('unit').notEmpty().withMessage('Unit required'),
  body('current_stock').isInt({ min: 0 }).withMessage('Current stock must be non-negative'),
  body('min_stock_level').isInt({ min: 0 }).withMessage('Min stock level must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      item_code, name, description, category_id, supplier_id,
      unit, current_stock, min_stock_level, max_stock_level,
      unit_cost, location, barcode
    } = req.body;

    // Check if item code already exists
    const existingItem = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM inventory WHERE item_code = ?', [item_code], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingItem) {
      return res.status(400).json({ message: 'Item code already exists' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO inventory (
          item_code, name, description, category_id, supplier_id,
          unit, current_stock, min_stock_level, max_stock_level,
          unit_cost, location, barcode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item_code, name, description, category_id, supplier_id,
        unit, current_stock, min_stock_level, max_stock_level,
        unit_cost, location, barcode
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    res.status(201).json({ message: 'Item created successfully', id: result.id });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update inventory item
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Name required'),
  body('unit').notEmpty().withMessage('Unit required'),
  body('current_stock').isInt({ min: 0 }).withMessage('Current stock must be non-negative'),
  body('min_stock_level').isInt({ min: 0 }).withMessage('Min stock level must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      name, description, category_id, supplier_id,
      unit, current_stock, min_stock_level, max_stock_level,
      unit_cost, location, barcode
    } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(`
        UPDATE inventory SET
          name = ?, description = ?, category_id = ?, supplier_id = ?,
          unit = ?, current_stock = ?, min_stock_level = ?, max_stock_level = ?,
          unit_cost = ?, location = ?, barcode = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, description, category_id, supplier_id,
        unit, current_stock, min_stock_level, max_stock_level,
        unit_cost, location, barcode, req.params.id
      ], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item updated successfully' });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get low stock items
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const items = await new Promise((resolve, reject) => {
      db.all(`
        SELECT i.*, c.name as category_name, s.name as supplier_name
        FROM inventory i
        LEFT JOIN categories c ON i.category_id = c.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.current_stock <= i.min_stock_level
        ORDER BY (i.current_stock - i.min_stock_level) ASC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(items);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
