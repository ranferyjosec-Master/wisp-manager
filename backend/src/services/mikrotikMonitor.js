const cron = require('node-cron');
const { MikrotikDevice, Alert, TrafficSnapshot } = require('../models');
const mikrotikService = require('./mikrotik.service');
const logger = require('../utils/logger');

class MikrotikMonitor {
  start() {
    // Monitoreo cada 60 segundos
    cron.schedule('*/1 * * * *', async () => {
      await this.checkAllDevices();
    });

    // Revisar facturas vencidas cada día a las 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.checkOverdueInvoices();
    });

    // Limpiar tráfico antiguo (>7 días) cada domingo
    cron.schedule('0 2 * * 0', async () => {
      await this.cleanOldTraffic();
    });

    logger.info('📡 Cron jobs de monitoreo iniciados');
  }

  async checkAllDevices() {
    try {
      const devices = await MikrotikDevice.findAll({ where: { isActive: true } });

      for (const device of devices) {
        const prevStatus = device.status;
        const info = await mikrotikService.getDeviceInfo(device);
        const traffic = info.status === 'online' 
          ? await mikrotikService.getTraffic(device)
          : { downloadMbps: 0, uploadMbps: 0 };

        await device.update(info);

        // Guardar snapshot de tráfico
        if (info.status === 'online') {
          await TrafficSnapshot.create({
            deviceId: device.id,
            downloadMbps: traffic.downloadMbps,
            uploadMbps: traffic.uploadMbps
          });
        }

        // Alerta si dispositivo cayó
        if (prevStatus === 'online' && info.status === 'offline') {
          await this.createAlert({
            type: 'critico',
            category: 'dispositivo',
            title: `Dispositivo ${device.name} fuera de línea`,
            description: `El dispositivo MikroTik "${device.name}" (${device.host}) dejó de responder.`,
            deviceId: device.id
          });
          logger.warn(`🔴 Dispositivo offline: ${device.name}`);
        }

        // Alerta si dispositivo volvió
        if (prevStatus === 'offline' && info.status === 'online') {
          await this.createAlert({
            type: 'info',
            category: 'dispositivo',
            title: `Dispositivo ${device.name} en línea`,
            description: `El dispositivo "${device.name}" ha vuelto en línea.`,
            deviceId: device.id
          });
          logger.info(`🟢 Dispositivo online: ${device.name}`);
        }

        // Alerta por CPU alta
        if (info.status === 'online' && info.cpuLoad > 85) {
          const existingAlert = await Alert.findOne({
            where: {
              deviceId: device.id,
              category: 'dispositivo',
              title: { like: '%CPU alta%' },
              status: 'abierta'
            }
          });

          if (!existingAlert) {
            await this.createAlert({
              type: 'advertencia',
              category: 'dispositivo',
              title: `CPU alta en ${device.name}`,
              description: `Uso de CPU: ${info.cpuLoad}%`,
              deviceId: device.id
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error en monitoreo:', error);
    }
  }

  async checkOverdueInvoices() {
    try {
      const { Invoice, Client } = require('../models');
      const { Op } = require('sequelize');

      const overdueInvoices = await Invoice.findAll({
        where: {
          status: 'pendiente',
          dueDate: { [Op.lt]: new Date() }
        },
        include: [{ model: Client, as: 'client' }]
      });

      for (const invoice of overdueInvoices) {
        await invoice.update({ status: 'vencido' });
        await invoice.client.update({ status: 'moroso' });

        // Suspender en MikroTik después de N días vencido
        const daysPast = Math.floor((new Date() - new Date(invoice.dueDate)) / 86400000);
        if (daysPast >= 5) {
          await mikrotikService.disableUser(invoice.client.ipAddress);
          await invoice.client.update({ status: 'suspendido' });
        }
      }

      if (overdueInvoices.length > 0) {
        await this.createAlert({
          type: 'advertencia',
          category: 'facturacion',
          title: `${overdueInvoices.length} facturas vencidas`,
          description: `Se encontraron ${overdueInvoices.length} facturas vencidas que requieren atención.`
        });
      }
    } catch (error) {
      logger.error('Error verificando facturas vencidas:', error);
    }
  }

  async cleanOldTraffic() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const deleted = await TrafficSnapshot.destroy({
        where: { timestamp: { [require('sequelize').Op.lt]: sevenDaysAgo } }
      });
      logger.info(`🧹 Eliminados ${deleted} snapshots de tráfico antiguos`);
    } catch (error) {
      logger.error('Error limpiando tráfico:', error);
    }
  }

  async createAlert({ type, category, title, description, deviceId, clientId }) {
    try {
      await Alert.create({ type, category, title, description, deviceId, clientId });
    } catch (err) {
      logger.error('Error creando alerta:', err);
    }
  }
}

module.exports = new MikrotikMonitor();
