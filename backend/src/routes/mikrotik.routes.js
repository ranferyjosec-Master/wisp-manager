// mikrotik.routes.js
const express = require('express');
const { authenticate, can } = require('../middleware/auth.middleware');
const { MikrotikDevice, TrafficSnapshot } = require('../models');
const mikrotikService = require('../services/mikrotik.service');

const router = express.Router();
router.use(authenticate);

router.get('/devices', can('mikrotik.read'), async (req, res) => {
  const devices = await MikrotikDevice.findAll({
    attributes: { exclude: ['password'] },
    order: [['name', 'ASC']]
  });
  res.json(devices);
});

router.post('/devices', can('mikrotik.write'), async (req, res) => {
  try {
    const device = await MikrotikDevice.create(req.body);
    res.status(201).json({ ...device.toJSON(), password: undefined });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/devices/:id/traffic', can('mikrotik.read'), async (req, res) => {
  const { hours = 2 } = req.query;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const snapshots = await TrafficSnapshot.findAll({
    where: { deviceId: req.params.id, timestamp: { [require('sequelize').Op.gte]: since } },
    order: [['timestamp', 'ASC']]
  });
  res.json(snapshots);
});

router.get('/devices/:id/users', can('mikrotik.read'), async (req, res) => {
  const device = await MikrotikDevice.findByPk(req.params.id);
  if (!device) return res.status(404).json({ error: 'Dispositivo no encontrado' });
  const users = await mikrotikService.getOnlineUsers(device);
  res.json(users);
});

router.post('/devices/:id/reboot', can('mikrotik.write'), async (req, res) => {
  const device = await MikrotikDevice.findByPk(req.params.id);
  if (!device) return res.status(404).json({ error: 'No encontrado' });
  // Solo usuarios superadmin pueden reiniciar
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Solo superadmin puede reiniciar dispositivos' });
  }
  try {
    const conn = await mikrotikService.connect(device);
    await conn.write('/system/reboot');
    res.json({ message: 'Reinicio iniciado' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
