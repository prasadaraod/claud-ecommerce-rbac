const jwt             = require('jsonwebtoken');
const { pool }        = require('../config/db');
const jwtConfig       = require('../config/jwt');
const { error }       = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access token missing', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtConfig.access.secret);

    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
              r.id AS role_id, r.name AS role_name, r.label AS role_label
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (!rows.length) {
      return error(res, 'User not found', 401);
    }

    if (!rows[0].is_active) {
      return error(res, 'Account is deactivated', 403);
    }

    // Fetch permissions for this role
    const [perms] = await pool.execute(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [rows[0].role_id]
    );

    req.user = {
      ...rows[0],
      permissions: perms.map(p => p.name),
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Access token expired', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return error(res, 'Invalid access token', 401);
    }
    return error(res, 'Authentication failed', 500);
  }
};

module.exports = { protect };