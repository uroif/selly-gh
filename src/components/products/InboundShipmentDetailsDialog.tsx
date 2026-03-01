'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InboundShipmentWithSupplier, InventoryLog, Product } from '@/types'
import { format } from 'date-fns'

interface InventoryLogWithProduct extends InventoryLog {
  products: Product | null
}

interface InboundShipmentDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shipment: InboundShipmentWithSupplier | null
}

export function InboundShipmentDetailsDialog({
  open,
  onOpenChange,
  shipment,
}: InboundShipmentDetailsDialogProps) {
  const [logs, setLogs] = useState<InventoryLogWithProduct[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const fetchShipmentDetails = useCallback(async () => {
    if (!shipment) return

    setLoading(true)
    const { data, error } = await supabase
      .from('inventory_logs')
      .select('*, products(*)')
      .eq('inbound_shipment_id', shipment.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shipment details:', error)
    } else {
      setLogs(data as InventoryLogWithProduct[])
    }
    setLoading(false)
  }, [shipment, supabase])

  useEffect(() => {
    if (open && shipment) {
      fetchShipmentDetails()
    }
  }, [open, shipment, fetchShipmentDetails])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  if (!shipment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chi tiết lô hàng nhập</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Nhà cung cấp</p>
              <p className="font-semibold">{shipment.suppliers?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ngày hóa đơn</p>
              <p className="font-semibold">
                {format(new Date(shipment.inbound_date), 'dd/MM/yyyy')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng số sản phẩm</p>
              <p className="font-semibold text-purple-600">{logs.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng số lượng nhập</p>
              <p className="font-semibold text-green-600">
                {logs.reduce((sum, log) => sum + log.quantity_change, 0).toLocaleString('vi-VN')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng tiền</p>
              <p className="font-semibold text-blue-700">
                {formatCurrency(shipment.total_amount)}
              </p>
            </div>
            {shipment.notes && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Ghi chú</p>
                <p className="font-medium">{shipment.notes}</p>
              </div>
            )}
          </div>

          
          <div>
            <h3 className="font-semibold mb-2">Danh sách sản phẩm</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Đang tải...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Không có sản phẩm
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã hàng</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead className="text-right">Số lượng nhập</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono">
                        {log.products?.sku || 'N/A'}
                      </TableCell>
                      <TableCell>{log.products?.name || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        +{log.quantity_change}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
