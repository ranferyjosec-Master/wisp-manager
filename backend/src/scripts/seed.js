/**
 * Seed script — ejecutar una sola vez para inicializar la BD
 * Uso: node src/scripts/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function seed() {
  const { sequelize, User, Plan, Client, MikrotikDevice, Invoice } = require('../models');

  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: false })
    console.log('✅ Base de datos conectada');

    // ── Superadmin ──────────────────────────────────────────
    const [admin] = await User.findOrCreate({
      where: { email: 'admin@wisp.mx' },
      defaults: {
        name: 'Admin Principal',
        email: 'admin@wisp.mx',
        password: await bcrypt.hash('Admin1234!', 12),
        role: 'superadmin',
        isActive: true
      }
    });
    console.log(`👤 Superadmin: admin@wisp.mx / Admin1234!`);

    // Usuario técnico de ejemplo
    await User.findOrCreate({
      where: { email: 'tecnico@wisp.mx' },
      defaults: {
        name: 'Técnico Campo',
        email: 'tecnico@wisp.mx',
        password: await bcrypt.hash('Tecnico1234!', 12),
        role: 'tecnico',
        isActive: true
      }
    });

    // ── Planes ──────────────────────────────────────────────
    const [planBasico] = await Plan.findOrCreate({
      where: { name: 'Básico' },
      defaults: {
        name: 'Básico',
        downloadSpeed: 10, uploadSpeed: 5,
        price: 180.00,
        burstDownload: 15, burstUpload: 8,
        mikrotikProfile: 'plan-basico',
        description: 'Ideal para uso básico en el hogar',
        isActive: true
      }
    });

    const [planEstandar] = await Plan.findOrCreate({
      where: { name: 'Estándar' },
      defaults: {
        name: 'Estándar',
        downloadSpeed: 20, uploadSpeed: 10,
        price: 280.00,
        burstDownload: 30, burstUpload: 15,
        mikrotikProfile: 'plan-estandar',
        description: 'El plan más popular para familias',
        isActive: true
      }
    });

    const [planPro] = await Plan.findOrCreate({
      where: { name: 'Pro' },
      defaults: {
        name: 'Pro',
        downloadSpeed: 50, uploadSpeed: 25,
        price: 450.00,
        burstDownload: 80, burstUpload: 40,
        mikrotikProfile: 'plan-pro',
        description: 'Alta velocidad con IP fija y SLA 99.9%',
        isActive: true
      }
    });

    console.log('📦 Planes creados: Básico, Estándar, Pro');

    // ── Dispositivo MikroTik de ejemplo ─────────────────────
    await MikrotikDevice.findOrCreate({
      where: { host: '192.168.1.1' },
      defaults: {
        name: 'MK-Principal',
        host: '192.168.1.1',
        port: 8728,
        username: 'admin',
        password: '',  // Cambiar por la contraseña real
        model: 'CCR1036',
        status: 'unknown',
        isActive: true
      }
    });
    console.log('📡 Dispositivo MikroTik de ejemplo creado (192.168.1.1)');

    // ── Clientes de ejemplo ──────────────────────────────────
    const clientsData = [
      { name: 'Luis', lastName: 'Martínez', email: 'luis.m@ejemplo.com', phone: '5551234567', sector: 'Norte', ipAddress: '192.168.10.45', planId: planPro.id, status: 'activo' },
      { name: 'Ana', lastName: 'García', email: 'ana.g@ejemplo.com', phone: '5557654321', sector: 'Sur', ipAddress: '192.168.10.62', planId: planEstandar.id, status: 'activo' },
      { name: 'Carlos', lastName: 'Pérez', email: 'carlos.p@ejemplo.com', phone: '5551111222', sector: 'Este', ipAddress: '192.168.10.71', planId: planBasico.id, status: 'moroso' },
      { name: 'María', lastName: 'López', email: 'maria.l@ejemplo.com', phone: '5553333444', sector: 'Norte', ipAddress: '192.168.10.88', planId: planPro.id, status: 'suspendido' },
      { name: 'Pedro', lastName: 'Torres', email: 'pedro.t@ejemplo.com', phone: '5555555666', sector: 'Oeste', ipAddress: '192.168.10.93', planId: planEstandar.id, status: 'activo' }
    ];

    const currentMonth = new Date().toISOString().slice(0, 7);
    const dueDate = new Date();
    dueDate.setDate(5);

    for (const cd of clientsData) {
      const [client, created] = await Client.findOrCreate({
        where: { ipAddress: cd.ipAddress },
        defaults: { ...cd, installDate: new Date('2024-01-15') }
      });

      if (created) {
        const plan = [planBasico, planEstandar, planPro].find(p => p.id === cd.planId);
        await Invoice.create({
          invoiceNumber: `INV-${currentMonth}-${client.id.slice(0, 8)}`,
          clientId: client.id,
          planId: cd.planId,
          amount: plan.price,
          dueDate,
          billingMonth: currentMonth,
          status: cd.status === 'activo' ? 'pagado' : cd.status === 'moroso' ? 'vencido' : 'pendiente',
          paidDate: cd.status === 'activo' ? new Date() : null,
          paymentMethod: cd.status === 'activo' ? 'efectivo' : null
        });
      }
    }
    console.log('👥 5 clientes de ejemplo creados con facturas');

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 Frontend: http://localhost:3000');
    console.log('🔑 Email:    admin@wisp.mx');
    console.log('🔑 Password: Admin1234!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err);
    process.exit(1);
  }
}

seed();
