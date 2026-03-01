'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { printInvoice } from '@/components/pos/utils/printInvoice'
import { Printer, XCircle, RotateCcw, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  cost_price: number
  products: {
    id: string
    sku: string
    name: string
    price: number
    cost_price: number
    image_url: string | null
    created_at: string
  } | null
}

interface ReportOrderViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: {
    id: string
    subtotal: number
    final_amount: number
    payment_method: string
    created_at: string
    notes?: string | null
    deleted_at?: string | null
    order_items: OrderItem[]
    creator_username?: string
  } | null
  onOrderUpdated?: () => void
}

export function ReportOrderViewDialog({ open, onOpenChange, order, onOrderUpdated }: ReportOrderViewDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const supabase = createClient()

  if (!order) return null

  const isCancelled = !!order.deleted_at

  const handlePrint = async () => {
    setIsPrinting(true)
    try {
      await printInvoice(order.id)
    } catch (err) {
      console.error('[ReportOrderViewDialog] Print error:', err)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!user || isProcessing) return

    setIsProcessing(true)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('[ReportOrderViewDialog] Error cancelling order:', updateError)
        alert('Lỗi khi hủy đơn hàng: ' + updateError.message)
        return
      }

      
      const { error: auditError } = await supabase
        .from('order_audit_logs')
        .insert({
          order_id: order.id,
          action: 'updated',
          changed_by: user.id,
          changes: {
            deleted_at: new Date().toISOString(),
          },
        })

      if (auditError) {
        console.warn('[ReportOrderViewDialog] Error creating audit log:', auditError)
      }

      
      console.log('[ReportOrderViewDialog] Order cancelled successfully')
      
      
      onOpenChange(false)
      if (onOrderUpdated) {
        onOrderUpdated()
      }
    } catch (err) {
      console.error('[ReportOrderViewDialog] Unexpected error:', err)
      alert('Đã xảy ra lỗi không mong muốn')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRestoreOrder = async () => {
    if (!user || isProcessing) return

    setIsProcessing(true)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('[ReportOrderViewDialog] Error restoring order:', updateError)
        alert('Lỗi khi khôi phục đơn hàng: ' + updateError.message)
        return
      }

      
      const { error: auditError } = await supabase
        .from('order_audit_logs')
        .insert({
          order_id: order.id,
          action: 'updated',
          changed_by: user.id,
          changes: {
            deleted_at: null,
          },
        })

      if (auditError) {
        console.warn('[ReportOrderViewDialog] Error creating audit log:', auditError)
      }

      
      console.log('[ReportOrderViewDialog] Order restored successfully')
      
      
      onOpenChange(false)
      if (onOrderUpdated) {
        onOrderUpdated()
      }
    } catch (err) {
      console.error('[ReportOrderViewDialog] Unexpected error:', err)
      alert('Đã xảy ra lỗi không mong muốn')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleForceDelete = async () => {
    if (!user || isProcessing) return

    
    const confirmed = window.confirm(
      'Bạn có chắc chắn muốn XÓA BỎ đơn hàng này?\n\n' +
      'Hành động này sẽ:\n' +
      '- Loại bỏ đơn hàng khỏi tất cả báo cáo doanh thu\n' +
      '- Khôi phục lại tồn kho sản phẩm\n' +
      '- Loại bỏ khỏi sổ quỹ tiền mặt (nếu thanh toán bằng tiền mặt)\n\n' +
      'Chỉ sử dụng khi cần xóa hoàn toàn đơn hàng khỏi hệ thống.'
    )

    if (!confirmed) return

    setIsProcessing(true)
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          force_delete_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq('id', order.id)

      if (updateError) {
        console.error('[ReportOrderViewDialog] Error force deleting order:', updateError)
        alert('Lỗi khi xóa bỏ đơn hàng: ' + updateError.message)
        return
      }

      
      const { error: auditError } = await supabase
        .from('order_audit_logs')
        .insert({
          order_id: order.id,
          action: 'updated',
          changed_by: user.id,
          changes: {
            force_delete_at: new Date().toISOString(),
          },
        })

      if (auditError) {
        console.warn('[ReportOrderViewDialog] Error creating audit log:', auditError)
      }

      
      console.log('[ReportOrderViewDialog] Order force deleted successfully')
      alert('Đơn hàng đã được xóa bỏ thành công')
      
      
      onOpenChange(false)
      if (onOrderUpdated) {
        onOrderUpdated()
      }
    } catch (err) {
      console.error('[ReportOrderViewDialog] Unexpected error:', err)
      alert('Đã xảy ra lỗi không mong muốn')
    } finally {
      setIsProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString))
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
    }
    return labels[method] || method
  }

  const discount = order.subtotal - order.final_amount
  const hasPromotion = discount > 0
  const totalQuantity = order.order_items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle>Chi tiết đơn hàng #{order.id.substring(0, 8)}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          
          {isCancelled && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-700 font-semibold">ĐƠN HÀNG ĐÃ HỦY</span>
                <span className="text-red-600 text-sm">
                  - Đã hủy lúc: {formatDateTime(order.deleted_at!)}
                </span>
              </div>
            </div>
          )}

          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Ngày tạo:</span>
              <p className="font-medium">{formatDateTime(order.created_at)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Hình thức thanh toán:</span>
              <p className="font-medium">{getPaymentMethodLabel(order.payment_method)}</p>
            </div>
            {order.creator_username && (
              <div>
                <span className="text-muted-foreground">Người bán:</span>
                <p className="font-medium">{order.creator_username}</p>
              </div>
            )}
          </div>

          
          {order.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-amber-700 font-semibold text-sm">Ghi chú:</span>
                <p className="text-sm text-amber-900 flex-1">{order.notes}</p>
              </div>
            </div>
          )}

          
          <div>
            <h3 className="font-semibold mb-3">Sản phẩm ({order.order_items.length})</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">STT</TableHead>
                    <TableHead className="w-[100px]">Mã hàng</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="text-center w-[80px]">SL</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item, index) => {
                    const isReturn = item.quantity < 0
                    return (
                      <TableRow key={item.id} className={isReturn ? 'bg-red-50' : ''}>
                        <TableCell className="text-center">{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.products?.sku || 'N/A'}
                        </TableCell>
                        <TableCell className={isReturn ? 'text-red-700 font-medium' : ''}>
                          {item.products?.name || 'Sản phẩm đã xóa'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${isReturn ? 'text-red-700' : ''}`}>
                          {item.quantity}
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isReturn ? 'text-red-700' : ''}`}>
                          {formatCurrency(item.unit_price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tổng số lượng sản phẩm:</span>
              <span className="font-semibold">{totalQuantity}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tổng tiền hàng:</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            
            {hasPromotion && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Khuyến mãi:</span>
                <span className="font-semibold">-{formatCurrency(discount)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Tổng cộng:</span>
              <span>{formatCurrency(order.final_amount)}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-between gap-2">
          <div className="flex gap-2">
            {isCancelled ? (
              <Button
                onClick={handleRestoreOrder}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <RotateCcw className="h-4 w-4" />
                {isProcessing ? 'Đang xử lý...' : 'Khôi phục'}
              </Button>
            ) : (
              <Button
                onClick={handleCancelOrder}
                disabled={isProcessing}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                {isProcessing ? 'Đang xử lý...' : 'Hủy'}
              </Button>
            )}
            
            <Button
              onClick={handleForceDelete}
              disabled={isProcessing}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isProcessing ? 'Đang xử lý...' : 'Xóa bỏ'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Đang in...' : 'In đơn hàng'}
            </Button>
            
            <Button onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
