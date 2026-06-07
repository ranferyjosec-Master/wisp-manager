// components/clients/ClientDetailModal.tsx
import { useQuery } from '@tanstack/react-query';
import { X, Mail, Phone, MapPin, Wifi, Calendar, FileText } from 'lucide-react';
import { clientsAPI } from '../../services/api';
import type { Client, Invoice } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_INVOICE: Record<string, { label: string; cls: string }> = {
  pagado:    { label: 'Pagado',    cls: 'bg-green-100 text-green-700' },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  vencido:   { label: 'Vencido',   cls: 'bg-red-100 text-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' }
};

interface Props {
  client: Client;
  onClose: () => void;
}

export default function ClientDetailModal({ client, onClose }: Props) {
  const { data: fullClient } = useQuery({
    queryKey: ['client-detail', client.id],
    queryFn: () => clientsAPI.getOne(client.id).then(r => r.data)
  });

  const c = fullClient || client;
  const invoices: Invoice[] = (c as Client & { invoices?: Invoice[] }).invoices || [];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Detalle del cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Info básica */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-base font-medium text-emerald-700">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-gray-900">{c.name} {c.lastName}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Cliente desde {c.installDate ? format(new Date(c.installDate), 'MMMM yyyy', { locale: es }) : '—'}
              </div>
            </div>
            <div className="ml-auto">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                c.status === 'activo' ? 'bg-green-100 text-green-700' :
                c.status === 'suspendido' ? 'bg-red-100 text-red-700' :
                c.status === 'moroso' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Datos de contacto */}
          <div className="grid grid-cols-2 gap-2">
            {c.email && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Mail size={12} className="text-gray-400 shrink-0" /> {c.email}
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone size={12} className="text-gray-400 shrink-0" /> {c.phone}
              </div>
            )}
            {c.address && (
              <div className="flex items-center gap-2 text-xs text-gray-600 col-span-2">
                <MapPin size={12} className="text-gray-400 shrink-0" /> {c.address}
              </div>
            )}
          </div>

          {/* Info de red */}
          <div className="bg-emerald-50 rounded-lg p-3 space-y-1.5">
            <div className="text-xs font-medium text-emerald-800 mb-2 flex items-center gap-1.5">
              <Wifi size={12} /> Configuración de red
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-emerald-600">Plan:</span>{' '}
                <span className="font-medium text-emerald-900">{c.plan?.name || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-600">Velocidad:</span>{' '}
                <span className="font-medium text-emerald-900">
                  {c.plan ? `${c.plan.downloadSpeed}↓/${c.plan.uploadSpeed}↑ Mbps` : '—'}
                </span>
              </div>
              <div>
                <span className="text-emerald-600">IP:</span>{' '}
                <code className="font-medium text-emerald-900 bg-emerald-100 px-1 rounded">{c.ipAddress || '—'}</code>
              </div>
              <div>
                <span className="text-emerald-600">MAC:</span>{' '}
                <code className="font-medium text-emerald-900 bg-emerald-100 px-1 rounded">{c.macAddress || '—'}</code>
              </div>
              <div>
                <span className="text-emerald-600">Sector:</span>{' '}
                <span className="font-medium text-emerald-900">{c.sector || '—'}</span>
              </div>
              <div>
                <span className="text-emerald-600">Precio:</span>{' '}
                <span className="font-medium text-emerald-900">
                  {c.plan ? `$${parseFloat(String(c.plan.price)).toLocaleString()}/mes` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de facturas */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
              <FileText size={12} /> Historial de facturas
            </div>
            {invoices.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Sin facturas registradas</p>
            ) : (
              <div className="space-y-1.5">
                {invoices.map((inv) => {
                  const st = STATUS_INVOICE[inv.status];
                  return (
                    <div key={inv.id}
                      className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg text-xs">
                      <div>
                        <span className="font-medium text-gray-800">{inv.invoiceNumber}</span>
                        <span className="text-gray-400 ml-2">{inv.billingMonth}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          ${parseFloat(String(inv.amount)).toLocaleString()}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                        {inv.paidDate && (
                          <span className="text-gray-400 flex items-center gap-0.5">
                            <Calendar size={10} />
                            {format(new Date(inv.paidDate), 'dd/MM/yy')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {c.notes && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              <span className="font-medium">Notas: </span>{c.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
