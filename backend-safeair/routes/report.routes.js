const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/report.controller');

router.post('/', ctrl.createReport);
router.get('/', ctrl.getReports);
router.put('/:id', ctrl.updateReport);
router.delete('/:id', ctrl.deleteReport);

module.exports = router;
