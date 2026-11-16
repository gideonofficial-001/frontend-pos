import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, useSidebarStore, useCartStore } from '@/store'
import { useThemeStore } from '@/store/theme'
import { UserRole } from '@/types'
import { Logo } from '@/components/Logo'
import { notificationsApi, invoicesApi } from '@/api'
import {
  LayoutDashboard, Users, Building2, PackageSearch, PackageCheck, UsersRound,
  ShoppingCart, FileText, RotateCcw, History, BarChart3,
  ClipboardList, Settings, LogOut, Bell, ArrowLeftRight,
  Receipt, ChevronLeft, ChevronRight, X, Menu, Smartphone,
  Sun, Moon, Sparkles, Heart, Droplets, SlidersHorizontal, Printer, Cpu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const Sidebar = () => {
  const { user, clearAuth } = useAuthStore()
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebarStore()
  const { theme, toggleTheme } = useThemeStore()
  const location = useLocation()
  const cartItemsCount = useCartStore((state) => state.items.length)

  // Fetch pending approvals for returns, transfers, devices, expenses
  const { data: pendingApprovals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      try {
        const res = await notificationsApi.getPendingApprovals()
        return res.data
      } catch {
        return null
      }
    },
    enabled: !!user,
    refetchInterval: 15000,
  })

  // Fetch unread notifications
  const { data: unreadNotifications } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      try {
        const res = await notificationsApi.getUnreadCount()
        return res.data
      } catch {
        return { count: 0 }
      }
    },
    enabled: !!user,
    refetchInterval: 15000,
  })

  // Fetch pending invoices count
  const { data: pendingInvoicesCount } = useQuery({
    queryKey: ['pending-invoices-count', user?.branchId],
    queryFn: async () => {
      try {
        const res = await invoicesApi.getAll({ status: 'PENDING' })
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        return list.length
      } catch {
        return 0
      }
    },
    enabled: !!user,
    refetchInterval: 30000,
  })

  const getBadgeCount = (path: string): number => {
    if (path === '/notifications') {
      return (unreadNotifications?.count || 0) + (pendingApprovals?.total || 0)
    }
    if (path.includes('/returns')) {
      return pendingApprovals?.pendingReturns || 0
    }
    if (path.includes('/transfers')) {
      if (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.OVERALL_MANAGER) {
        return 0 // Admins and Overall Managers only view completed transfer histories, no pending badges
      }
      return pendingApprovals?.pendingTransfers || 0
    }
    if (path.includes('/expenses')) {
      return pendingApprovals?.pendingExpenses || 0
    }
    if (path.includes('/devices')) {
      return pendingApprovals?.pendingDevices || 0
    }
    if (path === '/branch/new-sale') {
      return cartItemsCount || 0
    }
    if (path.includes('/invoices')) {
      return pendingInvoicesCount || 0
    }
    return 0
  }

  const handleLogout = () => {
    clearAuth()
    toast.success('Logged out successfully')
    window.location.href = '/login'
  }

  const getNavItems = () => {
    if (!user) return []
    const items = []

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.OVERALL_MANAGER && !user.branchId) {
      return [
        { path: '/unassigned', icon: Building2, label: 'Branch Assignment' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      items.push(
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/branches', icon: Building2, label: 'Branches' },
        { path: '/inventory', icon: PackageSearch, label: 'Inventory' },
        { path: '/stock-adjustments', icon: SlidersHorizontal, label: 'Stock Adjustments' },
        { path: '/closing-stock', icon: PackageCheck, label: 'Closing Stock' },
        { path: '/customers', icon: UsersRound, label: 'Customers' },
        { path: '/admin/invoices', icon: FileText, label: 'Invoices' },
        { path: '/admin/sales-history', icon: History, label: 'Sales History' },
        { path: '/admin/returns', icon: RotateCcw, label: 'Returns' },
        { path: '/admin/expenses', icon: Receipt, label: 'Expenses' },
        { path: '/admin/transfers', icon: ArrowLeftRight, label: 'Transfers' },
        { path: '/admin/devices',   icon: Smartphone,    label: 'Devices' },
        { path: '/admin/reports',   icon: BarChart3,     label: 'Reports' },
        { path: '/notifications',   icon: Bell,          label: 'Notifications' },
        { path: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
        { path: '/printer-setup',   icon: Printer,       label: 'Printer Setup' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      )
    }

    if (user.role === UserRole.OVERALL_MANAGER) {
      items.push(
        { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/inventory', icon: PackageSearch, label: 'Inventory' },
        { path: '/stock-adjustments', icon: SlidersHorizontal, label: 'Stock Adjustments' },
        { path: '/closing-stock', icon: PackageCheck, label: 'Closing Stock' },
        { path: '/customers', icon: UsersRound, label: 'Customers' },
        { path: '/admin/invoices', icon: FileText, label: 'Invoices' },
        { path: '/admin/sales-history', icon: History, label: 'Sales History' },
        { path: '/admin/transfers', icon: ArrowLeftRight, label: 'Transfers' },
        { path: '/manager/reports', icon: BarChart3, label: 'Reports' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/printer-setup', icon: Printer, label: 'Printer Setup' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      )
    }

    if (user.role === UserRole.BRANCH_MANAGER) {
      items.push(
        { path: '/branch/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/inventory', icon: PackageSearch, label: 'Inventory' },
        { path: '/stock-adjustments', icon: SlidersHorizontal, label: 'Stock Adjustments' },
        { path: '/closing-stock', icon: PackageCheck, label: 'Closing Stock' },
        { path: '/branch/new-sale', icon: ShoppingCart, label: 'New Sale' },
        { path: '/branch/invoices', icon: FileText, label: 'Invoices' },
        { path: '/branch/sales-history', icon: History, label: 'Sales History' },
        { path: '/branch/returns', icon: RotateCcw, label: 'Returns' },
        { path: '/branch/expenses', icon: Receipt, label: 'Expenses' },
        { path: '/branch/transfers', icon: ArrowLeftRight, label: 'Transfers' },
        { path: '/branch/reports', icon: BarChart3, label: 'Reports' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/printer-setup', icon: Printer, label: 'Printer Setup' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      )
    }

    return items
  }

  const navItems = getNavItems()

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center overflow-hidden">
          <Logo size="sm" variant="color" showText={!collapsed} />
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 hover:bg-muted rounded-lg shrink-0">
          <X className="w-5 h-5" />
        </button>
        <button onClick={toggleCollapsed} className="hidden lg:flex p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const badge = getBadgeCount(item.path)
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative',
                      isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                  title={collapsed && badge > 0 ? `${item.label} (${badge})` : item.label}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <item.icon className="w-5 h-5 shrink-0" />
                    {collapsed && badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cn(
                            'ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                            item.path === '/branch/new-sale'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : item.path === '/notifications'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-primary/15 text-primary'
                          )}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-3 border-t space-y-2">
        <button 
          onClick={toggleTheme} 
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          title={`Current theme: ${
            theme === 'jungle'
              ? 'Dark Jungle Green'
              : theme === 'pink'
              ? 'Neon Pink'
              : theme === 'aqua'
              ? 'Oceanic Aqua'
              : theme === 'cyan'
              ? 'Dark Cyan'
              : theme === 'obsidian-sleek' || (theme as string) === 'sleek-tech'
              ? 'Obsidian Sleek'
              : theme === 'dark'
              ? 'Dark Mode'
              : 'Light Mode'
          } (click to cycle)`}
        >
          {theme === 'jungle' ? (
            <Sparkles className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : theme === 'pink' ? (
            <Heart className="w-5 h-5 shrink-0 text-pink-400" />
          ) : theme === 'aqua' ? (
            <Droplets className="w-5 h-5 shrink-0 text-cyan-400" />
          ) : theme === 'cyan' ? (
            <Droplets className="w-5 h-5 shrink-0 text-cyan-500" />
          ) : theme === 'obsidian-sleek' || (theme as string) === 'sleek-tech' ? (
            <Cpu className="w-5 h-5 shrink-0 text-sky-400" />
          ) : theme === 'dark' ? (
            <Moon className="w-5 h-5 shrink-0 text-indigo-400" />
          ) : (
            <Sun className="w-5 h-5 shrink-0 text-amber-500" />
          )}
          {!collapsed && (
            <span>
              {theme === 'jungle'
                ? 'Dark Jungle'
                : theme === 'pink'
                ? 'Neon Pink'
                : theme === 'aqua'
                ? 'Oceanic Aqua'
                : theme === 'cyan'
                ? 'Bright Cyan'
                : theme === 'obsidian-sleek' || (theme as string) === 'sleek-tech'
                ? 'Obsidian Sleek'
                : theme === 'dark'
                ? 'Dark Mode'
                : 'Light Mode'}
            </span>
          )}
        </button>

        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors">
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-background border rounded-lg shadow-sm">
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-background border-r flex flex-col z-50 transition-all duration-300',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full',
          collapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export default Sidebar
