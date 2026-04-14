-- ============================================================
-- E-Commerce RBAC - Seed Data
-- ============================================================

USE ecommerce_rbac;

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (name, label) VALUES
  ('super_admin',     'Super Admin'),
  ('store_manager',   'Store Manager'),
  ('inventory_staff', 'Inventory Staff'),
  ('support_agent',   'Support Agent'),
  ('analyst',         'Analyst');

-- ============================================================
-- PERMISSIONS  (module + action)
-- ============================================================
INSERT INTO permissions (name, module, action) VALUES
  -- Products
  ('products.view',   'products', 'view'),
  ('products.create', 'products', 'create'),
  ('products.edit',   'products', 'edit'),
  ('products.delete', 'products', 'delete'),
  -- Categories
  ('categories.view',   'categories', 'view'),
  ('categories.create', 'categories', 'create'),
  ('categories.edit',   'categories', 'edit'),
  ('categories.delete', 'categories', 'delete'),
  -- Orders
  ('orders.view',   'orders', 'view'),
  ('orders.edit',   'orders', 'edit'),
  ('orders.refund', 'orders', 'refund'),
  -- Users
  ('users.view',   'users', 'view'),
  ('users.create', 'users', 'create'),
  ('users.edit',   'users', 'edit'),
  ('users.delete', 'users', 'delete'),
  -- Reports
  ('reports.view',   'reports', 'view'),
  ('reports.export', 'reports', 'export'),
  -- Settings
  ('settings.view', 'settings', 'view'),
  ('settings.edit', 'settings', 'edit');

-- ============================================================
-- ROLE → PERMISSIONS
-- ============================================================

-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin';

-- Store Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'products.view','products.create','products.edit',
  'categories.view','categories.create','categories.edit',
  'orders.view','orders.edit','orders.refund',
  'users.view',
  'reports.view','reports.export'
) WHERE r.name = 'store_manager';

-- Inventory Staff
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'products.view','products.create','products.edit',
  'categories.view',
  'orders.view'
) WHERE r.name = 'inventory_staff';

-- Support Agent
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'products.view',
  'orders.view','orders.edit','orders.refund',
  'users.view'
) WHERE r.name = 'support_agent';

-- Analyst
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r
JOIN permissions p ON p.name IN (
  'products.view',
  'orders.view',
  'reports.view','reports.export'
) WHERE r.name = 'analyst';

-- ============================================================
-- DEFAULT USERS  (password = "Password@123" bcrypt hashed)
-- ============================================================
INSERT INTO users (role_id, first_name, last_name, email, password_hash) VALUES
  (1, 'Super',     'Admin',   'superadmin@ecom.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  (2, 'Store',     'Manager', 'manager@ecom.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  (3, 'Inventory', 'Staff',   'inventory@ecom.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  (4, 'Support',   'Agent',   'support@ecom.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
  (5, 'Data',      'Analyst', 'analyst@ecom.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- ============================================================
-- SAMPLE CATEGORIES
-- ============================================================
INSERT INTO categories (name, description) VALUES
  ('Electronics',  'Phones, laptops, gadgets'),
  ('Clothing',     'Apparel and accessories'),
  ('Home & Kitchen','Furniture and appliances'),
  ('Books',        'Physical and digital books'),
  ('Sports',       'Fitness and outdoor gear');

-- ============================================================
-- SAMPLE PRODUCTS
-- ============================================================
INSERT INTO products (category_id, name, description, price, stock, sku, created_by) VALUES
  (1, 'Wireless Headphones', 'Noise cancelling over-ear headphones', 2999.00, 50,  'ELEC-001', 1),
  (1, 'Mechanical Keyboard', 'RGB backlit mechanical keyboard',       1499.00, 30,  'ELEC-002', 1),
  (2, 'Cotton T-Shirt',      'Premium cotton round neck t-shirt',      499.00, 200, 'CLTH-001', 1),
  (3, 'Coffee Maker',        '12-cup programmable coffee maker',       3499.00, 20,  'HOME-001', 1),
  (4, 'Clean Code',          'Book by Robert C. Martin',               799.00, 100, 'BOOK-001', 1);

-- ============================================================
-- SAMPLE ORDERS
-- ============================================================
INSERT INTO orders (customer_name, customer_email, status, total_amount, handled_by) VALUES
  ('Rahul Sharma',  'rahul@gmail.com',  'delivered',  2999.00, 4),
  ('Priya Patel',   'priya@gmail.com',  'processing', 1998.00, 4),
  ('Amit Kumar',    'amit@gmail.com',   'pending',    3499.00, NULL),
  ('Sneha Reddy',   'sneha@gmail.com',  'shipped',     799.00, 4),
  ('Vikram Singh',  'vikram@gmail.com', 'cancelled',  1499.00, 4);

-- ============================================================
-- SAMPLE ORDER ITEMS
-- ============================================================
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
  (1, 1, 1, 2999.00, 2999.00),
  (2, 3, 2,  499.00,  998.00),
  (2, 5, 1,  799.00,  799.00),
  (3, 4, 1, 3499.00, 3499.00),
  (4, 5, 1,  799.00,  799.00),
  (5, 2, 1, 1499.00, 1499.00);