// pages/UsersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Loader2, ShieldCheck, ShieldAlert, Shield, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersAPI, authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import type { User, UserRole } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ROLE_MAP: Record<UserRole, { label: string; icon: React.ElementType; cls: string }> = {
   superadmin: { label: 'Superadmin', icon: ShieldAlert, cls: 'bg-red-100 text-red-700' },
   admin: { label: 'Admin', icon: ShieldCheck, cls: 'bg-emerald-100 text-emerald-700' },
   tecnico: { label: 'Técnico', icon: Shield, cls: 'bg-gray-100 text-gray-600' },
   facturacion: { label: 'Facturación', icon: Shield, cls: 'bg-amber-100 text-amber-700' }
};

const registerSchema = z.object({
   name: z.string().min(2, 'Nombre requerido'),
   email: z.string().email('Email inválido'),
   password: z.string().min(8, 'Mínimo 8 caracteres'),
   role: z.enum(['superadmin', 'admin', 'tecnico', 'facturacion'])
});
type RegisterForm = z.infer<typeof registerSchema>;

const pwdSchema = z.object({
   currentPassword: z.string().min(1, 'Requerido'),
   newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
   confirm: z.string()
}).refine(d => d.newPassword === d.confirm, {
   message: 'Las contraseñas no coinciden',
   path: ['confirm']
});
type PwdForm = z.infer<typeof pwdSchema>;

