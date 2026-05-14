import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Truck, CalendarCheck, Users,
  Settings, LogOut, Menu, X, Package
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { BrandMark } from '../brand/BrandMark'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/bookings',  icon: CalendarCheck,   label: 'Bookings'   },
  { to: '/customers', icon: Users,           label: 'Customers'  },
  { to: '/services',  icon: Package,         label: 'Services'   },
  { to: '/settings',  icon: Settings,        label: 'Settings'   },
]

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-surface-100 px-4 py-5 sm:px-5 sm:py-6">
        <BrandMark className="h-9 w-9" iconClassName="h-4 w-4" />
        <div>
          <p className="font-display font-bold text-slate-900 text-sm leading-tight">Zevio</p>
          <p className="text-xs text-slate-400 truncate max-w-[120px]">{user?.tenant?.name ?? 'Dashboard'}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-2 py-3 sm:px-3 sm:py-4">
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
      <div className="border-t border-surface-100 p-2.5 sm:p-3">
        <div className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 sm:px-3">
          <div className="w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-brand-700 font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.role?.toLowerCase()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
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
      <div className="lg:hidden flex items-center justify-between px-3 py-3 bg-white border-b border-surface-200 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" iconClassName="h-3.5 w-3.5" />
          <span className="font-display font-bold text-slate-900 text-sm">Zevio</span>
        </div>
        <button
          onClick={() => setMobileOpen((current) => !current)}
          className="btn-ghost p-2 rounded-lg"
          aria-label={mobileOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-sidebar"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sidebar */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 z-40 transition-opacity duration-200',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
        <aside
          id="mobile-sidebar"
          className={clsx(
            'relative h-[calc(100%-57px)] mt-[57px] w-52 max-w-[80vw] bg-white border-r border-surface-200 shadow-xl transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          aria-hidden={!mobileOpen}
        >
          <SidebarContent />
        </aside>
      </div>
    </>
  )
}
