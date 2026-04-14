const { pool }        = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const auditLogger     = require('../utils/auditLogger');

// ── GET ALL PRODUCTS ──────────────────────────────────────────
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category_id = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.id, p.name, p.description, p.price, p.stock, p.sku, p.is_active,
             c.id AS category_id, c.name AS category_name,
             u.first_name, u.last_name,
             p.created_at, p.updated_at
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN users u      ON p.created_by  = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) AS total FROM products p WHERE 1=1
      ${search      ? ' AND (p.name LIKE ? OR p.sku LIKE ?)' : ''}
      ${category_id ? ' AND p.category_id = ?'               : ''}`;
    const countParams = [];
    if (search)      countParams.push(`%${search}%`, `%${search}%`);
    if (category_id) countParams.push(category_id);

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    query += ` ORDER BY p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [rows] = await pool.execute(query, params);

    return success(res, {
      products: rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAllProducts error:', err);
    return error(res, 'Failed to fetch products', 500);
  }
};

// ── GET SINGLE PRODUCT ────────────────────────────────────────
const getProductById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'Product not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    console.error('getProductById error:', err);
    return error(res, 'Failed to fetch product', 500);
  }
};

// ── CREATE PRODUCT ────────────────────────────────────────────
const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, sku, category_id, is_active = 1 } = req.body;

    if (!name || !price || !sku || !category_id) {
      return error(res, 'Name, price, sku and category are required', 400);
    }

    // Check SKU uniqueness
    const [existing] = await pool.execute(
      `SELECT id FROM products WHERE sku = ?`, [sku]
    );
    if (existing.length) {
      return error(res, 'SKU already exists', 409);
    }

    const [result] = await pool.execute(
      `INSERT INTO products
         (name, description, price, stock, sku, category_id, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock || 0, sku, category_id, is_active, req.user.id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'CREATE_PRODUCT',
      module:      'products',
      description: `Created product: ${name} (SKU: ${sku})`,
      ipAddress:   req.ip,
    });

    return success(res, { id: result.insertId }, 'Product created successfully', 201);
  } catch (err) {
    console.error('createProduct error:', err);
    return error(res, 'Failed to create product', 500);
  }
};

// ── UPDATE PRODUCT ────────────────────────────────────────────
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category_id, is_active } = req.body;
    const { id } = req.params;

    const [existing] = await pool.execute(
      `SELECT id FROM products WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'Product not found', 404);

    await pool.execute(
      `UPDATE products
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           stock = COALESCE(?, stock),
           category_id = COALESCE(?, category_id),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, description, price, stock, category_id, is_active, id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'UPDATE_PRODUCT',
      module:      'products',
      description: `Updated product ID: ${id}`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'Product updated successfully');
  } catch (err) {
    console.error('updateProduct error:', err);
    return error(res, 'Failed to update product', 500);
  }
};

// ── DELETE PRODUCT ────────────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `SELECT id, name FROM products WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'Product not found', 404);

    await pool.execute(`DELETE FROM products WHERE id = ?`, [id]);

    await auditLogger.log({
      userId:      req.user.id,
      action:      'DELETE_PRODUCT',
      module:      'products',
      description: `Deleted product: ${existing[0].name} (ID: ${id})`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'Product deleted successfully');
  } catch (err) {
    console.error('deleteProduct error:', err);
    return error(res, 'Failed to delete product', 500);
  }
};

// ── GET ALL CATEGORIES ────────────────────────────────────────
const getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM categories WHERE is_active = 1 ORDER BY name`
    );
    return success(res, rows);
  } catch (err) {
    console.error('getAllCategories error:', err);
    return error(res, 'Failed to fetch categories', 500);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllCategories,
};