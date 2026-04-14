const bcrypt      = require('bcryptjs');
const jwt         = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool }    = require('../config/db');
const jwtConfig   = require('../config/jwt');
const { success, error } = require('../utils/apiResponse');
const auditLogger = require('../utils/auditLogger');

// ── helpers ──────────────────────────────────────────────────
const generateAccessToken = (userId, roleId, roleName) =>
  jwt.sign({ userId, roleId, roleName }, jwtConfig.access.secret, {
    expiresIn: jwtConfig.access.expires,
  });

const generateRefreshToken = () => uuidv4();

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required', 400);
    }

    const [rows] = await pool.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email,
              u.password_hash, u.is_active,
              r.id AS role_id, r.name AS role_name, r.label AS role_label
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) {
        console.log('no matching emailid');
      return error(res, 'Invalid email or password', 401);
    }

    const user = rows[0];

    if (!user.is_active) {
      return error(res, 'Account is deactivated. Contact admin.', 403);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        console.log('email password not match');
      return error(res, 'Invalid email or password', 401);
    }

    // Fetch permissions
    const [perms] = await pool.execute(
      `SELECT p.name FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [user.role_id]
    );

    const accessToken  = generateAccessToken(user.id, user.role_id, user.role_name);
    const refreshToken = generateRefreshToken();

    // Store refresh token (expires in 7 days)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.execute(
      `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [user.id, refreshToken, expiresAt]
    );

    await auditLogger.log({
      userId:    user.id,
      action:    'LOGIN',
      module:    'auth',
      description: `User ${user.email} logged in`,
      ipAddress: req.ip,
    });

    return success(res, {
      accessToken,
      refreshToken,
      user: {
        id:          user.id,
        firstName:   user.first_name,
        lastName:    user.last_name,
        email:       user.email,
        role:        user.role_name,
        roleLabel:   user.role_label,
        permissions: perms.map(p => p.name),
      },
    }, 'Login successful');

  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed', 500);
  }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return error(res, 'Refresh token required', 400);
    }

    const [rows] = await pool.execute(
      `SELECT rt.*, u.id AS user_id,
              r.id AS role_id, r.name AS role_name
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       JOIN roles r ON u.role_id  = r.id
       WHERE rt.token = ? AND rt.expires_at > NOW()`,
      [token]
    );

    if (!rows.length) {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    const record      = rows[0];
    const accessToken = generateAccessToken(record.user_id, record.role_id, record.role_name);

    return success(res, { accessToken }, 'Token refreshed');

  } catch (err) {
    console.error('Refresh token error:', err);
    return error(res, 'Token refresh failed', 500);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await pool.execute(
        `DELETE FROM refresh_tokens WHERE token = ?`,
        [token]
      );
    }

    await auditLogger.log({
      userId:    req.user?.id,
      action:    'LOGOUT',
      module:    'auth',
      description: `User ${req.user?.email} logged out`,
      ipAddress: req.ip,
    });

    return success(res, {}, 'Logged out successfully');

  } catch (err) {
    console.error('Logout error:', err);
    return error(res, 'Logout failed', 500);
  }
};

// ── ME (current user) ─────────────────────────────────────────
const getMe = async (req, res) => {
  return success(res, {
    id:          req.user.id,
    firstName:   req.user.first_name,
    lastName:    req.user.last_name,
    email:       req.user.email,
    role:        req.user.role_name,
    roleLabel:   req.user.role_label,
    permissions: req.user.permissions,
  }, 'User fetched');
};

module.exports = { login, refreshToken, logout, getMe };