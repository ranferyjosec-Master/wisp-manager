const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const planRoutes = require('./routes/plan.routes');
const mikrotikRoutes = require('./routes/mikrotik.routes');
const alertRoutes = require('./routes/alert.routes');
const userRoutes = require('./routes/user.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' }
});
app.use('/api/', limiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login' }
});

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, user: req.user?.id });
  next();
});

// Rutas
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/mikrotik', mikrotikRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Manejo global de errores
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message
  });
});

module.exports = app;
