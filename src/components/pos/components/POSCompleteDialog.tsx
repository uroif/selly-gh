
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Check } from 'lucide-react'
import { getPaymentMethodLabel } from '../utils/posHelpers'

interface POSCompleteDialogProps {
  open: boolean
  onClose: () => void
  onNewOrder: () => void
  paymentMethod: 'cash' | 'card' | 'transfer'
  finalAmount: number
}

export function POSCompleteDialog({
  open,
  onClose,
  onNewOrder,
  paymentMethod,
  finalAmount
}: POSCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hoàn thành đơn hàng!</h2>
          
          
          <div className="my-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <p className="text-sm text-muted-foreground mb-2">Tổng tiền</p>
            <p className="text-3xl text-green-600 tracking-tight">
              {new Intl.NumberFormat('vi-VN').format(finalAmount)}₫
            </p>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Đã nhận thanh toán qua {getPaymentMethodLabel(paymentMethod)}
          </p>
          <div className="space-y-2">
            <Button onClick={onNewOrder} className="w-full">
              Đơn hàng mới
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
