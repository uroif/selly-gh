

const OFFLINE_ORDERS_KEY = 'pos_pending_sync_orders'

export interface OfflineOrder {
  id: string 
  timestamp: string
  userId: string
  orderData: {
    subtotal: number
    final_amount: number
    payment_method: 'cash' | 'transfer' | 'card'
    notes: string | null
    status: 'completed'
    created_by: string
  }
  orderItems: Array<{
    product_id: string
    quantity: number
    unit_price: number
    cost_price: number
  }>
  printed: boolean 
}


export function getOfflineOrders(): OfflineOrder[] {
  try {
    const stored = localStorage.getItem(OFFLINE_ORDERS_KEY)
    if (!stored) return []
    return JSON.parse(stored) as OfflineOrder[]
  } catch (error) {
    console.error('[OfflineQueue] Error reading offline orders:', error)
    return []
  }
}


export function addOfflineOrder(order: OfflineOrder): void {
  try {
    const orders = getOfflineOrders()
    orders.push(order)
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders))
    console.log('[OfflineQueue] Order added to queue:', order.id)
  } catch (error) {
    console.error('[OfflineQueue] Error adding offline order:', error)
    throw error
  }
}


export function removeOfflineOrder(orderId: string): void {
  try {
    const orders = getOfflineOrders()
    const filtered = orders.filter(o => o.id !== orderId)
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(filtered))
    console.log('[OfflineQueue] Order removed from queue:', orderId)
  } catch (error) {
    console.error('[OfflineQueue] Error removing offline order:', error)
    throw error
  }
}


export function clearOfflineOrders(): void {
  try {
    localStorage.removeItem(OFFLINE_ORDERS_KEY)
    console.log('[OfflineQueue] All offline orders cleared')
  } catch (error) {
    console.error('[OfflineQueue] Error clearing offline orders:', error)
  }
}


export function getOfflineOrderCount(): number {
  return getOfflineOrders().length
}


export function generateTempOrderId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
