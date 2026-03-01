import { CartItem, PaymentMethod } from '@/types'

export interface DraftOrder {
  id: string
  items: CartItem[]
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt: string
}

const DRAFT_ORDERS_KEY = 'pos_draft_orders'
const MAX_DRAFTS = 10


export function getDraftOrders(): DraftOrder[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(DRAFT_ORDERS_KEY)
    if (!stored) return []
    
    const drafts = JSON.parse(stored) as DraftOrder[]
    return drafts.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  } catch (error) {
    console.error('Error loading draft orders:', error)
    return []
  }
}


export function saveDraftOrder(
  items: CartItem[],
  paymentMethod: PaymentMethod,
  existingDraftId?: string
): string {
  if (typeof window === 'undefined') return ''
  
  try {
    const drafts = getDraftOrders()
    const now = new Date().toISOString()
    
    
    if (existingDraftId) {
      const index = drafts.findIndex(d => d.id === existingDraftId)
      if (index !== -1) {
        drafts[index] = {
          ...drafts[index],
          items,
          paymentMethod,
          updatedAt: now,
        }
      } else {
        
        const newDraft: DraftOrder = {
          id: existingDraftId,
          items,
          paymentMethod,
          createdAt: now,
          updatedAt: now,
        }
        drafts.unshift(newDraft)
      }
    } else {
      
      const newDraft: DraftOrder = {
        id: `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        items,
        paymentMethod,
        createdAt: now,
        updatedAt: now,
      }
      drafts.unshift(newDraft)
    }
    
    
    const trimmedDrafts = drafts.slice(0, MAX_DRAFTS)
    
    localStorage.setItem(DRAFT_ORDERS_KEY, JSON.stringify(trimmedDrafts))
    
    return existingDraftId || drafts[0].id
  } catch (error) {
    console.error('Error saving draft order:', error)
    return ''
  }
}


export function getDraftOrder(id: string): DraftOrder | null {
  if (typeof window === 'undefined') return null
  
  try {
    const drafts = getDraftOrders()
    return drafts.find(d => d.id === id) || null
  } catch (error) {
    console.error('Error getting draft order:', error)
    return null
  }
}


export function deleteDraftOrder(id: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const drafts = getDraftOrders()
    const filtered = drafts.filter(d => d.id !== id)
    localStorage.setItem(DRAFT_ORDERS_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Error deleting draft order:', error)
  }
}


export function clearAllDraftOrders(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(DRAFT_ORDERS_KEY)
  } catch (error) {
    console.error('Error clearing draft orders:', error)
  }
}


export function hasDraftOrders(): boolean {
  return getDraftOrders().length > 0
}
