
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory } from '@/types'
import { vietnameseFilter } from '@/lib/vietnameseSearch'

interface UsePOSProductsProps {
  open: boolean
  cartItems: Array<{ product_id: string; quantity: number }>
  quantityInputRef?: React.RefObject<HTMLInputElement | null>
}

export function usePOSProducts({ open, quantityInputRef }: UsePOSProductsProps) {
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null)
  
  const supabase = createClient()
  const hasFetched = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  
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
        console.error('[usePOSProducts] Error fetching products:', error)
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

    console.log(`[usePOSProducts] ✓ Loaded ALL ${allProducts.length} products`)
    setProducts(allProducts)
    setLoading(false)
  }, [supabase])

  
  useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true
      fetchProducts()
    }
  }, [open, fetchProducts])


  
  useEffect(() => {
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    
    
    if (search.trim() === '') {
      setDebouncedSearch('')
    } else {
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedSearch(search)
      }, 150)
    }

    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [search])

  
  
  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim() || selectedProduct) {
      return []
    }
    
    const filtered = vietnameseFilter(products, debouncedSearch, (p) => [p.name, p.sku])
    const sorted = filtered.sort((a, b) => a.sku.localeCompare(b.sku, 'vi', { numeric: true }))
    return sorted.slice(0, 100)
  }, [debouncedSearch, selectedProduct, products])

  
  
  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedIndex(-1)
    } else if (filteredProducts.length > 0 && selectedIndex === -1) {
      
      setSelectedIndex(0)
    } else if (selectedIndex >= filteredProducts.length) {
      setSelectedIndex(filteredProducts.length - 1)
    }
  }, [filteredProducts, selectedIndex])

  
  const handleSelectProduct = useCallback((product: ProductWithInventory, index: number) => {
    setSelectedProduct(product)
    setSearch(`${product.sku} - ${product.name}`)
    setSelectedIndex(index)
    
    
    setTimeout(() => {
      quantityInputRef?.current?.focus()
      quantityInputRef?.current?.select()
    }, 0)
  }, [quantityInputRef])

  
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < filteredProducts.length) {
        handleSelectProduct(filteredProducts[selectedIndex], selectedIndex)
      }
    }
  }, [filteredProducts, selectedIndex, handleSelectProduct])

  
  const resetSearch = useCallback(() => {
    setSearch('')
    setSelectedProduct(null)
    setSelectedIndex(-1)
    searchInputRef.current?.focus()
  }, [])

  
  const resetFetchFlag = useCallback(() => {
    hasFetched.current = false
  }, [])

  return useMemo(() => ({
    
    products,
    loading,
    search,
    setSearch,
    selectedIndex,
    setSelectedIndex,
    selectedProduct,
    setSelectedProduct,
    
    
    filteredProducts,
    
    
    searchInputRef,
    
    
    fetchProducts,
    handleSelectProduct,
    handleSearchKeyDown,
    resetSearch,
    resetFetchFlag,
  }), [
    products,
    loading,
    search,
    selectedIndex,
    selectedProduct,
    filteredProducts,
    fetchProducts,
    handleSelectProduct,
    handleSearchKeyDown,
    resetSearch,
    resetFetchFlag,
  ])
}
