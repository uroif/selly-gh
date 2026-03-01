'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { History } from 'lucide-react'

interface ProductHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithInventory | null
}

type HistoryEntry = {
  id: string
  type: 'sale' | 'inbound' | 'adjustment' | 'outbound'
  quantity_change: number
  notes?: string
  created_at: string
  order_id?: string
  unit_price?: number
}

export function ProductHistoryDialog({ open, onOpenChange, product }: ProductHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchHistory = async () => {
    if (!product) return

    setLoading(true)
    
    
    const { data: inventoryLogs, error: inventoryError } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('product_id', product.id)

    if (inventoryError) {
      console.error('Error fetching inventory logs:', inventoryError)
    }

    
    const { data: orderItems, error: orderError } = await supabase
      .from('order_items')
      .select('*, orders(id, created_at, status)')
      .eq('product_id', product.id)

    if (orderError) {
      console.error('Error fetching order items:', orderError)
    }

    
    const combinedHistory: HistoryEntry[] = []

    
    if (inventoryLogs) {
      inventoryLogs.forEach((log) => {
        combinedHistory.push({
          id: log.id,
          type: log.type,
          quantity_change: log.quantity_change,
          notes: log.notes,
          created_at: log.created_at,
        })
      })
    }

    
    if (orderItems) {
      
      orderItems.forEach((item: any) => {
        combinedHistory.push({
          id: item.id,
          type: 'sale',
          quantity_change: -item.quantity, 
          notes: `Đơn hàng #${item.orders?.id?.slice(0, 8)}`,
          created_at: item.orders?.created_at || new Date().toISOString(),
          order_id: item.orders?.id,
          unit_price: parseFloat(item.unit_price),
        })
      })
    }

    
    combinedHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    setHistory(combinedHistory)
    setLoading(false)
  }

  useEffect(() => {
    if (open && product) {
      fetchHistory()
    }
    
  }, [open, product])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sale':
        return 'Bán hàng'
      case 'inbound':
        return 'Nhập hàng'
      case 'adjustment':
        return 'Điều chỉnh'
      case 'outbound':
        return 'Xuất hàng'
      default:
        return type
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <History className="h-6 w-6" />
            Lịch sử giao dịch - {product?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          
          <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-2">
            <div>
              <span className="text-sm text-muted-foreground">Mã hàng:</span>
              <span className="ml-2 font-mono font-semibold">{product?.sku}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tồn kho hiện tại:</span>
              <span className="ml-2 font-bold text-lg">
                {product?.inventory_items?.quantity || 0} sản phẩm
              </span>
            </div>
          </div>

          
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải lịch sử...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có hoạt động nào
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      entry.quantity_change > 0 ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    {index < history.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>

                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{getTypeLabel(entry.type)}</span>
                          <span className={`text-lg font-bold ${
                            entry.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.quantity_change > 0 ? '+' : ''}{entry.quantity_change}
                          </span>
                          {entry.unit_price && (
                            <span className="text-sm text-muted-foreground">
                              @ {formatCurrency(entry.unit_price)}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
