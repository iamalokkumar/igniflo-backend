const express = require('express');
const router = express.Router();
const controller = require('../controllers/order.controller');

router.post('/', controller.create);
router.get('/', controller.getAll);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
