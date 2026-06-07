import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../../utils/animations';
// components/clients/ClientModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI } from '../../services/api';
import type { Plan, Client } from '../../types';

const schema = z.object({
  name:       z.string().min(2, 'Nombre requerido'),
  lastName:   z.string().optional(),
  email:      z.string().email('Email inválido').optional().or(z.literal('')),
  phone:      z.string().optional(),
  address:    z.string().optional(),
  sector:     z.string().optional(),
  ipAddress:  z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'IP inválida').optional().or(z.literal('')),
  macAddress: z.string().optional(),
  planId:     z.string().min(1, 'Selecciona un plan'),
  installDate: z.string().optional(),
  notes:      z.string().optional()
});

type FormData = z.infer<typeof schema>;

interface Props {
  plans: Plan[];
  client?: Client;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClientModal({ plans, client, onClose, onSuccess }: Props) {
  const isEdit = !!client;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: client ? {
      name: client.name,
      lastName: client.lastName || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      sector: client.sector || '',
      ipAddress: client.ipAddress || '',
      macAddress: client.macAddress || '',
      planId: client.planId,
      notes: client.notes || ''
    } : {}
  });

  const onSubmit = async (data: FormData) => {
    try {
      if (isEdit) {
        await clientsAPI.update(client!.id, data);
        toast.success('Cliente actualizado');
      } else {
        await clientsAPI.create(data);
        toast.success('Cliente creado. Factura inicial generada.');
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar';
      toast.error(msg);
    }
  };

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );

  const inputClass = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">
            {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre *" error={errors.name?.message}>
              <input {...register('name')} className={inputClass} placeholder="Luis" />
            </Field>
            <Field label="Apellido" error={errors.lastName?.message}>
              <input {...register('lastName')} className={inputClass} placeholder="Martínez" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" className={inputClass} placeholder="cliente@email.com" />
            </Field>
            <Field label="Teléfono" error={errors.phone?.message}>
              <input {...register('phone')} className={inputClass} placeholder="555-1234-567" />
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              <input {...register('address')} className={inputClass} placeholder="Calle 5 #23, Col. Centro" />
            </Field>
            <Field label="Sector / Zona" error={errors.sector?.message}>
              <input {...register('sector')} className={inputClass} placeholder="Sector Norte" />
            </Field>
            <Field label="Dirección IP" error={errors.ipAddress?.message}>
              <input {...register('ipAddress')} className={inputClass} placeholder="192.168.10.50" />
            </Field>
            <Field label="MAC Address" error={errors.macAddress?.message}>
              <input {...register('macAddress')} className={inputClass} placeholder="AA:BB:CC:DD:EE:FF" />
            </Field>
            <Field label="Plan de Internet *" error={errors.planId?.message}>
              <select {...register('planId')} className={inputClass}>
                <option value="">Seleccionar plan</option>
                {plans.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.downloadSpeed}/{p.uploadSpeed} Mbps — ${p.price}/mes
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha de instalación" error={errors.installDate?.message}>
              <input {...register('installDate')} type="date" className={inputClass} />
            </Field>
          </div>

          <Field label="Notas" error={errors.notes?.message}>
            <textarea {...register('notes')} className={inputClass} rows={2} placeholder="Observaciones del cliente..." />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5">
              {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Guardando...</> : (isEdit ? 'Actualizar' : 'Crear cliente')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
