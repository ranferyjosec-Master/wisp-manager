// dashboard.routes.js
const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { Client, Invoice, MikrotikDevice, Alert, Plan } = require('../models');
const { fn, col, literal, Op } = require('sequelize');
const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [
      activeClients,
      totalClients,
      monthRevenue,
      pendingInvoices,
      onlineDevices,
      totalDevices,
      openAlerts
    ] = await Promise.all([
      Client.count({ where: { status: 'activo' } }),
      Client.count(),
      Invoice.sum('amount', { where: { billingMonth: currentMonth, status: 'pagado' } }),
      Invoice.count({ where: { status: ['pendiente', 'vencido'] } }),
      MikrotikDevice.count({ where: { status: 'online', isActive: true } }),
      MikrotikDevice.count({ where: { isActive: true } }),
      Alert.count({ where: { status: 'abierta' } })
    ]);

    const pendingAmount = await Invoice.sum('amount', {
      where: { status: ['pendiente', 'vencido'] }
    });

    res.json({
      activeClients, totalClients,
      monthRevenue: monthRevenue || 0,
      pendingInvoices, pendingAmount: pendingAmount || 0,
      onlineDevices, totalDevices,
      openAlerts
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/clients-by-plan', async (req, res) => {
  const data = await Plan.findAll({
    attributes: ['name', [fn('COUNT', col('clients.id')), 'count']],
    include: [{ model: Client, as: 'clients', attributes: [], where: { status: 'activo' }, required: false }],
    group: ['Plan.id', 'Plan.name']
  });
  res.json(data);
});

module.exports = router;
