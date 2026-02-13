const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');

router.post('/', ctrl.createUser);
router.get('/:id', ctrl.getUser);
router.put('/reset-password', ctrl.resetPassword);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);
router.post('/login', ctrl.login);



module.exports = router;
