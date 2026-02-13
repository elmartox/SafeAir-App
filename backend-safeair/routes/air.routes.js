const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/air.controller');

router.post('/', ctrl.createReading);
router.get('/', ctrl.getReadings);
router.get('/:id', ctrl.getReadingById);
router.put('/:id', ctrl.updateReading);
router.delete('/:id', ctrl.deleteReading);

module.exports = router;
