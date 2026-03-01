
'use client'

import { CloudOff, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OfflineOrder } from '@/lib/offlineOrderQueue'

interface POSOfflineIndicatorProps {
  pendingOrders: OfflineOrder[]
  isSyncing: boolean
  onManualSync?: () => void
}

export function POSOfflineIndicator({ 
  pendingOrders, 
  isSyncing,
  onManualSync 
}: POSOfflineIndicatorProps) {
  const pendingCount = pendingOrders.length

  if (pendingCount === 0) {
    return null 
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative"
        >
          <CloudOff className="h-4 w-4 mr-2 text-orange-500" />
          <span className="text-orange-600 font-semibold">
            {pendingCount}
          </span>
          {isSyncing && (
            <Loader2 className="h-3 w-3 ml-2 animate-spin text-blue-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Đơn hàng chờ đồng bộ</h4>
            {isSyncing ? (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang đồng bộ...
              </span>
            ) : (
              <span className="text-xs text-orange-600">
                {pendingCount} đơn
              </span>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingOrders.map((order, index) => (
              <div
                key={order.id}
                className="p-2 bg-orange-50 border border-orange-200 rounded-md text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      #{index + 1} - {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(order.orderData.final_amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(order.timestamp).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Bangkok',
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {order.orderItems.length} sản phẩm • {
                        order.orderData.payment_method === 'cash' ? 'Tiền mặt' :
                        order.orderData.payment_method === 'transfer' ? 'Chuyển khoản' :
                        'Thẻ'
                      }
                    </div>
                  </div>
                  {order.printed && (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-gray-600">
              Hệ thống tự động kiểm tra kết nối mỗi 3 giây để đồng bộ.
            </p>
            {onManualSync && !isSyncing && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManualSync}
                className="w-full"
              >
                Thử đồng bộ ngay
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
