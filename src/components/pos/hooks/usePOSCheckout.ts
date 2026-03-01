
import { useState, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PaymentMethod } from '@/types'
import { useCartStore } from '@/lib/stores/cartStore'
import { calculateDiscount } from '../utils/posHelpers'
import { sendTelegramNotification, sendTelegramErrorLog } from '@/lib/actions/settings'
import { withRetry, isNetworkError } from '@/lib/utils/retry'
import { addOfflineOrder, generateTempOrderId } from '@/lib/offlineOrderQueue'
import { toast } from 'sonner'

interface OrderToEdit {
  id: string
  subtotal: number
  final_amount: number
  payment_method: PaymentMethod
  order_items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    cost_price: number
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

interface UsePOSCheckoutProps {
  editOrder?: OrderToEdit | null
  userId?: string
  onSuccess?: (orderId?: string) => void
}

export function usePOSCheckout({ editOrder, userId, onSuccess }: UsePOSCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [completedOrderAmount, setCompletedOrderAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer')
  const [showPromotion, setShowPromotion] = useState(false)
  const [promotionType, setPromotionType] = useState<'percent' | 'amount'>('amount')
  const [promotionValue, setPromotionValue] = useState('')
  const [promotionDisplayValue, setPromotionDisplayValue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])

  const { items, getSubtotal, clearCart } = useCartStore()
  const supabase = createClient()
  
  
  const isCheckoutInProgressRef = useRef(false)

  
  const discount = showPromotion ? calculateDiscount(promotionType, promotionValue, getSubtotal()) : 0
  const finalAmount = getSubtotal() - discount

  
  const handleCheckout = useCallback(async (): Promise<string | null> => {
    if (items.length === 0 || !userId) {
      return null
    }

    
    if (isCheckoutInProgressRef.current) {
      console.warn('[POS] Checkout already in progress, ignoring duplicate call')
      return null
    }

    
    isCheckoutInProgressRef.current = true
    const isEditing = !!editOrder
    setIsProcessing(true)
    setError(null)
    setErrorDetails([])
    const subtotal = getSubtotal()
    const logs: string[] = []

    try {
      logs.push(`[${new Date().toISOString()}] ✓ Starting checkout process...`)
      logs.push(`- Mode: ${isEditing ? 'UPDATE' : 'CREATE'}`)
      logs.push(`- User ID: ${userId}`)
      logs.push(`- Items count: ${items.length}`)
      logs.push(`- Subtotal: ${subtotal}`)
      logs.push(`- Final amount: ${finalAmount}`)
      logs.push(`- Payment method: ${paymentMethod}`)
      if (isEditing) {
        
        logs.push(`\n[${new Date().toISOString()}] Checking authentication...`)
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          logs.push(`❌ ERROR: Session expired`)
          setErrorDetails(logs)
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }
        logs.push(`✓ Authentication valid`)

        
        const oldValues = {
          subtotal: editOrder.subtotal,
          final_amount: editOrder.final_amount,
          discount: editOrder.subtotal - editOrder.final_amount,
          payment_method: editOrder.payment_method,
          items: editOrder.order_items.map((item) => ({
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown',
            product_sku: item.products?.sku || 'N/A',
            quantity: item.quantity,
            unit_price: item.unit_price,
            cost_price: item.cost_price,
            total: item.quantity * item.unit_price,
          })),
        }

        
        logs.push(`\n[${new Date().toISOString()}] Updating order #${editOrder.id.substring(0, 8)}...`)
        const { error: orderError } = await withRetry(
          async () => {
            const result = await supabase
              .from('orders')
              .update({
                subtotal,
                final_amount: finalAmount,
                payment_method: paymentMethod,
                notes: notes.trim() || null,
                updated_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editOrder.id)
            
            if (result.error) throw result.error
            return result
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              logs.push(`⚠️ Retry attempt ${attempt}/3: ${error.message}`)
            }
          }
        ).catch(err => ({ error: err }))

        if (orderError) {
          logs.push(`❌ ERROR updating order:`)
          logs.push(`  - Code: ${orderError.code}`)
          logs.push(`  - Message: ${orderError.message}`)
          logs.push(`  - Details: ${orderError.details}`)
          logs.push(`  - Hint: ${orderError.hint}`)
          console.error('[POS] Error updating order:', orderError)
          
          
          sendTelegramErrorLog({
            userId,
            action: 'Update Order',
            timestamp: new Date().toISOString(),
            errorType: orderError.code || 'DatabaseError',
            errorMessage: orderError.message,
            errorDetails: logs,
          }).catch(console.error)
          
          setErrorDetails(logs)
          setError(`Cập nhật đơn hàng thất bại: ${orderError.message}`)
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }
        logs.push(`✓ Order updated successfully`)

        
        logs.push(`\n[${new Date().toISOString()}] Deleting old order items...`)
        const { error: deleteError } = await withRetry(
          async () => {
            const result = await supabase
              .from('order_items')
              .delete()
              .eq('order_id', editOrder.id)
            
            if (result.error) throw result.error
            return result
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              logs.push(`⚠️ Retry attempt ${attempt}/3: ${error.message}`)
            }
          }
        ).catch(err => ({ error: err }))

        if (deleteError) {
          logs.push(`❌ ERROR deleting old order items:`)
          logs.push(`  - Code: ${deleteError.code}`)
          logs.push(`  - Message: ${deleteError.message}`)
          logs.push(`  - Details: ${deleteError.details}`)
          console.error('[POS] Error deleting old order items:', deleteError)
          
          
          sendTelegramErrorLog({
            userId,
            action: 'Delete Order Items',
            timestamp: new Date().toISOString(),
            errorType: deleteError.code || 'DatabaseError',
            errorMessage: deleteError.message,
            errorDetails: logs,
          }).catch(console.error)
          
          setErrorDetails(logs)
          setError('Xóa chi tiết đơn hàng cũ thất bại')
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }
        logs.push(`✓ Old order items deleted`)

        
        logs.push(`\n[${new Date().toISOString()}] Creating new order items (${items.length})...`)
        const orderItems = items.map((item) => ({
          order_id: editOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
        }))

        const { error: itemsError } = await withRetry(
          async () => {
            const result = await supabase
              .from('order_items')
              .insert(orderItems)
            
            if (result.error) throw result.error
            return result
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              logs.push(`⚠️ Retry attempt ${attempt}/3: ${error.message}`)
            }
          }
        ).catch(err => ({ error: err }))

        if (itemsError) {
          logs.push(`❌ ERROR creating new order items:`)
          logs.push(`  - Code: ${itemsError.code}`)
          logs.push(`  - Message: ${itemsError.message}`)
          logs.push(`  - Details: ${itemsError.details}`)
          console.error('[POS] Error creating new order items:', itemsError)
          
          
          sendTelegramErrorLog({
            userId,
            action: 'Create Order Items (Update)',
            timestamp: new Date().toISOString(),
            errorType: itemsError.code || 'DatabaseError',
            errorMessage: itemsError.message,
            errorDetails: logs,
          }).catch(console.error)
          
          setErrorDetails(logs)
          setError('Tạo chi tiết đơn hàng mới thất bại')
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }
        logs.push(`✓ New order items created`)

        
        const newItemsDetails = items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product.name,
          product_sku: item.product.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          total: item.quantity * item.unit_price,
        }))

        const itemChanges = {
          added: newItemsDetails.filter(
            (newItem) => !oldValues.items.find((oldItem) => oldItem.product_id === newItem.product_id)
          ),
          removed: oldValues.items.filter(
            (oldItem) => !newItemsDetails.find((newItem) => newItem.product_id === oldItem.product_id)
          ),
          modified: newItemsDetails.filter((newItem) => {
            const oldItem = oldValues.items.find((old) => old.product_id === newItem.product_id)
            return oldItem && (oldItem.quantity !== newItem.quantity || oldItem.unit_price !== newItem.unit_price)
          }).map((newItem) => {
            const oldItem = oldValues.items.find((old) => old.product_id === newItem.product_id)!
            return {
              product_id: newItem.product_id,
              product_name: newItem.product_name,
              product_sku: newItem.product_sku,
              old_quantity: oldItem.quantity,
              new_quantity: newItem.quantity,
              old_unit_price: oldItem.unit_price,
              new_unit_price: newItem.unit_price,
              old_total: oldItem.total,
              new_total: newItem.total,
            }
          }),
        }

        const changes = {
          old: oldValues,
          new: {
            subtotal,
            final_amount: finalAmount,
            discount,
            payment_method: paymentMethod,
            items: newItemsDetails,
          },
          summary: {
            total_items_before: oldValues.items.length,
            total_items_after: newItemsDetails.length,
            items_added: itemChanges.added.length,
            items_removed: itemChanges.removed.length,
            items_modified: itemChanges.modified.length,
            discount_before: oldValues.discount,
            discount_after: discount,
          },
          item_changes: itemChanges,
        }

        await supabase.from('order_audit_logs').insert({
          order_id: editOrder.id,
          action: 'updated',
          changed_by: userId,
          changes,
          notes: 'Order updated via POS',
        })

        logs.push(`\n[${new Date().toISOString()}] ✓ Order update completed successfully!`)
        console.log('[POS] Order update completed successfully!')

        
        window.dispatchEvent(new CustomEvent('orderUpdated', {
          detail: { orderId: editOrder.id, timestamp: new Date().toISOString() }
        }))

        setIsProcessing(false)
        isCheckoutInProgressRef.current = false
        
        setCompletedOrderAmount(finalAmount)
        setOrderComplete(true)
        
        
        onSuccess?.(editOrder.id)
        
        
        clearCart()
        return editOrder.id
      } else {
        
        logs.push(`\n[${new Date().toISOString()}] Creating new order...`)
        console.log('[POS] Creating new order')

        const { data: order, error: orderError } = await withRetry(
          async () => {
            const result = await supabase
              .from('orders')
              .insert({
                subtotal,
                final_amount: finalAmount,
                payment_method: paymentMethod,
                notes: notes.trim() || null,
                status: 'completed',
                created_by: userId,
              })
              .select()
              .single()
            
            if (result.error) throw result.error
            if (!result.data) throw new Error('No order data returned')
            return result
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              logs.push(`⚠️ Retry attempt ${attempt}/3: ${error.message}`)
            }
          }
        ).catch(err => ({ data: null, error: err }))

        if (orderError || !order) {
          logs.push(`❌ ERROR creating order:`)
          logs.push(`  - Code: ${orderError?.code}`)
          logs.push(`  - Message: ${orderError?.message}`)
          logs.push(`  - Details: ${orderError?.details}`)
          logs.push(`  - Hint: ${orderError?.hint}`)
          console.error('[POS] Error creating order:', orderError)
          
          
          if (isNetworkError(orderError)) {
            logs.push(`\n⚠️ Network error detected - Saving order offline...`)
            
            try {
              const tempOrderId = generateTempOrderId()
              const orderItemsData = items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price,
              }))
              
              addOfflineOrder({
                id: tempOrderId,
                timestamp: new Date().toISOString(),
                userId,
                orderData: {
                  subtotal,
                  final_amount: finalAmount,
                  payment_method: paymentMethod,
                  notes: notes.trim() || null,
                  status: 'completed',
                  created_by: userId,
                },
                orderItems: orderItemsData,
                printed: false,
              })
              
              logs.push(`✓ Order saved offline: ${tempOrderId}`)
              toast.warning('Mất kết nối mạng', {
                description: 'Đơn hàng đã lưu offline và sẽ tự động đồng bộ khi có mạng',
              })
              
              
              setIsProcessing(false)
              isCheckoutInProgressRef.current = false
              setCompletedOrderAmount(finalAmount)
              setOrderComplete(true)
              onSuccess?.(tempOrderId)
              clearCart()
              
              
              window.dispatchEvent(new CustomEvent('offlineOrderAdded', {
                detail: { orderId: tempOrderId, timestamp: new Date().toISOString() }
              }))
              
              return tempOrderId
            } catch (offlineError) {
              console.error('[POS] Failed to save offline order:', offlineError)
              logs.push(`❌ Failed to save offline: ${offlineError}`)
            }
          }
          
          
          sendTelegramErrorLog({
            userId,
            action: 'Create Order',
            timestamp: new Date().toISOString(),
            errorType: orderError?.code || 'DatabaseError',
            errorMessage: orderError?.message || 'Unknown error',
            errorDetails: logs,
          }).catch(console.error)
          
          setErrorDetails(logs)
          setError('Tạo đơn hàng thất bại')
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }

        logs.push(`✓ Order created: #${order.id.substring(0, 8)}`)
        console.log('[POS] Order created successfully:', order)

        
        logs.push(`\n[${new Date().toISOString()}] Creating order items (${items.length})...`)
        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
        }))

        const { error: itemsError } = await withRetry(
          async () => {
            const result = await supabase
              .from('order_items')
              .insert(orderItems)
            
            if (result.error) throw result.error
            return result
          },
          {
            maxAttempts: 3,
            delayMs: 1000,
            onRetry: (attempt, error) => {
              logs.push(`⚠️ Retry attempt ${attempt}/3: ${error.message}`)
            }
          }
        ).catch(err => ({ error: err }))

        if (itemsError) {
          logs.push(`❌ ERROR creating order items:`)
          logs.push(`  - Code: ${itemsError.code}`)
          logs.push(`  - Message: ${itemsError.message}`)
          logs.push(`  - Details: ${itemsError.details}`)
          console.error('[POS] Error creating order items:', itemsError)
          
          
          sendTelegramErrorLog({
            userId,
            action: 'Create Order Items',
            timestamp: new Date().toISOString(),
            errorType: itemsError.code || 'DatabaseError',
            errorMessage: itemsError.message,
            errorDetails: logs,
          }).catch(console.error)
          
          setErrorDetails(logs)
          setError('Tạo chi tiết đơn hàng thất bại')
          setIsProcessing(false)
          isCheckoutInProgressRef.current = false
          return null
        }

        logs.push(`✓ Order items created`)
        logs.push(`\n[${new Date().toISOString()}] ✓ Checkout completed successfully!`)
        console.log('[POS] Checkout completed successfully!')

        
        window.dispatchEvent(new CustomEvent('orderCreated', {
          detail: { orderId: order.id, timestamp: new Date().toISOString() }
        }))

        setIsProcessing(false)
        isCheckoutInProgressRef.current = false
        
        setCompletedOrderAmount(finalAmount)
        setOrderComplete(true)
        
        
        onSuccess?.(order.id)
        
        
        sendTelegramNotification(order.id).catch(console.error)

        
        clearCart()
        return order.id
      }
    } catch (err) {
      logs.push(`\n❌ UNEXPECTED ERROR:`)
      logs.push(`  - Type: ${err instanceof Error ? err.name : 'Unknown'}`)
      logs.push(`  - Message: ${err instanceof Error ? err.message : String(err)}`)
      logs.push(`  - Stack: ${err instanceof Error ? err.stack : 'N/A'}`)
      console.error('[POS] Unexpected error:', err)
      
      
      sendTelegramErrorLog({
        userId,
        action: 'Checkout Process',
        timestamp: new Date().toISOString(),
        errorType: err instanceof Error ? err.name : 'UnknownError',
        errorMessage: err instanceof Error ? err.message : String(err),
        errorDetails: logs,
        stackTrace: err instanceof Error ? err.stack : undefined,
      }).catch(console.error)
      
      setErrorDetails(logs)
      setError('Đã xảy ra lỗi không mong muốn')
      setIsProcessing(false)
      isCheckoutInProgressRef.current = false
      return null
    }
  }, [items, userId, editOrder, finalAmount, paymentMethod, notes, discount, getSubtotal, clearCart, onSuccess, supabase])

  
  const resetPromotion = useCallback(() => {
    setShowPromotion(false)
    setPromotionType('amount')
    setPromotionValue('')
    setPromotionDisplayValue('')
  }, [])

  
  const resetCheckoutState = useCallback(() => {
    setOrderComplete(false)
    setCompletedOrderAmount(0)
    setPaymentMethod('transfer')
    setNotes('')
    resetPromotion()
  }, [resetPromotion])

  
  const clearError = useCallback(() => {
    setError(null)
    setErrorDetails([])
  }, [])

  return useMemo(() => ({
    
    isProcessing,
    orderComplete,
    setOrderComplete,
    completedOrderAmount,
    paymentMethod,
    setPaymentMethod,
    showPromotion,
    setShowPromotion,
    promotionType,
    setPromotionType,
    promotionValue,
    setPromotionValue,
    promotionDisplayValue,
    setPromotionDisplayValue,
    notes,
    setNotes,
    error,
    errorDetails,

    
    discount,
    finalAmount,

    
    handleCheckout,
    resetPromotion,
    resetCheckoutState,
    clearError,
  }), [
    isProcessing,
    orderComplete,
    completedOrderAmount,
    paymentMethod,
    showPromotion,
    promotionType,
    promotionValue,
    promotionDisplayValue,
    notes,
    error,
    errorDetails,
    discount,
    finalAmount,
    handleCheckout,
    resetPromotion,
    resetCheckoutState,
    clearError,
  ])
}
