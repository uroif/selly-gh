'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CashTransactionType, CashTransactionCategory, CashTransaction } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'

interface CashTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransactionAdded: () => void
  selectedDate: Date
  editTransaction?: CashTransaction | null
}

interface TransactionFormData {
  amount: string
  description: string
}

export function CashTransactionDialog({
  open,
  onOpenChange,
  onTransactionAdded,
  selectedDate,
  editTransaction,
}: CashTransactionDialogProps) {
  const [incomeData, setIncomeData] = useState<TransactionFormData>({
    amount: '',
    description: '',
  })
  const [expenseData, setExpenseData] = useState<TransactionFormData>({
    amount: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  
  useEffect(() => {
    if (editTransaction) {
      const formattedAmount = formatAmount(editTransaction.amount.toString())
      const formData = {
        amount: formattedAmount,
        description: editTransaction.description,
      }
      
      if (editTransaction.transaction_type === 'income') {
        setIncomeData(formData)
        setExpenseData({ amount: '', description: '' })
      } else {
        setExpenseData(formData)
        setIncomeData({ amount: '', description: '' })
      }
    } else {
      
      setIncomeData({ amount: '', description: '' })
      setExpenseData({ amount: '', description: '' })
    }
  }, [editTransaction])

  const handleSubmit = async (type: CashTransactionType) => {
    setError(null)
    setLoading(true)

    try {
      const formData = type === 'income' ? incomeData : expenseData

      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const transactionDate = new Date(selectedDate)
      transactionDate.setHours(0, 0, 0, 0)

      if (transactionDate < today && !editTransaction) {
        setError('Không thể thêm giao dịch cho ngày hôm trước')
        setLoading(false)
        return
      }

      
      if (editTransaction) {
        const editDate = new Date(editTransaction.transaction_date)
        editDate.setHours(0, 0, 0, 0)
        
        if (editDate < today) {
          setError('Không thể sửa giao dịch của ngày hôm trước')
          setLoading(false)
          return
        }
      }

      
      const cleanAmount = formData.amount.replace(/\./g, '')
      const amount = parseFloat(cleanAmount)
      if (isNaN(amount) || amount <= 0) {
        setError(`Vui lòng nhập số tiền ${type === 'income' ? 'thu' : 'chi'} hợp lệ`)
        setLoading(false)
        return
      }

      if (!formData.description.trim()) {
        setError(`Vui lòng nhập mô tả ${type === 'income' ? 'thu' : 'chi'}`)
        setLoading(false)
        return
      }

      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Không thể xác định người dùng')
        setLoading(false)
        return
      }

      
      const category: CashTransactionCategory = type === 'income'
        ? 'other_income'
        : 'other_expense'

      if (editTransaction) {
        
        const { error: updateError } = await supabase
          .from('cash_transactions')
          .update({
            transaction_type: type,
            amount: amount,
            description: formData.description.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editTransaction.id)

        if (updateError) {
          console.error('Error updating transaction:', updateError)
          setError(`Lỗi: ${updateError.message}`)
          setLoading(false)
          return
        }
      } else {
        
        const { error: insertError } = await supabase
          .from('cash_transactions')
          .insert({
            transaction_date: format(selectedDate, 'yyyy-MM-dd'),
            transaction_type: type,
            amount: amount,
            category: category,
            description: formData.description.trim(),
            notes: null,
            created_by: user.id,
          })

        if (insertError) {
          console.error('Error inserting transaction:', insertError)
          setError(`Lỗi: ${insertError.message}`)
          setLoading(false)
          return
        }
      }

      
      if (type === 'income') {
        setIncomeData({ amount: '', description: '' })
      } else {
        setExpenseData({ amount: '', description: '' })
      }

      
      onOpenChange(false)
      onTransactionAdded()
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('Đã xảy ra lỗi không mong muốn')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (value: string): string => {
    
    const digitsOnly = value.replace(/\D/g, '')
    
    
    if (!digitsOnly) return ''
    
    
    return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const handleAmountChange = (type: CashTransactionType, value: string) => {
    const formatted = formatAmount(value)
    if (type === 'income') {
      setIncomeData({ ...incomeData, amount: formatted })
    } else {
      setExpenseData({ ...expenseData, amount: formatted })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {editTransaction ? 'Sửa giao dịch' : 'Thêm giao dịch thu/chi'}
          </DialogTitle>
          <DialogDescription>
            Ngày: {format(selectedDate, 'dd/MM/yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          
          <div className={`border-2 border-green-500 bg-green-50 rounded-lg p-4 ${editTransaction && editTransaction.transaction_type !== 'income' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-green-600">Thu</div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="income-amount" className="text-green-700">Số tiền (VNĐ)</Label>
                <Input
                  id="income-amount"
                  type="text"
                  placeholder="0"
                  value={incomeData.amount}
                  onChange={(e) => handleAmountChange('income', e.target.value)}
                  className="border-green-300 focus-visible:ring-green-500 !text-lg"
                  disabled={!!(editTransaction && editTransaction.transaction_type !== 'income')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="income-description" className="text-green-700">Mô tả</Label>
                <Input
                  id="income-description"
                  type="text"
                  placeholder="Nhập mô tả"
                  value={incomeData.description}
                  onChange={(e) => setIncomeData({ ...incomeData, description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      e.preventDefault()
                      handleSubmit('income')
                    }
                  }}
                  className="border-green-300 focus-visible:ring-green-500 !text-lg"
                  disabled={!!(editTransaction && editTransaction.transaction_type !== 'income')}
                />
              </div>

              <Button
                type="button"
                onClick={() => handleSubmit('income')}
                disabled={loading || !!(editTransaction && editTransaction.transaction_type !== 'income')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Đang lưu...' : editTransaction ? 'Cập nhật thu' : 'Thêm thu'}
              </Button>
            </div>
          </div>

          
          <div className={`border-2 border-red-500 bg-red-50 rounded-lg p-4 ${editTransaction && editTransaction.transaction_type !== 'expense' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="text-center mb-4">
              <div className="text-2xl font-bold text-red-600">Chi</div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="expense-amount" className="text-red-700">Số tiền (VNĐ)</Label>
                <Input
                  id="expense-amount"
                  type="text"
                  placeholder="0"
                  value={expenseData.amount}
                  onChange={(e) => handleAmountChange('expense', e.target.value)}
                  className="border-red-300 focus-visible:ring-red-500 !text-lg"
                  disabled={!!(editTransaction && editTransaction.transaction_type !== 'expense')}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="expense-description" className="text-red-700">Mô tả</Label>
                <Input
                  id="expense-description"
                  type="text"
                  placeholder="Nhập mô tả"
                  value={expenseData.description}
                  onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      e.preventDefault()
                      handleSubmit('expense')
                    }
                  }}
                  className="border-red-300 focus-visible:ring-red-500 !text-lg"
                  disabled={!!(editTransaction && editTransaction.transaction_type !== 'expense')}
                />
              </div>

              <Button
                type="button"
                onClick={() => handleSubmit('expense')}
                disabled={loading || !!(editTransaction && editTransaction.transaction_type !== 'expense')}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Đang lưu...' : editTransaction ? 'Cập nhật chi' : 'Thêm chi'}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
