'use client'

import { useAuth } from './useAuth'


export type Permission =
  | 'view_dashboard'
  | 'manage_products'
  | 'view_products'
  | 'manage_inventory'
  | 'view_inventory'
  | 'use_pos'
  | 'manage_settings'
  | 'view_settings'
  | 'view_orders'
  | 'view_cash_book'
  | 'view_reports'
  | 'view_invoice_settings'


const rolePermissions: Record<string, Permission[]> = {
  owner: [
    'view_dashboard',
    'manage_products',
    'view_products',
    'manage_inventory',
    'view_inventory',
    'use_pos',
    'manage_settings',
    'view_settings',
    'view_orders',
    'view_cash_book',
    'view_reports',
    'view_invoice_settings',
  ],
  staff: [
    'view_orders',      
    'view_cash_book',   
    'view_settings',    
  ],
}

export function usePermissions() {
  const { user, loading } = useAuth()

  const hasPermission = (permission: Permission): boolean => {
    if (!user) {
      return false
    }
    const permissions = rolePermissions[user.role] || []
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p))
  }

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(p))
  }

  return {
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    canViewDashboard: hasPermission('view_dashboard'),
    canManageProducts: hasPermission('manage_products'),
    canViewProducts: hasPermission('view_products'),
    canManageInventory: hasPermission('manage_inventory'),
    canViewInventory: hasPermission('view_inventory'),
    canUsePOS: hasPermission('use_pos'),
    canManageSettings: hasPermission('manage_settings'),
    canViewSettings: hasPermission('view_settings'),
    canViewOrders: hasPermission('view_orders'),
    canViewCashBook: hasPermission('view_cash_book'),
    canViewReports: hasPermission('view_reports'),
    canViewInvoiceSettings: hasPermission('view_invoice_settings'),
  }
}
