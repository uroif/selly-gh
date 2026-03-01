'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProductWithInventory } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks'
import { toast } from 'sonner'

interface EditProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithInventory | null
  onSuccess?: () => void
}

export function EditProductDialog({ open, onOpenChange, product, onSuccess }: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    unit: '',
    costPrice: '',
    sellPrice: '',
    stockAdjustment: 0,
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const { user } = useAuth()

  
  useEffect(() => {
    if (open && product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        unit: product.unit || '',
        costPrice: formatNumber(String(product.cost_price)),
        sellPrice: formatNumber(String(product.price)),
        stockAdjustment: 0,
        notes: '',
      })
    } else if (!open) {
      setFormData({
        sku: '',
        name: '',
        unit: '',
        costPrice: '',
        sellPrice: '',
        stockAdjustment: 0,
        notes: '',
      })
    }
  }, [open, product])

  
  const formatNumber = (value: string): string => {
    const number = value.replace(/\D/g, '')
    if (!number) return ''
    return parseInt(number).toLocaleString('vi-VN')
  }

  
  const parseFormattedNumber = (value: string): number => {
    const cleaned = value.replace(/\./g, '')
    return parseFloat(cleaned) || 0
  }

  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  const handlePriceChange = (field: 'costPrice' | 'sellPrice', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: formatNumber(value) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product || !user) return

    setIsSubmitting(true)

    try {
      const costPrice = parseFormattedNumber(formData.costPrice)
      const sellPrice = parseFormattedNumber(formData.sellPrice)

      if (!formData.sku.trim() || !formData.name.trim()) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc')
        setIsSubmitting(false)
        return
      }

      if (costPrice <= 0 || sellPrice <= 0) {
        toast.error('Giá vốn và giá bán phải lớn hơn 0')
        setIsSubmitting(false)
        return
      }

      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          unit: formData.unit.trim() || null,
          cost_price: costPrice,
          price: sellPrice,
        })
        .eq('id', product.id)

      if (updateError) {
        console.error('Error updating product:', updateError)
        toast.error('Cập nhật sản phẩm thất bại')
        setIsSubmitting(false)
        return
      }

      
      if (formData.stockAdjustment !== 0) {
        const { error: logError } = await supabase.from('inventory_logs').insert({
          product_id: product.id,
          type: 'adjustment',
          quantity_change: formData.stockAdjustment,
          notes: formData.notes || null,
        })

        if (logError) {
          console.error('Error creating inventory log:', logError)
          toast.error('Cập nhật sản phẩm thành công nhưng điều chỉnh kho thất bại')
          setIsSubmitting(false)
          return
        }
      }

      
      toast.success(`Cập nhật sản phẩm thành công: ${formData.name}`)
      setFormData({
        sku: '',
        name: '',
        unit: '',
        costPrice: '',
        sellPrice: '',
        stockAdjustment: 0,
        notes: '',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Đã xảy ra lỗi')
    } finally {
      setIsSubmitting(false)
    }
  }

  
  
  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Chỉnh sửa sản phẩm</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-base font-semibold">
                  Mã hàng <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="VD: PROD-001"
                  className="h-12"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-base font-semibold">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Áo thun trắng"
                  className="h-12"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit" className="text-base font-semibold">
                Đơn vị tính
              </Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="VD: Cái, Kg, Lít..."
                className="h-12"
              />
            </div>
          </div>

          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
            
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="costPrice" className="text-base font-semibold">
                    💰 Giá vốn <span className="text-red-500">*</span>
                  </Label>
                  {formData.costPrice && formData.sellPrice && parseFormattedNumber(formData.costPrice) > 0 && (
                    <span className="text-sm text-gray-600 font-semibold">
                      LN {formatCurrency(parseFormattedNumber(formData.sellPrice) - parseFormattedNumber(formData.costPrice))}
                    </span>
                  )}
                </div>
                <Input
                  id="costPrice"
                  value={formData.costPrice}
                  onChange={(e) => handlePriceChange('costPrice', e.target.value)}
                  placeholder="0"
                  className="h-14 !text-2xl font-bold text-blue-700 bg-white"
                />
              </div>

              
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="sellPrice" className="text-base font-semibold">
                    💵 Giá bán <span className="text-red-500">*</span>
                  </Label>
                  {formData.costPrice && formData.sellPrice && parseFormattedNumber(formData.costPrice) > 0 && (
                    <span className="text-sm text-green-700 font-bold">
                      LN {((parseFormattedNumber(formData.sellPrice) - parseFormattedNumber(formData.costPrice)) / parseFormattedNumber(formData.costPrice) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                <Input
                  id="sellPrice"
                  value={formData.sellPrice}
                  onChange={(e) => handlePriceChange('sellPrice', e.target.value)}
                  placeholder="0"
                  className="h-14 !text-2xl font-bold text-green-700 bg-white"
                />
              </div>
            </div>
          </div>

          
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-xl text-orange-900 mb-2">
              Tồn kho hiện tại: <span className="text-orange-700">{product?.inventory_items?.quantity || 0} sản phẩm</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stockAdjustment" className="text-base font-semibold">
                  Thay đổi số lượng (+/-)
                </Label>
                <Input
                  id="stockAdjustment"
                  type="number"
                  value={formData.stockAdjustment}
                  onChange={(e) => setFormData({ ...formData, stockAdjustment: parseInt(e.target.value) || 0 })}
                  placeholder="-5 hoặc +10"
                  className="h-12 !text-2xl font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-base font-semibold">
                  Ghi chú (lý do điều chỉnh)
                </Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="VD: Kiểm kê, hỏng hóc..."
                  className="h-12"
                />
              </div>
            </div>

            {formData.stockAdjustment !== 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded border-2 border-orange-300">
                <span className="text-base font-semibold">Tồn kho mới:</span>
                <span className="text-xl font-bold text-orange-700">
                  {(product?.inventory_items?.quantity || 0) + formData.stockAdjustment} sản phẩm
                </span>
                <span className={`text-base font-bold ${formData.stockAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ({formData.stockAdjustment > 0 ? '+' : ''}{formData.stockAdjustment})
                </span>
              </div>
            )}
          </div>

          
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
