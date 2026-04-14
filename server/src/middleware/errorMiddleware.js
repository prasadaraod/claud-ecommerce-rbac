const { error } = require('../utils/apiResponse');

const notFound = (req, res, next) => {
  error(res, `Route not found: ${req.originalUrl}`, 404);
};

const globalErrorHandler = (err, req, res, next) => {
  console.error('Global error:', err);
  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal server error';
  error(res, message, statusCode);
};

module.exports = { notFound, globalErrorHandler };