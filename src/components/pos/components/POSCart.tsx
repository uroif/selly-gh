
import { Button } from '@/components/ui/button'
import { Plus, Minus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../utils/posHelpers'

interface CartItem {
  product_id: string
  product: {
    name: string
    sku: string
  }
  quantity: number
  unit_price: number
}

interface POSCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
}

export function POSCart({ items, onUpdateQuantity, onRemoveItem }: POSCartProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-3">
        <p className="text-center text-muted-foreground py-8 text-sm">
          Giỏ hàng trống
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-3">
      
      <div className="flex items-center gap-2 pb-2 px-3 border-b mb-2">
        <div className="w-20 text-xs font-semibold text-muted-foreground">Mã hàng</div>
        <div className="flex-1 text-xs font-semibold text-muted-foreground">Tên sản phẩm</div>
        <div className="w-20 text-xs font-semibold text-muted-foreground text-right">Đơn giá</div>
        <div className="w-28 text-xs font-semibold text-muted-foreground text-center">Số lượng</div>
        <div className="w-20 text-xs font-semibold text-muted-foreground text-right">Thành tiền</div>
        <div className="w-6"></div>
      </div>

      
      <div className="space-y-1.5">
        {items.map((item) => {
          const isReturnItem = item.quantity < 0
          return (
            <div
              key={item.product_id}
              className={`flex items-center gap-2 py-2 px-3 border rounded ${
                isReturnItem ? 'bg-red-50 border-red-200' : 'bg-white'
              }`}
            >
              
              <div className={`w-20 text-sm truncate ${isReturnItem ? 'text-red-700' : ''}`}>
                {item.product.sku}
              </div>
              
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate text-sm ${isReturnItem ? 'text-red-700' : ''}`}>
                  {item.product.name}
                </p>
              </div>
              
              
              <div className={`w-20 text-sm text-right ${
                isReturnItem ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {formatCurrency(item.unit_price)}
              </div>
              
              
              <div className="w-28 flex items-center justify-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className={`w-7 text-center font-medium text-sm ${
                  isReturnItem ? 'text-red-700' : ''
                }`}>
                  {Math.abs(item.quantity)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              
              <div className={`w-20 font-semibold text-right text-sm ${
                isReturnItem ? 'text-red-700' : ''
              }`}>
                {formatCurrency(item.unit_price * item.quantity)}
              </div>
              
              
              <div className="w-6">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => onRemoveItem(item.product_id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
