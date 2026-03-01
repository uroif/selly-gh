'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CalendarIcon, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import { POSDialog } from '@/components/pos/POSDialog'
import { OrderViewDialog } from '@/components/orders/OrderViewDialog'
import { PaymentStatsCards } from '@/components/orders/PaymentStatsCards'
import { PaymentMethodDialog } from '@/components/orders/PaymentMethodDialog'
import { vietnameseMatch } from '@/lib/vietnameseSearch'

interface OrderWithDetails extends Order {
  order_items: Array<{
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
  }>
  creator_username?: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null)
  const [posDialogOpen, setPosDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<OrderWithDetails | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [paymentMethodDialog, setPaymentMethodDialog] = useState<{
    open: boolean
    orderId: string
    currentMethod: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    console.log('[Orders Page] Starting to fetch orders for date:', selectedDate)
    setLoading(true)
    
    try {
      const startDate = startOfDay(selectedDate).toISOString()
      const endDate = endOfDay(selectedDate).toISOString()

      
      let ordersQuery = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            order_id,
            product_id,
            quantity,
            unit_price,
            cost_price,
            products (
              id,
              sku,
              name,
              price,
              cost_price,
              image_url,
              created_at
            )
          )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
      
      
      ordersQuery = ordersQuery.is('deleted_at', null).is('force_delete_at', null)

      
      const { data: ordersData, error: fetchError } = await ordersQuery
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[Orders Page] Error fetching orders:', fetchError)
        setError(`Error: ${fetchError.message}`)
        setLoading(false)
        return
      }

      console.log('[Orders Page] Orders fetched successfully:', {
        count: ordersData?.length || 0,
        orders: ordersData
      })

      
      if (ordersData && ordersData.length > 0) {
        const userIds = [...new Set(ordersData.map((o: { created_by: string }) => o.created_by).filter(Boolean))]
        
        if (userIds.length > 0) {
          console.log('[Orders Page] Fetching user profiles for:', userIds)
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds)

          if (profilesError) {
            console.warn('[Orders Page] Error fetching profiles:', profilesError)
          } else {
            console.log('[Orders Page] Profiles fetched:', profilesData)
            
            
            const userMap = new Map(profilesData?.map((p: { id: string; username: string }) => [p.id, p.username]) || [])
            
            
            const ordersWithUsers = ordersData.map((order: OrderWithDetails) => ({
              ...order,
              creator_username: order.created_by ? userMap.get(order.created_by) : undefined
            }))
            
            setOrders(ordersWithUsers)
            setLoading(false)
            console.log('[Orders Page] Fetch completed successfully')
            return
          }
        }
      }

      setOrders(ordersData || [])
    } catch (err) {
      console.error('[Orders Page] Unexpected error:', err)
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
      console.log('[Orders Page] Fetch completed')
    }
  }, [selectedDate, supabase])

  useEffect(() => {
    fetchOrders()

    
    const handleOrderCreated = (event: CustomEvent) => {
      console.log('[Orders Page] Order created event received:', event.detail)
      fetchOrders()
    }

    const handleOrderUpdated = (event: CustomEvent) => {
      console.log('[Orders Page] Order updated event received:', event.detail)
      fetchOrders()
    }

    window.addEventListener('orderCreated', handleOrderCreated as EventListener)
    window.addEventListener('orderUpdated', handleOrderUpdated as EventListener)

    
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[Orders Page] Real-time update received:', payload)
          
          fetchOrders()
        }
      )
      .subscribe()

    
    return () => {
      console.log('[Orders Page] Cleaning up listeners and subscription')
      window.removeEventListener('orderCreated', handleOrderCreated as EventListener)
      window.removeEventListener('orderUpdated', handleOrderUpdated as EventListener)
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, supabase])

  function openViewDialog(order: OrderWithDetails) {
    setViewingOrder(order)
    setViewDialogOpen(true)
  }

  function handleOrderSaved() {
    setPosDialogOpen(false)
    setEditingOrder(null)
    fetchOrders()
  }

  function navigateDate(direction: 'prev' | 'next') {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes} ${day}/${month}`
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Tiền mặt',
      card: 'Thẻ',
      transfer: 'Chuyển khoản',
    }
    return labels[method] || method
  }

  function openPaymentMethodDialog(orderId: string, currentMethod: string) {
    setPaymentMethodDialog({
      open: true,
      orderId,
      currentMethod,
    })
  }

  function closePaymentMethodDialog() {
    setPaymentMethodDialog(null)
  }

  function handlePaymentMethodChanged() {
    closePaymentMethodDialog()
    fetchOrders()
  }

  
  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true
    
    
    if (order.id.toLowerCase().includes(searchQuery.toLowerCase())) return true
    
    
    if (order.notes && vietnameseMatch(order.notes, searchQuery)) return true
    
    
    return order.order_items.some((item) =>
      item.products?.name && vietnameseMatch(item.products.name, searchQuery)
    )
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Bán hàng</h1>
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bán hàng</h1>
        
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('prev')}
            className="h-9 w-9 rounded-lg border-gray-300 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate('next')}
            className="h-9 w-9 rounded-lg border-gray-300 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-medium">Lỗi tải dữ liệu:</p>
          <p className="text-sm">{error}</p>
          <p className="text-sm mt-2">Kiểm tra console để xem chi tiết lỗi.</p>
        </div>
      )}

      
      <PaymentStatsCards
        orders={filteredOrders}
        formatCurrency={formatCurrency}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
          <CardTitle>Danh sách đơn hàng ({filteredOrders.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm sản phẩm, ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Không tìm thấy đơn hàng nào phù hợp' : `Không có đơn hàng nào trong ngày ${format(selectedDate, 'dd/MM/yyyy')}`}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Người bán</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-right">Khuyến mại</TableHead>
                    <TableHead>Hình thức TT</TableHead>
                    <TableHead className="text-center">SL SP</TableHead>
                    <TableHead className="text-center">SL SP trả lại</TableHead>
                    <TableHead className="max-w-[200px]">Ghi chú</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    
                    const totalQuantity = order.order_items.reduce((sum, item) =>
                      sum + (item.quantity > 0 ? item.quantity : 0), 0
                    )
                    
                    
                    const returnQuantity = order.order_items.reduce((sum, item) =>
                      sum + (item.quantity < 0 ? Math.abs(item.quantity) : 0), 0
                    )
                    
                    
                    const discount = order.subtotal - order.final_amount
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          <button
                            onClick={() => openViewDialog(order)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            #{order.id.substring(0, 8)}
                          </button>
                        </TableCell>
                        <TableCell>
                          {order.creator_username || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(order.final_amount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">
                          {discount > 0 ? formatCurrency(discount) : '-'}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => openPaymentMethodDialog(order.id, order.payment_method)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                          >
                            {getPaymentMethodLabel(order.payment_method)}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">
                          {totalQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          {returnQuantity > 0 ? returnQuantity : '-'}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {order.notes ? (
                            <div className="truncate text-sm text-muted-foreground" title={order.notes}>
                              {order.notes}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(order.created_at)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      
      <POSDialog
        open={posDialogOpen}
        onOpenChange={(open) => {
          setPosDialogOpen(open)
          if (!open) {
            setEditingOrder(null)
          }
        }}
        editOrder={editingOrder ? {
          id: editingOrder.id,
          subtotal: editingOrder.subtotal,
          final_amount: editingOrder.final_amount,
          payment_method: editingOrder.payment_method,
          order_items: editingOrder.order_items,
        } : null}
        onOrderSaved={handleOrderSaved}
      />

      
      <OrderViewDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open)
          if (!open) {
            setViewingOrder(null)
          }
        }}
        order={viewingOrder ? {
          id: viewingOrder.id,
          subtotal: viewingOrder.subtotal,
          final_amount: viewingOrder.final_amount,
          payment_method: viewingOrder.payment_method,
          created_at: viewingOrder.created_at,
          notes: viewingOrder.notes,
          order_items: viewingOrder.order_items,
        } : null}
      />

      
      {paymentMethodDialog && (
        <PaymentMethodDialog
          open={paymentMethodDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              closePaymentMethodDialog()
            }
          }}
          orderId={paymentMethodDialog.orderId}
          currentPaymentMethod={paymentMethodDialog.currentMethod}
          onPaymentMethodChanged={handlePaymentMethodChanged}
        />
      )}
    </div>
  )
}
