
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { PaymentMethod, ProductWithInventory } from '@/types'
import { useCartStore } from '@/lib/stores/cartStore'
import {
  saveDraftOrder,
  deleteDraftOrder,
  getDraftOrders,
  DraftOrder
} from '@/lib/draftOrderStorage'

interface UsePOSDraftsProps {
  open: boolean
  editOrder?: { id: string } | null
  products: ProductWithInventory[]
  paymentMethod: PaymentMethod
}

export function usePOSDrafts({ open, editOrder, products, paymentMethod }: UsePOSDraftsProps) {
  const [draftOrders, setDraftOrders] = useState<DraftOrder[]>([])
  const [showDraftsList, setShowDraftsList] = useState(false)

  const {
    items,
    addItem,
    updateQuantity: updateCartQuantity,
    clearCart,
    setCurrentDraftId,
    getCurrentDraftId
  } = useCartStore()

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoadRef = useRef(true)

  
  useEffect(() => {
    if (open && !editOrder) {
      setDraftOrders(getDraftOrders())
    }
  }, [open, editOrder])

  
  useEffect(() => {
    
    
    
    
    
    if (!open || editOrder || items.length === 0 || isInitialLoadRef.current) {
      if (open && !editOrder) {
        
        isInitialLoadRef.current = false
      }
      return
    }

    
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    
    autoSaveTimeoutRef.current = setTimeout(() => {
      const draftId = getCurrentDraftId()
      const newDraftId = saveDraftOrder(items, paymentMethod, draftId || undefined)

      if (!draftId && newDraftId) {
        setCurrentDraftId(newDraftId)
      }

      
      setDraftOrders(getDraftOrders())
    }, 1000)

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [items, paymentMethod, open, editOrder, getCurrentDraftId, setCurrentDraftId])

  
  const handleLoadDraft = useCallback((draft: DraftOrder) => {
    clearCart()
    setCurrentDraftId(draft.id)

    
    draft.items.forEach((item) => {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        addItem(product)
        setTimeout(() => {
          updateCartQuantity(item.product_id, item.quantity)
        }, 0)
      }
    })

    setShowDraftsList(false)
  }, [products, addItem, updateCartQuantity, clearCart, setCurrentDraftId])

  
  const handleDeleteDraft = useCallback((draftId: string) => {
    deleteDraftOrder(draftId)
    setDraftOrders(getDraftOrders())

    
    if (getCurrentDraftId() === draftId) {
      clearCart()
      setCurrentDraftId(null)
    }
  }, [getCurrentDraftId, clearCart, setCurrentDraftId])

  
  const handleNewOrderFromDraft = useCallback(() => {
    clearCart()
    setCurrentDraftId(null)
    setShowDraftsList(false)
    isInitialLoadRef.current = true 
  }, [clearCart, setCurrentDraftId])

  
  const clearCurrentDraft = useCallback(() => {
    const draftId = getCurrentDraftId()
    if (draftId) {
      deleteDraftOrder(draftId)
      setCurrentDraftId(null)
    }
  }, [getCurrentDraftId, setCurrentDraftId])

  
  const resetInitialLoadFlag = useCallback(() => {
    isInitialLoadRef.current = true
  }, [])

  
  const currentDraftId = getCurrentDraftId()
  
  return useMemo(() => ({
    
    draftOrders,
    showDraftsList,
    setShowDraftsList,

    
    handleLoadDraft,
    handleDeleteDraft,
    handleNewOrderFromDraft,
    clearCurrentDraft,
    resetInitialLoadFlag,

    
    currentDraftId,
  }), [
    draftOrders,
    showDraftsList,
    handleLoadDraft,
    handleDeleteDraft,
    handleNewOrderFromDraft,
    clearCurrentDraft,
    resetInitialLoadFlag,
    currentDraftId,
  ])
}
