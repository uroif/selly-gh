'use client'

import { ProductWithInventory } from '@/types'
import { Package, Boxes, TrendingDown, TrendingUp } from 'lucide-react'

interface ProductSummaryCardsProps {
  products: ProductWithInventory[]
  formatCurrency: (amount: number) => string
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string
  bgColor: string
  borderColor: string
  iconColor: string
  textColor: string
}

function StatCard({
  icon,
  title,
  value,
  bgColor,
  borderColor,
  iconColor,
  textColor,
}: StatCardProps) {
  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-4 transition-transform hover:scale-105`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor} aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${textColor}`}>
        {value}
      </div>
    </div>
  )
}

export function ProductSummaryCards({
  products,
  formatCurrency,
}: ProductSummaryCardsProps) {
  
  
  const totalProducts = products.length
  
  
  const totalInventory = products.reduce((sum, p) => {
    const qty = p.inventory_items?.quantity || 0
    return sum + (qty >= 0 ? qty : 0)
  }, 0)
  
  
  const totalCostPrice = products.reduce((sum, p) => {
    const qty = p.inventory_items?.quantity || 0
    if (qty >= 0) {
      return sum + (p.cost_price * qty)
    }
    return sum
  }, 0)
  
  
  const totalSellPrice = products.reduce((sum, p) => {
    const qty = p.inventory_items?.quantity || 0
    if (qty >= 0) {
      return sum + (p.price * qty)
    }
    return sum
  }, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      <StatCard
        icon={<Package className="h-5 w-5" />}
        title="Tổng sản phẩm"
        value={totalProducts.toString()}
        bgColor="bg-gray-50"
        borderColor="border-gray-300"
        iconColor="text-gray-700"
        textColor="text-gray-900"
      />
      
      
      <StatCard
        icon={<Boxes className="h-5 w-5" />}
        title="Tổng tồn kho"
        value={totalInventory.toString()}
        bgColor="bg-white"
        borderColor="border-gray-400"
        iconColor="text-gray-800"
        textColor="text-gray-900"
      />
      
      
      <StatCard
        icon={<TrendingDown className="h-5 w-5" />}
        title="Tổng giá vốn"
        value={formatCurrency(totalCostPrice)}
        bgColor="bg-gray-50"
        borderColor="border-gray-300"
        iconColor="text-gray-700"
        textColor="text-gray-900"
      />
      
      
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Tổng giá bán"
        value={formatCurrency(totalSellPrice)}
        bgColor="bg-white"
        borderColor="border-gray-400"
        iconColor="text-gray-800"
        textColor="text-gray-900"
      />
    </div>
  )
}
