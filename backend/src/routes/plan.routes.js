// plan.routes.js
const express = require('express');
const { authenticate, can } = require('../middleware/auth.middleware');
const { Plan, Client } = require('../models');
const mikrotikService = require('../services/mikrotik.service');

const router = express.Router();
router.use(authenticate);

router.get('/', can('plans.read'), async (req, res) => {
  const plans = await Plan.findAll({
    include: [{ model: Client, as: 'clients', attributes: ['id', 'status'] }]
  });
  res.json(plans);
});

router.get('/:id', can('plans.read'), async (req, res) => {
  const plan = await Plan.findByPk(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
  res.json(plan);
});

router.post('/', can('plans.write'), async (req, res) => {
  try {
    const plan = await Plan.create(req.body);
    // Crear perfil en MikroTik
    await mikrotikService.createQoSProfile({
      name: plan.mikrotikProfile || plan.name.toLowerCase().replace(/\s+/g, '-'),
      downloadSpeed: plan.downloadSpeed,
      uploadSpeed: plan.uploadSpeed
    });
    res.status(201).json(plan);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', can('plans.write'), async (req, res) => {
  const plan = await Plan.findByPk(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
  await plan.update(req.body);
  res.json(plan);
});

module.exports = router;
