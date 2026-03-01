'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { InventoryLogWithProduct } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { Search, Package, TrendingUp, ChevronRight } from 'lucide-react'
import { DailyInboundDialog } from '@/components/products/DailyInboundDialog'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { vietnameseMatch } from '@/lib/vietnameseSearch'

interface InboundReportTabProps {
  onDataLoaded?: () => void
}

interface DailyInboundData {
  date: string
  logs: InventoryLogWithProduct[]
  totalAmount: number
  totalQuantity: number
}

export function InboundReportTab({ onDataLoaded }: InboundReportTabProps) {
  const [inboundLogs, setInboundLogs] = useState<InventoryLogWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDay, setSelectedDay] = useState<DailyInboundData | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date())
  })
  
  const supabase = createClient()
  const hasFetched = useRef(false)

  const fetchInboundLogs = useCallback(async () => {
    setLoading(true)
    
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('inventory_logs')
        .select(`*, products!inner (*)`)
        .eq('type', 'inbound')
        .is('products.deleted_at', null)
        .is('deleted_at', null)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false })

      if (logsError) {
        console.error('Error fetching inbound logs:', logsError)
      } else {
        setInboundLogs(logsData as InventoryLogWithProduct[])
      }
    } catch (error) {
      console.error('Unexpected error fetching inbound logs:', error)
    } finally {
      setLoading(false)
      onDataLoaded?.()
    }
  }, [supabase, dateRange, onDataLoaded])

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchInboundLogs()
    }
  }, [fetchInboundLogs])

  
  useEffect(() => {
    if (hasFetched.current) {
      fetchInboundLogs()
    }
  }, [dateRange, fetchInboundLogs])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatDateKey = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: vi })
  }

  
  
  

  
  const groupedData: DailyInboundData[] = (() => {
    const groups: Record<string, DailyInboundData> = {}

    inboundLogs.forEach((log) => {
      const dateKey = formatDateKey(log.created_at)
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          logs: [],
          totalAmount: 0,
          totalQuantity: 0
        }
      }

      groups[dateKey].logs.push(log)
      groups[dateKey].totalQuantity += log.quantity_change
      
      
      if (log.products) {
        groups[dateKey].totalAmount += log.products.cost_price * log.quantity_change
      }
    })

    return Object.values(groups).sort((a, b) => {
      
      const dateA = new Date(a.date.split('/').reverse().join('-'))
      const dateB = new Date(b.date.split('/').reverse().join('-'))
      return dateB.getTime() - dateA.getTime()
    })
  })()

  
  const filteredGroupedData = groupedData.map(day => {
    if (!search.trim()) return day
    
    const filteredLogs = day.logs.filter(log => {
      return (
        vietnameseMatch(log.products?.name || '', search) ||
        vietnameseMatch(log.products?.sku || '', search) ||
        vietnameseMatch(log.notes || '', search)
      )
    })

    if (filteredLogs.length === 0) return null

    
    const totalAmount = filteredLogs.reduce((sum, log) => 
      sum + (log.products?.cost_price || 0) * log.quantity_change, 0
    )
    const totalQuantity = filteredLogs.reduce((sum, log) => 
      sum + log.quantity_change, 0
    )

    return {
      ...day,
      logs: filteredLogs,
      totalAmount,
      totalQuantity
    }
  }).filter((day): day is DailyInboundData => day !== null)

  
  const overallTotals = filteredGroupedData.reduce(
    (acc, day) => ({
      totalAmount: acc.totalAmount + day.totalAmount,
      totalQuantity: acc.totalQuantity + day.totalQuantity
    }),
    { totalAmount: 0, totalQuantity: 0 }
  )

  const handleFromDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: startOfDay(date),
        to: prev.to
      }))
    }
  }

  const handleToDateSelect = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: prev.from,
        to: endOfDay(date)
      }))
    }
  }

  const setQuickDateRange = (days: number) => {
    setDateRange({
      from: startOfDay(subDays(new Date(), days - 1)),
      to: endOfDay(new Date())
    })
  }

  const handleDayClick = (dayData: DailyInboundData) => {
    setSelectedDay(dayData)
    setIsDialogOpen(true)
  }

  
  const totalPages = Math.ceil(filteredGroupedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredGroupedData.slice(startIndex, endIndex)

  
  useEffect(() => {
    setCurrentPage(1)
  }, [search, dateRange])

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border-green-200 border rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600" aria-hidden="true">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">Tổng giá trị nhập</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(overallTotals.totalAmount)}
            </div>
            <div className="text-xs text-gray-600">
              {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border-blue-200 border rounded-lg p-4 transition-transform hover:scale-105">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600" aria-hidden="true">
              <Package className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium text-gray-700">Tổng số lượng</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-blue-900">
              {overallTotals.totalQuantity.toLocaleString('vi-VN')}
            </div>
            <div className="text-xs text-gray-600">
              Sản phẩm đã nhập
            </div>
          </div>
        </div>
      </div>

      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm sản phẩm..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            
            <div className="flex gap-2 flex-wrap items-center">
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Từ:</label>
                <Input
                  type="date"
                  value={format(dateRange.from, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    if (!isNaN(date.getTime())) {
                      handleFromDateSelect(date)
                    }
                  }}
                  className="w-auto"
                />
              </div>

              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Đến:</label>
                <Input
                  type="date"
                  value={format(dateRange.to, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = new Date(e.target.value)
                    if (!isNaN(date.getTime())) {
                      handleToDateSelect(date)
                    }
                  }}
                  min={format(dateRange.from, 'yyyy-MM-dd')}
                  className="w-auto"
                />
              </div>

              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(7)}
              >
                7 ngày
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(30)}
              >
                30 ngày
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(90)}
              >
                90 ngày
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Đang tải dữ liệu...
            </div>
          ) : filteredGroupedData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? 'Không tìm thấy sản phẩm' : 'Không có dữ liệu nhập hàng trong khoảng thời gian này'}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {paginatedData.map((dayData) => (
                  <div
                    key={dayData.date}
                    onClick={() => handleDayClick(dayData)}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <h3 className="font-semibold text-base">{dayData.date}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                          {dayData.logs.length} giao dịch
                        </span>
                      </div>
                      
                      
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">Giá trị:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(dayData.totalAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-muted-foreground">Số lượng:</span>
                          <span className="font-bold text-blue-600">
                            {dayData.totalQuantity.toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>

              
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredGroupedData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value)
                  setCurrentPage(1)
                }}
                itemLabel="ngày"
              />
            </div>
          )}
        </CardContent>
      </Card>

      
      {selectedDay && (
        <DailyInboundDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          date={selectedDay.date}
          logs={selectedDay.logs}
          totalAmount={selectedDay.totalAmount}
          totalQuantity={selectedDay.totalQuantity}
        />
      )}
    </div>
  )
}
