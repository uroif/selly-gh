'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory, Supplier } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Package } from 'lucide-react'
import { useAuth } from '@/hooks'
import { vietnameseFilter } from '@/lib/vietnameseSearch'
import { toast } from 'sonner'

interface InboundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InboundDialog({ open, onOpenChange, onSuccess }: InboundDialogProps) {
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithInventory | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit: 'Chiếc',
    costPrice: '',
    sellPrice: '',
    quantity: '',
    supplierId: '',
    inboundDate: new Date().toISOString().split('T')[0]
  })

  
  const [commonUnits] = useState<string[]>([
    'Chiếc',
    'Bộ',
    'Cái',
    'Hộp',
    "Túi",
    'Đôi',
    'Thùng'
  ])

  
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false)

  
  const [supplierInput, setSupplierInput] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)

  const supabase = createClient()
  const { user } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasFetched = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  
  const getFilteredSuppliers = () => {
    if (!supplierInput.trim()) return suppliers
    return vietnameseFilter(suppliers, supplierInput, (s) => s.name)
  }

  
  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSupplierInput(supplier.name)
    setShowSupplierSuggestions(false)
    setFormData({ ...formData, supplierId: supplier.id })
  }

  const fetchProducts = async () => {
    setLoading(true)

    
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
        console.error('[InboundDialog] Error fetching products:', error)
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

    console.log(`[InboundDialog] ✓ Loaded ALL ${allProducts.length} products`)
    setProducts(allProducts)
    setLoading(false)
  }

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (error) {
      console.error('[InboundDialog] Error fetching suppliers:', error)
      setSuppliers([])
    } else {
      setSuppliers(data || [])
    }
  }

  useEffect(() => {
    if (open && !hasFetched.current) {
      hasFetched.current = true
      fetchProducts()
      fetchSuppliers()
    }
    
  }, [open])

  
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  
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

  
  useEffect(() => {
    if (open) {
      setSearch('')
      setDebouncedSearch('')
      setSelectedIndex(-1)
      setSelectedProduct(null)
      setFormData({
        name: '',
        sku: '',
        unit: 'Chiếc',
        costPrice: '',
        sellPrice: '',
        quantity: '',
        supplierId: '',
        inboundDate: new Date().toISOString().split('T')[0]
      })
      setShowUnitSuggestions(false)
      setSupplierInput('')
      setSelectedSupplier(null)
      setShowSupplierSuggestions(false)
    }
  }, [open])

  
  const filteredProducts = debouncedSearch.trim() && !selectedProduct
    ? vietnameseFilter(products, debouncedSearch, (p) => [p.sku, p.name])
      .sort((a, b) => a.sku.localeCompare(b.sku, 'vi', { numeric: true }))
      .slice(0, 100)
    : []

  
  
  useEffect(() => {
    if (filteredProducts.length === 0) {
      setSelectedIndex(-1)
    } else if (filteredProducts.length > 0 && selectedIndex === -1) {
      
      setSelectedIndex(0)
    } else if (selectedIndex >= filteredProducts.length) {
      setSelectedIndex(filteredProducts.length - 1)
    }
  }, [filteredProducts.length, selectedIndex])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  
  const handleSelectProduct = (product: ProductWithInventory, index: number) => {
    setSelectedProduct(product)
    setSearch(product.sku)
    setSelectedIndex(index)
    setFormData({
      name: product.name,
      sku: product.sku,
      unit: product.unit || 'Chiếc',
      costPrice: product.cost_price.toString(),
      sellPrice: product.price.toString(),
      quantity: '',
      supplierId: formData.supplierId,
      inboundDate: formData.inboundDate
    })
  }

  
  const getFilteredUnits = () => {
    if (!formData.unit.trim()) return commonUnits
    return commonUnits.filter(unit =>
      unit.toLowerCase().includes(formData.unit.toLowerCase())
    )
  }

  
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) {
      return
    }

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
  }

  
  const formatNumber = (value: string): string => {
    
    const number = value.replace(/\D/g, '')
    if (!number) return ''
    
    return parseInt(number).toLocaleString('vi-VN')
  }

  
  const parseFormattedNumber = (value: string): string => {
    return value.replace(/\D/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setIsProcessing(true)

    try {
      
      let supplierId: string | null = null

      if (supplierInput.trim()) {
        if (selectedSupplier) {
          supplierId = selectedSupplier.id
        } else {
          const { data: newSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert([{ name: supplierInput.trim() }])
            .select()
            .single()

          if (supplierError || !newSupplier) {
            console.error('Error creating supplier:', supplierError)
            toast.error('Tạo nhà cung cấp thất bại')
            return
          }

          supplierId = newSupplier.id
        }
      }

      
      
      let productId: string
      let successMessage: string

      if (selectedProduct) {
        
        const quantity = parseInt(formData.quantity) || 0
        const newCostPrice = parseFloat(formData.costPrice) || selectedProduct.cost_price
        const newSellPrice = parseFloat(formData.sellPrice) || selectedProduct.price
        const newUnit = formData.unit.trim() || null

        if (quantity <= 0) {
          toast.error('Vui lòng nhập số lượng hợp lệ')
          return
        }

        
        const updates: { cost_price?: number; price?: number; unit?: string | null } = {}
        if (newCostPrice !== selectedProduct.cost_price) updates.cost_price = newCostPrice
        if (newSellPrice !== selectedProduct.price) updates.price = newSellPrice
        if (newUnit !== selectedProduct.unit) updates.unit = newUnit

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('products')
            .update(updates)
            .eq('id', selectedProduct.id)

          if (updateError) {
            console.error('Error updating product:', updateError)
            toast.error('Cập nhật sản phẩm thất bại')
            return
          }
        }

        productId = selectedProduct.id

        
        let existingProductShipmentId: string | null = null
        if (supplierId) {
          const totalAmount = quantity * newCostPrice
          const { data: shipment, error: shipmentError } = await supabase
            .from('inbound_shipments')
            .insert([{
              supplier_id: supplierId,
              inbound_date: formData.inboundDate,
              total_amount: totalAmount,
              created_by: user.id,
            }])
            .select('id')
            .single()

          if (shipmentError || !shipment) {
            
            console.error('Error creating shipment:', shipmentError)
          } else {
            existingProductShipmentId = shipment.id
          }
        }

        
        const logPayloadExist: Record<string, unknown> = {
          product_id: productId,
          type: 'inbound',
          quantity_change: quantity,
          notes: supplierInput.trim() ? `Nhập hàng - ${supplierInput}` : 'Nhập hàng',
        }
        if (existingProductShipmentId) logPayloadExist.inbound_shipment_id = existingProductShipmentId

        const { error: logError } = await supabase.from('inventory_logs').insert(logPayloadExist)

        if (logError) {
          console.error('Error creating inventory log:', logError)
          
          if (existingProductShipmentId) {
            await supabase.from('inbound_shipments').delete().eq('id', existingProductShipmentId)
          }
          toast.error('Nhập hàng thất bại')
          return
        }

        successMessage = `Nhập hàng thành công: ${selectedProduct.name} (+${quantity})`

      } else {
        
        const costPrice = parseFloat(formData.costPrice) || 0
        const sellPrice = parseFloat(formData.sellPrice) || 0
        const quantity = parseInt(formData.quantity) || 0

        if (!formData.name.trim() || !formData.sku.trim()) {
          toast.error('Vui lòng nhập tên sản phẩm và mã hàng')
          return
        }
        if (costPrice <= 0 || sellPrice <= 0) {
          toast.error('Vui lòng nhập giá vốn và giá bán hợp lệ')
          return
        }
        if (quantity <= 0) {
          toast.error('Vui lòng nhập số lượng hợp lệ')
          return
        }

        
        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert([{
            sku: formData.sku,
            name: formData.name,
            unit: formData.unit.trim() || null,
            cost_price: costPrice,
            price: sellPrice,
            image_url: null
          }])
          .select()
          .single()

        if (productError || !newProduct) {
          console.error('Error creating product:', productError)
          toast.error('Tạo sản phẩm thất bại')
          return
        }

        productId = newProduct.id

        
        
        let newShipmentId: string | null = null
        if (supplierId) {
          const totalAmount = quantity * costPrice
          const { data: shipment, error: shipmentError } = await supabase
            .from('inbound_shipments')
            .insert([{
              supplier_id: supplierId,
              inbound_date: formData.inboundDate,
              total_amount: totalAmount,
              created_by: user.id,
            }])
            .select('id')
            .single()

          if (shipmentError || !shipment) {
            
            console.error('Error creating shipment:', shipmentError)
          } else {
            newShipmentId = shipment.id
          }
        }

        
        const logPayload: Record<string, unknown> = {
          product_id: productId,
          type: 'inbound',
          quantity_change: quantity,
          notes: supplierInput.trim() ? `Nhập hàng lần đầu - ${supplierInput}` : 'Nhập hàng lần đầu',
        }
        if (newShipmentId) logPayload.inbound_shipment_id = newShipmentId

        const { error: logError } = await supabase.from('inventory_logs').insert(logPayload)

        if (logError) {
          console.error('Error creating inventory log:', logError)
          
          if (newShipmentId) {
            await supabase.from('inbound_shipments').delete().eq('id', newShipmentId)
          }
          toast.error('Nhập hàng thất bại')
          return
        }

        successMessage = `Tạo sản phẩm và nhập hàng thành công: ${formData.name} (+${quantity})`
      }

      toast.success(successMessage)
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Đã xảy ra lỗi không mong muốn')
    } finally {
      setIsProcessing(false)
    }
  }

  const isNewProduct = !selectedProduct && formData.sku.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[66vw] max-w-[66vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nhập hàng
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          
          <div className="space-y-1.5">
            <Label htmlFor="product-search" className="text-base font-semibold">Mã hàng</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
              <Input
                ref={searchInputRef}
                id="product-search"
                placeholder="Tìm kiếm hoặc nhập mã hàng mới..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setSelectedProduct(null)
                  setSelectedIndex(0)
                  setFormData({ ...formData, sku: e.target.value })
                }}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
                autoComplete="off"
              />

              
              {search.trim() && !selectedProduct && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-y-auto z-50">
                  {loading ? (
                    <div className="text-center py-4 text-muted-foreground text-base">
                      Đang tải...
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map((product, index) => {
                        const isSelected = index === selectedIndex
                        const currentStock = product.inventory_items?.quantity || 0

                        return (
                          <div
                            key={product.id}
                            className={`p-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
                              }`}
                            onClick={() => handleSelectProduct(product, index)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-muted-foreground">
                                    {product.sku}
                                  </span>
                                  <span className="font-semibold truncate text-base">
                                    {product.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-sm text-muted-foreground">
                                    Giá vốn: {formatCurrency(product.cost_price)}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    Bán: {formatCurrency(product.price)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <span className={`text-base font-semibold ${currentStock <= 5 ? 'text-red-600' : 'text-muted-foreground'
                                  }`}>
                                  Tồn: {currentStock}
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
          </div>

          
          {(selectedProduct || isNewProduct) && (
            <>
              
              <div className="grid grid-cols-4 gap-3">
                
                <div className="col-span-3 space-y-1.5">
                  <Label htmlFor="name" className="text-base font-semibold">Tên sản phẩm</Label>
                  {!selectedProduct && isNewProduct ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nhập tên sản phẩm..."
                    />
                  ) : (
                    <Input
                      id="name"
                      value={formData.name}
                      disabled
                      className="bg-muted"
                    />
                  )}
                </div>

                
                <div className="col-span-1 space-y-1.5">
                  <Label htmlFor="unit" className="text-base font-semibold">Đơn vị tính</Label>
                  <div className="relative">
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => {
                        setFormData({ ...formData, unit: e.target.value })
                        setShowUnitSuggestions(true)
                      }}
                      onFocus={() => setShowUnitSuggestions(true)}
                      onBlur={() => {
                        
                        setTimeout(() => setShowUnitSuggestions(false), 200)
                      }}
                      placeholder="Đơn vị..."
                      autoComplete="off"
                    />

                    
                    {showUnitSuggestions && getFilteredUnits().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto z-50">
                        {getFilteredUnits().map((unit, index) => (
                          <div
                            key={index}
                            className="p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => {
                              setFormData({ ...formData, unit: unit })
                              setShowUnitSuggestions(false)
                            }}
                          >
                            <span className="text-sm">{unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 p-3.5 rounded-lg border-2 border-blue-300">
                <div className="grid grid-cols-2 gap-3">
                  
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="cost-price" className="text-base font-semibold text-gray-700">
                        💰 Giá vốn
                      </Label>
                      {formData.costPrice && formData.sellPrice && parseFloat(formData.costPrice) > 0 && (
                        <span className="text-sm text-gray-600 font-semibold">
                          LN {formatCurrency(parseFloat(formData.sellPrice) - parseFloat(formData.costPrice))}
                        </span>
                      )}
                    </div>
                    <Input
                      id="cost-price"
                      type="text"
                      value={formatNumber(formData.costPrice)}
                      onChange={(e) => {
                        const rawValue = parseFormattedNumber(e.target.value)
                        setFormData({ ...formData, costPrice: rawValue })
                      }}
                      placeholder="0"
                      className="!text-2xl font-bold h-14 bg-white text-blue-700"
                    />
                    {selectedProduct && (
                      <span className="text-sm text-muted-foreground">Hiện tại: {formatCurrency(selectedProduct.cost_price)}</span>
                    )}
                  </div>

                  
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="sell-price" className="text-base font-semibold text-gray-700">
                        💵 Giá bán
                      </Label>
                      {formData.costPrice && formData.sellPrice && parseFloat(formData.costPrice) > 0 && (
                        <span className="text-sm text-green-700 font-bold">
                          LN {((parseFloat(formData.sellPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice) * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <Input
                      id="sell-price"
                      type="text"
                      value={formatNumber(formData.sellPrice)}
                      onChange={(e) => {
                        const rawValue = parseFormattedNumber(e.target.value)
                        setFormData({ ...formData, sellPrice: rawValue })
                      }}
                      placeholder="0"
                      className="!text-2xl font-bold h-14 bg-white text-green-700"
                    />
                    {selectedProduct && (
                      <span className="text-sm text-muted-foreground">Hiện tại: {formatCurrency(selectedProduct.price)}</span>
                    )}
                  </div>
                </div>
              </div>

              
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-base font-semibold">
                  Số lượng nhập {selectedProduct && <span className="text-sm text-muted-foreground">(tồn hiện tại: {selectedProduct.inventory_items?.quantity || 0})</span>}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  min="1"
                  className="!text-2xl font-bold h-14 bg-white text-green-700"
                  required
                />
              </div>

              
              <div className="grid grid-cols-2 gap-3">
                
                <div className="space-y-1.5">
                  <Label htmlFor="supplier" className="text-base font-semibold">Nhà cung cấp</Label>
                  <div className="relative">
                    <Input
                      id="supplier"
                      placeholder="Chọn hoặc nhập NCC mới..."
                      value={supplierInput}
                      onChange={(e) => {
                        setSupplierInput(e.target.value)
                        setSelectedSupplier(null)
                        setShowSupplierSuggestions(true)
                      }}
                      onFocus={() => setShowSupplierSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSupplierSuggestions(false), 200)}
                      autoComplete="off"
                    />

                    {showSupplierSuggestions && getFilteredSuppliers().length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto z-50">
                        {getFilteredSuppliers().map((supplier) => (
                          <div
                            key={supplier.id}
                            className="p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleSelectSupplier(supplier)}
                          >
                            <span className="font-medium">{supplier.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                
                <div className="space-y-1.5">
                  <Label htmlFor="inbound-date" className="text-base font-semibold">Ngày hóa đơn</Label>
                  <Input
                    id="inbound-date"
                    type="date"
                    value={formData.inboundDate}
                    onChange={(e) => setFormData({ ...formData, inboundDate: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              
              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={isProcessing}>
                  {isProcessing ? 'Đang xử lý...' : (isNewProduct ? 'Tạo & Nhập hàng' : 'Nhập hàng')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isProcessing}
                >
                  Hủy
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
