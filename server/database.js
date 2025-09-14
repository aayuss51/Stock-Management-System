const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Suppliers table
      db.run(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          contact_person TEXT,
          email TEXT,
          phone TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Inventory table
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          category_id INTEGER,
          supplier_id INTEGER,
          unit TEXT NOT NULL,
          current_stock INTEGER DEFAULT 0,
          min_stock_level INTEGER DEFAULT 0,
          max_stock_level INTEGER DEFAULT 0,
          unit_cost DECIMAL(10,2) DEFAULT 0,
          location TEXT,
          barcode TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories (id),
          FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
        )
      `);

      // Projects table
      db.run(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          start_date DATE,
          end_date DATE,
          status TEXT DEFAULT 'active',
          budget DECIMAL(12,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Project inventory allocations
      db.run(`
        CREATE TABLE IF NOT EXISTS project_allocations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          inventory_id INTEGER NOT NULL,
          allocated_quantity INTEGER NOT NULL,
          allocated_date DATE DEFAULT CURRENT_DATE,
          status TEXT DEFAULT 'allocated',
          FOREIGN KEY (project_id) REFERENCES projects (id),
          FOREIGN KEY (inventory_id) REFERENCES inventory (id)
        )
      `);

      // Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL CHECK (type IN ('in', 'out', 'transfer', 'adjustment')),
          inventory_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_cost DECIMAL(10,2),
          total_cost DECIMAL(10,2),
          reference_number TEXT,
          notes TEXT,
          project_id INTEGER,
          user_id INTEGER,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (inventory_id) REFERENCES inventory (id),
          FOREIGN KEY (project_id) REFERENCES projects (id),
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Insert default categories
      const defaultCategories = [
        'Building Materials',
        'Tools & Equipment',
        'Safety Equipment',
        'Electrical Supplies',
        'Plumbing Supplies',
        'Hardware & Fasteners',
        'Paints & Coatings',
        'Flooring Materials'
      ];

      const stmt = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
      defaultCategories.forEach(category => {
        stmt.run(category);
      });
      stmt.finalize();

      // Insert default admin user
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(
        'INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@construction.com', hashedPassword, 'admin']
      );

      resolve();
    });
  });
};

// Initialize database on startup
initializeDatabase().catch(console.error);

module.exports = db;
