'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderAuditLogWithUser } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronLeft, ChevronRight, Edit, History, AlertCircle, Download, Search } from 'lucide-react'
import { format, startOfDay, endOfDay } from 'date-fns'
import * as XLSX from 'xlsx'
import { POSDialog } from '@/components/pos/POSDialog'
import { AuditLogDisplay } from '@/components/orders/AuditLogDisplay'
import { ReportOrderViewDialog } from '@/components/orders/ReportOrderViewDialog'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { vietnameseFilter } from '@/lib/vietnameseSearch'

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

const ITEMS_PER_PAGE = 20

export default function ReportsPage() {
  const { canViewReports, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7) 
    return date
  })
  const [toDate, setToDate] = useState<Date>(new Date())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCostOfGoods, setTotalCostOfGoods] = useState(0)
  const [totalReturnRevenue, setTotalReturnRevenue] = useState(0)
  const [totalProfit, setTotalProfit] = useState(0)
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null)
  const [posDialogOpen, setPosDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<OrderWithDetails | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<OrderAuditLogWithUser[]>([])
  const [showCancelledOrders, setShowCancelledOrders] = useState(false)
  const [allOrdersData, setAllOrdersData] = useState<OrderWithDetails[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map())
  const supabase = createClient()

  const fetchOrders = useCallback(async (page: number = 1) => {
    console.log('[Reports Page] Starting to fetch orders from:', fromDate, 'to:', toDate, 'page:', page)
    setLoading(true)
    
    try {
      const startDate = startOfDay(fromDate).toISOString()
      const endDate = endOfDay(toDate).toISOString()

      
      let countQuery = supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .is('force_delete_at', null)
      
      if (!showCancelledOrders) {
        countQuery = countQuery.is('deleted_at', null)
      }

      const { count, error: countError } = await countQuery

      if (countError) {
        console.error('[Reports Page] Error counting orders:', countError)
        setError(`Error: ${countError.message}`)
        setLoading(false)
        return
      }

      setTotalOrders(count || 0)

      
      let allOrdersQuery = supabase
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
        .is('force_delete_at', null)
      
      if (!showCancelledOrders) {
        allOrdersQuery = allOrdersQuery.is('deleted_at', null)
      }

      const { data: allOrdersData, error: allOrdersError } = await allOrdersQuery

      
      let newUserMap = new Map<string, string>()

      if (allOrdersError) {
        console.error('[Reports Page] Error fetching all orders:', allOrdersError)
      } else if (allOrdersData) {
        
        setAllOrdersData(allOrdersData as OrderWithDetails[])
        
        
        const revenue = allOrdersData.reduce((sum: number, order: OrderWithDetails) => sum + order.final_amount, 0)
        const costOfGoods = allOrdersData.reduce((sum: number, order: OrderWithDetails) => {
          const orderCost = order.order_items.reduce((itemSum, item) =>
            itemSum + (item.cost_price * item.quantity), 0)
          return sum + orderCost
        }, 0)
        
        const returnRevenue = allOrdersData.reduce((sum: number, order: OrderWithDetails) => {
          const orderReturnRevenue = order.order_items.reduce((itemSum, item) => {
            
            if (item.quantity < 0) {
              return itemSum + (item.unit_price * Math.abs(item.quantity))
            }
            return itemSum
          }, 0)
          return sum + orderReturnRevenue
        }, 0)
        
        const profit = revenue - costOfGoods - returnRevenue
        
        setTotalRevenue(revenue)
        setTotalCostOfGoods(costOfGoods)
        setTotalReturnRevenue(returnRevenue)
        setTotalProfit(profit)

        
        const userIds = [...new Set(allOrdersData.map((o: { created_by: string }) => o.created_by).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', userIds)
          
          if (profilesData) {
            newUserMap = new Map(profilesData.map((p: { id: string; username: string }) => [p.id, p.username]))
            setUserMap(newUserMap)
          }
        }
      }

      
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1

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
        .is('force_delete_at', null)
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (!showCancelledOrders) {
        ordersQuery = ordersQuery.is('deleted_at', null)
      }

      const { data: ordersData, error: fetchError } = await ordersQuery

      if (fetchError) {
        console.error('[Reports Page] Error fetching orders:', fetchError)
        setError(`Error: ${fetchError.message}`)
        setLoading(false)
        return
      }

      
      const ordersWithUsers = (ordersData || []).map((order: OrderWithDetails) => ({
        ...order,
        creator_username: order.created_by ? newUserMap.get(order.created_by) : undefined
      }))
      
      setOrders(ordersWithUsers)
      
    } catch (err) {
      console.error('[Reports Page] Unexpected error:', err)
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
      console.log('[Reports Page] Fetch completed')
    }
  }, [fromDate, toDate, showCancelledOrders, supabase]) 

  
  useEffect(() => {
    if (!permissionsLoading && !canViewReports) {
      router.push('/dashboard/orders')
      return
    }

    if (!permissionsLoading && canViewReports) {
      
      setCurrentPage(1)
      fetchOrders(1)
    }
  }, [fromDate, toDate, showCancelledOrders, canViewReports, permissionsLoading, router, fetchOrders])

  
  useEffect(() => {
    if (!permissionsLoading && canViewReports && !searchTerm && currentPage > 1) {
       fetchOrders(currentPage)
    }
  }, [currentPage, searchTerm, fetchOrders, permissionsLoading, canViewReports])

  
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return null

    return vietnameseFilter(allOrdersData, searchTerm, (order) => {
      const searchTerms = [
        order.id, 
        order.notes || '', 
      ]
      
      
      order.order_items.forEach(item => {
        if (item.products) {
          searchTerms.push(item.products.name)
          searchTerms.push(item.products.sku)
        }
      })
      
      return searchTerms
    })
  }, [allOrdersData, searchTerm])

  const displayOrders = useMemo(() => {
    if (searchTerm.trim() && filteredOrders) {
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE
      
      return filteredOrders.slice(from, to).map(order => ({
        ...order,
        creator_username: order.created_by ? userMap.get(order.created_by) : undefined
      }))
    }
    return orders
  }, [orders, filteredOrders, searchTerm, currentPage, userMap])

  const displayTotal = searchTerm.trim() && filteredOrders ? filteredOrders.length : totalOrders
  const displayTotalPages = Math.ceil(displayTotal / ITEMS_PER_PAGE)

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

  async function fetchAuditLogs(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('order_audit_logs')
        .select(`
          *,
          profiles:changed_by (
            username
          )
        `)
        .eq('order_id', orderId)
        .order('changed_at', { ascending: false })

      if (error) {
        console.error('[Reports Page] Error fetching audit logs:', error)
        return
      }

      const logsWithUsernames = (data || []).map((log) => ({
        ...log,
        changer_username: (log as { profiles?: { username?: string } }).profiles?.username
      })) as OrderAuditLogWithUser[]

      setAuditLogs(logsWithUsernames)
    } catch (err) {
      console.error('[Reports Page] Unexpected error fetching audit logs:', err)
    }
  }

  function openEditDialog(order: OrderWithDetails) {
    setEditingOrder(order)
    setPosDialogOpen(true)
  }

  function openViewDialog(order: OrderWithDetails) {
    setViewingOrder(order)
    setViewDialogOpen(true)
  }

  function handleOrderSaved() {
    setPosDialogOpen(false)
    setEditingOrder(null)
    fetchOrders(currentPage)
  }

  function handleOrderUpdated() {
    setViewDialogOpen(false)
    setViewingOrder(null)
    fetchOrders(currentPage)
  }

  function openAuditLogDialog(orderId: string) {
    setShowAuditLog(orderId)
    fetchAuditLogs(orderId)
  }

  function toggleShowCancelledOrders() {
    setShowCancelledOrders(prev => !prev)
    setCurrentPage(1) 
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const formatDateForExcel = (dateString: string) => {
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year} ${hours}:${minutes}`
  }

  const formatDateForFilename = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const handleExportToExcel = () => {
    if (allOrdersData.length === 0) {
      alert('Không có dữ liệu để xuất')
      return
    }

    
    const summaryData = [
      { 'Thông tin': 'Từ ngày', 'Giá trị': format(fromDate, 'dd/MM/yyyy') },
      { 'Thông tin': 'Đến ngày', 'Giá trị': format(toDate, 'dd/MM/yyyy') },
      { 'Thông tin': 'Tổng đơn hàng', 'Giá trị': totalOrders },
      { 'Thông tin': 'Tổng doanh thu', 'Giá trị': totalRevenue },
      { 'Thông tin': 'Tổng doanh thu trả lại', 'Giá trị': totalReturnRevenue },
    ]

    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData)
    summaryWorksheet['!cols'] = [
      { wch: 25 }, 
      { wch: 20 }  
    ]

    
    const orderDetailsData = allOrdersData.map(order => {
      const totalQuantity = order.order_items.reduce((sum, item) =>
        sum + (item.quantity > 0 ? item.quantity : 0), 0
      )
      const returnQuantity = order.order_items.reduce((sum, item) =>
        sum + (item.quantity < 0 ? Math.abs(item.quantity) : 0), 0
      )
      const discount = order.subtotal - order.final_amount

      return {
        'ID đơn hàng': `#${order.id.substring(0, 8)}`,
        'Số tiền': order.final_amount,
        'Khuyến mại': discount > 0 ? discount : 0,
        'SL sản phẩm': totalQuantity,
        'SL trả lại': returnQuantity,
        'Ngày tạo': formatDateForExcel(order.created_at),
      }
    })

    const orderDetailsWorksheet = XLSX.utils.json_to_sheet(orderDetailsData)
    orderDetailsWorksheet['!cols'] = [
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 12 }, 
      { wch: 20 }  
    ]

    
    const productDetailsData: Array<{
      'ID đơn hàng': string
      'Ngày tạo': string
      'Mã hàng': string
      'Tên sản phẩm': string
      'Số lượng': number
      'Đơn giá': number
      'Thành tiền': number
    }> = []
    allOrdersData.forEach(order => {
      order.order_items.forEach(item => {
        const product = item.products
        productDetailsData.push({
          'ID đơn hàng': `#${order.id.substring(0, 8)}`,
          'Ngày tạo': formatDateForExcel(order.created_at),
          'Mã hàng': product?.sku || 'N/A',
          'Tên sản phẩm': product?.name || 'N/A',
          'Số lượng': item.quantity,
          'Đơn giá': item.unit_price,
          'Thành tiền': item.quantity * item.unit_price,
        })
      })
    })

    const productDetailsWorksheet = XLSX.utils.json_to_sheet(productDetailsData)
    productDetailsWorksheet['!cols'] = [
      { wch: 15 }, 
      { wch: 20 }, 
      { wch: 15 }, 
      { wch: 30 }, 
      { wch: 12 }, 
      { wch: 15 }, 
      { wch: 15 }  
    ]

    
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Tổng quan')
    XLSX.utils.book_append_sheet(workbook, orderDetailsWorksheet, 'Chi tiết đơn hàng')
    XLSX.utils.book_append_sheet(workbook, productDetailsWorksheet, 'Chi tiết sản phẩm')

    
    const fromDateStr = formatDateForFilename(fromDate)
    const toDateStr = formatDateForFilename(toDate)
    const filename = `bao-cao-don-hang-${fromDateStr}-den-${toDateStr}.xlsx`

    
    XLSX.writeFile(workbook, filename)
  }

  
  if (permissionsLoading || (loading && orders.length === 0 && !searchTerm)) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Báo cáo</h1>
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  
  if (!canViewReports) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Báo cáo</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-8 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6" />
            <p className="font-semibold text-lg">Không có quyền truy cập</p>
          </div>
          <p className="text-sm ml-9">
            Bạn không có quyền xem báo cáo. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold" onClick={toggleShowCancelledOrders}>Báo cáo</h1>
        
        
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportToExcel}
            size="sm"
            variant="outline"
            disabled={allOrdersData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={format(fromDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                setFromDate(new Date(e.target.value))
                setCurrentPage(1)
              }}
              className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <span className="text-gray-500">-</span>
          <div className="relative">
            <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={format(toDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                setToDate(new Date(e.target.value))
                setCurrentPage(1)
              }}
              className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <Button
            onClick={() => {
              setCurrentPage(1)
              fetchOrders(1)
            }}
            size="sm"
          >
            Lọc
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

      
      <div className="grid gap-4 md:grid-cols-5">
        <div 
          className="bg-white border border-gray-200 rounded-lg p-4 transition-transform hover:scale-105"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Tổng đơn hàng</span>
          </div>
          <div className={`text-2xl font-bold ${showCancelledOrders ? 'text-gray-600' : 'text-gray-900'}`}>
            {totalOrders}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Tổng doanh thu</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Tổng giá vốn</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalCostOfGoods)}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Tổng DT trả lại</span>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalReturnRevenue)}
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Lợi nhuận ước tính</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalProfit)}
          </div>
        </div>
      </div>

      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
          <CardTitle className="text-xl font-bold">
            Danh sách đơn hàng
            {displayTotal > 0 && ` (${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, displayTotal)} / ${displayTotal})`}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo sản phẩm, mã hàng..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {displayOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Không tìm thấy đơn hàng nào phù hợp' : `Không có đơn hàng nào từ ${format(fromDate, 'dd/MM/yyyy')} đến ${format(toDate, 'dd/MM/yyyy')}`}
            </div>
          ) : (
            <>
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
                      <TableHead>Ngày sửa</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayOrders.map((order) => {
                      
                      const totalQuantity = order.order_items.reduce((sum, item) =>
                        sum + (item.quantity > 0 ? item.quantity : 0), 0
                      )
                      
                      
                      const returnQuantity = order.order_items.reduce((sum, item) =>
                        sum + (item.quantity < 0 ? Math.abs(item.quantity) : 0), 0
                      )
                      
                      
                      const discount = order.subtotal - order.final_amount
                      
                      const isCancelled = !!order.deleted_at
                      
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">
                            <button
                              onClick={() => openViewDialog(order)}
                              className={`hover:underline cursor-pointer ${
                                isCancelled ? 'text-gray-300' : 'text-blue-600 hover:text-blue-800'
                              }`}
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
                            {getPaymentMethodLabel(order.payment_method)}
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
                          <TableCell>
                            {order.updated_at ? formatDateTime(order.updated_at) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(order)}
                                className="h-8 w-8 p-0"
                                title="Sửa"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openAuditLogDialog(order.id)}
                                className="h-8 w-8 p-0"
                                title="Xem lịch sử"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              
              {displayTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Trang {currentPage} / {displayTotalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || (loading && !searchTerm)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Trang trước
                    </Button>
                    
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, displayTotalPages) }, (_, i) => {
                        let pageNum
                        if (displayTotalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= displayTotalPages - 2) {
                          pageNum = displayTotalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={loading && !searchTerm}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === displayTotalPages || (loading && !searchTerm)}
                    >
                      Trang sau
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
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

      
      <ReportOrderViewDialog
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
          deleted_at: viewingOrder.deleted_at,
          order_items: viewingOrder.order_items,
          creator_username: viewingOrder.creator_username,
        } : null}
        onOrderUpdated={handleOrderUpdated}
      />

      
      <Dialog open={!!showAuditLog} onOpenChange={(open) => !open && setShowAuditLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lịch sử thay đổi</DialogTitle>
            <DialogDescription>
              Đơn hàng #{showAuditLog?.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-96 overflow-y-auto">
            <AuditLogDisplay
              logs={auditLogs}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              getPaymentMethodLabel={getPaymentMethodLabel}
            />
          </div>

          <DialogFooter>
            <Button onClick={() => setShowAuditLog(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
