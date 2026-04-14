const { pool }           = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const auditLogger        = require('../utils/auditLogger');

// ── GET ALL ORDERS ────────────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.id, o.customer_name, o.customer_email, o.status,
             o.total_amount, o.notes, o.created_at, o.updated_at,
             u.first_name AS handled_by_first, u.last_name AS handled_by_last
      FROM orders o
      LEFT JOIN users u ON o.handled_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (o.customer_name LIKE ? OR o.customer_email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM orders o WHERE 1=1
      ${status ? ' AND o.status = ?'                                          : ''}
      ${search ? ' AND (o.customer_name LIKE ? OR o.customer_email LIKE ?)' : ''}`;
    const countParams = [];
    if (status) countParams.push(status);
    if (search) countParams.push(`%${search}%`, `%${search}%`);

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    query += ` ORDER BY o.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [rows] = await pool.execute(query, params);

    return success(res, {
      orders: rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return error(res, 'Failed to fetch orders', 500);
  }
};

// ── GET SINGLE ORDER ──────────────────────────────────────────
const getOrderById = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.first_name AS handled_by_first, u.last_name AS handled_by_last
       FROM orders o
       LEFT JOIN users u ON o.handled_by = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );
    if (!orders.length) return error(res, 'Order not found', 404);

    const [items] = await pool.execute(
      `SELECT oi.*, p.name AS product_name, p.sku
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    return success(res, { ...orders[0], items });
  } catch (err) {
    console.error('getOrderById error:', err);
    return error(res, 'Failed to fetch order', 500);
  }
};

// ── UPDATE ORDER STATUS ───────────────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending','processing','shipped','delivered','cancelled','refunded'];
    if (!status || !validStatuses.includes(status)) {
      return error(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const [existing] = await pool.execute(
      `SELECT id, status FROM orders WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'Order not found', 404);

    await pool.execute(
      `UPDATE orders
       SET status = ?, notes = COALESCE(?, notes), handled_by = ?
       WHERE id = ?`,
      [status, notes, req.user.id, id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'UPDATE_ORDER_STATUS',
      module:      'orders',
      description: `Order #${id} status changed from ${existing[0].status} to ${status}`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'Order status updated successfully');
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return error(res, 'Failed to update order status', 500);
  }
};

// ── REFUND ORDER ──────────────────────────────────────────────
const refundOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute(
      `SELECT id, status FROM orders WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'Order not found', 404);

    if (!['delivered', 'processing'].includes(existing[0].status)) {
      return error(res, 'Only delivered or processing orders can be refunded', 400);
    }

    await pool.execute(
      `UPDATE orders SET status = 'refunded', handled_by = ? WHERE id = ?`,
      [req.user.id, id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'REFUND_ORDER',
      module:      'orders',
      description: `Order #${id} marked as refunded`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'Order refunded successfully');
  } catch (err) {
    console.error('refundOrder error:', err);
    return error(res, 'Failed to refund order', 500);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  refundOrder,
};