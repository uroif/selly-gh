'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  Receipt,
  FileText,
  Wallet,
  Printer,
  Send
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  permission?: 'view_dashboard' | 'manage_products' | 'manage_inventory' | 'use_pos' | 'view_orders' | 'view_settings' | 'view_reports' | 'view_cash_book' | 'view_invoice_settings' | 'manage_settings'
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Tổng quan',
    icon: <LayoutDashboard className="h-5 w-5" />,
    permission: 'view_dashboard',
  },
  {
    href: '/dashboard/reports',
    label: 'Báo cáo',
    icon: <FileText className="h-5 w-5" />,
    permission: 'view_reports',
  },
  {
    href: '/dashboard/products',
    label: 'Nhập hàng',
    icon: <Package className="h-5 w-5" />,
    permission: 'manage_products',
  },
  {
    href: '/dashboard/orders',
    label: 'Bán hàng',
    icon: <Receipt className="h-5 w-5" />,
    permission: 'view_orders',
  },
  {
    href: '/dashboard/cash-book',
    label: 'Sổ Quỹ',
    icon: <Wallet className="h-5 w-5" />,
    permission: 'view_cash_book',
  },
  {
    href: '/dashboard/invoice-settings',
    label: 'Phiếu In',
    icon: <Printer className="h-5 w-5" />,
    permission: 'view_invoice_settings',
  },
  {
    href: '/dashboard/telegram',
    label: 'Telegram',
    icon: <Send className="h-5 w-5" />,
    permission: 'manage_settings',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { hasPermission, loading } = usePermissions()

  
  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) return true
    return hasPermission(item.permission)
  })

  if (loading) {
    return (
      <aside className="w-52 bg-slate-900 text-white min-h-screen p-4 shrink-0">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded mb-8"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-52 bg-slate-900 text-white min-h-screen flex flex-col shrink-0">
      
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-xl font-bold">Sellly</h1>
      </div>

      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer',
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
