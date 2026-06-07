// invoice.routes.js
const express = require('express');
const { authenticate, can } = require('../middleware/auth.middleware');
const invoiceCtrl = require('../controllers/invoice.controller');

const router = express.Router();
router.use(authenticate);
router.get('/', can('invoices.read'), invoiceCtrl.getAll);
router.get('/stats', can('invoices.read'), invoiceCtrl.getStats);
router.post('/generate-monthly', can('invoices.write'), invoiceCtrl.generateMonthly);
router.post('/:id/pay', can('invoices.write'), invoiceCtrl.markAsPaid);
module.exports = router;
