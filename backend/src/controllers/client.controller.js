const { Client, Plan, Invoice } = require('../models');
const { Op } = require('sequelize');
const mikrotikService = require('../services/mikrotik.service');
const logger = require('../utils/logger');

// GET /api/clients
const getAll = async (req, res) => {
  try {
    const { search, status, planId, page = 1, limit = 20 } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status) where.status = status;
    if (planId) where.planId = planId;

    const { count, rows } = await Client.findAndCountAll({
      where,
      include: [{ model: Plan, as: 'plan', attributes: ['name', 'downloadSpeed', 'uploadSpeed', 'price'] }],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      total: count,
      pages: Math.ceil(count / limit),
      page: parseInt(page),
      clients: rows
    });
  } catch (error) {
    logger.error('Error obteniendo clientes:', error);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

// GET /api/clients/:id
const getOne = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [
        { model: Plan, as: 'plan' },
        { model: Invoice, as: 'invoices', limit: 12, order: [['createdAt', 'DESC']] }
      ]
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

// POST /api/clients
const create = async (req, res) => {
  try {
    const { name, lastName, email, phone, address, sector, ipAddress, macAddress, planId, installDate, notes } = req.body;

    const plan = await Plan.findByPk(planId);
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

    const client = await Client.create({
      name, lastName, email, phone, address, sector, ipAddress, macAddress, planId, installDate, notes
    });

    // Crear usuario en MikroTik automáticamente
    try {
      await mikrotikService.createHotspotUser({
        username: ipAddress,
        password: macAddress || ipAddress,
        profile: plan.mikrotikProfile,
        comment: `${name} ${lastName || ''}`
      });
    } catch (mikErr) {
      logger.warn('No se pudo crear usuario en MikroTik:', mikErr.message);
    }

    // Generar primera factura
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    await Invoice.create({
      invoiceNumber: `INV-${Date.now()}`,
      clientId: client.id,
      planId,
      amount: plan.price,
      dueDate,
      billingMonth: new Date().toISOString().slice(0, 7),
      status: 'pendiente'
    });

    res.status(201).json(client);
  } catch (error) {
    logger.error('Error creando cliente:', error);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

// PUT /api/clients/:id
const update = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    await client.update(req.body);
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

// POST /api/clients/:id/suspend
const suspend = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [{ model: Plan, as: 'plan' }]
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    await client.update({ status: 'suspendido' });

    // Suspender en MikroTik
    try {
      await mikrotikService.disableUser(client.ipAddress);
    } catch (mikErr) {
      logger.warn('No se pudo suspender en MikroTik:', mikErr.message);
    }

    res.json({ message: 'Cliente suspendido', client });
  } catch (error) {
    res.status(500).json({ error: 'Error al suspender cliente' });
  }
};

// POST /api/clients/:id/activate
const activate = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [{ model: Plan, as: 'plan' }]
    });
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    await client.update({ status: 'activo' });

    try {
      await mikrotikService.enableUser(client.ipAddress);
    } catch (mikErr) {
      logger.warn('No se pudo activar en MikroTik:', mikErr.message);
    }

    res.json({ message: 'Cliente activado', client });
  } catch (error) {
    res.status(500).json({ error: 'Error al activar cliente' });
  }
};

// DELETE /api/clients/:id
const remove = async (req, res) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });

    await client.update({ status: 'inactivo' });
    res.json({ message: 'Cliente desactivado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

module.exports = { getAll, getOne, create, update, suspend, activate, remove };
