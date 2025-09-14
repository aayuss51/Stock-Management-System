const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, type, inventory_id, project_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT t.*, i.name as item_name, i.item_code, p.name as project_name, u.username
      FROM transactions t
      LEFT JOIN inventory i ON t.inventory_id = i.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }

    if (inventory_id) {
      query += ' AND t.inventory_id = ?';
      params.push(inventory_id);
    }

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }

    if (start_date) {
      query += ' AND DATE(t.transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.transaction_date) <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY t.transaction_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    let countParams = [];

    if (type) {
      countQuery += ' AND type = ?';
      countParams.push(type);
    }

    if (inventory_id) {
      countQuery += ' AND inventory_id = ?';
      countParams.push(inventory_id);
    }

    if (project_id) {
      countQuery += ' AND project_id = ?';
      countParams.push(project_id);
    }

    if (start_date) {
      countQuery += ' AND DATE(transaction_date) >= ?';
      countParams.push(start_date);
    }

    if (end_date) {
      countQuery += ' AND DATE(transaction_date) <= ?';
      countParams.push(end_date);
    }

    const count = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await new Promise((resolve, reject) => {
      db.get(`
        SELECT t.*, i.name as item_name, i.item_code, p.name as project_name, u.username
        FROM transactions t
        LEFT JOIN inventory i ON t.inventory_id = i.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = ?
      `, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new transaction
router.post('/', authenticateToken, requireRole(['admin', 'manager', 'user']), [
  body('type').isIn(['in', 'out', 'transfer', 'adjustment']).withMessage('Valid transaction type required'),
  body('inventory_id').isInt().withMessage('Valid inventory ID required'),
  body('quantity').isInt().withMessage('Valid quantity required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type, inventory_id, quantity, unit_cost, reference_number,
      notes, project_id
    } = req.body;

    // Check if inventory item exists
    const inventory = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM inventory WHERE id = ?', [inventory_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // For 'out' transactions, check if sufficient stock is available
    if (type === 'out' && inventory.current_stock < quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available',
        available: inventory.current_stock,
        requested: quantity
      });
    }

    const total_cost = unit_cost ? unit_cost * quantity : null;

    // Create transaction
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO transactions (
          type, inventory_id, quantity, unit_cost, total_cost,
          reference_number, notes, project_id, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        type, inventory_id, quantity, unit_cost, total_cost,
        reference_number, notes, project_id, req.user.id
      ], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    // Update inventory stock
    let stockChange = 0;
    if (type === 'in' || type === 'adjustment') {
      stockChange = quantity;
    } else if (type === 'out') {
      stockChange = -quantity;
    }

    if (stockChange !== 0) {
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE inventory SET 
            current_stock = current_stock + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [stockChange, inventory_id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.status(201).json({ message: 'Transaction created successfully', id: result.id });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction summary
router.get('/summary/overview', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    let params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(transaction_date) BETWEEN ? AND ?';
      params = [start_date, end_date];
    }

    const summary = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_transactions,
          SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as total_in,
          SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as total_out,
          SUM(CASE WHEN type = 'in' THEN total_cost ELSE 0 END) as total_cost_in,
          SUM(CASE WHEN type = 'out' THEN total_cost ELSE 0 END) as total_cost_out
        FROM transactions
        ${dateFilter}
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(summary);
  } catch (error) {
    console.error('Get transaction summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const transactions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, i.name as item_name, i.item_code, p.name as project_name, u.username
        FROM transactions t
        LEFT JOIN inventory i ON t.inventory_id = i.id
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.type = ?
        ORDER BY t.transaction_date DESC
        LIMIT ? OFFSET ?
      `, [type, parseInt(limit), parseInt(offset)], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get transactions by type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
