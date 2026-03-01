'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProductForm, ProductFormData } from '@/components/products/ProductForm'
import { Product } from '@/types'

export default function EditProductPage() {
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const productId = params.id as string

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        router.push('/dashboard/products')
        return
      }

      setProduct(data)
      setFetchLoading(false)
    }

    fetchProduct()
  }, [productId, router, supabase])

  async function handleSubmit(data: ProductFormData) {
    setIsLoading(true)
    
    const { error } = await supabase
      .from('products')
      .update({
        sku: data.sku,
        name: data.name,
        unit: data.unit || null,
        price: data.price,
        cost_price: data.cost_price,
        image_url: data.image_url || null,
      })
      .eq('id', productId)

    setIsLoading(false)

    if (error) {
      console.error('Error updating product:', error)
      alert(error.message || 'Cập nhật sản phẩm thất bại')
      return
    }

    router.push('/dashboard/products')
  }

  if (fetchLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Chỉnh sửa sản phẩm</h1>
        <div className="text-muted-foreground">Đang tải sản phẩm...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Chỉnh sửa sản phẩm</h1>
        <div className="text-muted-foreground">Không tìm thấy sản phẩm</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Chỉnh sửa sản phẩm</h1>
      <ProductForm product={product} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
