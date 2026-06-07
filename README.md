# WISPManager — Sistema de Gestión WISP/MikroTik

Sistema completo para gestión de proveedores de internet inalámbrico (WISP) con integración nativa a MikroTik RouterOS.

---

## 🏗️ Stack tecnológico

| Capa         | Tecnología                                      |
|--------------|------------------------------------------------|
| Frontend     | React 18 + TypeScript + Vite + Tailwind CSS    |
| Backend      | Node.js + Express.js                           |
| Base de datos| PostgreSQL 16 + Sequelize ORM                  |
| Autenticación| JWT (jsonwebtoken) + bcryptjs                  |
| MikroTik API | node-routeros (RouterOS API)                   |
| Gráficas     | Recharts                                       |
| Estado       | Zustand + TanStack Query                       |
| Monitoreo    | node-cron (jobs automáticos)                   |
| Logging      | Winston                                        |
| Contenedores | Docker + Docker Compose                        |

---

## 📦 Módulos del sistema

### 1. Gestión de clientes
- Alta, edición, baja de clientes
- Asignación de IP y MAC address
- Suspensión/activación automática en MikroTik
- Historial de facturas por cliente
- Búsqueda y filtros avanzados

### 2. Facturación y pagos
- Generación automática de facturas mensuales
- Registro de pagos (efectivo, transferencia, tarjeta)
- Marcado automático de facturas vencidas
- Gráficas de tendencia de cobros (6 meses)
- Estadísticas: cobrado vs pendiente vs vencido

### 3. Planes de internet
- CRUD de planes con velocidades configurables
- Creación automática de perfiles QoS en MikroTik
- Soporte para burst de velocidad
- Vista de clientes activos por plan

### 4. Monitoreo MikroTik
- Conexión vía RouterOS API (puerto 8728)
- Estado en tiempo real: CPU, RAM, uptime
- Gráficas de tráfico (↓ descarga / ↑ subida)
- Múltiples dispositivos simultáneos
- Historial de snapshots de tráfico (7 días)

### 5. Sistema de alertas
- Detección automática de dispositivos offline
- Alertas por CPU alta (>85%)
- Alertas por facturas vencidas
- Historial completo con resolución
- Clasificación: crítico / advertencia / info

### 6. Seguridad (JWT + Roles)
- 4 roles: superadmin, admin, técnico, facturación
- Permisos granulares por endpoint y recurso
- Contraseñas cifradas con bcrypt (salt 12)
- Tokens JWT con expiración configurable (8h default)
- Rate limiting anti-brute-force (10 req/15min en login)
- Logs de auditoría con Winston

---

## 🚀 Instalación rápida

### Con Docker (recomendado)
```bash
git clone https://github.com/tu-usuario/wisp-manager.git
cd wisp-manager

# Copiar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores

# Levantar todo el stack
docker-compose up -d

# Crear usuario superadmin inicial
docker-compose exec backend node src/scripts/seed.js
```

Acceder en: http://localhost:3000

### Sin Docker

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tu DATABASE_URL, JWT_SECRET, etc.
npm run migrate
npm run seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## ⚙️ Variables de entorno (backend)

```env
# Base de datos
DATABASE_URL=postgresql://wisp_user:wisp_pass@localhost:5432/wisp_db

# JWT
JWT_SECRET=tu_clave_super_secreta_minimo_32_chars
JWT_EXPIRES_IN=8h

# Servidor
PORT=4000
NODE_ENV=development

# Frontend (para CORS)
FRONTEND_URL=http://localhost:3000
```

---

## 🔌 Integración MikroTik

El sistema se conecta a MikroTik vía **RouterOS API** (puerto 8728, no Winbox).

### Requisitos en el router:
```bash
# Habilitar API en MikroTik
/ip service enable api

# Crear usuario de API con permisos mínimos
/user add name=wisp-api password=tu_password group=read
# Para control completo (suspender/activar):
/user add name=wisp-api password=tu_password group=write
```

### Comandos RouterOS que ejecuta el sistema:
```bash
# Obtener información del sistema
/system/resource/print
/system/identity/print

# Gestión de usuarios Hotspot
/ip/hotspot/user/add
/ip/hotspot/user/set disabled=yes|no
/ip/hotspot/active/print

# Perfiles QoS
/ip/hotspot/user/profile/add name=plan-basico rate-limit=10M/5M

# Tráfico de interfaces
/interface/print =.proplist=name,rx-bits-per-second,tx-bits-per-second
```

---

## 📊 API REST — Endpoints principales

