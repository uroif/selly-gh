'use client'

import { useState, useMemo } from 'react'
import { InventoryLogWithProduct } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Pagination } from '@/components/ui/pagination'
import { Package } from 'lucide-react'

interface DailyInboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  logs: InventoryLogWithProduct[]
  totalAmount: number
  totalQuantity: number
}

export function DailyInboundDialog({
  open,
  onOpenChange,
  date,
  logs,
  totalAmount,
  totalQuantity
}: DailyInboundDialogProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  
  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return logs.slice(startIndex, startIndex + itemsPerPage)
  }, [logs, currentPage, itemsPerPage])

  
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentPage(1)
    }
    onOpenChange(newOpen)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Chi tiết nhập hàng - {date}
          </DialogTitle>
        </DialogHeader>

        
        <div className="px-6 py-4 border-b bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Tổng giá trị</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAmount)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Tổng số lượng</div>
              <div className="text-2xl font-bold text-blue-600">
                {totalQuantity.toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
            {logs.length} giao dịch nhập hàng
          </h3>
          
          <div className="space-y-1.5">
            {paginatedLogs.map((log, idx) => {
              const index = (currentPage - 1) * itemsPerPage + idx
              return (
              <div
                key={log.id}
                className="border rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
              >
                
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono text-muted-foreground shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {formatTime(log.created_at)}
                  </span>
                  <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {log.products?.sku}
                  </span>
                  <span className="font-semibold text-sm truncate flex-1">
                    {log.products?.name}
                  </span>
                </div>

                
                <div className="flex items-center text-sm">
                  <div className="flex items-center gap-1 w-[140px]">
                    <span className="text-muted-foreground text-sm">Giá:</span>
                    <span className="font-medium">
                      {formatCurrency(log.products?.cost_price || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-[140px]">
                    <span className="text-muted-foreground text-sm">Số lượng:</span>
                    <span className="font-semibold text-green-600">
                      +{log.quantity_change}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 w-[180px]">
                    <span className="text-muted-foreground text-sm">Thành tiền:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency((log.products?.cost_price || 0) * log.quantity_change)}
                    </span>
                  </div>
                  {log.notes && (
                    <div className="flex items-center gap-1 flex-1 min-w-0 pl-2 border-l">
                      <span className="text-muted-foreground text-sm shrink-0">Ghi chú:</span>
                      <span className="text-sm truncate">{log.notes}</span>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        </div>

        
        {logs.length > 0 && (
          <div className="px-4 pb-4 border-t bg-background rounded-b-lg">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={logs.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              itemLabel="giao dịch"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
