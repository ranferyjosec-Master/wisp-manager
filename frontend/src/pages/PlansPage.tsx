import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, backdropVariants, modalVariants } from '../utils/animations';
// pages/PlansPage.tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Loader2, Zap, Users, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { plansAPI } from '../services/api';
import type { Plan } from '../types';

const schema = z.object({
   name: z.string().min(2, 'Nombre requerido'),
   downloadSpeed: z.coerce.number().min(1, 'Velocidad inválida'),
   uploadSpeed: z.coerce.number().min(1, 'Velocidad inválida'),
   price: z.coerce.number().min(1, 'Precio inválido'),
   burstDownload: z.coerce.number().optional(),
   burstUpload: z.coerce.number().optional(),
   mikrotikProfile: z.string().optional(),
   description: z.string().optional()
});
type FormData = z.infer<typeof schema>;

function PlanCard ({ plan }: { plan: Plan & { clients?: { status: string }[] } }) {
   const activeClients = plan.clients?.filter(c => c.status === 'activo').length ?? 0;
   return (
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3 shadow-sm cursor-default">
         <div className="flex items-start justify-between">
            <div>
               <h3 className="text-sm font-medium text-gray-900">{plan.name}</h3>
               {plan.description && <p className="text-xs text-gray-400 mt-0.5">{plan.description}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
               {plan.isActive ? 'Activo' : 'Inactivo'}
            </span>
         </div>

         <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-emerald-500" />
            <span className="text-2xl font-semibold text-emerald-700">{plan.downloadSpeed}</span>
            <span className="text-xs text-gray-400">↓ / {plan.uploadSpeed} ↑ Mbps</span>
         </div>

         {
            (plan.burstDownload || plan.burstUpload) && (
               <div className="text-xs text-gray-400">
                  Burst: {plan.burstDownload}↓ / {plan.burstUpload}↑ Mbps
               </div>
            )
         }

         <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-1.5">
               <DollarSign size={12} className="text-green-600" />
               <span className="font-medium text-gray-800">${parseFloat(String(plan.price)).toLocaleString()}</span>
               <span className="text-gray-400">/mes</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 flex items-center gap-1.5">
               <Users size={12} className="text-emerald-600" />
               <span className="font-medium text-gray-800">{activeClients}</span>
               <span className="text-gray-400">clientes</span>
            </div>
         </div>

         {
            plan.mikrotikProfile && (
               <div className="bg-emerald-50 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-emerald-600">Perfil MikroTik: </span>
                  <code className="text-emerald-800 font-medium">{plan.mikrotikProfile}</code>
               </div>
            )
         }

         <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 font-mono">
            /ip hotspot user profile add name={plan.mikrotikProfile || plan.name.toLowerCase().replace(/\s+/g, '-')} rate-limit={plan.downloadSpeed}M/{plan.uploadSpeed}M
         </div>
      </div >
   );
}

function PlanModal ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
   const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
      resolver: zodResolver(schema)
   });

   const onSubmit = async (data: FormData) => {
      try {
         await plansAPI.create({
            ...data,
            mikrotikProfile: data.mikrotikProfile || data.name.toLowerCase().replace(/\s+/g, '-')
         });
         toast.success('Plan creado y configurado en MikroTik');
         onSuccess();
      } catch (err: unknown) {
         toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear plan');
      }
   };

   const inp = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

   return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
               <h2 className="text-sm font-medium text-gray-900">Nuevo plan de internet</h2>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre del plan *</label>
                  <input {...register('name')} className={inp} placeholder="Plan Básico" />
                  {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">Descarga (Mbps) *</label>
                     <input {...register('downloadSpeed')} type="number" className={inp} placeholder="10" />
                     {errors.downloadSpeed && <p className="text-xs text-red-500 mt-0.5">{errors.downloadSpeed.message}</p>}
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">Subida (Mbps) *</label>
                     <input {...register('uploadSpeed')} type="number" className={inp} placeholder="5" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">Burst descarga</label>
                     <input {...register('burstDownload')} type="number" className={inp} placeholder="15" />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-700 mb-1">Burst subida</label>
                     <input {...register('burstUpload')} type="number" className={inp} placeholder="8" />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Precio mensual (MXN) *</label>
                  <input {...register('price')} type="number" step="0.01" className={inp} placeholder="350.00" />
                  {errors.price && <p className="text-xs text-red-500 mt-0.5">{errors.price.message}</p>}
               </div>

               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre perfil MikroTik</label>
                  <input {...register('mikrotikProfile')} className={inp} placeholder="plan-basico (auto-generado si se deja vacío)" />
               </div>

               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea {...register('description')} className={inp} rows={2} placeholder="Ideal para uso básico en el hogar..." />
               </div>

               <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={onClose}
                     className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                     Cancelar
                  </button>
                  <button type="submit" disabled={isSubmitting}
                     className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5">
                     {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Creando...</> : 'Crear plan'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

export default function PlansPage () {
   const qc = useQueryClient();
   const [showCreate, setShowCreate] = useState(false);

   const { data: plans = [], isLoading } = useQuery<Plan[]>({
      queryKey: ['plans'],
      queryFn: () => plansAPI.getAll().then(r => r.data)
   });

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-base font-medium text-gray-900">Planes de internet</h2>
               <p className="text-xs text-gray-500 mt-0.5">
                  {plans.length} planes · Los perfiles QoS se configuran automáticamente en MikroTik
               </p>
            </div>
            <button
               onClick={() => setShowCreate(true)}
               className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
            >
               <Plus size={13} /> Nuevo plan
            </button>
         </div>

         {isLoading ? (
            <div className="text-center py-12 text-sm text-gray-400">Cargando planes...</div>
         ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" variants={staggerContainer} initial="hidden" animate="show">
               {plans.map(plan => <PlanCard key={plan.id} plan={plan as Plan & { clients?: { status: string }[] }} />)}
               {plans.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-sm text-gray-400">
                     No hay planes registrados
                  </div>
               )}
            </motion.div>
         )}

         {showCreate && (
            <PlanModal
               onClose={() => setShowCreate(false)}
               onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['plans'] }); }}
            />
         )}
      </div>
   );
}
