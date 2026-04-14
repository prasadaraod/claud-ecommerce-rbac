const { error } = require('../utils/apiResponse');

// Check if user has one of the allowed roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Unauthorized', 401);
    }
    if (!roles.includes(req.user.role_name)) {
      return error(res, 'Access denied: insufficient role', 403);
    }
    next();
  };
};

// Check if user has a specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Unauthorized', 401);
    }
    if (!req.user.permissions.includes(permission)) {
      return error(res, `Access denied: missing permission '${permission}'`, 403);
    }
    next();
  };
};

module.exports = { requireRole, requirePermission };