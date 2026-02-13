const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/airControl.controller');

router.get('/', ctrl.getControl);
router.put('/', ctrl.updateControl);

module.exports = router;
