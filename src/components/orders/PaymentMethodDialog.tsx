'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface PaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string
  currentPaymentMethod: string
  onPaymentMethodChanged?: () => void
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'card', label: 'Thẻ' },
]

export function PaymentMethodDialog({
  open,
  onOpenChange,
  orderId,
  currentPaymentMethod,
  onPaymentMethodChanged,
}: PaymentMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState(currentPaymentMethod)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSave = async () => {
    if (selectedMethod === currentPaymentMethod) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    setError(null)

    try {
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('Không thể xác thực người dùng')
      }

      
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_method: selectedMethod,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (updateError) {
        throw updateError
      }

      
      onPaymentMethodChanged?.()
      
      
      onOpenChange(false)
    } catch (err) {
      console.error('[PaymentMethodDialog] Error updating payment method:', err)
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật')
    } finally {
      setSaving(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!saving) {
      
      if (!newOpen) {
        setSelectedMethod(currentPaymentMethod)
        setError(null)
      }
      onOpenChange(newOpen)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thay đổi hình thức thanh toán</DialogTitle>
          <DialogDescription>
            Đơn hàng #{orderId.substring(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-3">
            <Label>Chọn hình thức thanh toán</Label>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setSelectedMethod(method.value)}
                  disabled={saving}
                  className={`
                    w-full px-4 py-3 text-left rounded-lg border-2 transition-all
                    ${
                      selectedMethod === method.value
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
                    ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{method.label}</span>
                    {selectedMethod === method.value && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedMethod === currentPaymentMethod}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
