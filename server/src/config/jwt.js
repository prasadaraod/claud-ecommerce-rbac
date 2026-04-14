require('dotenv').config();

module.exports = {
  access: {
    secret:  process.env.JWT_ACCESS_SECRET,
    expires: process.env.JWT_ACCESS_EXPIRES || '15m',
  },
  refresh: {
    secret:  process.env.JWT_REFRESH_SECRET,
    expires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
};