// alert.routes.js
const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { Alert, MikrotikDevice, Client } = require('../models');
const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const where = {};
  if (status) where.status = status;
  if (type) where.type = type;
  const { count, rows } = await Alert.findAndCountAll({
    where, limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['createdAt', 'DESC']],
    include: [
      { model: MikrotikDevice, as: 'device', attributes: ['name', 'host'] },
      { model: Client, as: 'client', attributes: ['name', 'email'] }
    ]
  });
  res.json({ total: count, alerts: rows });
});

router.put('/:id/resolve', async (req, res) => {
  const alert = await Alert.findByPk(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });
  await alert.update({ status: 'resuelta', resolvedAt: new Date(), resolvedBy: req.user.id });
  res.json(alert);
});

module.exports = router;
