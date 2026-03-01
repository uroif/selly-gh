'use client'



import { useEffect, useState, useCallback, useRef } from 'react'
import { printInvoice } from './utils/printInvoice'
import { useAuth } from '@/hooks'
import { useCartStore } from '@/lib/stores/cartStore'
import { PaymentMethod, OrderItem } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FolderOpen, Save } from 'lucide-react'


import { usePOSProducts } from './hooks/usePOSProducts'
import { usePOSCheckout } from './hooks/usePOSCheckout'
import { usePOSDrafts } from './hooks/usePOSDrafts'
import { useOfflineSync } from './hooks/useOfflineSync'


import { POSCompleteDialog } from './components/POSCompleteDialog'
import { POSErrorDialog } from './components/POSErrorDialog'
import { POSDraftsList } from './components/POSDraftsList'
import { POSSearchBar } from './components/POSSearchBar'
import { POSCart } from './components/POSCart'
import { POSPaymentSection } from './components/POSPaymentSection'
import { POSOfflineIndicator } from './components/POSOfflineIndicator'

interface OrderToEdit {
  id: string
  subtotal: number
  final_amount: number
  payment_method: PaymentMethod
  order_items: Array<OrderItem & {
    products: {
      id: string
      sku: string
      name: string
      price: number
      cost_price: number
      image_url: string | null
      created_at: string
    } | null
  }>
}

interface POSDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editOrder?: OrderToEdit | null
  onOrderSaved?: () => void
}

