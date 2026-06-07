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
      timeout: 10
    });

    await conn.connect();
    this.connections.set(device.id, conn);
    return conn;
  }

  async disconnect(deviceId) {
    if (this.connections.has(deviceId)) {
      try {
        this.connections.get(deviceId).close();
      } catch (_) {}
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

  async getTraffic(device, interfaceName = 'ether1') {
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

  async createHotspotUser({ username, password, profile, comment }) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ip/hotspot/user/add', [
          `=name=${username}`,
          `=password=${password}`,
          `=profile=${profile}`,
          `=comment=${comment || ''}`
        ]);
      } catch (err) {
        logger.warn(`Error creando usuario en ${device.name}:`, err.message);
      }
    }
  }

  async disableUser(username) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ip/hotspot/user/set', [
          `=numbers=${username}`,
          '=disabled=yes'
        ]);
        // También remover sesiones activas
        const sessions = await conn.write('/ip/hotspot/active/print', [`?user=${username}`]);
        for (const session of sessions) {
          await conn.write('/ip/hotspot/active/remove', [`=.id=${session['.id']}`]);
        }
      } catch (err) {
        logger.warn(`Error deshabilitando ${username} en ${device.name}:`, err.message);
      }
    }
  }

  async enableUser(username) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        await conn.write('/ip/hotspot/user/set', [
          `=numbers=${username}`,
          '=disabled=no'
        ]);
      } catch (err) {
        logger.warn(`Error habilitando ${username} en ${device.name}:`, err.message);
      }
    }
  }

  async createQoSProfile({ name, downloadSpeed, uploadSpeed, burstDownload, burstUpload }) {
    const devices = await MikrotikDevice.findAll({ where: { isActive: true, status: 'online' } });
    for (const device of devices) {
      try {
        const conn = await this.connect(device);
        const rateLimit = `${downloadSpeed}M/${uploadSpeed}M`;
        await conn.write('/ip/hotspot/user/profile/add', [
          `=name=${name}`,
          `=rate-limit=${rateLimit}`,
          `=shared-users=1`
        ]);
      } catch (err) {
        logger.warn(`Error creando perfil QoS en ${device.name}:`, err.message);
      }
    }
  }

  async getOnlineUsers(device) {
    try {
      const conn = await this.connect(device);
      const active = await conn.write('/ip/hotspot/active/print');
      return active.map(u => ({
        username: u.user,
        ipAddress: u.address,
        macAddress: u['mac-address'],
        uptime: u.uptime,
        bytesIn: u['bytes-in'],
        bytesOut: u['bytes-out']
      }));
    } catch (error) {
      return [];
    }
  }
}

module.exports = new MikrotikService();
