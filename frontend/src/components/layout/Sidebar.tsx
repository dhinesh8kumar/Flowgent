import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Truck, CalendarCheck, Users,
  Settings, LogOut, Droplets, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/bookings',  icon: CalendarCheck,   label: 'Bookings'   },
  { to: '/customers', icon: Users,           label: 'Customers'  },
  { to: '/settings',  icon: Settings,        label: 'Settings'   },
]

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-100">
        <div className="w-9 h-9 rounded-2xl bg-brand-600 flex items-center justify-center shadow-soft">
          <Droplets className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-display font-bold text-slate-900 text-sm leading-tight">Flowgent</p>
          <p className="text-xs text-slate-400 truncate max-w-[120px]">{user?.tenant?.name ?? 'Dashboard'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-surface-100">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role?.toLowerCase()}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white border-r border-surface-200 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-brand-600 flex items-center justify-center">
            <Droplets className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-slate-900 text-sm">Flowgent</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 rounded-xl">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-2xl">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 btn-ghost p-2 rounded-xl">
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  )
}
