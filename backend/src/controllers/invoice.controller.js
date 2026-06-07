const { Invoice, Client, Plan } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');

// GET /api/invoices
const getAll = async (req, res) => {
  try {
    const { status, clientId, month, page = 1, limit = 30 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (month) where.billingMonth = month;

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [
        { model: Client, as: 'client', attributes: ['name', 'lastName', 'email'] },
        { model: Plan, as: 'plan', attributes: ['name', 'price'] }
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({ total: count, pages: Math.ceil(count / limit), page: parseInt(page), invoices: rows });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
};

// POST /api/invoices/:id/pay
const markAsPaid = async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [{ model: Client, as: 'client' }]
    });

    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    if (invoice.status === 'pagado') return res.status(400).json({ error: 'Factura ya pagada' });

    await invoice.update({
      status: 'pagado',
      paidDate: new Date(),
      paymentMethod,
      notes
    });

    // Reactivar cliente si estaba suspendido
    if (invoice.client.status === 'suspendido' || invoice.client.status === 'moroso') {
      await invoice.client.update({ status: 'activo' });
    }

    res.json({ message: 'Pago registrado', invoice });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar pago' });
  }
};

// GET /api/invoices/stats - Estadísticas para gráficas
const getStats = async (req, res) => {
  try {
    const { months = 6 } = req.query;

    // Ingresos por mes
    const monthlyStats = await Invoice.findAll({
      attributes: [
        'billingMonth',
        [fn('SUM', col('amount')), 'total'],
        [fn('SUM', literal("CASE WHEN status='pagado' THEN amount ELSE 0 END")), 'collected'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        createdAt: { [Op.gte]: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000) }
      },
      group: ['billingMonth'],
      order: [['billingMonth', 'ASC']]
    });

    // Resumen del mes actual
    const currentMonth = new Date().toISOString().slice(0, 7);
    const summary = await Invoice.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('amount')), 'total']
      ],
      where: { billingMonth: currentMonth },
      group: ['status']
    });

    res.json({ monthlyStats, summary, currentMonth });
  } catch (error) {
    logger.error('Error en stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

// POST /api/invoices/generate-monthly - Generar facturas del mes
const generateMonthly = async (req, res) => {
  try {
    const { month } = req.body; // YYYY-MM
    const billingMonth = month || new Date().toISOString().slice(0, 7);

    const clients = await Client.findAll({
      where: { status: ['activo', 'moroso'] },
      include: [{ model: Plan, as: 'plan' }]
    });

    const created = [];
    const skipped = [];

    for (const client of clients) {
      const existing = await Invoice.findOne({
        where: { clientId: client.id, billingMonth }
      });

      if (existing) {
        skipped.push(client.id);
        continue;
      }

      const dueDate = new Date(`${billingMonth}-05`);
      const invoice = await Invoice.create({
        invoiceNumber: `INV-${billingMonth}-${client.id.slice(0, 8)}`,
        clientId: client.id,
        planId: client.planId,
        amount: client.plan.price,
        dueDate,
        billingMonth,
        status: 'pendiente'
      });
      created.push(invoice.id);
    }

    res.json({
      message: `Facturación generada: ${created.length} nuevas, ${skipped.length} omitidas`,
      created: created.length,
      skipped: skipped.length
    });
  } catch (error) {
    logger.error('Error generando facturas:', error);
    res.status(500).json({ error: 'Error al generar facturas' });
  }
};

module.exports = { getAll, markAsPaid, getStats, generateMonthly };
