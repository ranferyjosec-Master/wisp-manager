// pages/DashboardPage.tsx
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, DollarSign, Clock, Wifi, AlertTriangle, TrendingUp } from 'lucide-react';
import { dashboardAPI, invoicesAPI } from '../services/api';
import { staggerContainer, staggerItem, metricPop } from '../utils/animations';
import type { DashboardSummary, MonthlyStats } from '../types';

const COLORS = ['#059669', '#34d399', '#6ee7b7', '#a7f3d0'];

function MetricCard({ icon: Icon, label, value, sub, subColor = 'text-gray-500', delay = 0 }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; subColor?: string; delay?: number;
}) {
  return (
    <motion.div
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
      variants={metricPop}
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.09)', transition: { duration: 0.2 } }}
    >
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
        <Icon size={13} className="text-emerald-500" /> {label}
      </div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      {sub && <div className={`text-xs mt-1 ${subColor}`}>{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => dashboardAPI.getSummary().then(r => r.data),
    refetchInterval: 60_000
  });

  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: () => invoicesAPI.getStats(6).then(r => r.data)
  });

  const { data: planDist } = useQuery({
    queryKey: ['plan-distribution'],
    queryFn: () => dashboardAPI.getClientsByPlan().then(r => r.data)
  });

  const monthlyData: MonthlyStats[] = invoiceStats?.monthlyStats || [];

  return (
    <div className="space-y-4">
      {/* Métricas */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <MetricCard icon={Users} label="Clientes activos"
          value={summary?.activeClients ?? '—'}
          sub={`${summary?.totalClients ?? 0} total`} />
        <MetricCard icon={DollarSign} label="Cobrado (mes)"
          value={summary ? `$${summary.monthRevenue.toLocaleString()}` : '—'}
          sub="Mayo 2026" subColor="text-emerald-700" delay={0.07} />
        <MetricCard icon={Clock} label="Pagos pendientes"
          value={summary?.pendingInvoices ?? '—'}
          sub={summary ? `$${summary.pendingAmount.toLocaleString()} vencido` : ''}
          subColor="text-amber-700" delay={0.14} />
        <MetricCard icon={Wifi} label="Nodos activos"
          value={summary ? `${summary.onlineDevices}/${summary.totalDevices}` : '—'}
          sub={summary && summary.onlineDevices < summary.totalDevices ? '⚠ nodo offline' : 'Todos en línea'}
          subColor={summary && summary.onlineDevices < summary.totalDevices ? 'text-red-600' : 'text-emerald-700'}
          delay={0.21} />
      </motion.div>

      {/* Gráficas */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={staggerItem}
          className="md:col-span-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
          whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: { duration: 0.2 } }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-500" /> Ingresos últimos 6 meses
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="billingMonth" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="collected" name="Cobrado" fill="#059669" radius={[3,3,0,0]} />
              <Bar dataKey="total" name="Total facturado" fill="#6ee7b7" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          variants={staggerItem}
          className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
          whileHover={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: { duration: 0.2 } }}
        >
          <h3 className="text-sm font-medium text-gray-900 mb-3">Clientes por plan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={planDist || []} dataKey="count" nameKey="name"
                cx="50%" cy="50%" outerRadius={70} innerRadius={45}
                label={({ name }) => name} labelLine={false}>
                {(planDist || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Alerta */}
      {summary && summary.openAlerts > 0 && (
        <motion.div
          className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div>
            <div className="text-sm font-medium text-red-800">
              {summary.openAlerts} alertas activas requieren atención
            </div>
            <a href="/alerts" className="text-xs text-red-600 hover:underline">
              Ver todas las alertas →
            </a>
          </div>
        </motion.div>
      )}
    </div>
  );
}
