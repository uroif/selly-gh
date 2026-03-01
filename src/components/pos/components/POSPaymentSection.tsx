
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaymentMethod } from '@/types'
import { formatCurrency, formatNumber, getPaymentMethodLabel } from '../utils/posHelpers'

interface POSPaymentSectionProps {
  
  subtotal: number
  discount: number
  finalAmount: number
  totalQuantity: number

  
  showPromotion: boolean
  onShowPromotionChange: (show: boolean) => void
  promotionType: 'percent' | 'amount'
  onPromotionTypeChange: (type: 'percent' | 'amount') => void
  promotionValue: string
  onPromotionValueChange: (value: string) => void
  promotionDisplayValue: string
  onPromotionDisplayValueChange: (value: string) => void

  
  notes: string
  onNotesChange: (notes: string) => void

  
  paymentMethod: PaymentMethod
  onPaymentMethodChange: (method: PaymentMethod) => void

  
  onCheckout: () => void
  onCheckoutAndPrint: () => void
  onCancel: () => void
  isProcessing: boolean
  isEditMode: boolean
  hasItems: boolean
}

export function POSPaymentSection({
  subtotal,
  discount,
  finalAmount,
  totalQuantity,
  showPromotion,
  onShowPromotionChange,
  promotionType,
  onPromotionTypeChange,
  promotionValue,
  onPromotionValueChange,
  promotionDisplayValue,
  onPromotionDisplayValueChange,
  notes,
  onNotesChange,
  paymentMethod,
  onPaymentMethodChange,
  onCheckout,
  onCheckoutAndPrint,
  onCancel,
  isProcessing,
  isEditMode,
  hasItems
}: POSPaymentSectionProps) {
  const handlePromotionValueChange = (input: string) => {
    if (promotionType === 'amount') {
      
      const numericValue = input.replace(/\D/g, '')
      onPromotionValueChange(numericValue)
      
      if (numericValue) {
        const formatted = formatNumber(parseInt(numericValue))
        onPromotionDisplayValueChange(formatted)
      } else {
        onPromotionDisplayValueChange('')
      }
    } else {
      onPromotionValueChange(input)
      onPromotionDisplayValueChange(input)
    }
  }

  return (
    <div className="border-t p-6 space-y-3 bg-white rounded-b-lg">
      
      {showPromotion && (
        <div className="flex items-start justify-between gap-4 pb-2 border-b">
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">Khuyến mãi:</label>
            <select
              value={promotionType}
              onChange={(e) => onPromotionTypeChange(e.target.value as 'percent' | 'amount')}
              className="border rounded px-2 py-1 text-sm h-8"
            >
              <option value="amount">Giảm VNĐ</option>
              <option value="percent">Giảm %</option>
            </select>
            <Input
              type={promotionType === 'amount' ? 'text' : 'number'}
              min="0"
              max={promotionType === 'percent' ? '100' : undefined}
              step={promotionType === 'percent' ? '1' : '1000'}
              value={promotionType === 'amount' ? promotionDisplayValue : promotionValue}
              onChange={(e) => handlePromotionValueChange(e.target.value)}
              className="w-24 h-8"
              placeholder={promotionType === 'percent' ? '0-100' : '0'}
            />
            {promotionValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onPromotionValueChange('')
                  onPromotionDisplayValueChange('')
                }}
                className="h-8 px-2"
              >
                Xóa
              </Button>
            )}
          </div>

          
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Tổng tiền hàng</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <span>Giảm giá</span>
                <span className="font-semibold">-{formatCurrency(discount)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      
      <div className="flex items-center gap-4">
        
        <div className="flex-1 flex items-center gap-2">
          <label htmlFor="order-notes" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Ghi chú
          </label>
          <Input
            id="order-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Nhập ghi chú..."
            className="flex-1 h-9"
          />
        </div>

        
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground text-lg">Tổng số sản phẩm:</span>
            <span className="font-bold text-lg">{totalQuantity}</span>
          </div>
          <div className="flex items-center gap-1 text-lg font-bold whitespace-nowrap">
            <span>Tổng cộng</span>
            <span>{formatCurrency(finalAmount)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-2 border-t">
        
        <div className="flex items-center gap-3">
          
          <div className="flex items-center gap-2">
            {(['cash', 'transfer', 'card'] as PaymentMethod[]).map((method) => {
              const isSelected = paymentMethod === method
              const colors = {
                cash: {
                  bg: isSelected ? 'bg-green-100' : 'bg-gray-50',
                  border: isSelected ? 'border-green-400' : 'border-gray-200',
                  text: isSelected ? 'text-green-800' : 'text-gray-400',
                  hover: isSelected ? 'hover:bg-green-200' : 'hover:bg-gray-100'
                },
                transfer: {
                  bg: isSelected ? 'bg-purple-100' : 'bg-gray-50',
                  border: isSelected ? 'border-purple-400' : 'border-gray-200',
                  text: isSelected ? 'text-purple-800' : 'text-gray-400',
                  hover: isSelected ? 'hover:bg-purple-200' : 'hover:bg-gray-100'
                },
                card: {
                  bg: isSelected ? 'bg-blue-100' : 'bg-gray-50',
                  border: isSelected ? 'border-blue-400' : 'border-gray-200',
                  text: isSelected ? 'text-blue-800' : 'text-gray-400',
                  hover: isSelected ? 'hover:bg-blue-200' : 'hover:bg-gray-100'
                }
              }
              const color = colors[method]

              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => onPaymentMethodChange(method)}
                  className={`
                    h-8 px-3 rounded-md border-2 font-medium text-sm
                    transition-all cursor-pointer
                    ${color.bg} ${color.border} ${color.text} ${color.hover}
                    ${isSelected ? 'shadow-md scale-105' : 'shadow-sm'}
                  `}
                >
                  {getPaymentMethodLabel(method)}
                </button>
              )
            })}
          </div>

          
          <label className="flex items-center gap-2 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showPromotion}
              onChange={(e) => onShowPromotionChange(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium">KM</span>
          </label>
        </div>

        
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={onCheckoutAndPrint}
            disabled={isProcessing || !hasItems}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md"
          >
            Lưu đơn hàng & In
          </Button>
          <Button
            variant="default"
            onClick={onCheckout}
            disabled={isProcessing || !hasItems}
            size="sm"
          >
            {isProcessing ? 'Đang xử lý...' : (isEditMode ? 'Lưu' : 'Lưu đơn hàng')}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            size="sm"
          >
            Hủy
          </Button>
        </div>
      </div>
    </div>
  )
}
