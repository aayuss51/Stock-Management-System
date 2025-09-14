const express = require('express');
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get total inventory items
    const totalItems = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get low stock items
    const lowStockItems = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM inventory WHERE current_stock <= min_stock_level', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get total suppliers
    const totalSuppliers = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM suppliers', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get active projects
    const activeProjects = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM projects WHERE status = "active"', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // Get total inventory value
    const totalValue = await new Promise((resolve, reject) => {
      db.get('SELECT SUM(current_stock * unit_cost) as value FROM inventory', (err, row) => {
        if (err) reject(err);
        else resolve(row.value || 0);
      });
    });

    // Get recent transactions
    const recentTransactions = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, i.name as item_name, i.item_code
        FROM transactions t
        JOIN inventory i ON t.inventory_id = i.id
        ORDER BY t.transaction_date DESC
        LIMIT 10
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      overview: {
        totalItems,
        lowStockItems,
        totalSuppliers,
        activeProjects,
        totalValue
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get inventory value report
router.get('/inventory-value', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT 
        i.*, 
        c.name as category_name,
        s.name as supplier_name,
        (i.current_stock * i.unit_cost) as total_value
      FROM inventory i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN suppliers s ON i.supplier_id = s.id
      WHERE 1=1
    `;
    let params = [];

    if (category_id) {
      query += ' AND i.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY total_value DESC';

    const items = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);

    res.json({
      items,
      totalValue,
      itemCount: items.length
    });
  } catch (error) {
    console.error('Get inventory value error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get stock movement report
router.get('/stock-movement', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, inventory_id } = req.query;

    let query = `
      SELECT 
        t.*,
        i.name as item_name,
        i.item_code,
        p.name as project_name,
        u.username
      FROM transactions t
      JOIN inventory i ON t.inventory_id = i.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (start_date) {
      query += ' AND DATE(t.transaction_date) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(t.transaction_date) <= ?';
      params.push(end_date);
    }

    if (inventory_id) {
      query += ' AND t.inventory_id = ?';
      params.push(inventory_id);
    }

    query += ' ORDER BY t.transaction_date DESC';

    const transactions = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(transactions);
  } catch (error) {
    console.error('Get stock movement error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get category-wise inventory report
router.get('/category-wise', authenticateToken, async (req, res) => {
  try {
    const report = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          c.name as category_name,
          COUNT(i.id) as item_count,
          SUM(i.current_stock) as total_stock,
          SUM(i.current_stock * i.unit_cost) as total_value,
          AVG(i.unit_cost) as avg_unit_cost
        FROM categories c
        LEFT JOIN inventory i ON c.id = i.category_id
        GROUP BY c.id, c.name
        ORDER BY total_value DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(report);
  } catch (error) {
    console.error('Get category-wise report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get supplier performance report
router.get('/supplier-performance', authenticateToken, async (req, res) => {
  try {
    const report = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          s.name as supplier_name,
          s.contact_person,
          s.email,
          s.phone,
          COUNT(i.id) as item_count,
          SUM(i.current_stock * i.unit_cost) as total_value,
          AVG(i.unit_cost) as avg_unit_cost
        FROM suppliers s
        LEFT JOIN inventory i ON s.id = i.supplier_id
        GROUP BY s.id, s.name, s.contact_person, s.email, s.phone
        ORDER BY total_value DESC
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(report);
  } catch (error) {
    console.error('Get supplier performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get project inventory allocation report
router.get('/project-allocations', authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = `
      SELECT 
        p.name as project_name,
        p.status as project_status,
        pa.allocated_quantity,
        pa.allocated_date,
        pa.status as allocation_status,
        i.name as item_name,
        i.item_code,
        i.unit,
        i.unit_cost,
        (pa.allocated_quantity * i.unit_cost) as allocated_value
      FROM project_allocations pa
      JOIN projects p ON pa.project_id = p.id
      JOIN inventory i ON pa.inventory_id = i.id
      WHERE 1=1
    `;
    let params = [];

    if (project_id) {
      query += ' AND pa.project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY pa.allocated_date DESC';

    const allocations = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const totalAllocatedValue = allocations.reduce((sum, item) => sum + (item.allocated_value || 0), 0);

    res.json({
      allocations,
      totalAllocatedValue,
      allocationCount: allocations.length
    });
  } catch (error) {
    console.error('Get project allocations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get monthly transaction summary
router.get('/monthly-summary', authenticateToken, async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const summary = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          strftime('%m', transaction_date) as month,
          type,
          COUNT(*) as transaction_count,
          SUM(quantity) as total_quantity,
          SUM(total_cost) as total_cost
        FROM transactions
        WHERE strftime('%Y', transaction_date) = ?
        GROUP BY strftime('%m', transaction_date), type
        ORDER BY month, type
      `, [year.toString()], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(summary);
  } catch (error) {
    console.error('Get monthly summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
