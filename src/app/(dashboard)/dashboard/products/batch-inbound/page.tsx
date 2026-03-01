'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory, Supplier, BatchInboundItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Package, Plus, Edit2, Save, Trash2, Download } from 'lucide-react'
import { useAuth } from '@/hooks'
import { vietnameseFilter } from '@/lib/vietnameseSearch'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import * as xlsx from 'xlsx'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function BatchInboundPage() {
  const router = useRouter()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  
  const [supplierInput, setSupplierInput] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [inboundDate, setInboundDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  
  const [items, setItems] = useState<BatchInboundItem[]>([])
  const [isItemsLoaded, setIsItemsLoaded] = useState(false)

  
  useEffect(() => {
    const draft = localStorage.getItem('batch-inbound-draft-items')
    if (draft) {
      try {
        setItems(JSON.parse(draft))
      } catch (error) {
        console.error('Error parsing draft items:', error)
      }
    }
    setIsItemsLoaded(true)
  }, [])

  
  useEffect(() => {
    if (isItemsLoaded) {
      if (items.length > 0) {
        localStorage.setItem('batch-inbound-draft-items', JSON.stringify(items))
      } else {
        localStorage.removeItem('batch-inbound-draft-items')
      }
    }
  }, [items, isItemsLoaded])

  
  const [currentProduct, setCurrentProduct] = useState<BatchInboundItem>({
    tempId: '',
    product: null,
    sku: '',
    name: '',
    unit: 'Chiếc',
    costPrice: '',
    sellPrice: '',
    quantity: '',
    isNewProduct: false,
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isFormDirty, setIsFormDirty] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingEditIndex, setPendingEditIndex] = useState<number | null>(null)

  
  const [searchValue, setSearchValue] = useState('')
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [selectedProductIndex, setSelectedProductIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  
  const nameRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLInputElement>(null)
  const quantityRef = useRef<HTMLInputElement>(null)
  const costPriceRef = useRef<HTMLInputElement>(null)
  const sellPriceRef = useRef<HTMLInputElement>(null)

  
  const [commonUnits] = useState<string[]>([
    'Chiếc', 'Bộ', 'Cái', 'Hộp', 'Túi', 'Đôi', 'Thùng'
  ])
  const [showUnitSuggestions, setShowUnitSuggestions] = useState(false)

  const supabase = createClient()
  const { user } = useAuth()
  const hasFetched = useRef(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    
    const { data: suppliersData, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name')

    if (suppliersError) {
      console.error('Error fetching suppliers:', suppliersError)
      setSuppliers([])
    } else {
      setSuppliers(suppliersData || [])
    }

    
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
        console.error('Error fetching products:', error)
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

    setProducts(allProducts)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchData()
    }
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const formatNumber = (value: string): string => {
    const number = value.replace(/\D/g, '')
    if (!number) return ''
    return parseInt(number).toLocaleString('vi-VN')
  }

  const parseFormattedNumber = (value: string): string => {
    return value.replace(/\D/g, '')
  }

  const calculateProfit = (sellPrice: string, costPrice: string): number => {
    const sell = parseFloat(sellPrice) || 0
    const cost = parseFloat(costPrice) || 0
    return sell - cost
  }

  const calculateProfitPercent = (sellPrice: string, costPrice: string): number => {
    const sell = parseFloat(sellPrice) || 0
    const cost = parseFloat(costPrice) || 0
    if (cost === 0) return 0
    return ((sell - cost) / cost) * 100
  }

  const calculateItemTotal = (quantity: string, costPrice: string): number => {
    const qty = parseInt(quantity) || 0
    const cost = parseFloat(costPrice) || 0
    return qty * cost
  }

  const calculateGrandTotal = (): number => {
    return items.reduce((sum, item) => {
      return sum + calculateItemTotal(item.quantity, item.costPrice)
    }, 0)
  }

  
  const getFilteredSuppliers = () => {
    if (!supplierInput.trim()) return suppliers
    return vietnameseFilter(suppliers, supplierInput, (s) => s.name)
  }

  
  const getFilteredProducts = useCallback(() => {
    const search = searchValue
    if (!search.trim()) return []
    const filtered = vietnameseFilter(products, search, (p) => [p.sku, p.name])
      .sort((a, b) => a.sku.localeCompare(b.sku, 'vi', { numeric: true }))
      .slice(0, 100)

    return filtered
  }, [products, searchValue])

  
  const handleSelectSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSupplierInput(supplier.name)
    setShowSupplierSuggestions(false)
  }

  
  const handleSelectProduct = (product: ProductWithInventory) => {
    setCurrentProduct({
      ...currentProduct,
      product,
      sku: product.sku,
      name: product.name,
      unit: product.unit || 'Chiếc',
      costPrice: product.cost_price.toString(),
      sellPrice: product.price.toString(),
      isNewProduct: false,
    })
    setSearchValue(product.sku)
    setShowProductSuggestions(false)
    setIsFormDirty(true)
  }

  
  const updateCurrentProduct = (field: keyof BatchInboundItem, value: string) => {
    const updated = { ...currentProduct, [field]: value }

    
    if (field === 'sku') {
      const existingProduct = products.find(p => p.sku === value)
      updated.isNewProduct = !existingProduct
      updated.product = existingProduct || null
    }

    setCurrentProduct(updated)
    setIsFormDirty(true)
  }

  
  const clearForm = () => {
    setCurrentProduct({
      tempId: '',
      product: null,
      sku: '',
      name: '',
      unit: 'Chiếc',
      costPrice: '',
      sellPrice: '',
      quantity: '',
      isNewProduct: false,
    })
    setSearchValue('')
    setEditingIndex(null)
    setIsFormDirty(false)
  }

  
  const handleAddProduct = () => {
    
    if (!currentProduct.sku.trim()) {
      toast.error('Vui lòng nhập mã hàng')
      return
    }
    if (currentProduct.isNewProduct && !currentProduct.name.trim()) {
      toast.error('Sản phẩm mới phải có tên')
      return
    }
    if (!currentProduct.quantity.trim() || parseInt(currentProduct.quantity) <= 0) {
      toast.error('Vui lòng nhập số lượng hợp lệ')
      return
    }
    if (!currentProduct.costPrice || parseFloat(currentProduct.costPrice) <= 0) {
      toast.error('Vui lòng nhập giá vốn hợp lệ')
      return
    }
    if (!currentProduct.sellPrice || parseFloat(currentProduct.sellPrice) <= 0) {
      toast.error('Vui lòng nhập giá bán hợp lệ')
      return
    }

    if (editingIndex !== null) {
      
      const duplicateIndex = items.findIndex(
        (item, i) => i !== editingIndex && item.sku.trim() === currentProduct.sku.trim()
      )
      if (duplicateIndex !== -1) {
        toast.error(`SKU "${currentProduct.sku}" đã có ở dòng #${duplicateIndex + 1}`, {
          description: 'Mỗi SKU chỉ được xuất hiện một lần trong lô hàng.',
        })
        return
      }

      const updatedItems = [...items]
      updatedItems[editingIndex] = {
        ...currentProduct,
        tempId: items[editingIndex].tempId
      }
      setItems(updatedItems)
      toast.success('Đã cập nhật sản phẩm')
    } else {
      
      const duplicateIndex = items.findIndex(
        (item) => item.sku.trim() === currentProduct.sku.trim()
      )
      if (duplicateIndex !== -1) {
        toast.error(`SKU "${currentProduct.sku}" đã có ở dòng #${duplicateIndex + 1}`, {
          description: 'Mỗi SKU chỉ được xuất hiện một lần trong lô hàng.',
        })
        return
      }

      const newItem = {
        ...currentProduct,
        tempId: `temp-${Date.now()}-${Math.random()}`
      }
      setItems([newItem, ...items])
      toast.success('Đã thêm sản phẩm')
    }

    clearForm()

    
    setTimeout(() => searchRef.current?.focus(), 50)
  }


  
  const handleEditClick = (index: number) => {
    if (isFormDirty) {
      setPendingEditIndex(index)
      setShowUnsavedDialog(true)
    } else {
      loadProductToForm(index)
    }
  }

  
  const loadProductToForm = (index: number) => {
    const item = items[index]
    setCurrentProduct({ ...item })
    setSearchValue(item.sku)
    setEditingIndex(index)
    setIsFormDirty(false)
    setShowUnsavedDialog(false)
    setPendingEditIndex(null)
  }

  
  const handleUnsavedConfirm = () => {
    if (pendingEditIndex !== null) {
      loadProductToForm(pendingEditIndex)
    }
  }

  
  const getFilteredUnits = (unit: string) => {
    if (!unit.trim()) return commonUnits
    return commonUnits.filter(u => u.toLowerCase().includes(unit.toLowerCase()))
  }

  
  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
    if (editingIndex === index) {
      clearForm()
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
    toast.success('Đã xóa sản phẩm')
  }

  
  const handleExportExcel = () => {
    if (items.length === 0) {
      toast.error('Chưa có sản phẩm nào để xuất file')
      return
    }

    const exportData = items.map((item, index) => ({
      'STT': index + 1,
      'Mã hàng': item.sku,
      'Tên sản phẩm': item.name,
      'Đơn vị': item.unit,
      'Số lượng': item.quantity,
      'Giá vốn': parseFloat(item.costPrice) || 0,
      'Giá bán': parseFloat(item.sellPrice) || 0,
      'Lợi nhuận': calculateProfit(item.sellPrice, item.costPrice),
      'LN (%)': calculateProfitPercent(item.sellPrice, item.costPrice).toFixed(1) + '%',
      'Thành tiền': calculateItemTotal(item.quantity, item.costPrice)
    }))

    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.json_to_sheet(exportData)

    
    ws['!cols'] = [
      { wch: 5 },  
      { wch: 15 }, 
      { wch: 30 }, 
      { wch: 10 }, 
      { wch: 10 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 15 }, 
      { wch: 10 }, 
      { wch: 15 }, 
    ]

    xlsx.utils.book_append_sheet(wb, ws, "Danh_sach_san_pham")
    xlsx.writeFile(wb, `Danh_sach_nhap_hang_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
    toast.success('Đã xuất file Excel')
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) return

    
    if (!supplierInput.trim()) {
      toast.error('Vui lòng chọn hoặc nhập Nhà cung cấp')
      return
    }

    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm')
      return
    }

    setIsProcessing(true)

    try {
      
      let supplierId: string

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
          toast.error('Tạo nhà cung cấp thất bại. Vui lòng thử lại.')
          return
        }
        supplierId = newSupplier.id
      }

      
      
      
      const { data: shipment, error: shipmentError } = await supabase
        .from('inbound_shipments')
        .insert([{
          supplier_id: supplierId,
          inbound_date: inboundDate,
          total_amount: 0, 
          created_by: user.id,
        }])
        .select()
        .single()

      if (shipmentError || !shipment) {
        console.error('Error creating shipment:', shipmentError)
        toast.error('Tạo lô hàng thất bại. Vui lòng thử lại.')
        return
      }

      
      const itemErrors: string[] = []
      let successCount = 0
      let actualTotalAmount = 0

      for (const item of items) {
        let productId: string | null = null
        let itemFailed = false

        try {
          if (item.product) {
            
            const costPrice = parseFloat(item.costPrice)
            const sellPrice = parseFloat(item.sellPrice)
            const updates: { cost_price?: number; price?: number; unit?: string | null } = {}

            if (costPrice !== item.product.cost_price) updates.cost_price = costPrice
            if (sellPrice !== item.product.price) updates.price = sellPrice
            if (item.unit.trim() !== item.product.unit) updates.unit = item.unit.trim() || null

            if (Object.keys(updates).length > 0) {
              const { error: updateError } = await supabase
                .from('products')
                .update(updates)
                .eq('id', item.product.id)

              if (updateError) {
                console.error(`Error updating product ${item.sku}:`, updateError)
                itemErrors.push(`SKU ${item.sku}: Cập nhật giá/đơn vị thất bại`)
                itemFailed = true
              }
            }

            if (!itemFailed) productId = item.product.id
          } else {
            
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert([{
                sku: item.sku,
                name: item.name,
                unit: item.unit.trim() || null,
                cost_price: parseFloat(item.costPrice),
                price: parseFloat(item.sellPrice),
                image_url: null
              }])
              .select()
              .single()

            if (productError || !newProduct) {
              console.error(`Error creating product ${item.sku}:`, productError)
              itemErrors.push(`SKU ${item.sku}: Tạo sản phẩm thất bại`)
              itemFailed = true
            } else {
              productId = newProduct.id
            }
          }

          
          if (!itemFailed && productId) {
            const qty = parseInt(item.quantity)
            const { error: logError } = await supabase
              .from('inventory_logs')
              .insert({
                product_id: productId,
                type: 'inbound',
                quantity_change: qty,
                notes: `Nhập lô hàng - ${supplierInput}`,
                inbound_shipment_id: shipment.id,
              })

            if (logError) {
              console.error(`Error creating inventory log for ${item.sku}:`, logError)
              itemErrors.push(`SKU ${item.sku}: Cập nhật tồn kho thất bại`)
              itemFailed = true
            } else {
              successCount++
              actualTotalAmount += qty * (parseFloat(item.costPrice) || 0)
            }
          }
        } catch (itemErr) {
          console.error(`Unexpected error processing item ${item.sku}:`, itemErr)
          itemErrors.push(`SKU ${item.sku}: Lỗi không mong muốn`)
        }
      }

      
      if (successCount > 0) {
        const { error: updateShipmentError } = await supabase
          .from('inbound_shipments')
          .update({ total_amount: actualTotalAmount })
          .eq('id', shipment.id)

        if (updateShipmentError) {
          console.error('Error updating shipment total:', updateShipmentError)
          
        }
      } else {
        
        await supabase
          .from('inbound_shipments')
          .delete()
          .eq('id', shipment.id)
      }

      
      if (successCount > 0 && itemErrors.length === 0) {
        toast.success('Nhập lô hàng thành công!', {
          description: `Đã nhập ${successCount}/${items.length} sản phẩm.`,
        })
        localStorage.removeItem('batch-inbound-draft-items')
        setTimeout(() => router.push('/dashboard/products'), 1000)
      } else if (successCount > 0 && itemErrors.length > 0) {
        toast.warning(`Nhập ${successCount}/${items.length} sản phẩm thành công`, {
          description: itemErrors.slice(0, 3).join(' · ') + (itemErrors.length > 3 ? ` (+${itemErrors.length - 3} lỗi khác)` : ''),
          duration: 8000,
        })
        localStorage.removeItem('batch-inbound-draft-items')
        setTimeout(() => router.push('/dashboard/products'), 2000)
      } else {
        toast.error('Không có sản phẩm nào được nhập thành công', {
          description: itemErrors.slice(0, 3).join(' · ') + (itemErrors.length > 3 ? ` (+${itemErrors.length - 3} lỗi khác)` : ''),
          duration: 8000,
        })
      }
    } catch (err) {
      console.error('Unexpected error during submission:', err)
      toast.error('Đã xảy ra lỗi không mong muốn')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Nhập lô hàng</h1>
        </div>
        <div className="text-center py-8 text-muted-foreground">Đang tải dữ liệu...</div>
      </div>
    )
  }

  return (
    <div className="space-y-2 pb-4">
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Package className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Nhập lô hàng</h1>
        </div>
      </div>

      
      <Card>
        <CardHeader className="-mb-4 pb-0">
          <CardTitle className="text-lg">{editingIndex !== null ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-0">
          
          <div className="grid grid-cols-4 gap-2">
            
            <div className="col-span-1 space-y-1">
              <Label htmlFor="sku" className="text-base font-semibold">Mã hàng</Label>
              <div className="relative">
                <Input
                  ref={searchRef}
                  id="sku"
                  placeholder="Nhập mã..."
                  value={searchValue}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchValue(value)
                    updateCurrentProduct('sku', value)
                    setShowProductSuggestions(true)
                    setSelectedProductIndex(0)
                  }}
                  onFocus={() => {
                    setShowProductSuggestions(true)
                    if (getFilteredProducts().length > 0) {
                      setSelectedProductIndex(0)
                    }
                  }}
                  onKeyDown={(e) => {
                    const filtered = getFilteredProducts()

                    
                    if (e.key === 'Enter' && filtered.length === 0) {
                      e.preventDefault()
                      
                      if (currentProduct.isNewProduct || !currentProduct.product) {
                        nameRef.current?.focus()
                      } else {
                        unitRef.current?.focus()
                      }
                      return
                    }

                    
                    if (filtered.length === 0) return

                    if (e.key === 'ArrowDown') {
                      e.preventDefault()
                      setSelectedProductIndex(prev => {
                        const newIndex = prev < filtered.length - 1 ? prev + 1 : prev
                        
                        setTimeout(() => {
                          const element = document.getElementById(`product-item-${newIndex}`)
                          element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                        }, 0)
                        return newIndex
                      })
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault()
                      setSelectedProductIndex(prev => {
                        const newIndex = prev > 0 ? prev - 1 : 0
                        
                        setTimeout(() => {
                          const element = document.getElementById(`product-item-${newIndex}`)
                          element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                        }, 0)
                        return newIndex
                      })
                    } else if (e.key === 'Enter') {
                      e.preventDefault()
                      if (selectedProductIndex >= 0 && selectedProductIndex < filtered.length) {
                        handleSelectProduct(filtered[selectedProductIndex])
                        
                        setTimeout(() => unitRef.current?.focus(), 100)
                      }
                    } else if (e.key === 'Escape') {
                      setShowProductSuggestions(false)
                    }
                  }}
                  className="text-base"
                />

                
                {showProductSuggestions && getFilteredProducts().length > 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg max-h-[300px] overflow-y-auto z-50" style={{ width: '600px' }}>
                    <div className="divide-y">
                      {getFilteredProducts().map((product, index) => {
                        const currentStock = product.inventory_items?.quantity || 0
                        return (
                          <div
                            id={`product-item-${index}`}
                            key={product.id}
                            className={`p-2.5 cursor-pointer transition-colors ${index === selectedProductIndex
                              ? 'bg-blue-50 border-l-4 border-blue-500'
                              : 'hover:bg-blue-50'
                              }`}
                            onClick={() => handleSelectProduct(product)}
                            onMouseEnter={() => setSelectedProductIndex(index)}
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
                  </div>
                )}
              </div>
            </div>

            
            <div className="col-span-3 space-y-1">
              <Label htmlFor="name" className="text-base font-semibold">Tên sản phẩm</Label>
              <Input
                ref={nameRef}
                id="name"
                placeholder="Tên sản phẩm..."
                value={currentProduct.name}
                onChange={(e) => updateCurrentProduct('name', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    unitRef.current?.focus()
                  }
                }}
                disabled={!!currentProduct.product}
                className="text-base"
              />
            </div>
          </div>

          
          <div className="grid grid-cols-6 gap-2">
            
            <div className="space-y-1">
              <Label htmlFor="unit" className="text-base font-semibold">Đơn vị</Label>
              <div className="relative">
                <Input
                  ref={unitRef}
                  id="unit"
                  placeholder="Đơn vị..."
                  value={currentProduct.unit}
                  onChange={(e) => {
                    updateCurrentProduct('unit', e.target.value)
                    setShowUnitSuggestions(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setShowUnitSuggestions(false)
                      costPriceRef.current?.focus()
                    }
                  }}
                  onFocus={() => setShowUnitSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowUnitSuggestions(false)
                    }, 200)
                  }}
                  className="text-base"
                />

                {showUnitSuggestions && getFilteredUnits(currentProduct.unit).length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto z-50">
                    {getFilteredUnits(currentProduct.unit).map((unit, idx) => (
                      <div
                        key={idx}
                        className="p-2 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          updateCurrentProduct('unit', unit)
                          setShowUnitSuggestions(false)
                        }}
                      >
                        {unit}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            
            <div className="space-y-1">
              <Label htmlFor="costPrice" className="text-base font-semibold">Giá vốn</Label>
              <Input
                ref={costPriceRef}
                id="costPrice"
                type="text"
                placeholder="0"
                value={formatNumber(currentProduct.costPrice)}
                onChange={(e) => {
                  const rawValue = parseFormattedNumber(e.target.value)
                  updateCurrentProduct('costPrice', rawValue)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    sellPriceRef.current?.focus()
                  }
                }}
                className="text-base"
              />
            </div>

            
            <div className="space-y-1">
              <Label htmlFor="sellPrice" className="text-base font-semibold">Giá bán</Label>
              <Input
                ref={sellPriceRef}
                id="sellPrice"
                type="text"
                placeholder="0"
                value={formatNumber(currentProduct.sellPrice)}
                onChange={(e) => {
                  const rawValue = parseFormattedNumber(e.target.value)
                  updateCurrentProduct('sellPrice', rawValue)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    quantityRef.current?.focus()
                  }
                }}
                className="text-base"
              />
            </div>

            
            <div className="space-y-1">
              <Label htmlFor="quantity" className="text-base font-semibold">SL</Label>
              <Input
                ref={quantityRef}
                id="quantity"
                type="number"
                placeholder="0"
                value={currentProduct.quantity}
                onChange={(e) => updateCurrentProduct('quantity', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddProduct()
                  }
                }}
                min="1"
                className="text-base"
              />
            </div>


            
            <div className="space-y-1">
              <Label className="text-base font-semibold">Lợi nhuận</Label>
              <div className="text-base font-semibold text-purple-600 pt-2">
                {currentProduct.costPrice && currentProduct.sellPrice
                  ? formatCurrency(calculateProfit(currentProduct.sellPrice, currentProduct.costPrice))
                  : '-'}
              </div>
            </div>

            
            <div className="space-y-1">
              <Label className="text-base font-semibold">LN %</Label>
              <div className="text-base font-semibold text-green-700 pt-2">
                {currentProduct.costPrice && currentProduct.sellPrice
                  ? `${calculateProfitPercent(currentProduct.sellPrice, currentProduct.costPrice).toFixed(1)}%`
                  : '-'}
              </div>
            </div>
          </div>

          
          <div className="flex gap-2 pt-1">
            <Button onClick={handleAddProduct} variant="default" size="lg">
              <Plus className="h-4 w-4 mr-2" />
              {editingIndex !== null ? 'Cập nhật' : 'Thêm'}
            </Button>
            <Button onClick={clearForm} variant="outline" size="lg">
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa
            </Button>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardContent className="pt-0 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            
            <div className="space-y-1">
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

            
            <div className="space-y-1">
              <Label htmlFor="inbound-date" className="text-base font-semibold">Ngày hóa đơn</Label>
              <Input
                id="inbound-date"
                type="date"
                value={inboundDate}
                onChange={(e) => setInboundDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader className="-mb-4 pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Danh sách sản phẩm ({items.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-2"
            disabled={items.length === 0}
          >
            <Download className="h-4 w-4" />
            Tải File Excel
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chưa có sản phẩm nào. Vui lòng thêm sản phẩm ở form bên trên.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.tempId}
                  className={`border rounded-lg p-3 ${editingIndex === index ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Mã hàng</div>
                        <div className="font-mono font-semibold">{item.sku}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Tên sản phẩm</div>
                        <div className="font-medium">{item.name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Đơn vị</div>
                        <div>{item.unit}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Số lượng</div>
                        <div className="font-semibold">{item.quantity}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Giá vốn</div>
                        <div>{formatCurrency(parseFloat(item.costPrice) || 0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Giá bán</div>
                        <div>{formatCurrency(parseFloat(item.sellPrice) || 0)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Lợi nhuận</div>
                        <div className="font-semibold text-purple-600">
                          {formatCurrency(calculateProfit(item.sellPrice, item.costPrice))}
                          <span className="ml-1 text-sm">
                            ({calculateProfitPercent(item.sellPrice, item.costPrice).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Thành tiền</div>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(calculateItemTotal(item.quantity, item.costPrice))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(index)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">Tổng cộng:</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(calculateGrandTotal())}
                  </div>
                </div>
              </div>

              
              <div className="flex justify-end mt-4">
                <Button onClick={() => handleSubmit()} disabled={isProcessing} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Đang lưu...' : 'Lưu lô hàng'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>
              Form hiện tại có dữ liệu chưa được lưu. Bạn có muốn tiếp tục và xóa các thay đổi này không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnsavedConfirm}>Tiếp tục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
