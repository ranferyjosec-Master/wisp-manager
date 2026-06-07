require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const mikrotikMonitor = require('./services/mikrotikMonitor');

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a PostgreSQL establecida');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('✅ Modelos sincronizados con la base de datos');

    // Iniciar monitoreo MikroTik cada 60 segundos
    mikrotikMonitor.start();
    logger.info('✅ Monitor MikroTik iniciado');

    app.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
