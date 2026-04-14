const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { protect }           = require('../middleware/authMiddleware');
const { requirePermission } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/roles',   requirePermission('users.view'),   ctrl.getAllRoles);
router.get('/',        requirePermission('users.view'),   ctrl.getAllUsers);
router.get('/:id',     requirePermission('users.view'),   ctrl.getUserById);
router.post('/',       requirePermission('users.create'), ctrl.createUser);
router.put('/:id',     requirePermission('users.edit'),   ctrl.updateUser);
router.delete('/:id',  requirePermission('users.delete'), ctrl.deleteUser);

module.exports = router;