### Autenticación
```
POST   /api/auth/login              → Login, devuelve JWT
GET    /api/auth/me                 → Usuario actual
PUT    /api/auth/change-password    → Cambiar contraseña
POST   /api/auth/register           → Crear usuario (superadmin)
```

### Clientes
```
GET    /api/clients                 → Listar (paginado + filtros)
GET    /api/clients/:id             → Detalle + facturas
POST   /api/clients                 → Crear + usuario MikroTik
PUT    /api/clients/:id             → Actualizar
POST   /api/clients/:id/suspend     → Suspender (MikroTik)
POST   /api/clients/:id/activate    → Activar (MikroTik)
```

### Facturación
```
GET    /api/invoices                → Listar facturas
GET    /api/invoices/stats          → Estadísticas por mes
POST   /api/invoices/generate-monthly → Generar mes
POST   /api/invoices/:id/pay        → Registrar pago
```

### Planes
```
GET    /api/plans                   → Listar planes
POST   /api/plans                   → Crear + perfil MikroTik
PUT    /api/plans/:id               → Actualizar
```

### MikroTik
```
GET    /api/mikrotik/devices        → Dispositivos registrados
POST   /api/mikrotik/devices        → Agregar dispositivo
GET    /api/mikrotik/devices/:id/traffic → Tráfico histórico
GET    /api/mikrotik/devices/:id/users   → Usuarios activos
POST   /api/mikrotik/devices/:id/reboot → Reiniciar (superadmin)
```

### Alertas
```
GET    /api/alerts                  → Listar alertas
PUT    /api/alerts/:id/resolve      → Resolver alerta
```

### Dashboard
```
GET    /api/dashboard/summary       → Métricas principales
GET    /api/dashboard/clients-by-plan → Distribución por plan
```

---

## 🔄 Jobs automáticos (cron)

| Frecuencia | Tarea |
|------------|-------|
| Cada 60s   | Monitorear todos los dispositivos MikroTik |
| Cada 60s   | Guardar snapshot de tráfico |
| Cada 60s   | Detectar dispositivos offline → alerta crítica |
| Diario 9AM | Revisar y marcar facturas vencidas |
| Diario 9AM | Suspender clientes con >5 días de mora |
| Semanal    | Limpiar snapshots de tráfico >7 días |

---

## 🗄️ Modelos de base de datos

```
User          → usuarios del sistema (con roles)
Plan          → planes de internet
Client        → clientes del WISP
Invoice       → facturas y pagos
MikrotikDevice→ routers/AP registrados
Alert         → alertas del sistema
TrafficSnapshot → histórico de tráfico
```

---

## 📁 Estructura del proyecto

```
wisp-manager/
├── docker-compose.yml
├── backend/
│   ├── src/
│   │   ├── server.js          → Entry point
│   │   ├── app.js             → Express config + middlewares
│   │   ├── models/            → Sequelize models + relaciones
│   │   ├── controllers/       → Lógica de negocio
│   │   ├── routes/            → Endpoints REST
│   │   ├── middleware/        → JWT auth, roles, permisos
│   │   ├── services/
│   │   │   ├── mikrotik.service.js   → RouterOS API
│   │   │   └── mikrotikMonitor.js    → Cron jobs
│   │   └── utils/
│   │       └── logger.js      → Winston logger
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.tsx            → Router principal
    │   ├── main.tsx           → Entry point React
    │   ├── types/             → TypeScript interfaces
    │   ├── store/             → Zustand (auth state)
    │   ├── services/          → Axios API client
    │   ├── pages/             → DashboardPage, ClientsPage...
    │   └── components/        → Modales, layout, etc.
    ├── vite.config.ts
    └── package.json
```

---

## 🔒 Matriz de permisos por rol

| Módulo       | Superadmin | Admin | Técnico | Facturación |
|--------------|-----------|-------|---------|-------------|
| Clientes     | ✅ CRUD   | ✅ CRUD | 👁 Leer | 👁 Leer   |
| Facturación  | ✅ CRUD   | ✅ CRUD | ❌      | ✅ CRUD    |
| Planes       | ✅ CRUD   | ✅ CRUD | ❌      | ❌         |
| MikroTik     | ✅ Todo   | 👁 Leer | ✅ Todo | ❌         |
| Alertas      | ✅ Todo   | ✅ Todo | ✅ Todo | ❌         |
| Usuarios     | ✅ CRUD   | 👁 Leer | ❌      | ❌         |
| Dashboard    | ✅        | ✅      | ✅      | ✅         |

---

## 📝 Licencia
MIT — Uso libre para ISPs y WISPs.
