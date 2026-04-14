const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/productController');
const { protect }            = require('../middleware/authMiddleware');
const { requirePermission }  = require('../middleware/roleMiddleware');

// All routes require login
router.use(protect);

// Categories
router.get('/categories', requirePermission('categories.view'), ctrl.getAllCategories);

// Products
router.get('/',    requirePermission('products.view'),   ctrl.getAllProducts);
router.get('/:id', requirePermission('products.view'),   ctrl.getProductById);
router.post('/',   requirePermission('products.create'), ctrl.createProduct);
router.put('/:id', requirePermission('products.edit'),   ctrl.updateProduct);
router.delete('/:id', requirePermission('products.delete'), ctrl.deleteProduct);

module.exports = router;