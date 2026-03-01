'use client'

import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Product } from '@/types'


const productFormSchema = z.object({
  sku: z.string().min(1, 'Mã hàng là bắt buộc'),
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  unit: z.string().optional(),
  price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: 'Giá bán phải là số dương',
  }),
  cost_price: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: 'Giá vốn phải là số dương',
  }),
  image_url: z.string().optional(),
})


type ProductFormInput = z.infer<typeof productFormSchema>


export type ProductFormData = {
  sku: string
  name: string
  unit?: string
  price: number
  cost_price: number
  image_url?: string
}

interface ProductFormProps {
  product?: Product
  onSubmit: (data: ProductFormData) => Promise<void>
  isLoading?: boolean
  onCancel?: () => void
  showCard?: boolean
}

export function ProductForm({ product, onSubmit, isLoading, onCancel, showCard = true }: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          unit: product.unit || '',
          price: String(product.price),
          cost_price: String(product.cost_price),
          image_url: product.image_url || '',
        }
      : {
          sku: '',
          name: '',
          unit: '',
          price: '0',
          cost_price: '0',
          image_url: '',
        },
  })

  const onFormSubmit: SubmitHandler<ProductFormInput> = async (data) => {
    
    const transformedData: ProductFormData = {
      sku: data.sku,
      name: data.name,
      unit: data.unit?.trim() || undefined,
      price: parseFloat(data.price),
      cost_price: parseFloat(data.cost_price),
      image_url: data.image_url || undefined,
    }
    await onSubmit(transformedData)
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">Mã hàng *</Label>
          <Input
            id="sku"
            {...register('sku')}
            placeholder="VD: SHIRT-001"
          />
          {errors.sku && (
            <p className="text-base text-red-600">{errors.sku.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Tên sản phẩm *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="VD: Áo thun xanh"
          />
          {errors.name && (
            <p className="text-base text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">Đơn vị tính</Label>
          <Input
            id="unit"
            {...register('unit')}
            placeholder="VD: Cái, Kg, Lít..."
          />
          {errors.unit && (
            <p className="text-base text-red-600">{errors.unit.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Giá bán *</Label>
          <Input
            id="price"
            type="number"
            step="1000"
            {...register('price')}
            placeholder="0"
          />
          {errors.price && (
            <p className="text-base text-red-600">{errors.price.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost_price">Giá vốn *</Label>
          <Input
            id="cost_price"
            type="number"
            step="1000"
            {...register('cost_price')}
            placeholder="0"
          />
          {errors.cost_price && (
            <p className="text-base text-red-600">{errors.cost_price.message}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="image_url">URL hình ảnh (tùy chọn)</Label>
          <Input
            id="image_url"
            {...register('image_url')}
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Đang lưu...' : product ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel || (() => window.history.back())}
        >
          Hủy
        </Button>
      </div>
    </div>
  )

  if (showCard) {
    return (
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{product ? 'Chỉnh sửa sản phẩm' : 'Sản phẩm mới'}</CardTitle>
          </CardHeader>
          <CardContent>
            {formFields}
          </CardContent>
        </Card>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {formFields}
    </form>
  )
}
