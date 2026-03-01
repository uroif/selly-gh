
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ShoppingCart } from 'lucide-react'
import { ProductWithInventory } from '@/types'
import { formatCurrency } from '../utils/posHelpers'

interface POSSearchBarProps {
  search: string
  onSearchChange: (value: string) => void
  selectedProduct: ProductWithInventory | null
  onProductSelect: (product: ProductWithInventory | null) => void
  selectedIndex: number
  onSelectedIndexChange: (index: number) => void
  filteredProducts: ProductWithInventory[]
  loading: boolean
  cartItems: Array<{ product_id: string; quantity: number }>
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onAddToCart: (quantity: number) => void
  isReturn: boolean
  onIsReturnChange: (value: boolean) => void
  quantityInputRef?: React.RefObject<HTMLInputElement | null>
}

export function POSSearchBar({
  search,
  onSearchChange,
  selectedProduct,
  onProductSelect,
  selectedIndex,
  filteredProducts,
  loading,
  cartItems,
  searchInputRef,
  onSearchKeyDown,
  onAddToCart,
  isReturn,
  onIsReturnChange,
  quantityInputRef: externalQuantityRef
}: POSSearchBarProps) {
  const [quantity, setQuantity] = useState('1')
  const internalQuantityRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = externalQuantityRef || internalQuantityRef

  const handleProductClick = (product: ProductWithInventory) => {
    onProductSelect(product)
    onSearchChange(product.name)
    
    
    setTimeout(() => {
      quantityInputRef.current?.focus()
      quantityInputRef.current?.select()
    }, 0)
  }

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddToCart()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onSearchChange('')
      onProductSelect(null)
      setQuantity('1')
      onIsReturnChange(false) 
      searchInputRef.current?.focus()
    }
  }

  const handleAddToCart = () => {
    const qty = parseInt(quantity) || 1
    onAddToCart(qty)
    setQuantity('1')
  }

  return (
    <div className="px-6 pt-0 pb-4 relative">
      
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <Input
            ref={searchInputRef}
            placeholder="Tìm sản phẩm..."
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value)
              onProductSelect(null)
            }}
            onKeyDown={onSearchKeyDown}
            className="pl-10"
          />

          
          {search.trim() && !selectedProduct && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-[400px] overflow-y-auto z-50">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Đang tải...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Không tìm thấy sản phẩm
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProducts.map((product, index) => {
                    const stock = product.inventory_items?.quantity || 0
                    const inCart = cartItems.find((i) => i.product_id === product.id)?.quantity || 0
                    const available = stock - inCart
                    const isSelected = index === selectedIndex

                    return (
                      <div
                        key={product.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : available <= 0
                              ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500'
                              : available <= 5
                                ? 'bg-amber-50 hover:bg-amber-100'
                                : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-muted-foreground">
                                {product.sku}
                              </span>
                              <span className="font-medium truncate">
                                {product.name}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <span className="font-semibold text-sm">
                              {formatCurrency(product.price)}
                            </span>
                            <span className={`text-sm font-semibold tabular-nums ${
                              available <= 0
                                ? 'text-red-700'
                                : available <= 5
                                  ? 'text-amber-700'
                                  : 'text-muted-foreground'
                            }`}>
                              Tồn: {available} {available <= 0 && '⚠️'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        
        {selectedProduct && (
          <Input
            ref={quantityInputRef}
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={handleQuantityKeyDown}
            className="w-20"
            placeholder="SL"
          />
        )}
      </div>

      
      {selectedProduct && (
        <div className="mt-3 flex items-center gap-3">
          
          <span className="text-sm font-semibold whitespace-nowrap">
            {formatCurrency(selectedProduct.price)}
          </span>

          
          <span className={`text-sm font-semibold whitespace-nowrap px-2 py-1 rounded ${
            (selectedProduct.inventory_items?.quantity || 0) <= 0
              ? 'bg-red-100 text-red-700'
              : (selectedProduct.inventory_items?.quantity || 0) <= 5
                ? 'bg-amber-100 text-amber-700'
                : 'text-muted-foreground'
          }`}>
            Tồn: {selectedProduct.inventory_items?.quantity || 0}
            {(selectedProduct.inventory_items?.quantity || 0) <= 0 && ' ⚠️'}
          </span>

          
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={isReturn}
              onChange={(e) => onIsReturnChange(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium">
              Hàng bán trả lại
            </span>
          </label>

          
          <Button
            onClick={handleAddToCart}
            size="sm"
            className="h-8"
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            <span className="text-sm">Thêm vào giỏ hàng</span>
          </Button>
        </div>
      )}
    </div>
  )
}
