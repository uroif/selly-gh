import { create } from 'zustand'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  currentDraftId: string | null
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getItemCount: () => number
  setCurrentDraftId: (id: string | null) => void
  getCurrentDraftId: () => string | null
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  currentDraftId: null,

  addItem: (product: Product) => {
    set((state) => {
      const existingItem = state.items.find(
        (item) => item.product_id === product.id
      )

      if (existingItem) {
        
        return {
          items: state.items.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }

      
      const newItem: CartItem = {
        product_id: product.id,
        product,
        quantity: 1,
        unit_price: product.price,
        cost_price: product.cost_price,
      }

      return { items: [newItem, ...state.items] }
    })
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.product_id !== productId),
    }))
  },

  updateQuantity: (productId: string, quantity: number) => {
    
    if (quantity === 0) {
      get().removeItem(productId)
      return
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    }))
  },

  clearCart: () => {
    set({ items: [], currentDraftId: null })
  },

  getSubtotal: () => {
    return get().items.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0
    )
  },

  getItemCount: () => {
    return get().items.reduce((count, item) => count + item.quantity, 0)
  },

  setCurrentDraftId: (id: string | null) => {
    set({ currentDraftId: id })
  },

  getCurrentDraftId: () => {
    return get().currentDraftId
  },
}))