function CreateUserModal ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
   const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
      resolver: zodResolver(registerSchema),
      defaultValues: { role: 'tecnico' }
   });
   const inp = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

   const onSubmit = async (data: RegisterForm) => {
      try {
         await authAPI['register' as keyof typeof authAPI];
         // Llamar directamente
         const { default: api } = await import('../services/api');
         await (api as unknown as { post: (url: string, data: unknown) => Promise<unknown> }).post('/auth/register', data);
         toast.success('Usuario creado exitosamente');
         onSuccess();
      } catch (err: unknown) {
         toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear usuario');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
               <h2 className="text-sm font-medium text-gray-900">Nuevo usuario del sistema</h2>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo *</label>
                  <input {...register('name')} className={inp} placeholder="María García" />
                  {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input {...register('email')} type="email" className={inp} placeholder="usuario@wisp.mx" />
                  {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña *</label>
                  <input {...register('password')} type="password" className={inp} placeholder="Mínimo 8 caracteres" />
                  {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rol *</label>
                  <select {...register('role')} className={inp}>
                     <option value="tecnico">Técnico (lectura + MikroTik)</option>
                     <option value="facturacion">Facturación (clientes + facturas)</option>
                     <option value="admin">Admin (todo excepto usuarios)</option>
                     <option value="superadmin">Superadmin (acceso total)</option>
                  </select>
               </div>
               <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={onClose}
                     className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isSubmitting}
                     className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5">
                     {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Creando...</> : 'Crear usuario'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

function ChangePasswordModal ({ onClose }: { onClose: () => void }) {
   const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PwdForm>({
      resolver: zodResolver(pwdSchema)
   });
   const inp = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500";

   const onSubmit = async (data: PwdForm) => {
      try {
         await authAPI.changePassword(data.currentPassword, data.newPassword);
         toast.success('Contraseña cambiada exitosamente');
         onClose();
      } catch {
         toast.error('Error: verifica tu contraseña actual');
      }
   };

   return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
         <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
               <h2 className="text-sm font-medium text-gray-900">Cambiar contraseña</h2>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contraseña actual</label>
                  <input {...register('currentPassword')} type="password" className={inp} />
                  {errors.currentPassword && <p className="text-xs text-red-500 mt-0.5">{errors.currentPassword.message}</p>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input {...register('newPassword')} type="password" className={inp} placeholder="Mínimo 8 caracteres" />
                  {errors.newPassword && <p className="text-xs text-red-500 mt-0.5">{errors.newPassword.message}</p>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input {...register('confirm')} type="password" className={inp} />
                  {errors.confirm && <p className="text-xs text-red-500 mt-0.5">{errors.confirm.message}</p>}
               </div>
               <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button type="button" onClick={onClose}
                     className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={isSubmitting}
                     className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-1.5">
                     {isSubmitting ? <><Loader2 size={12} className="animate-spin" /> Guardando...</> : 'Cambiar contraseña'}
                  </button>
               </div>
            </form>
         </div>
      </div>
   );
}

export default function UsersPage () {
   const qc = useQueryClient();
   const { user: currentUser } = useAuthStore();
   const [showCreate, setShowCreate] = useState(false);
   const [showChangePwd, setShowChangePwd] = useState(false);

   const { data: users = [], isLoading } = useQuery<User[]>({
      queryKey: ['users'],
      queryFn: () => usersAPI.getAll().then(r => r.data)
   });

   const toggleActive = useMutation({
      mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
         usersAPI.update(id, { isActive }),
      onSuccess: () => { toast.success('Usuario actualizado'); qc.invalidateQueries({ queryKey: ['users'] }); },
      onError: () => toast.error('Error al actualizar')
   });

   return (
      <div className="space-y-4">
         <div className="flex items-center justify-between">
            <div>
               <h2 className="text-base font-medium text-gray-900">Usuarios y seguridad</h2>
               <p className="text-xs text-gray-500 mt-0.5">{users.length} usuarios · JWT · bcrypt · roles granulares</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setShowChangePwd(true)}
                  className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cambiar mi contraseña
               </button>
               {currentUser?.role === 'superadmin' && (
                  <button onClick={() => setShowCreate(true)}
                     className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
                     <Plus size={13} /> Nuevo usuario
                  </button>
               )}
            </div>
         </div>

         {/* Tarjeta de seguridad */}
         <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
            <h3 className="text-xs font-medium text-emerald-800 mb-2">Configuración de seguridad activa</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs text-emerald-700">
               {[
                  'JWT con expiración 8h',
                  'Contraseñas con bcrypt (salt 12)',
                  'Rate limiting 10 req/15min en login',
                  'Roles granulares por endpoint',
                  'Logs de auditoría con Winston',
                  'CORS configurado por origen'
               ].map(item => (
                  <div key={item} className="flex items-center gap-1.5">
                     <ShieldCheck size={11} className="text-emerald-500 shrink-0" /> {item}
                  </div>
               ))}
            </div>
         </div>

         {/* Tabla de usuarios */}
         <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                     <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Usuario</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Rol</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Último acceso</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Estado</th>
                        {currentUser?.role === 'superadmin' && (
                           <th className="px-4 py-2.5 text-xs font-medium text-gray-500 text-right">Acciones</th>
                        )}
                     </tr>
                  </thead>
                  <tbody>
                     {isLoading ? (
                        <tr><td colSpan={5} className="text-center py-8 text-sm text-gray-400">Cargando usuarios...</td></tr>
                     ) : users.map(user => {
                        const role = ROLE_MAP[user.role];
                        const RoleIcon = role.icon;
                        const isMe = user.id === currentUser?.id;
                        return (
                           <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="px-4 py-2.5">
                                 <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">
                                       {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                       <div className="text-xs font-medium text-gray-900">{user.name} {isMe && <span className="text-emerald-500">(tú)</span>}</div>
                                       <div className="text-xs text-gray-400">{user.email}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-2.5">
                                 <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${role.cls}`}>
                                    <RoleIcon size={10} /> {role.label}
                                 </span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-gray-500">
                                 {user.lastLogin
                                    ? format(new Date(user.lastLogin), "dd/MM/yyyy HH:mm", { locale: es })
                                    : 'Nunca'}
                              </td>
                              <td className="px-4 py-2.5">
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {user.isActive ? 'Activo' : 'Inactivo'}
                                 </span>
                              </td>
                              {currentUser?.role === 'superadmin' && (
                                 <td className="px-4 py-2.5 text-right">
                                    {!isMe && (
                                       <button
                                          onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                                          className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                                       >
                                          {user.isActive ? 'Desactivar' : 'Activar'}
                                       </button>
                                    )}
                                 </td>
                              )}
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>

            {showCreate && (
               <CreateUserModal
                  onClose={() => setShowCreate(false)}
                  onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }); }}
               />
            )}
            {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
         </div>
      </div>
   );
}
