'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DailyCashSummary, CashTransactionWithUser } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarIcon, Plus, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { CashSummaryCards } from '@/components/cash-book/CashSummaryCards'
import { CashTransactionDialog } from '@/components/cash-book/CashTransactionDialog'
import { CashTransactionList } from '@/components/cash-book/CashTransactionList'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter } from 'next/navigation'

export default function CashBookPage() {
  const { canViewCashBook, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [summary, setSummary] = useState<DailyCashSummary>({
    opening_balance: 0,
    cash_sales: 0,
    other_income: 0,
    total_expenses: 0,
    closing_balance: 0,
  })
  const [transactions, setTransactions] = useState<CashTransactionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const supabase = createClient()

  
  const ensureDailyBalanceExists = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      
      const { data: existingRecord, error: checkError } = await supabase
        .from('daily_cash_balance')
        .select('id')
        .eq('balance_date', dateStr)
        .maybeSingle()
      
      if (checkError) {
        console.error('Error checking balance existence:', checkError)
        return
      }
      
      
      if (!existingRecord) {
        const { error: rpcError } = await supabase
          .rpc('update_daily_cash_balance_for_date', {
            p_date: dateStr,
            force_update: false  
          })
        
        if (rpcError) {
          console.error('Error auto-creating balance:', rpcError)
          
        } else {
          console.log('Auto-created daily balance for', dateStr)
        }
      }
    } catch (err) {
      console.error('Unexpected error ensuring balance exists:', err)
      
    }
  }, [selectedDate, supabase])

  
  const fetchDailySummary = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      const { data, error: summaryError } = await supabase
        .rpc('get_daily_cash_summary', {
          target_date: dateStr
        })
        .single()

      if (summaryError) {
        console.error('Error fetching summary:', summaryError)
        setError(`Lỗi tải tóm tắt: ${summaryError.message}`)
        return
      }

      if (data) {
        setSummary(data as DailyCashSummary)
      } else {
        setSummary({
          opening_balance: 0,
          cash_sales: 0,
          other_income: 0,
          total_expenses: 0,
          closing_balance: 0,
        })
      }
    } catch (err) {
      console.error('Unexpected error fetching summary:', err)
      setError('Lỗi không mong muốn khi tải tóm tắt')
    }
  }, [selectedDate, supabase])

  
  const fetchTransactions = useCallback(async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      const { data, error: transError } = await supabase
        .from('cash_transactions')
        .select(`
          *,
          profiles:created_by (
            username
          )
        `)
        .eq('transaction_date', dateStr)
        .order('created_at', { ascending: false })

      if (transError) {
        console.error('Error fetching transactions:', transError)
        setError(`Lỗi tải giao dịch: ${transError.message}`)
        return
      }

      
      const transactionsWithUsers = (data || []).map(transaction => ({
        ...transaction,
        creator_username: transaction.profiles?.username,
      }))

      setTransactions(transactionsWithUsers)
    } catch (err) {
      console.error('Unexpected error fetching transactions:', err)
      setError('Lỗi không mong muốn khi tải giao dịch')
    }
  }, [selectedDate, supabase])

  
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    
    await ensureDailyBalanceExists()
    
    
    await Promise.all([
      fetchDailySummary(),
      fetchTransactions(),
    ])
    
    setLoading(false)
  }, [ensureDailyBalanceExists, fetchDailySummary, fetchTransactions])

  
  useEffect(() => {
    
    if (!permissionsLoading && !canViewCashBook) {
      
      router.push('/dashboard/orders')
      return
    }

    if (!permissionsLoading && canViewCashBook) {
      fetchData()
    }
  }, [fetchData, canViewCashBook, permissionsLoading, router])

  
  useEffect(() => {
    const channel = supabase
      .channel('cash-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_transactions',
        },
        () => {
          console.log('Cash transaction changed, refetching data')
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData, supabase])

  const handleTransactionAdded = () => {
    fetchData()
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      
      const transaction = transactions.find(t => t.id === id)
      if (transaction) {
        const transactionDate = new Date(transaction.transaction_date)
        transactionDate.setHours(0, 0, 0, 0)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (transactionDate < today) {
          setError('Không thể xóa giao dịch của ngày hôm trước')
          return
        }
      }

      const { error: deleteError } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting transaction:', deleteError)
        setError(`Lỗi xóa giao dịch: ${deleteError.message}`)
        return
      }

      fetchData()
    } catch (err) {
      console.error('Unexpected error deleting transaction:', err)
      setError('Lỗi không mong muốn khi xóa giao dịch')
    }
  }

  const [refreshLoading, setRefreshLoading] = useState(false)

  const handleRefreshOpeningBalance = async () => {
    setRefreshLoading(true)
    setError(null)
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      
      
      const { error: rpcError } = await supabase
        .rpc('update_daily_cash_balance_for_date', {
          p_date: dateStr,
          force_update: true  
        })
      
      if (rpcError) {
        console.error('Error recalculating balance:', rpcError)
        setError(`Lỗi tính lại số dư: ${rpcError.message}`)
        setRefreshLoading(false)
        return
      }
      
      
      await fetchDailySummary()
      
    } catch (err) {
      console.error('Unexpected error refreshing balance:', err)
      setError('Lỗi không mong muốn khi tính lại số dư')
    } finally {
      setRefreshLoading(false)
    }
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  const isSelectedDatePast = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const selected = new Date(selectedDate)
    selected.setHours(0, 0, 0, 0)
    return selected < today
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

  
  if (permissionsLoading || loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sổ Quỹ</h1>
        <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  
  if (!canViewCashBook) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sổ Quỹ</h1>
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-8 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="h-6 w-6" />
            <p className="font-semibold text-lg">Không có quyền truy cập</p>
          </div>
          <p className="text-sm ml-9">
            Bạn không có quyền xem Sổ Quỹ. Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sổ Quỹ</h1>
        
        
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

          <Button
            onClick={() => setDialogOpen(true)}
            className="ml-4"
            disabled={isSelectedDatePast()}
            title={isSelectedDatePast() ? 'Không thể thêm giao dịch cho ngày hôm trước' : 'Thêm giao dịch'}
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm giao dịch
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <p className="font-medium">Lỗi:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      
      <CashSummaryCards
        summary={summary}
        formatCurrency={formatCurrency}
        onRefreshOpeningBalance={handleRefreshOpeningBalance}
        refreshLoading={refreshLoading}
      />

      
      <Card>
        <CardHeader>
          <CardTitle>Giao dịch trong ngày ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <CashTransactionList
            transactions={transactions}
            formatCurrency={formatCurrency}
            formatDateTime={formatDateTime}
            onDelete={handleDeleteTransaction}
            userRole="staff"
          />
        </CardContent>
      </Card>

      
      <CashTransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTransactionAdded={handleTransactionAdded}
        selectedDate={selectedDate}
        editTransaction={null}
      />
    </div>
  )
}
