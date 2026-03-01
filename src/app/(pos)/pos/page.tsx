'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory, PaymentMethod } from '@/types'
import { useCartStore } from '@/lib/stores/cartStore'
import { useAuth } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Plus, Minus, Trash2, ArrowLeft, Check } from 'lucide-react'

export default function POSPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal } = useCartStore()
  const { user } = useAuth()
  const supabase = createClient()
  const hasFetched = useRef(false)

  const fetchProducts = useCallback(async () => {
    
    const pageSize = 1000
    let allProducts: ProductWithInventory[] = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * pageSize
      const to = from + pageSize - 1

      const { data: batch, error } = await supabase
        .from('products')
        .select(`*, inventory_items (*)`)
        .is('deleted_at', null)
        .order('name')
        .range(from, to)

      if (error) {
        console.error('[POS] Error fetching products:', error)
        break
      }

      if (batch && batch.length > 0) {
        allProducts = [...allProducts, ...batch as ProductWithInventory[]]
        page++
        hasMore = batch.length === pageSize
      } else {
        hasMore = false
      }
    }

    console.log(`[POS] ✓ Loaded ALL ${allProducts.length} products`)
    setProducts(allProducts)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchProducts()
    }
  }, [fetchProducts])

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  async function handleCheckout() {
    if (items.length === 0 || !user) {
      console.warn('[POS] Cannot checkout: empty cart or no user')
      return
    }
    
    console.log('[POS] Starting checkout process...')
    console.log('[POS] Cart items:', items)
    console.log('[POS] User:', user)
    
    setIsProcessing(true)
    const subtotal = getSubtotal()

    console.log('[POS] Creating order with:', {
      subtotal,
      final_amount: subtotal,
      payment_method: paymentMethod,
      status: 'completed',
      created_by: user.id,
    })

    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        subtotal,
        final_amount: subtotal,
        payment_method: paymentMethod,
        status: 'completed',
        created_by: user.id,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[POS] Error creating order:', orderError)
      alert('Tạo đơn hàng thất bại')
      setIsProcessing(false)
      return
    }

    console.log('[POS] Order created successfully:', order)

    
    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      cost_price: item.cost_price,
    }))

    console.log('[POS] Creating order items:', orderItems)

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('[POS] Error creating order items:', itemsError)
      alert('Tạo chi tiết đơn hàng thất bại')
      setIsProcessing(false)
      return
    }

    console.log('[POS] Order items created successfully')
    console.log('[POS] Checkout completed successfully!')

    setIsProcessing(false)
    setOrderComplete(true)
    clearCart()
  }

  function handleNewOrder() {
    setOrderComplete(false)
    setShowPayment(false)
    setPaymentMethod('cash')
    fetchProducts() 
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Hoàn thành đơn hàng!</h2>
            <p className="text-muted-foreground mb-6">
              Đã nhận thanh toán qua {paymentMethod === 'cash' ? 'tiền mặt' : paymentMethod === 'card' ? 'thẻ' : 'chuyển khoản'}
            </p>
            <Button onClick={handleNewOrder} className="w-full">
              Đơn hàng mới
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      
      <div className="flex-1 p-4">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </Link>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm sản phẩm hoặc quét mã vạch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const stock = product.inventory_items?.quantity || 0
              const inCart = items.find((i) => i.product_id === product.id)?.quantity || 0
              const available = stock - inCart

              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    available <= 0 ? 'opacity-50' : ''
                  }`}
                  onClick={() => available > 0 && addItem(product)}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-base truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sku}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="font-bold">{formatCurrency(product.price)}</p>
                      <span className={`text-sm ${available <= 5 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        Còn: {available}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      
      <div className="w-96 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold">Đơn hàng hiện tại</h2>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Giỏ hàng trống
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center gap-2 border-b pb-3">
                  <div className="flex-1">
                    <p className="font-medium text-base">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.unit_price)} / cái
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600"
                      onClick={() => removeItem(item.product_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 space-y-4">
          <div className="flex justify-between text-lg font-bold">
            <span>Tổng cộng</span>
            <span>{formatCurrency(getSubtotal())}</span>
          </div>

          {showPayment ? (
            <div className="space-y-3">
              <p className="text-base font-medium">Phương thức thanh toán</p>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'card', 'transfer'] as PaymentMethod[]).map((method) => (
                  <Button
                    key={method}
                    variant={paymentMethod === method ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod(method)}
                    className="capitalize"
                  >
                    {method === 'cash' ? 'Tiền mặt' : method === 'card' ? 'Thẻ' : 'Chuyển khoản'}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing || items.length === 0}
              >
                {isProcessing ? 'Đang xử lý...' : `Thanh toán ${formatCurrency(getSubtotal())}`}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPayment(false)}
              >
                Hủy
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={items.length === 0}
              onClick={() => setShowPayment(true)}
            >
              Thanh toán
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
