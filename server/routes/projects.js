const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM projects WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const projects = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE 1=1';
    let countParams = [];

    if (search) {
      countQuery += ' AND (name LIKE ? OR description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const count = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        else resolve(row.total);
      });
    });

    res.json({
      projects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single project
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project allocations
router.get('/:id/allocations', authenticateToken, async (req, res) => {
  try {
    const allocations = await new Promise((resolve, reject) => {
      db.all(`
        SELECT pa.*, i.name as item_name, i.item_code, i.unit
        FROM project_allocations pa
        JOIN inventory i ON pa.inventory_id = i.id
        WHERE pa.project_id = ?
        ORDER BY pa.allocated_date DESC
      `, [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(allocations);
  } catch (error) {
    console.error('Get project allocations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project
router.post('/', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Project name required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, start_date, end_date, status = 'active', budget } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO projects (name, description, start_date, end_date, status, budget)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, description, start_date, end_date, status, budget], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    res.status(201).json({ message: 'Project created successfully', id: result.id });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticateToken, requireRole(['admin', 'manager']), [
  body('name').notEmpty().withMessage('Project name required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, start_date, end_date, status, budget } = req.body;

    const result = await new Promise((resolve, reject) => {
      db.run(`
        UPDATE projects SET
          name = ?, description = ?, start_date = ?, end_date = ?, status = ?, budget = ?
        WHERE id = ?
      `, [name, description, start_date, end_date, status, budget, req.params.id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Check if project has allocations
    const allocationCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM project_allocations WHERE project_id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (allocationCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete project with inventory allocations' 
      });
    }

    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Allocate inventory to project
router.post('/:id/allocate', authenticateToken, requireRole(['admin', 'manager']), [
  body('inventory_id').isInt().withMessage('Valid inventory ID required'),
  body('allocated_quantity').isInt({ min: 1 }).withMessage('Allocated quantity must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { inventory_id, allocated_quantity, notes } = req.body;
    const project_id = req.params.id;

    // Check if inventory item exists and has sufficient stock
    const inventory = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM inventory WHERE id = ?', [inventory_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    if (inventory.current_stock < allocated_quantity) {
      return res.status(400).json({ 
        message: 'Insufficient stock available',
        available: inventory.current_stock,
        requested: allocated_quantity
      });
    }

    // Create allocation
    const result = await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO project_allocations (project_id, inventory_id, allocated_quantity, notes)
        VALUES (?, ?, ?, ?)
      `, [project_id, inventory_id, allocated_quantity, notes], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      });
    });

    // Update inventory stock
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE inventory SET current_stock = current_stock - ?
        WHERE id = ?
      `, [allocated_quantity, inventory_id], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Record transaction
    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO transactions (type, inventory_id, quantity, project_id, user_id, notes)
        VALUES ('out', ?, ?, ?, ?, ?)
      `, [inventory_id, allocated_quantity, project_id, req.user.id, `Project allocation: ${notes || ''}`], function(err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({ message: 'Inventory allocated successfully', id: result.id });
  } catch (error) {
    console.error('Allocate inventory error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
