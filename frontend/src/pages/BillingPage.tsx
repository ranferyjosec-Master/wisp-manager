// pages/BillingPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
   BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { DollarSign, Clock, TrendingUp, CheckCircle, Calendar, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../services/api';
import type { Invoice, InvoiceStatus, PaymentMethod } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ST: Record<InvoiceStatus, { label: string; cls: string }> = {
   pagado: { label: 'Pagado', cls: 'bg-green-100 text-green-700' },
   pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
   vencido: { label: 'Vencido', cls: 'bg-red-100 text-red-700' },
   cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-500' }
};

function PayModal ({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: () => void }) {
   const [method, setMethod] = useState<PaymentMethod>('efectivo');
   const [notes, setNotes] = useState('');
   const [loading, setLoading] = useState(false);

   const handlePay = async () => {
      setLoading(true);
      try {
         await invoicesAPI.markAsPaid(invoice.id, { paymentMethod: method, notes });
         toast.success('Pago registrado exitosamente');
         onSuccess();
      } catch {
         toast.error('Error al registrar pago');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Registrar pago</h3>
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
               <div className="flex justify-between">
                  <span className="text-gray-500">Cliente:</span>
                  <span className="font-medium">{invoice.client?.name}</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-gray-500">Factura:</span>
                  <span className="font-medium">{invoice.invoiceNumber}</span>
               </div>
               <div className="flex justify-between text-base mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-700 font-medium">Total a cobrar:</span>
                  <span className="font-medium text-green-700">${parseFloat(String(invoice.amount)).toLocaleString()}</span>
               </div>
            </div>
            <div>
               <label className="block text-xs font-medium text-gray-700 mb-1">Método de pago</label>
               <select value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-gray-700 mb-1">Notas (opcional)</label>
               <input value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Referencia, folio, etc." />
            </div>
            <div className="flex gap-2 pt-1">
               <button onClick={onClose}
                  className="flex-1 px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancelar
               </button>
               <button onClick={handlePay} disabled={loading}
                  className="flex-1 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {loading ? <><Loader2 size={12} className="animate-spin" /> Guardando...</> : <><CheckCircle size={12} /> Confirmar pago</>}
               </button>
            </div>
         </div>
      </div>
   );
}

export default function BillingPage () {
   const qc = useQueryClient();
   const [statusFilter, setStatusFilter] = useState('');
   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
   const [page, setPage] = useState(1);
   const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

   const { data, isLoading } = useQuery({
      queryKey: ['invoices', statusFilter, month, page],
      queryFn: () => invoicesAPI.getAll({ status: statusFilter, month, page, limit: 25 }).then(r => r.data)
   });

   const { data: stats } = useQuery({
      queryKey: ['invoice-stats-billing'],
      queryFn: () => invoicesAPI.getStats(6).then(r => r.data)
   });

   const generateMonthly = useMutation({
      mutationFn: () => invoicesAPI.generateMonthly(month),
      onSuccess: (res) => {
         toast.success(res.data.message);
         qc.invalidateQueries({ queryKey: ['invoices'] });
      },
      onError: () => toast.error('Error al generar facturas')
   });

   const invoices: Invoice[] = data?.invoices || [];
   const pages = data?.pages || 1;

   // Estadísticas del mes actual
   const summaryItems = stats?.summary || [];
   const paid = summaryItems.find((s: { status: string; total: number }) => s.status === 'pagado');
   const pending = summaryItems.find((s: { status: string; total: number }) => s.status === 'pendiente');
   const overdue = summaryItems.find((s: { status: string; total: number }) => s.status === 'vencido');

   return (
      <div className="space-y-4">
         {/* Header */}
         <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-gray-900">Facturación y pagos</h2>
            <button
               onClick={() => generateMonthly.mutate()}
               disabled={generateMonthly.isPending}
               className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50"
            >
               {generateMonthly.isPending
                  ? <><Loader2 size={12} className="animate-spin" /> Generando...</>
                  : <><Calendar size={12} /> Generar facturas del mes</>}
            </button>
         </div>

         {/* Métricas del mes */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-lg p-4">
               <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1"><DollarSign size={12} /> Cobrado</div>
               <div className="text-xl font-medium text-green-800">
                  ${paid ? parseFloat(String(paid.total)).toLocaleString() : '0'}
               </div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
               <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1"><Clock size={12} /> Pendiente</div>
               <div className="text-xl font-medium text-amber-800">
                  ${pending ? parseFloat(String(pending.total)).toLocaleString() : '0'}
               </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
               <div className="flex items-center gap-1.5 text-xs text-red-600 mb-1"><TrendingUp size={12} /> Vencido</div>
               <div className="text-xl font-medium text-red-800">
                  ${overdue ? parseFloat(String(overdue.total)).toLocaleString() : '0'}
               </div>
            </div>
         </div>

         {/* Gráfica de ingresos */}
         <div className="bg-white border border-gray-100 rounded-xl p-4">
            <h3 className="text-xs font-medium text-gray-700 mb-3">Tendencia de cobros (6 meses)</h3>
            <ResponsiveContainer width="100%" height={180}>
               <LineChart data={stats?.monthlyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="billingMonth" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="collected" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} name="Cobrado" />
                  <Line type="monotone" dataKey="total" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Facturado" />
               </LineChart>
            </ResponsiveContainer>
         </div>

         {/* Filtros y tabla */}
         <div className="flex gap-2">
            <input type="month" value={month} onChange={e => { setMonth(e.target.value); setPage(1); }}
               className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
               className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
               <option value="">Todos los estados</option>
               <option value="pendiente">Pendiente</option>
               <option value="pagado">Pagado</option>
               <option value="vencido">Vencido</option>
               <option value="cancelado">Cancelado</option>
            </select>
         </div>

         <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500"># Factura</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Cliente</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Plan</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Monto</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Vencimiento</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Estado</th>
                        <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Acción</th>
                     </tr>
                  </thead>
                  <tbody>
                     {isLoading ? (
                        <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">Cargando facturas...</td></tr>
                     ) : invoices.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">No hay facturas para este período</td></tr>
                     ) : invoices.map(inv => {
                        const st = ST[inv.status];
                        const isOverdue = inv.status === 'vencido';
                        return (
                           <tr key={inv.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
                              <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{inv.invoiceNumber}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{inv.client?.name || '—'}</td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">{inv.plan?.name || '—'}</td>
                              <td className="px-4 py-2.5 text-xs font-medium text-gray-900 text-right">
                                 ${parseFloat(String(inv.amount)).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">
                                 {format(new Date(inv.dueDate), 'dd MMM yyyy', { locale: es })}
                              </td>
                              <td className="px-4 py-2.5">
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                                 {inv.paymentMethod && (
                                    <span className="text-xs text-gray-400 ml-1 capitalize">· {inv.paymentMethod}</span>
                                 )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                 {(inv.status === 'pendiente' || inv.status === 'vencido') && (
                                    <button
                                       onClick={() => setPayingInvoice(inv)}
                                       className="text-xs px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                    >
                                       Cobrar
                                    </button>
                                 )}
                                 {inv.status === 'pagado' && (
                                    <span className="text-xs text-gray-400 flex items-center gap-0.5 justify-end">
                                       <CheckCircle size={11} className="text-green-500" />
                                       {inv.paidDate ? format(new Date(inv.paidDate), 'dd/MM/yy') : 'Pagado'}
                                    </span>
                                 )}
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>

               {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                     <span className="text-xs text-gray-400">Página {page} de {pages} · {data?.total} facturas</span>
                     <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                           className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Anterior</button>
                        <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                           className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
                     </div>
                  </div>
               )}
            </div>

            {payingInvoice && (
               <PayModal
                  invoice={payingInvoice}
                  onClose={() => setPayingInvoice(null)}
                  onSuccess={() => {
                     setPayingInvoice(null);
                     qc.invalidateQueries({ queryKey: ['invoices'] });
                     qc.invalidateQueries({ queryKey: ['invoice-stats-billing'] });
                  }}
               />
            )}
         </div>
      </div>
   );
}