export function POSDialog({ open, onOpenChange, editOrder, onOrderSaved }: POSDialogProps) {
  const [isReturn, setIsReturn] = useState(false)
  const quantityInputRef = useState<React.RefObject<HTMLInputElement | null>>(
    () => ({ current: null })
  )[0]
  
  
  const hasInitializedRef = useRef(false)
  
  const editOrderLoadedRef = useRef<string | null>(null)
  
  const { user } = useAuth()
  const { items, addItem, updateQuantity: updateCartQuantity, removeItem, clearCart, getSubtotal } = useCartStore()

  
  const productsHook = usePOSProducts({ open, cartItems: items, quantityInputRef })
  
  
  const onSuccessRef = useRef<((orderId?: string) => void) | null>(null)
  
  const checkoutHook = usePOSCheckout({
    editOrder,
    userId: user?.id,
    onSuccess: (orderId) => {
      
      onSuccessRef.current?.(orderId)
    }
  })
  
  const draftsHook = usePOSDrafts({
    open,
    editOrder,
    products: productsHook.products,
    paymentMethod: checkoutHook.paymentMethod
  })

  
  const offlineSync = useOfflineSync(user?.id)
  
  
  useEffect(() => {
    onSuccessRef.current = () => {
      draftsHook.clearCurrentDraft()
      onOrderSaved?.()
    }
  }, [draftsHook, onOrderSaved])

  
  
  useEffect(() => {
    
    if (!open || !editOrder || productsHook.products.length === 0) {
      return
    }
    
    
    if (editOrderLoadedRef.current === editOrder.id) {
      return
    }
    
    
    editOrderLoadedRef.current = editOrder.id
    
    clearCart()
    checkoutHook.setPaymentMethod(editOrder.payment_method)

    
    const orderDiscount = editOrder.subtotal - editOrder.final_amount
    if (orderDiscount > 0) {
      checkoutHook.setShowPromotion(true)
      const percentValue = (orderDiscount / editOrder.subtotal) * 100
      
      if (Math.abs(percentValue - Math.round(percentValue)) < 0.01) {
        checkoutHook.setPromotionType('percent')
        const percentStr = Math.round(percentValue).toString()
        checkoutHook.setPromotionValue(percentStr)
        checkoutHook.setPromotionDisplayValue(percentStr)
      } else {
        checkoutHook.setPromotionType('amount')
        const amountStr = orderDiscount.toString()
        checkoutHook.setPromotionValue(amountStr)
        checkoutHook.setPromotionDisplayValue(new Intl.NumberFormat('vi-VN').format(orderDiscount))
      }
    } else {
      checkoutHook.resetPromotion()
    }

    editOrder.order_items.forEach((orderItem) => {
      if (orderItem.products) {
        const product = productsHook.products.find(p => p.id === orderItem.product_id)
        if (product) {
          addItem(product)
          setTimeout(() => {
            updateCartQuantity(orderItem.product_id, orderItem.quantity)
          }, 0)
        }
      }
    })
  }, [open, editOrder, productsHook, addItem, updateCartQuantity, clearCart, checkoutHook])

  
  
  useEffect(() => {
    if (open && !editOrder && !hasInitializedRef.current) {
      hasInitializedRef.current = true
      productsHook.setSearch('')
      productsHook.setSelectedProduct(null)
      setIsReturn(false)
      checkoutHook.resetPromotion()
      checkoutHook.setNotes('')
      draftsHook.setShowDraftsList(false)
    }
    
    if (!open) {
      hasInitializedRef.current = false
      
      editOrderLoadedRef.current = null
    }
  }, [open, editOrder, productsHook, checkoutHook, draftsHook])

  
  const handleAddToCart = (qty: number) => {
    if (productsHook.selectedProduct) {
      if (isReturn) {
        const existingItem = items.find((i) => i.product_id === productsHook.selectedProduct!.id)
        if (existingItem) {
          updateCartQuantity(productsHook.selectedProduct.id, -Math.abs(qty))
        } else {
          addItem(productsHook.selectedProduct)
          setTimeout(() => {
            updateCartQuantity(productsHook.selectedProduct!.id, -Math.abs(qty))
          }, 0)
        }
      } else {
        if (qty > 0) {
          const existingItem = items.find((i) => i.product_id === productsHook.selectedProduct!.id)
          if (existingItem) {
            updateCartQuantity(productsHook.selectedProduct.id, qty)
          } else {
            addItem(productsHook.selectedProduct)
            if (qty > 1) {
              setTimeout(() => {
                updateCartQuantity(productsHook.selectedProduct!.id, qty)
              }, 0)
            }
          }
        }
      }

      productsHook.resetSearch()
      setIsReturn(false)
    }
  }

  
  function handleNewOrder() {
    checkoutHook.setOrderComplete(false)
    checkoutHook.resetCheckoutState()
    productsHook.setSearch('')
    productsHook.setSelectedProduct(null)
    setIsReturn(false)
    draftsHook.resetInitialLoadFlag()
    productsHook.fetchProducts() 
  }

  
  function handleClose() {
    if (!checkoutHook.isProcessing) {
      checkoutHook.setOrderComplete(false)
      checkoutHook.resetCheckoutState()
      productsHook.setSearch('')
      productsHook.setSelectedProduct(null)
      setIsReturn(false)
      draftsHook.setShowDraftsList(false)
      draftsHook.resetInitialLoadFlag()
      productsHook.resetFetchFlag()
      onOpenChange(false)
    }
  }

  
  const handleCheckoutAndPrint = useCallback(async () => {
    const orderId = await checkoutHook.handleCheckout()
    if (orderId) {
      
      await printInvoice(orderId)
    }
  }, [checkoutHook])

  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'F2' && !checkoutHook.isProcessing && items.length > 0 && !checkoutHook.orderComplete) {
      event.preventDefault()
      handleCheckoutAndPrint()
    }
  }, [checkoutHook.isProcessing, items.length, checkoutHook.orderComplete, handleCheckoutAndPrint])

  
  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open, handleKeyDown])

  
  if (checkoutHook.orderComplete) {
    return (
      <POSCompleteDialog
        open={open}
        onClose={handleClose}
        onNewOrder={handleNewOrder}
        paymentMethod={checkoutHook.paymentMethod}
        finalAmount={checkoutHook.completedOrderAmount}
      />
    )
  }

  return (
    <>
      
      {checkoutHook.error && (
        <POSErrorDialog
          open={!!checkoutHook.error}
          onClose={checkoutHook.clearError}
          errorMessage={checkoutHook.error}
          errorDetails={checkoutHook.errorDetails}
        />
      )}

    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-[66vw] max-h-[90vh] p-0"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          
          setTimeout(() => {
            productsHook.searchInputRef.current?.focus()
          }, 0)
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>{editOrder ? 'Sửa đơn hàng' : 'Tạo đơn hàng'}</DialogTitle>
              {!editOrder && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => draftsHook.setShowDraftsList(!draftsHook.showDraftsList)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Đơn nháp ({draftsHook.draftOrders.length})
                  </Button>
                  <POSOfflineIndicator
                    pendingOrders={offlineSync.pendingOrders}
                    isSyncing={offlineSync.isSyncing}
                    onManualSync={offlineSync.manualSync}
                  />
                </>
              )}
            </div>
            {!editOrder && draftsHook.currentDraftId && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Save className="h-3 w-3" />
                Đã tự động lưu nháp
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
          
          {draftsHook.showDraftsList && !editOrder && (
            <POSDraftsList
              draftOrders={draftsHook.draftOrders}
              currentDraftId={draftsHook.currentDraftId}
              onLoadDraft={draftsHook.handleLoadDraft}
              onDeleteDraft={draftsHook.handleDeleteDraft}
              onNewOrder={draftsHook.handleNewOrderFromDraft}
            />
          )}

          
          <POSSearchBar
            search={productsHook.search}
            onSearchChange={productsHook.setSearch}
            selectedProduct={productsHook.selectedProduct}
            onProductSelect={productsHook.setSelectedProduct}
            selectedIndex={productsHook.selectedIndex}
            onSelectedIndexChange={productsHook.setSelectedIndex}
            filteredProducts={productsHook.filteredProducts}
            loading={productsHook.loading}
            cartItems={items}
            searchInputRef={productsHook.searchInputRef}
            onSearchKeyDown={productsHook.handleSearchKeyDown}
            onAddToCart={handleAddToCart}
            isReturn={isReturn}
            onIsReturnChange={setIsReturn}
            quantityInputRef={quantityInputRef}
          />

          
          <div className="flex-1 overflow-hidden flex flex-col border-t">
            <POSCart
              items={items}
              onUpdateQuantity={updateCartQuantity}
              onRemoveItem={removeItem}
            />

            
            <POSPaymentSection
              subtotal={getSubtotal()}
              discount={checkoutHook.discount}
              finalAmount={checkoutHook.finalAmount}
              totalQuantity={items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0)}
              showPromotion={checkoutHook.showPromotion}
              onShowPromotionChange={checkoutHook.setShowPromotion}
              promotionType={checkoutHook.promotionType}
              onPromotionTypeChange={checkoutHook.setPromotionType}
              promotionValue={checkoutHook.promotionValue}
              onPromotionValueChange={checkoutHook.setPromotionValue}
              promotionDisplayValue={checkoutHook.promotionDisplayValue}
              onPromotionDisplayValueChange={checkoutHook.setPromotionDisplayValue}
              notes={checkoutHook.notes}
              onNotesChange={checkoutHook.setNotes}
              paymentMethod={checkoutHook.paymentMethod}
              onPaymentMethodChange={checkoutHook.setPaymentMethod}
              onCheckout={checkoutHook.handleCheckout}
              onCheckoutAndPrint={handleCheckoutAndPrint}
              onCancel={handleClose}
              isProcessing={checkoutHook.isProcessing}
              isEditMode={!!editOrder}
              hasItems={items.length > 0}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
