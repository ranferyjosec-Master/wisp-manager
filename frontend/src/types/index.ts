// types/index.ts

export type UserRole = 'superadmin' | 'admin' | 'tecnico' | 'facturacion';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type ClientStatus = 'activo' | 'suspendido' | 'moroso' | 'inactivo';

export interface Plan {
  id: string;
  name: string;
  downloadSpeed: number;
  uploadSpeed: number;
  price: number;
  burstDownload?: number;
  burstUpload?: number;
  mikrotikProfile?: string;
  isActive: boolean;
  description?: string;
  clients?: Client[];
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  sector?: string;
  ipAddress?: string;
  macAddress?: string;
  status: ClientStatus;
  installDate?: string;
  notes?: string;
  planId: string;
  plan?: Plan;
  invoices?: Invoice[];
  createdAt: string;
}

export type InvoiceStatus = 'pendiente' | 'pagado' | 'vencido' | 'cancelado';
export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  planId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  notes?: string;
  billingMonth: string;
  client?: Pick<Client, 'name' | 'lastName' | 'email'>;
  plan?: Pick<Plan, 'name' | 'price'>;
  createdAt: string;
}

export type DeviceStatus = 'online' | 'offline' | 'unknown';

export interface MikrotikDevice {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  model?: string;
  routerosVersion?: string;
  status: DeviceStatus;
  lastSeen?: string;
  cpuLoad?: number;
  memoryUsed?: number;
  uptime?: string;
  isActive: boolean;
}

export type AlertType = 'critico' | 'advertencia' | 'info';
export type AlertCategory = 'dispositivo' | 'cliente' | 'facturacion' | 'red' | 'sistema';
export type AlertStatus = 'abierta' | 'en_proceso' | 'resuelta';

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  description?: string;
  deviceId?: string;
  clientId?: string;
  status: AlertStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  device?: Pick<MikrotikDevice, 'name' | 'host'>;
  client?: Pick<Client, 'name' | 'email'>;
  createdAt: string;
}

export interface TrafficSnapshot {
  id: string;
  deviceId: string;
  downloadMbps: number;
  uploadMbps: number;
  activeConnections?: number;
  timestamp: string;
}

export interface DashboardSummary {
  activeClients: number;
  totalClients: number;
  monthRevenue: number;
  pendingInvoices: number;
  pendingAmount: number;
  onlineDevices: number;
  totalDevices: number;
  openAlerts: number;
}

export interface MonthlyStats {
  billingMonth: string;
  total: number;
  collected: number;
  count: number;
}

export interface PaginatedResponse<T> {
  total: number;
  pages: number;
  page: number;
  data: T[];
}
