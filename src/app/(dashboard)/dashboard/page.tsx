'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import RevenueChart from '@/components/dashboard/RevenueChart'
import PeakHoursChart from '@/components/dashboard/PeakHoursChart'
import { Calendar, TrendingUp, CalendarRange, AlertCircle } from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DashboardStats {
  todayRevenue: number
  todayOrderCount: number
  last30DaysRevenue: number
  last30DaysOrderCount: number
  last7DaysRevenue: number
  last7DaysOrderCount: number
}

interface BestSellingProduct {
  productId: string
  productName: string
  productSku: string
  totalQuantity: number
  totalAmount: number
}

export default function DashboardPage() {
  const { canViewDashboard, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date()),
  })
  
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayOrderCount: 0,
    last30DaysRevenue: 0,
    last30DaysOrderCount: 0,
    last7DaysRevenue: 0,
    last7DaysOrderCount: 0,
  })
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [bestSellersLoading, setBestSellersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchBestSellingProducts = useCallback(async () => {
    setBestSellersLoading(true)
    try {
      console.log('[Dashboard] Fetching best sellers for:', {
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      })

      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          unit_price,
          order:orders!inner(created_at)
        `)
        .gte('order.created_at', dateRange.from.toISOString())
        .lte('order.created_at', dateRange.to.toISOString())
        .is('order.deleted_at', null)
        .is('order.force_delete_at', null)
      
      if (orderItemsError) {
        console.error('[Dashboard] Error fetching order items:', orderItemsError)
      } else if (orderItems && orderItems.length > 0) {
        const productSales = new Map<string, { quantity: number; amount: number }>()
        
        
        orderItems.forEach((item: any) => {
          const productId = item.product_id
          const quantity = item.quantity
          const amount = Number(item.unit_price) * quantity
          
          if (productSales.has(productId)) {
            const current = productSales.get(productId)!
            productSales.set(productId, {
              quantity: current.quantity + quantity,
              amount: current.amount + amount
            })
          } else {
            productSales.set(productId, { quantity, amount })
          }
        })

        const productIds = Array.from(productSales.keys())
        const { data: productDetails, error: productDetailsError } = await supabase
          .from('products')
          .select('id, name, sku')
          .in('id', productIds)
          .is('deleted_at', null)
        
        if (productDetailsError) {
          console.error('[Dashboard] Error fetching product details:', productDetailsError)
        } else if (productDetails) {
          
          const bestSellers: BestSellingProduct[] = productDetails.map((product: any) => {
            const sales = productSales.get(product.id)!
            return {
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              totalQuantity: sales.quantity,
              totalAmount: sales.amount
            }
          })

          
          bestSellers.sort((a, b) => b.totalAmount - a.totalAmount)
          setBestSellingProducts(bestSellers.slice(0, 10))
        }
      } else {
        setBestSellingProducts([])
      }
    } catch (err) {
      console.error('[Dashboard] Error calculating best sellers:', err)
    } finally {
      setBestSellersLoading(false)
    }
  }, [supabase, dateRange])

  const fetchDashboardData = useCallback(async () => {
    console.log('[Dashboard] Starting to fetch dashboard data...')
    
    try {
      
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(todayStart)
      todayEnd.setDate(todayEnd.getDate() + 1)
      
      
      const last7DaysStart = new Date(todayStart)
      last7DaysStart.setDate(last7DaysStart.getDate() - 7)
      
      
      const last30DaysStart = new Date(todayStart)
      last30DaysStart.setDate(last30DaysStart.getDate() - 30)
      
      console.log('[Dashboard] Fetching orders for different periods:', {
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
        last7DaysStart: last7DaysStart.toISOString(),
        last30DaysStart: last30DaysStart.toISOString()
      })

      
      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, final_amount, created_at')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .is('deleted_at', null)
        .is('force_delete_at', null)
      
      if (ordersError) {
        console.error('[Dashboard] Error fetching orders:', ordersError)
        setError(`Orders error: ${ordersError.message}`)
      } else {
        console.log('[Dashboard] Today\'s orders fetched:', {
          count: todayOrders?.length || 0,
          orders: todayOrders
        })
      }

      
      const { data: last7DaysOrders, error: last7DaysError } = await supabase
        .from('orders')
        .select('id, final_amount, created_at')
        .gte('created_at', last7DaysStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .is('deleted_at', null)
        .is('force_delete_at', null)
      
      if (last7DaysError) {
        console.error('[Dashboard] Error fetching last 7 days orders:', last7DaysError)
      } else {
        console.log('[Dashboard] Last 7 days orders fetched:', {
          count: last7DaysOrders?.length || 0
        })
      }

      
      const { data: last30DaysOrders, error: last30DaysError } = await supabase
        .from('orders')
        .select('id, final_amount, created_at')
        .gte('created_at', last30DaysStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
        .is('deleted_at', null)
        .is('force_delete_at', null)
      
      if (last30DaysError) {
        console.error('[Dashboard] Error fetching last 30 days orders:', last30DaysError)
      } else {
        console.log('[Dashboard] Last 30 days orders fetched:', {
          count: last30DaysOrders?.length || 0
        })
      }

      
      const todayRevenue = todayOrders?.reduce((sum: number, order: { final_amount: number }) => sum + Number(order.final_amount), 0) || 0
      const todayOrderCount = todayOrders?.length || 0
      const last7DaysRevenue = last7DaysOrders?.reduce((sum: number, order: { final_amount: number }) => sum + Number(order.final_amount), 0) || 0
      const last7DaysOrderCount = last7DaysOrders?.length || 0
      const last30DaysRevenue = last30DaysOrders?.reduce((sum: number, order: { final_amount: number }) => sum + Number(order.final_amount), 0) || 0
      const last30DaysOrderCount = last30DaysOrders?.length || 0

      console.log('[Dashboard] Calculated stats:', {
        todayRevenue,
        todayOrderCount,
        last7DaysRevenue,
        last7DaysOrderCount,
        last30DaysRevenue,
        last30DaysOrderCount
      })

      setStats({
        todayRevenue,
        todayOrderCount,
        last30DaysRevenue,
        last30DaysOrderCount,
        last7DaysRevenue,
        last7DaysOrderCount,
      })
    } catch (err) {
      console.error('[Dashboard] Unexpected error:', err)
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
      console.log('[Dashboard] Data fetch completed')
    }
  }, [supabase])

  useEffect(() => {
    
    if (!permissionsLoading && !canViewDashboard) {
      
      router.push('/dashboard/orders')
      return
    }

    if (!permissionsLoading && canViewDashboard) {
      fetchDashboardData()
    }
  }, [fetchDashboardData, canViewDashboard, permissionsLoading, router])

  useEffect(() => {
    if (!permissionsLoading && canViewDashboard) {
      fetchBestSellingProducts()
    }
  }, [fetchBestSellingProducts, canViewDashboard, permissionsLoading])

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      setDateRange(prev => ({ ...prev, from: startOfDay(newDate) }))
    }
  }

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    if (!isNaN(newDate.getTime())) {
      setDateRange(prev => ({ ...prev, to: endOfDay(newDate) }))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  
  if (permissionsLoading || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tổng quan</h1>
        <div className="text-center py-8 text-muted-foreground">Đang tải dữ liệu...</div>
      </div>
    )
  }

  
  if (!canViewDashboard) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tổng quan</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-8 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6" />
            <p className="font-semibold text-lg">Không có quyền truy cập</p>
          </div>
          <p className="text-sm ml-9">
            Bạn không có quyền xem trang Tổng quan. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Tổng quan</h1>
        
        
        <div className="flex gap-2 items-center">
          <div className="flex gap-2 items-center">
            <Label htmlFor="dashboard-from-date" className="text-sm whitespace-nowrap">Từ ngày</Label>
            <Input
              id="dashboard-from-date"
              type="date"
              value={format(dateRange.from, 'yyyy-MM-dd')}
              onChange={handleFromDateChange}
              className="w-[150px]"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Label htmlFor="dashboard-to-date" className="text-sm whitespace-nowrap">Đến ngày</Label>
            <Input
              id="dashboard-to-date"
              type="date"
              value={format(dateRange.to, 'yyyy-MM-dd')}
              onChange={handleToDateChange}
              className="w-[150px]"
            />
          </div>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-medium">Lỗi tải dữ liệu:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-green-50 border-green-200 border rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600" aria-hidden="true">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">Doanh thu hôm nay</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(stats.todayRevenue)}
            </div>
            <div className="text-sm text-gray-600">
              {stats.todayOrderCount} đơn
            </div>
          </div>
        </div>
        
        
        <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600" aria-hidden="true">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">7 ngày qua</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(stats.last7DaysRevenue)}
            </div>
            <div className="text-sm text-gray-600">
              {stats.last7DaysOrderCount} đơn
            </div>
          </div>
        </div>
        
        
        <div className="bg-purple-50 border-purple-200 border rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-600" aria-hidden="true">
              <CalendarRange className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">30 ngày qua</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-purple-900">
              {formatCurrency(stats.last30DaysRevenue)}
            </div>
            <div className="text-sm text-gray-600">
              {stats.last30DaysOrderCount} đơn
            </div>
          </div>
        </div>
      </div>

      
      <RevenueChart dateRange={dateRange} />

      
      <PeakHoursChart dateRange={dateRange} />

      
      <Card>
        <CardHeader>
          <CardTitle>Top 10 sản phẩm bán chạy</CardTitle>
        </CardHeader>
        <CardContent>
          {bestSellersLoading ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : bestSellingProducts.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">STT</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Doanh thu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestSellingProducts.map((product, index) => (
                  <TableRow key={product.productId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{product.productSku}</TableCell>
                    <TableCell>{product.productName}</TableCell>
                    <TableCell className="text-right">{product.totalQuantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    
    </div>
  )
}
