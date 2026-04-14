const { pool } = require('../config/db');

const log = async ({ userId = null, action, module, description = '', ipAddress = '' }) => {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, module, description, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, action, module, description, ipAddress]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { log };