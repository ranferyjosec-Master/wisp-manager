const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuario desactivado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn(`Intento de login fallido para: ${email}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user);

    logger.info(`Login exitoso: ${user.email} (${user.role})`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// POST /api/auth/register (solo superadmin puede crear usuarios)
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'tecnico'
    });

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);
    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashed });

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, register, changePassword, me };
