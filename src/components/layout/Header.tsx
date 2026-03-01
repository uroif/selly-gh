'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks'
import { User, ShoppingCart, Settings, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { POSDialog } from '@/components/pos/POSDialog'
import { hasDraftOrders } from '@/lib/draftOrderStorage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { logout } from '@/app/(auth)/login/actions'
import Link from 'next/link'

export function Header() {
  const { user, loading } = useAuth()
  const [posDialogOpen, setPosDialogOpen] = useState(false)
  const [hasDrafts, setHasDrafts] = useState(false)

  useEffect(() => {
    
    if (!posDialogOpen) {
      setHasDrafts(hasDraftOrders())
    }
  }, [posDialogOpen])

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div>
          <Button
            onClick={() => setPosDialogOpen(true)}
            className="gap-2 relative"
          >
            <ShoppingCart className="h-4 w-4" />
            Tạo đơn hàng
            {hasDrafts && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />
            )}
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="animate-pulse flex items-center gap-2">
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto p-2">
                  <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{user.username}</p>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="h-4 w-4" />
                    Cài đặt
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </header>

      <POSDialog open={posDialogOpen} onOpenChange={setPosDialogOpen} />
    </>
  )
}
