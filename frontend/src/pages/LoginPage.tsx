// pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Router, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';

const schema = z.object({
   email: z.string().email('Email inválido'),
   password: z.string().min(6, 'Mínimo 6 caracteres')
});
type LoginForm = z.infer<typeof schema>;

export default function LoginPage () {
   const [showPwd, setShowPwd] = useState(false);
   const [loading, setLoading] = useState(false);
   const { setAuth } = useAuthStore();
   const navigate = useNavigate();

   const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
      resolver: zodResolver(schema)
   });

   const onSubmit = async (data: LoginForm) => {
      setLoading(true);
      try {
         const res = await authAPI.login(data.email, data.password);
         setAuth(res.data.user, res.data.token);
         toast.success(`Bienvenido, ${res.data.user.name}`);
         navigate('/dashboard');
      } catch (err: unknown) {
         const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Credenciales incorrectas';
         toast.error(msg);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6">
         <div className="w-full max-w-sm mx-auto">

            {/* Logo */}
            <motion.div
               className="text-center mb-8"
               initial={{ opacity: 0, y: -24 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
               <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-900/40"
                  whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
               >
                  <Router size={26} className="text-white" />
               </motion.div>
               <h1 className="text-2xl font-bold text-white">WISPManager</h1>
               <p className="text-sm text-gray-400 mt-1">Sistema de gestión WISP/MikroTik</p>
            </motion.div>

            {/* Card del formulario */}
            <motion.div
               className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl"
               initial={{ opacity: 0, y: 24 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Email */}
                  <motion.div
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.2, duration: 0.3 }}
                  >
                     <label className="block text-xs font-medium text-gray-300 mb-1.5">Email</label>
                     <input
                        {...register('email')}
                        type="email"
                        placeholder="admin@wisp.mx"
                        className="w-full px-3 py-2.5 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                     />
                     {errors.email && (
                        <motion.p
                           className="text-xs text-red-400 mt-1"
                           initial={{ opacity: 0, y: -4 }}
                           animate={{ opacity: 1, y: 0 }}
                        >
                           {errors.email.message}
                        </motion.p>
                     )}
                  </motion.div>

                  {/* Contraseña */}
                  <motion.div
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: 0.27, duration: 0.3 }}
                  >
                     <label className="block text-xs font-medium text-gray-300 mb-1.5">Contraseña</label>
                     <div className="relative">
                        <input
                           {...register('password')}
                           type={showPwd ? 'text' : 'password'}
                           placeholder="••••••••"
                           className="w-full px-3 py-2.5 pr-9 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                        <button
                           type="button"
                           onClick={() => setShowPwd(!showPwd)}
                           className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                        >
                           {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                     </div>
                     {errors.password && (
                        <motion.p
                           className="text-xs text-red-400 mt-1"
                           initial={{ opacity: 0, y: -4 }}
                           animate={{ opacity: 1, y: 0 }}
                        >
                           {errors.password.message}
                        </motion.p>
                     )}
                  </motion.div>

                  {/* Botón */}
                  <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.34, duration: 0.3 }}
                  >
                     <motion.button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-900/30"
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                     >
                        {loading
                           ? <><Loader2 size={14} className="animate-spin" /> Iniciando sesión...</>
                           : 'Iniciar sesión'}
                     </motion.button>
                  </motion.div>
               </form>
            </motion.div>

            <motion.p
               className="text-center text-xs text-gray-600 mt-5"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ delay: 0.5 }}
            >
               Protegido con JWT · Cifrado bcrypt · HTTPS
            </motion.p>
         </div>
      </div>
   );
}
