// components/layout/Layout.tsx
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, FileText, Package, Server,
  Bell, ShieldCheck, LogOut, Router, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { alertsAPI } from '../../services/api';
import { drawerVariants, backdropVariants, fadeInDown, staggerContainer, staggerItem } from '../../utils/animations';
import clsx from 'clsx';

const navMain = [
  { label: 'Dashboard',   path: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes',    path: '/clients',   icon: Users },
  { label: 'Facturación', path: '/billing',   icon: FileText },
  { label: 'Planes',      path: '/plans',     icon: Package },
  { label: 'MikroTik',   path: '/mikrotik',  icon: Server },
];

interface SidebarProps {
  user: { name: string; role: string } | null;
  alertData: number | undefined;
  onClose?: () => void;
  onLogout: () => void;
}

function SidebarContent({ user, alertData, onClose, onLogout }: SidebarProps) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
      isActive
        ? 'bg-emerald-600 text-white font-medium shadow-sm'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    );

  return (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0 shadow">
            <Router size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">WISPManager</div>
            <div className="text-xs text-gray-400">Sistema de Gestión</div>
          </div>
        </motion.div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <motion.nav
        className="flex-1 py-4 overflow-y-auto px-3 space-y-0.5"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pb-2">Principal</p>
        {navMain.map(item => (
          <motion.div key={item.path} variants={staggerItem}>
            <NavLink to={item.path} className={navLinkClass} onClick={onClose}>
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </NavLink>
          </motion.div>
        ))}

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-5 pb-2">Red</p>
        <motion.div variants={staggerItem}>
          <NavLink to="/alerts" className={navLinkClass} onClick={onClose}>
            <Bell size={15} />
            Alertas
            <AnimatePresence>
              {alertData && alertData > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none font-semibold"
                >
                  {alertData}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </motion.div>

        {['superadmin', 'admin'].includes(user?.role || '') && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 pt-5 pb-2">Sistema</p>
            <motion.div variants={staggerItem}>
              <NavLink to="/users" className={navLinkClass} onClick={onClose}>
                <ShieldCheck size={15} />
                Usuarios
              </NavLink>
            </motion.div>
          </>
        )}
      </motion.nav>

      {/* User footer */}
      <motion.div
        className="px-3 py-3 border-t border-white/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-400 transition-colors" aria-label="Cerrar sesión">
            <LogOut size={14} />
          </button>
        </div>
      </motion.div>
    </>
  );
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: alertData } = useQuery({
    queryKey: ['open-alerts-count'],
    queryFn: () => alertsAPI.getAll({ status: 'abierta', limit: 1 }).then(r => r.data.total),
    refetchInterval: 30_000
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Overlay móvil */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            variants={backdropVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-56 bg-gray-900 flex-col shrink-0">
        <SidebarContent user={user} alertData={alertData} onLogout={handleLogout} />
      </aside>

      {/* Sidebar móvil drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="drawer"
            variants={drawerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed inset-y-0 left-0 w-64 bg-gray-900 flex flex-col z-30 lg:hidden"
          >
            <SidebarContent
              user={user}
              alertData={alertData}
              onClose={() => setSidebarOpen(false)}
              onLogout={handleLogout}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <motion.header
          className="bg-white border-b border-gray-200 h-12 flex items-center px-4 shrink-0 gap-3"
          variants={fadeInDown}
          initial="hidden"
          animate="show"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center">
              <Router size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-800">WISPManager</span>
          </div>
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <AnimatePresence>
              {alertData && alertData > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <NavLink to="/alerts" className="relative text-gray-500 hover:text-gray-800">
                    <Bell size={18} />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                      {alertData > 9 ? '9+' : alertData}
                    </span>
                  </NavLink>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* Page content con AnimatePresence para transiciones entre rutas */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
