const { pool }           = require('../config/db');
const { success, error } = require('../utils/apiResponse');

// ── SALES SUMMARY ─────────────────────────────────────────────
const getSalesSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    let dateFilter = '';
    const params   = [];
    if (from && to) {
      dateFilter = `AND o.created_at BETWEEN ? AND ?`;
      params.push(from, to);
    }

    const [summary] = await pool.execute(
      `SELECT
         COUNT(*)                                          AS total_orders,
         SUM(CASE WHEN status='delivered'  THEN 1 ELSE 0 END) AS delivered,
         SUM(CASE WHEN status='pending'    THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status='cancelled'  THEN 1 ELSE 0 END) AS cancelled,
         SUM(CASE WHEN status='refunded'   THEN 1 ELSE 0 END) AS refunded,
         SUM(CASE WHEN status='delivered'  THEN total_amount ELSE 0 END) AS total_revenue,
         AVG(CASE WHEN status='delivered'  THEN total_amount END) AS avg_order_value
       FROM orders o WHERE 1=1 ${dateFilter}`,
      params
    );

    return success(res, summary[0], 'Sales summary fetched');
  } catch (err) {
    console.error('getSalesSummary error:', err);
    return error(res, 'Failed to fetch sales summary', 500);
  }
};

// ── REVENUE BY MONTH ──────────────────────────────────────────
const getRevenueByMonth = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS month,
         COUNT(*)                          AS total_orders,
         SUM(total_amount)                 AS revenue
       FROM orders
       WHERE status = 'delivered'
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`
    );
    return success(res, rows, 'Revenue by month fetched');
  } catch (err) {
    console.error('getRevenueByMonth error:', err);
    return error(res, 'Failed to fetch revenue by month', 500);
  }
};

// ── TOP PRODUCTS ──────────────────────────────────────────────
const getTopProducts = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const [rows] = await pool.execute(
      `SELECT
         p.id, p.name, p.sku, p.price,
         SUM(oi.quantity)  AS total_sold,
         SUM(oi.subtotal)  AS total_revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders   o ON oi.order_id   = o.id
       WHERE o.status = 'delivered'
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT ${parseInt(limit)}`
    );
    return success(res, rows, 'Top products fetched');
  } catch (err) {
    console.error('getTopProducts error:', err);
    return error(res, 'Failed to fetch top products', 500);
  }
};

// ── REVENUE BY CATEGORY ───────────────────────────────────────
const getRevenueByCategory = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         c.id, c.name AS category,
         COUNT(DISTINCT o.id) AS total_orders,
         SUM(oi.subtotal)     AS total_revenue
       FROM order_items oi
       JOIN products  p  ON oi.product_id = p.id
       JOIN categories c ON p.category_id  = c.id
       JOIN orders     o ON oi.order_id    = o.id
       WHERE o.status = 'delivered'
       GROUP BY c.id
       ORDER BY total_revenue DESC`
    );
    return success(res, rows, 'Revenue by category fetched');
  } catch (err) {
    console.error('getRevenueByCategory error:', err);
    return error(res, 'Failed to fetch revenue by category', 500);
  }
};

// ── AUDIT LOGS ────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, module = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (module) {
      query += ` AND al.module = ?`;
      params.push(module);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM audit_logs ${module ? 'WHERE module = ?' : ''}`,
      module ? [module] : []
    );
    const total = countRows[0].total;

    query += ` ORDER BY al.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [rows] = await pool.execute(query, params);

    return success(res, {
      logs: rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAuditLogs error:', err);
    return error(res, 'Failed to fetch audit logs', 500);
  }
};

module.exports = {
  getSalesSummary,
  getRevenueByMonth,
  getTopProducts,
  getRevenueByCategory,
  getAuditLogs,
};