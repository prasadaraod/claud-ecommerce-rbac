const bcrypt             = require('bcryptjs');
const { pool }           = require('../config/db');
const { success, error } = require('../utils/apiResponse');
const auditLogger        = require('../utils/auditLogger');

// ── GET ALL USERS ─────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role_id = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
             u.created_at, r.id AS role_id, r.name AS role_name, r.label AS role_label
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (role_id) {
      query += ` AND u.role_id = ?`;
      params.push(role_id);
    }

    const countQuery = `SELECT COUNT(*) AS total FROM users u WHERE 1=1
      ${search  ? ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)' : ''}
      ${role_id ? ' AND u.role_id = ?'                                                 : ''}`;
    const countParams = [];
    if (search)  countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    if (role_id) countParams.push(role_id);

    const [countRows] = await pool.execute(countQuery, countParams);
    const total = countRows[0].total;

    query += ` ORDER BY u.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    const [rows] = await pool.execute(query, params);

    return success(res, {
      users: rows,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('getAllUsers error:', err);
    return error(res, 'Failed to fetch users', 500);
  }
};

// ── GET SINGLE USER ───────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
              u.created_at, r.id AS role_id, r.name AS role_name, r.label AS role_label
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return error(res, 'User not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    console.error('getUserById error:', err);
    return error(res, 'Failed to fetch user', 500);
  }
};

// ── CREATE USER ───────────────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password, role_id } = req.body;

    if (!first_name || !last_name || !email || !password || !role_id) {
      return error(res, 'All fields are required', 400);
    }

    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]
    );
    if (existing.length) return error(res, 'Email already exists', 409);

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id)
       VALUES (?, ?, ?, ?, ?)`,
      [first_name, last_name, email.toLowerCase().trim(), password_hash, role_id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'CREATE_USER',
      module:      'users',
      description: `Created user: ${email} with role_id: ${role_id}`,
      ipAddress:   req.ip,
    });

    return success(res, { id: result.insertId }, 'User created successfully', 201);
  } catch (err) {
    console.error('createUser error:', err);
    return error(res, 'Failed to create user', 500);
  }
};

// ── UPDATE USER ───────────────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const { id }  = req.params;
    const { first_name, last_name, role_id, is_active } = req.body;

    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'User not found', 404);

    await pool.execute(
      `UPDATE users
       SET first_name = COALESCE(?, first_name),
           last_name  = COALESCE(?, last_name),
           role_id    = COALESCE(?, role_id),
           is_active  = COALESCE(?, is_active)
       WHERE id = ?`,
      [first_name, last_name, role_id, is_active, id]
    );

    await auditLogger.log({
      userId:      req.user.id,
      action:      'UPDATE_USER',
      module:      'users',
      description: `Updated user ID: ${id}`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'User updated successfully');
  } catch (err) {
    console.error('updateUser error:', err);
    return error(res, 'Failed to update user', 500);
  }
};

// ── DELETE USER ───────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return error(res, 'You cannot delete your own account', 400);
    }

    const [existing] = await pool.execute(
      `SELECT id, email FROM users WHERE id = ?`, [id]
    );
    if (!existing.length) return error(res, 'User not found', 404);

    await pool.execute(`DELETE FROM users WHERE id = ?`, [id]);

    await auditLogger.log({
      userId:      req.user.id,
      action:      'DELETE_USER',
      module:      'users',
      description: `Deleted user: ${existing[0].email} (ID: ${id})`,
      ipAddress:   req.ip,
    });

    return success(res, {}, 'User deleted successfully');
  } catch (err) {
    console.error('deleteUser error:', err);
    return error(res, 'Failed to delete user', 500);
  }
};

// ── GET ALL ROLES ─────────────────────────────────────────────
const getAllRoles = async (req, res) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM roles ORDER BY id`);
    return success(res, rows);
  } catch (err) {
    console.error('getAllRoles error:', err);
    return error(res, 'Failed to fetch roles', 500);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAllRoles,
};