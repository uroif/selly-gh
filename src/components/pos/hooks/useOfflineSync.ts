
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOfflineOrders, removeOfflineOrder, OfflineOrder } from '@/lib/offlineOrderQueue'
import { sendTelegramNotification, sendTelegramErrorLog } from '@/lib/actions/settings'
import { toast } from 'sonner'

const SYNC_INTERVAL_MS = 3000 

export function useOfflineSync(userId?: string) {
  const [pendingOrders, setPendingOrders] = useState<OfflineOrder[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const supabase = createClient()

  
  const loadPendingOrders = useCallback(() => {
    const orders = getOfflineOrders()
    setPendingOrders(orders)
  }, [])

  
  const syncOrder = useCallback(async (order: OfflineOrder): Promise<boolean> => {
    try {
      console.log(`[OfflineSync] Syncing order ${order.id}...`)

      
      const { data: createdOrder, error: orderError } = await supabase
        .from('orders')
        .insert(order.orderData)
        .select()
        .single()

      if (orderError || !createdOrder) {
        console.error('[OfflineSync] Failed to create order:', orderError)
        return false
      }

      console.log(`[OfflineSync] Order created: ${createdOrder.id}`)

      
      const orderItems = order.orderItems.map(item => ({
        ...item,
        order_id: createdOrder.id,
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('[OfflineSync] Failed to create order items:', itemsError)
        
        await supabase.from('orders').delete().eq('id', createdOrder.id)
        return false
      }

      console.log('[OfflineSync] Order items created')

      
      sendTelegramNotification(createdOrder.id).catch(console.error)

      
      removeOfflineOrder(order.id)

      
      toast.success(`Đã đồng bộ đơn hàng ${createdOrder.id.substring(0, 8)}`, {
        description: `Tổng tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.orderData.final_amount)}`,
      })

      return true
    } catch (error) {
      console.error('[OfflineSync] Unexpected error:', error)
      
      
      sendTelegramErrorLog({
        userId: order.userId,
        action: 'Offline Order Sync',
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined,
        errorDetails: [
          `Order ID: ${order.id}`,
          `Amount: ${order.orderData.final_amount}`,
          `Items: ${order.orderItems.length}`,
          `Timestamp: ${order.timestamp}`,
        ],
      }).catch(console.error)
      
      return false
    }
  }, [supabase])

  
  const processQueue = useCallback(async () => {
    
    if (isSyncing) return

    
    if (!navigator.onLine) {
      console.log('[OfflineSync] Offline, skipping sync')
      return
    }

    const orders = getOfflineOrders()
    if (orders.length === 0) {
      return
    }

    setIsSyncing(true)
    console.log(`[OfflineSync] Processing ${orders.length} pending orders...`)

    
    for (const order of orders) {
      const success = await syncOrder(order)
      if (!success) {
        
        console.log('[OfflineSync] Sync failed, will retry later')
        break
      }
    }

    
    loadPendingOrders()
    setIsSyncing(false)
  }, [isSyncing, syncOrder, loadPendingOrders])

  
  useEffect(() => {
    
    loadPendingOrders()

    
    const intervalId = setInterval(() => {
      processQueue()
    }, SYNC_INTERVAL_MS)

    
    if (navigator.onLine) {
      processQueue()
    }

    return () => {
      clearInterval(intervalId)
    }
  }, [loadPendingOrders, processQueue])

  
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Network restored, attempting sync...')
      processQueue()
    }

    const handleOffline = () => {
      console.log('[OfflineSync] Network lost')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [processQueue])

  return {
    pendingOrders,
    isSyncing,
    pendingCount: pendingOrders.length,
    manualSync: processQueue,
    refresh: loadPendingOrders,
  }
}
