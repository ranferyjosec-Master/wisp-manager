// client.routes.js
const express = require('express');
const { authenticate, can } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/client.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', can('clients.read'), ctrl.getAll);
router.get('/:id', can('clients.read'), ctrl.getOne);
router.post('/', can('clients.write'), ctrl.create);
router.put('/:id', can('clients.write'), ctrl.update);
router.post('/:id/suspend', can('clients.write'), ctrl.suspend);
router.post('/:id/activate', can('clients.write'), ctrl.activate);
router.delete('/:id', can('clients.delete'), ctrl.remove);

module.exports = router;
