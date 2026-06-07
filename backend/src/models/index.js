//console.log('DATABASE_URL:', process.env.DATABASE_URL);

const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

// === MODELO: Usuario del sistema ===
const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: {
    type: DataTypes.ENUM('superadmin', 'admin', 'tecnico', 'facturacion'),
    defaultValue: 'tecnico'
  },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  lastLogin: { type: DataTypes.DATE }
});

// === MODELO: Plan de internet ===
const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  downloadSpeed: { type: DataTypes.INTEGER, allowNull: false, comment: 'Mbps' },
  uploadSpeed: { type: DataTypes.INTEGER, allowNull: false, comment: 'Mbps' },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  burstDownload: { type: DataTypes.INTEGER, comment: 'Mbps burst' },
  burstUpload: { type: DataTypes.INTEGER },
  mikrotikProfile: { type: DataTypes.STRING(100), comment: 'Nombre del perfil en MikroTik' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT }
});

// === MODELO: Cliente ===
const Client = sequelize.define('Client', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  lastName: { type: DataTypes.STRING(150) },
  email: { type: DataTypes.STRING(150), unique: true },
  phone: { type: DataTypes.STRING(20) },
  address: { type: DataTypes.TEXT },
  sector: { type: DataTypes.STRING(100) },
  ipAddress: { type: DataTypes.STRING(45), unique: true },
  macAddress: { type: DataTypes.STRING(17) },
  status: {
    type: DataTypes.ENUM('activo', 'suspendido', 'moroso', 'inactivo'),
    defaultValue: 'activo'
  },
  installDate: { type: DataTypes.DATEONLY },
  notes: { type: DataTypes.TEXT },
  planId: { type: DataTypes.UUID, allowNull: false }
});

// === MODELO: Factura ===
const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceNumber: { type: DataTypes.STRING(20), unique: true },
  clientId: { type: DataTypes.UUID, allowNull: false },
  planId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
  paidDate: { type: DataTypes.DATEONLY },
  status: {
    type: DataTypes.ENUM('pendiente', 'pagado', 'vencido', 'cancelado'),
    defaultValue: 'pendiente'
  },
  paymentMethod: { type: DataTypes.ENUM('efectivo', 'transferencia', 'tarjeta', 'otro') },
  notes: { type: DataTypes.TEXT },
  billingMonth: { type: DataTypes.STRING(7), comment: 'YYYY-MM' }
});

// === MODELO: Dispositivo MikroTik ===
const MikrotikDevice = sequelize.define('MikrotikDevice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  host: { type: DataTypes.STRING(100), allowNull: false },
  port: { type: DataTypes.INTEGER, defaultValue: 8728 },
  username: { type: DataTypes.STRING(100), allowNull: false },
  password: { type: DataTypes.STRING(255), allowNull: false },
  model: { type: DataTypes.STRING(100) },
  routerosVersion: { type: DataTypes.STRING(50) },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'unknown'),
    defaultValue: 'unknown'
  },
  lastSeen: { type: DataTypes.DATE },
  cpuLoad: { type: DataTypes.FLOAT },
  memoryUsed: { type: DataTypes.FLOAT },
  uptime: { type: DataTypes.STRING(50) },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// === MODELO: Alerta ===
const Alert = sequelize.define('Alert', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: {
    type: DataTypes.ENUM('critico', 'advertencia', 'info'),
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('dispositivo', 'cliente', 'facturacion', 'red', 'sistema'),
    allowNull: false
  },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  deviceId: { type: DataTypes.UUID, references: { model: 'MikrotikDevices', key: 'id' } },
  clientId: { type: DataTypes.UUID, references: { model: 'Clients', key: 'id' } },
  status: {
    type: DataTypes.ENUM('abierta', 'en_proceso', 'resuelta'),
    defaultValue: 'abierta'
  },
  resolvedAt: { type: DataTypes.DATE },
  resolvedBy: { type: DataTypes.UUID }
});

// === MODELO: Snapshot de tráfico ===
const TrafficSnapshot = sequelize.define('TrafficSnapshot', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  deviceId: { type: DataTypes.UUID, allowNull: false },
  downloadMbps: { type: DataTypes.FLOAT },
  uploadMbps: { type: DataTypes.FLOAT },
  activeConnections: { type: DataTypes.INTEGER },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// === RELACIONES ===
Client.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Plan.hasMany(Client, { foreignKey: 'planId', as: 'clients' });

Invoice.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Invoice.belongsTo(Plan, { foreignKey: 'planId', as: 'plan' });
Client.hasMany(Invoice, { foreignKey: 'clientId', as: 'invoices' });

Alert.belongsTo(MikrotikDevice, { foreignKey: 'deviceId', as: 'device' });
Alert.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });

TrafficSnapshot.belongsTo(MikrotikDevice, { foreignKey: 'deviceId', as: 'device' });
MikrotikDevice.hasMany(TrafficSnapshot, { foreignKey: 'deviceId', as: 'snapshots' });

module.exports = {
  sequelize,
  User,
  Plan,
  Client,
  Invoice,
  MikrotikDevice,
  Alert,
  TrafficSnapshot
};
