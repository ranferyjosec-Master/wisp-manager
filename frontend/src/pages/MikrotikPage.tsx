import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../utils/animations';
// pages/MikrotikPage.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Server, Wifi, WifiOff, Cpu, MemoryStick, Clock, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { mikrotikAPI } from '../services/api';
import type { MikrotikDevice } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function StatusBadge ({ status }: { status: MikrotikDevice['status'] }) {
   const map = {
      online: 'bg-green-100 text-green-700',
      offline: 'bg-red-100 text-red-700',
      unknown: 'bg-gray-100 text-gray-600'
   };
   const label = { online: 'En línea', offline: 'Sin conexión', unknown: 'Desconocido' };
   return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>
         {status === 'online' ? <Wifi size={10} className="inline mr-1" /> : <WifiOff size={10} className="inline mr-1" />}
         {label[status]}
      </span>
   );
}

function DeviceCard ({ device }: { device: MikrotikDevice }) {
   const { data: traffic } = useQuery({
      queryKey: ['traffic', device.id],
      queryFn: () => mikrotikAPI.getTraffic(device.id, 2).then(r => r.data),
      enabled: device.status === 'online',
      refetchInterval: 60_000
   });

   return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
         <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Server size={16} className="text-emerald-600" />
               </div>
               <div>
                  <div className="text-sm font-medium text-gray-900">{device.name}</div>
                  <div className="text-xs text-gray-400">{device.host} · {device.model || 'MikroTik'}</div>
               </div>
            </div>
            <StatusBadge status={device.status} />
         </div>

         {device.status === 'online' && (
            <div className="grid grid-cols-3 gap-2">
               <div className="text-center bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                     <Cpu size={11} /> CPU
                  </div>
                  <div className={`text-sm font-medium ${(device.cpuLoad || 0) > 80 ? 'text-red-600' : 'text-gray-900'}`}>
                     {device.cpuLoad?.toFixed(0) ?? '—'}%
                  </div>
               </div>
               <div className="text-center bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                     <MemoryStick size={11} /> RAM
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                     {device.memoryUsed?.toFixed(0) ?? '—'}%
                  </div>
               </div>
               <div className="text-center bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                     <Clock size={11} /> Uptime
                  </div>
                  <div className="text-xs font-medium text-gray-900 truncate">
                     {device.uptime || '—'}
                  </div>
               </div>
            </div>
         )}

         {traffic && traffic.length > 0 && (
            <div>
               <div className="text-xs text-gray-400 mb-1">Tráfico (2h)</div>
               <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={traffic}>
                     <XAxis dataKey="timestamp" hide />
                     <YAxis hide />
                     <Tooltip
                        formatter={(v: number) => `${v.toFixed(1)} Mbps`}
                        labelFormatter={(l) => format(new Date(l), 'HH:mm', { locale: es })}
                     />
                     <Line type="monotone" dataKey="downloadMbps" stroke="#059669" dot={false} strokeWidth={1.5} name="↓ Descarga" />
                     <Line type="monotone" dataKey="uploadMbps" stroke="#34d399" dot={false} strokeWidth={1.5} name="↑ Subida" strokeDasharray="4 2" />
                  </LineChart>
               </ResponsiveContainer>
            </div>
         )}

         {device.lastSeen && (
            <div className="text-xs text-gray-400">
               Última vez: {format(new Date(device.lastSeen), 'dd/MM HH:mm', { locale: es })}
            </div>
         )}
      </div>
   );
}

export default function MikrotikPage () {
   const qc = useQueryClient();

   const { data: devices = [], isLoading } = useQuery({
      queryKey: ['mikrotik-devices'],
      queryFn: () => mikrotikAPI.getDevices().then(r => r.data),
      refetchInterval: 60_000
   });

   const reboot = useMutation({
      mutationFn: (id: string) => mikrotikAPI.rebootDevice(id),
      onSuccess: () => { toast.success('Reinicio iniciado'); qc.invalidateQueries({ queryKey: ['mikrotik-devices'] }); },
      onError: () => toast.error('Error al reiniciar')
   });

   const online = devices.filter(d => d.status === 'online').length;
   const offline = devices.filter(d => d.status === 'offline').length;

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-base font-medium text-gray-900">Monitoreo MikroTik</h2>
               <p className="text-xs text-gray-500 mt-0.5">
                  {online} en línea · {offline} sin conexión · actualización automática cada 60s
               </p>
            </div>
            <div className="flex flex-wrap gap-2">
               <button
                  onClick={() => qc.invalidateQueries({ queryKey: ['mikrotik-devices'] })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
               >
                  <RefreshCw size={12} /> Actualizar
               </button>
               <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
                  <Plus size={12} /> Agregar dispositivo
               </button>
            </div>
         </div>

         {isLoading ? (
            <div className="text-center py-10 text-sm text-gray-400">Conectando con dispositivos...</div>
         ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" variants={staggerContainer} initial="hidden" animate="show">
               {devices.map(device => (
                  <DeviceCard key={device.id} device={device} />
               ))}
               {devices.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-sm text-gray-400">
                     No hay dispositivos MikroTik registrados
                  </div>
               )}
            </motion.div>
         )}
      </div>
   );
}
