const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
require('dotenv').config();

const { testConnection }               = require('./config/db');
const { notFound, globalErrorHandler } = require('./middleware/errorMiddleware');
const authRoutes                       = require('./routes/authRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global middleware ─────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

// ── Routes ────────────────────────────────────────────────────
// app.use('/api/auth', authRoutes);
// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders',   require('./routes/orderRoutes'));
app.use('/api/users',    require('./routes/userRoutes'));
app.use('/api/reports',  require('./routes/reportRoutes'));

// ── Error handlers ────────────────────────────────────────────
app.use(notFound);
app.use(globalErrorHandler);

// ── Start ─────────────────────────────────────────────────────
const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

start();