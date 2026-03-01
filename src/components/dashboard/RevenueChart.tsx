'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface ChartDataPoint {
  date: string
  orders: number
  amount: number
}

interface RevenueChartProps {
  dateRange: { from: Date; to: Date }
}

export default function RevenueChart({ dateRange }: RevenueChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchChartData()
    
  }, [dateRange])

  const fetchChartData = async () => {
    setLoading(true)
    try {

      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, final_amount, created_at')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .is('deleted_at', null)
        .is('force_delete_at', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[RevenueChart] Error fetching orders:', error)
        return
      }

      
      const groupedData = new Map<string, { orders: number; amount: number }>()

      
      const days: Date[] = []
      const currentDate = new Date(dateRange.from)
      
      while (currentDate <= dateRange.to) {
        days.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }

      
      days.forEach(day => {
        const key = format(day, 'dd/MM')
        if (!groupedData.has(key)) {
          groupedData.set(key, { orders: 0, amount: 0 })
        }
      })

      
      if (orders && orders.length > 0) {
        
        orders.forEach((order: any) => {
          const orderDate = new Date(order.created_at)
          const key = format(orderDate, 'dd/MM')

          const current = groupedData.get(key) || { orders: 0, amount: 0 }
          groupedData.set(key, {
            orders: current.orders + 1,
            amount: current.amount + Number(order.final_amount)
          })
        })
      }

      
      const chartData: ChartDataPoint[] = Array.from(groupedData.entries()).map(([date, data]) => ({
        date,
        orders: data.orders,
        amount: data.amount
      }))

      setChartData(chartData)
    } catch (err) {
      console.error('[RevenueChart] Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biểu đồ doanh thu & đơn hàng</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Không có dữ liệu
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Đơn hàng', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                label={{ value: 'Doanh thu', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
              <Tooltip
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (!value || !name) return [0, '']
                  if (name === 'Doanh thu') {
                    return [formatCurrency(value), name]
                  }
                  return [value, name]
                }}
                labelStyle={{ fontSize: 12 }}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => {
                  if (value === 'orders') return 'Đơn hàng'
                  if (value === 'amount') return 'Doanh thu'
                  return value
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="orders" 
                name="Đơn hàng"
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="amount" 
                name="Doanh thu"
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
