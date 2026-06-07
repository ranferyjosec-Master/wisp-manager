import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '../utils/animations';
// pages/AlertsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, CheckCircle, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { alertsAPI } from '../services/api';
import type { Alert, AlertType, AlertStatus } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_MAP: Record<AlertType, { icon: React.ElementType; cls: string; label: string }> = {
   critico: { icon: AlertTriangle, cls: 'text-red-500', label: 'Crítico' },
   advertencia: { icon: AlertTriangle, cls: 'text-amber-500', label: 'Advertencia' },
   info: { icon: Info, cls: 'text-blue-500', label: 'Info' }
};

const STATUS_MAP: Record<AlertStatus, { label: string; cls: string }> = {
   abierta: { label: 'Abierta', cls: 'bg-red-100 text-red-700' },
   en_proceso: { label: 'En proceso', cls: 'bg-amber-100 text-amber-700' },
   resuelta: { label: 'Resuelta', cls: 'bg-green-100 text-green-700' }
};

const CATEGORY_LABELS: Record<string, string> = {
   dispositivo: 'Dispositivo',
   cliente: 'Cliente',
   facturacion: 'Facturación',
   red: 'Red',
   sistema: 'Sistema'
};

export default function AlertsPage () {
   const qc = useQueryClient();
   const [statusFilter, setStatusFilter] = useState('abierta');
   const [typeFilter, setTypeFilter] = useState('');
   const [page, setPage] = useState(1);

   const { data, isLoading } = useQuery({
      queryKey: ['alerts', statusFilter, typeFilter, page],
      queryFn: () => alertsAPI.getAll({ status: statusFilter, type: typeFilter, page, limit: 30 }).then(r => r.data),
      refetchInterval: 30_000
   });

   const resolve = useMutation({
      mutationFn: (id: string) => alertsAPI.resolve(id),
      onSuccess: () => {
         toast.success('Alerta marcada como resuelta');
         qc.invalidateQueries({ queryKey: ['alerts'] });
         qc.invalidateQueries({ queryKey: ['open-alerts-count'] });
      },
      onError: () => toast.error('Error al resolver alerta')
   });

   const alerts: Alert[] = data?.alerts || [];
   const total = data?.total || 0;

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-base font-medium text-gray-900">Alertas del sistema</h2>
               <p className="text-xs text-gray-500 mt-0.5">{total} alertas · actualización cada 30s</p>
            </div>
            <button
               onClick={() => qc.invalidateQueries({ queryKey: ['alerts'] })}
               className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
               <RefreshCw size={12} /> Actualizar
            </button>
         </div>

         {/* Filtros */}
         <div className="flex gap-2 flex-wrap">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
               className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
               <option value="">Todos los estados</option>
               <option value="abierta">Abiertas</option>
               <option value="en_proceso">En proceso</option>
               <option value="resuelta">Resueltas</option>
            </select>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
               className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
               <option value="">Todos los tipos</option>
               <option value="critico">Críticas</option>
               <option value="advertencia">Advertencias</option>
               <option value="info">Informativas</option>
            </select>
         </div>

         {/* Lista de alertas */}
         <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="show">
            {isLoading ? (
               <div className="text-center py-10 text-sm text-gray-400">Cargando alertas...</div>
            ) : alerts.length === 0 ? (
               <div className="text-center py-12 bg-white border border-gray-100 rounded-xl">
                  <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No hay alertas {statusFilter === 'abierta' ? 'activas' : 'en este estado'}</p>
               </div>
            ) : alerts.map(alert => {
               const type = TYPE_MAP[alert.type];
               const st = STATUS_MAP[alert.status];
               const Icon = type.icon;
               return (
                  <div key={alert.id}
                     className={`bg-white border rounded-xl p-4 flex items-start gap-3 ${alert.type === 'critico' ? 'border-red-100' :
                        alert.type === 'advertencia' ? 'border-amber-100' : 'border-gray-100'
                        }`}>
                     <Icon size={16} className={`${type.cls} shrink-0 mt-0.5`} />
                     <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                           <div>
                              <span className="text-sm font-medium text-gray-900">{alert.title}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                                 <span className="text-xs text-gray-400">{CATEGORY_LABELS[alert.category] || alert.category}</span>
                                 {alert.device && (
                                    <span className="text-xs text-gray-400">· {alert.device.name}</span>
                                 )}
                                 {alert.client && (
                                    <span className="text-xs text-gray-400">· {alert.client.name}</span>
                                 )}
                              </div>
                           </div>
                           <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-400">
                                 {format(new Date(alert.createdAt), "dd/MM HH:mm", { locale: es })}
                              </span>
                              {alert.status !== 'resuelta' && (
                                 <button
                                    onClick={() => resolve.mutate(alert.id)}
                                    disabled={resolve.isPending}
                                    className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                                 >
                                    Resolver
                                 </button>
                              )}
                           </div>
                        </div>
                        {alert.description && (
                           <p className="text-xs text-gray-500 mt-1.5">{alert.description}</p>
                        )}
                        {alert.resolvedAt && (
                           <p className="text-xs text-green-600 mt-1">
                              ✓ Resuelta {format(new Date(alert.resolvedAt), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                           </p>
                        )}
                     </div>
                  </div>
               );
            })}
         </motion.div >
         {/* </div> */}

         {/* Paginación */}
         {
            (data?.total || 0) > 30 && (
               <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Página {page}</span>
                  <div className="flex gap-1">
                     <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Anterior</button>
                     <button onClick={() => setPage(p => p + 1)}
                        className="px-2.5 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-50">Siguiente</button>
                  </div>
               </div>
            )
         }
      </div >
   );
}
