const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orderController');
const { protect }           = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/',         requirePermission('orders.view'),   ctrl.getAllOrders);
router.get('/:id',      requirePermission('orders.view'),   ctrl.getOrderById);
router.put('/:id',      requirePermission('orders.edit'),   ctrl.updateOrderStatus);
router.post('/:id/refund', requirePermission('orders.refund'), ctrl.refundOrder);

module.exports = router;