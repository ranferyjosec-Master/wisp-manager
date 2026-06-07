// user.routes.js
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { User } = require('../models');
const bcrypt = require('bcryptjs');
const router = express.Router();
router.use(authenticate);

router.get('/', authorize('superadmin', 'admin'), async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['password'] }, order: [['name', 'ASC']] });
  res.json(users);
});

router.put('/:id', authorize('superadmin'), async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const { name, email, role, isActive } = req.body;
  await user.update({ name, email, role, isActive });
  res.json({ ...user.toJSON(), password: undefined });
});

router.delete('/:id', authorize('superadmin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  await user.update({ isActive: false });
  res.json({ message: 'Usuario desactivado' });
});

module.exports = router;
