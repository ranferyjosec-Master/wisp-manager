const RouterOSAPI = require('node-routeros').RouterOSAPI;
const { MikrotikDevice } = require('../models');
const logger = require('../utils/logger');

class MikrotikService {
  constructor() {
    this.connections = new Map();
  }

   async connect(device) {
    if (this.connections.has(device.id)) {
      return this.connections.get(device.id);
    }

    const conn = new RouterOSAPI({
      host: device.host,
      user: device.username,
      password: device.password,
      port: device.port || 8728,
      timeout: 60000
    });

   

    await conn.connect();
    this.connections.set(device.id, conn);
    return conn;
  }

  async disconnect(deviceId) {
    if (this.connections.has(deviceId)) {
      try {
        this.connections.get(deviceId).close();
      } catch (_) { }
      this.connections.delete(deviceId);
    }
  }
  async getDeviceInfo(device) {
    try {
      const conn = await this.connect(device);

      const [sysResource, identity] = await Promise.all([
        conn.write('/system/resource/print'),
        conn.write('/system/identity/print')
      ]);

      const res = sysResource[0];
      const cpuLoad = parseFloat(res['cpu-load']) || 0;
      const totalMem = parseFloat(res['total-memory']) || 1;
      const freeMem = parseFloat(res['free-memory']) || 0;
      const memUsed = Math.round(((totalMem - freeMem) / totalMem) * 100);

      return {
        status: 'online',
        cpuLoad,
        memoryUsed: memUsed,
        uptime: res['uptime'],
        model: res['board-name'],
        routerosVersion: res['version'],
        lastSeen: new Date()
      };
    } catch (error) {
      this.disconnect(device.id);
      return { status: 'offline', lastSeen: new Date() };
    }
  }

   async getTraffic(device, interfaceName = 'bridge-pppoe') {
    try {
      const conn = await this.connect(device);
      const stats = await conn.write('/interface/print', ['=.proplist=name,rx-bits-per-second,tx-bits-per-second']);
      const iface = stats.find(i => i.name === interfaceName) || stats[0];

      if (!iface) return { downloadMbps: 0, uploadMbps: 0 };

      return {
        downloadMbps: parseFloat((parseFloat(iface['rx-bits-per-second'] || 0) / 1000000).toFixed(2)),
        uploadMbps: parseFloat((parseFloat(iface['tx-bits-per-second'] || 0) / 1000000).toFixed(2))
      };
    } catch (error) {
      return { downloadMbps: 0, uploadMbps: 0 };
    }
  }
   async getActiveConnections(device) {
    try {
      const conn = await this.connect(device);
      const connections = await conn.write('/ip/firewall/connection/print', ['=count-only=']);
      return parseInt(connections[0]?.ret || 0);
    } catch (error) {
      return 0;
    }
  }

  // Crear usuario PPPoE
  async createPPPoEUser({ username, password, profile, service, remoteAddress, comment }) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ppp/secret/add', [
          `=name=${username}`,
          `=password=${password}`,
          `=service=pppoe`,
          `=profile=${profile}`,
          `=remote-address=${remoteAddress}`,
          `=comment=${comment || ''}`
        ]);
      } catch (err) {
        console.error('ERROR PPPoE COMPLETO:', err);

        logger.error(
          `Error creando usuario PPPoE en ${device.name}: ${err.message || JSON.stringify(err)
          }`
        );
      }
    }
  }
  // Deshabilitar usuario PPPoE
  async disableUser(username) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ppp/secret/set', [
          `=numbers=${username}`,
          '=disabled=yes'
        ]);
        // Remover sesiones activas PPPoE
        const sessions = await conn.write('/ppp/active/print', [`?name=${username}`]);
        for (const session of sessions) {
          await conn.write('/ppp/active/remove', [`=.id=${session['.id']}`]);
        }
      } catch (err) {
        logger.warn(`Error deshabilitando PPPoE ${username} en ${device.name}:`, err.message);
      }
    }
  }

  // Habilitar usuario PPPoE
  async enableUser(username) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ppp/secret/set', [
          `=numbers=${username}`,
          '=disabled=no'
        ]);
      } catch (err) {
        logger.warn(`Error habilitando PPPoE ${username} en ${device.name}:`, err.message);
      }
    }
  }

  // Crear perfil QoS (para PPPoE)
  async createQoSProfile({ name, downloadSpeed, uploadSpeed, host}) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        const rateLimit = `${downloadSpeed}M/${uploadSpeed}M`;
        await conn.write('/ppp/profile/add', [
          `=name=${name}`,
          `=rate-limit=${rateLimit}`,
          `=local-address=${device.host}`,
        ]);
      } catch (err) {
        logger.warn(`Error creando perfil PPPoE en ${device.name}:`, err.message);
      }

    }
  }


async getOnlineUsers(device) {
  try {
    const conn = await this.connect(device);
    const activeUsers = await conn.write('/ppp/active/print');
    const interfaces = await conn.write('/interface/print/stats');

    return activeUsers.map(user => {
      const iface = interfaces.find(
        i => i.name === `<pppoe-${user.name}>`
      );

      return {
        username: user.name,
        ipAddress: user.address,
        macAddress: user['caller-id'],
        uptime: user.uptime,
        service: user.service,
        rxBytes: iface ? iface['rx-byte'] : 0,
        txBytes: iface ? iface['tx-byte'] : 0
      };
    });

  } catch (error) {
    console.error(error);
    return [];
  }
}
}
module.exports = new MikrotikService();
