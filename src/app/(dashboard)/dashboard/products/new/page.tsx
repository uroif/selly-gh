'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProductForm, ProductFormData } from '@/components/products/ProductForm'

export default function NewProductPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(data: ProductFormData) {
    setIsLoading(true)
    
    const { error } = await supabase.from('products').insert({
      sku: data.sku,
      name: data.name,
      unit: data.unit || null,
      price: data.price,
      cost_price: data.cost_price,
      image_url: data.image_url || null,
    })

    setIsLoading(false)

    if (error) {
      console.error('Error creating product:', error)
      alert(error.message || 'Tạo sản phẩm thất bại')
      return
    }

    router.push('/dashboard/products')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Thêm sản phẩm mới</h1>
      <ProductForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
