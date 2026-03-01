'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { getDay, getHours } from 'date-fns'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

type MetricType = 'revenue' | 'orders'

interface HourlyData {
  revenue: number
  orders: number
  count: number 
}

interface PeakHoursChartProps {
  dateRange: { from: Date; to: Date }
}


const HOURS = Array.from({ length: 16 }, (_, i) => i + 8)
const DAYS = [
  { key: 1, label: 'T2' },
  { key: 2, label: 'T3' },
  { key: 3, label: 'T4' },
  { key: 4, label: 'T5' },
  { key: 5, label: 'T6' },
  { key: 6, label: 'T7' },
  { key: 0, label: 'CN' },
]

export default function PeakHoursChart({ dateRange }: PeakHoursChartProps) {
  const [metric, setMetric] = useState<MetricType>('revenue')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Record<string, HourlyData>>({})
  const [maxValue, setMaxValue] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
    
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at, final_amount')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .is('deleted_at', null)
        .is('force_delete_at', null)

      if (error) throw error

      
      const gridData: Record<string, HourlyData> = {}
      
      
      DAYS.forEach(day => {
        HOURS.forEach(hour => {
          const key = `${day.key}-${hour}`
          gridData[key] = { revenue: 0, orders: 0, count: 0 }
        })
      })

      
      
      
      
      
      
      
      orders?.forEach(order => {
        const date = new Date(order.created_at)
        const day = getDay(date)
        const hour = getHours(date)

        
        if (hour >= 8 && hour <= 23) {
          const key = `${day}-${hour}`
          if (gridData[key]) {
            gridData[key].revenue += Number(order.final_amount) || 0
            gridData[key].orders += 1
          }
        }
      })

      
      let max = 0
      Object.values(gridData).forEach(cell => {
        const val = metric === 'revenue' ? cell.revenue : cell.orders
        if (val > max) max = val
      })

      setData(gridData)
      setMaxValue(max)
    } catch (err) {
      console.error('[PeakHoursChart] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  
  useEffect(() => {
    let max = 0
    Object.values(data).forEach(cell => {
      const val = metric === 'revenue' ? cell.revenue : cell.orders
      if (val > max) max = val
    })
    setMaxValue(max)
  }, [metric, data])

  const getColor = (value: number) => {
    if (value === 0) return 'bg-gray-50'
    const intensity = maxValue > 0 ? value / maxValue : 0
    
    
    if (metric === 'revenue') {
      if (intensity < 0.2) return 'bg-green-100'
      if (intensity < 0.4) return 'bg-green-200'
      if (intensity < 0.6) return 'bg-green-300'
      if (intensity < 0.8) return 'bg-green-400'
      return 'bg-green-500'
    } else {
      if (intensity < 0.2) return 'bg-blue-100'
      if (intensity < 0.4) return 'bg-blue-200'
      if (intensity < 0.6) return 'bg-blue-300'
      if (intensity < 0.8) return 'bg-blue-400'
      return 'bg-blue-500'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      compactDisplay: 'short',
      notation: 'compact'
    }).format(value)
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>Thời gian mua sắm tập trung</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="w-[300px]">
                    Biểu đồ thể hiện mức độ tập trung của doanh thu và đơn hàng theo khung giờ và thứ trong tuần. Màu càng đậm thể hiện giá trị càng cao.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
            <TabsList>
              <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
              <TabsTrigger value="orders">Đơn hàng</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="w-full overflow-auto">
            <div className="min-w-[800px]">
              
              <div className="grid grid-cols-[60px_repeat(16,1fr)] gap-1 mb-1">
                <div className="text-xs text-muted-foreground font-medium flex items-center justify-center">
                  Thứ / Giờ
                </div>
                {HOURS.map(hour => (
                  <div key={hour} className="text-xs text-muted-foreground font-medium text-center">
                    {hour}h
                  </div>
                ))}
              </div>

              
              {DAYS.map(day => (
                <div key={day.key} className="grid grid-cols-[60px_repeat(16,1fr)] gap-1 mb-1">
                  <div className="text-sm font-medium flex items-center justify-center text-muted-foreground bg-gray-50 rounded">
                    {day.label}
                  </div>
                  {HOURS.map(hour => {
                    const key = `${day.key}-${hour}`
                    const cellData = data[key] || { revenue: 0, orders: 0, count: 0 }
                    const value = metric === 'revenue' ? cellData.revenue : cellData.orders
                    
                    return (
                      <TooltipProvider key={hour}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "h-10 rounded transition-colors cursor-pointer hover:ring-2 hover:ring-ring hover:ring-offset-1",
                                getColor(value)
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="text-xs">
                              <p className="font-semibold mb-1">
                                {day.label} - {hour}:00 đến {hour}:59
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span className="text-muted-foreground">Doanh thu:</span>
                                <span className="font-medium text-right">{formatCurrency(cellData.revenue)}</span>
                                <span className="text-muted-foreground">Đơn hàng:</span>
                                <span className="font-medium text-right">{cellData.orders}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
