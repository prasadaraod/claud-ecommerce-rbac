const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportController');
const { protect }           = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/summary',          requirePermission('reports.view'), ctrl.getSalesSummary);
router.get('/revenue-by-month', requirePermission('reports.view'), ctrl.getRevenueByMonth);
router.get('/top-products',     requirePermission('reports.view'), ctrl.getTopProducts);
router.get('/revenue-by-category', requirePermission('reports.view'), ctrl.getRevenueByCategory);
router.get('/audit-logs',       requirePermission('reports.view'), ctrl.getAuditLogs);

module.exports = router;