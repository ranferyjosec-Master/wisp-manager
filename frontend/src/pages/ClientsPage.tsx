// pages/ClientsPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, UserCheck, UserX, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI, plansAPI } from '../services/api';
import type { Client, ClientStatus, Plan } from '../types';
import ClientModal from '../components/clients/ClientModal';
import ClientDetailModal from '../components/clients/ClientDetailModal';

const STATUS_MAP: Record<ClientStatus, { label: string; cls: string }> = {
  activo:     { label: 'Activo',     cls: 'bg-green-100 text-green-700' },
  suspendido: { label: 'Suspendido', cls: 'bg-red-100 text-red-700' },
  moroso:     { label: 'Moroso',     cls: 'bg-amber-100 text-amber-700' },
  inactivo:   { label: 'Inactivo',   cls: 'bg-gray-100 text-gray-500' }
};

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, statusFilter, planFilter, page],
    queryFn: () => clientsAPI.getAll({ search, status: statusFilter, planId: planFilter, page, limit: 20 }).then(r => r.data),
    staleTime: 15_000
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['plans'],
    queryFn: () => plansAPI.getAll().then(r => r.data)
  });

  const suspend = useMutation({
    mutationFn: (id: string) => clientsAPI.suspend(id),
    onSuccess: () => { toast.success('Cliente suspendido'); qc.invalidateQueries({ queryKey: ['clients'] }); },
    onError: () => toast.error('Error al suspender')
  });

  const activate = useMutation({
    mutationFn: (id: string) => clientsAPI.activate(id),
    onSuccess: () => { toast.success('Cliente activado'); qc.invalidateQueries({ queryKey: ['clients'] }); },
    onError: () => toast.error('Error al activar')
  });

  const clients: Client[] = data?.clients || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Clientes</h2>
          <p className="text-xs text-gray-500 mt-0.5">{total} clientes registrados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors shrink-0"
        >
          <Plus size={13} /> <span className="hidden sm:inline">Nuevo cliente</span><span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre, IP, email..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="suspendido">Suspendidos</option>
            <option value="moroso">Morosos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <select
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Planes</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Cliente</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Plan</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">IP</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 hidden lg:table-cell">Sector</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Estado</th>
              <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">Cargando clientes...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-gray-400">No se encontraron clientes</td></tr>
            ) : clients.map(client => {
              const st = STATUS_MAP[client.status];
              return (
                <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700 shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-xs">{client.name} {client.lastName}</div>
                        <div className="text-xs text-gray-400">{client.email || client.phone || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-medium text-gray-800">{client.plan?.name || '—'}</div>
                    <div className="text-xs text-gray-400">
                      {client.plan ? `${client.plan.downloadSpeed}↓/${client.plan.uploadSpeed}↑ Mbps` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {client.ipAddress || '—'}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 hidden lg:table-cell">{client.sector || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setSelectedClient(client)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={13} />
                      </button>
                      {client.status !== 'suspendido' && client.status !== 'inactivo' ? (
                        <button onClick={() => suspend.mutate(client.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Suspender">
                          <UserX size={13} />
                        </button>
                      ) : (
                        <button onClick={() => activate.mutate(client.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activar">
                          <UserCheck size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <span className="text-xs text-gray-400">Página {page} de {pages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Anterior</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-2.5 py-1 text-xs border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Cards móvil */}
      <div className="md:hidden space-y-2">
        {isLoading ? (
          <div className="text-center py-10 text-sm text-gray-400">Cargando clientes...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">No se encontraron clientes</div>
        ) : clients.map(client => {
          const st = STATUS_MAP[client.status];
          return (
            <div key={client.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700 shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{client.name} {client.lastName}</div>
                    <div className="text-xs text-gray-400">{client.email || client.phone || '—'}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400 mb-0.5">Plan</div>
                  <div className="font-medium text-gray-800">{client.plan?.name || '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400 mb-0.5">IP</div>
                  <code className="font-medium text-gray-800">{client.ipAddress || '—'}</code>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => setSelectedClient(client)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Eye size={11} /> Ver
                </button>
                {client.status !== 'suspendido' && client.status !== 'inactivo' ? (
                  <button onClick={() => suspend.mutate(client.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50">
                    <UserX size={11} /> Suspender
                  </button>
                ) : (
                  <button onClick={() => activate.mutate(client.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-green-200 text-green-600 rounded-lg hover:bg-green-50">
                    <UserCheck size={11} /> Activar
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {pages > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Anterior</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-2 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">Siguiente →</button>
          </div>
        )}
      </div>

      {showCreate && (
        <ClientModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['clients'] }); }}
        />
      )}
      {selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
