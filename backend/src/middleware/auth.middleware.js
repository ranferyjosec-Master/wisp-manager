const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verificar token JWT
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Control de roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para realizar esta acción'
      });
    }
    next();
  };
};

// Permisos granulares
const PERMISSIONS = {
  superadmin: ['*'],
  admin: ['clients.*', 'invoices.*', 'plans.*', 'mikrotik.read', 'alerts.*', 'users.read'],
  tecnico: ['clients.read', 'mikrotik.*', 'alerts.*'],
  facturacion: ['clients.read', 'invoices.*']
};

const can = (permission) => {
  return (req, res, next) => {
    const userPerms = PERMISSIONS[req.user.role] || [];
    const [resource, action] = permission.split('.');

    const hasPermission = userPerms.includes('*') ||
      userPerms.includes(permission) ||
      userPerms.includes(`${resource}.*`);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Permiso denegado' });
    }
    next();
  };
};

module.exports = { authenticate, authorize, can };
