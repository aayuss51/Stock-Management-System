const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM suppliers WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const suppliers = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM suppliers WHERE 1=1';
    let countParams = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const count = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    res.json({
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single supplier
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM suppliers WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new supplier
router.post('/', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Supplier name required'),
  body('email').optional().isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO suppliers (name, contact_person, email, phone, address)
        VALUES (?, ?, ?, ?, ?)
      `, [name, contact_person, email, phone, address], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    res.status(201).json({ message: 'Supplier created successfully', id: result.id });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update supplier
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Supplier name required'),
  body('email').optional().isEmail().withMessage('Valid email required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(`
        UPDATE suppliers SET
          name = ?, contact_person = ?, email = ?, phone = ?, address = ?
        WHERE id = ?
      `, [name, contact_person, email, phone, address, req.params.id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete supplier
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Check if supplier has associated inventory items
    const inventoryCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM inventory WHERE supplier_id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (inventoryCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete supplier with associated inventory items' 
      });
    }

    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
