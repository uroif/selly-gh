'use client'

import { Banknote, Building2, CreditCard, TrendingUp } from 'lucide-react'

interface OrderWithDetails {
  id: string
  final_amount: number
  payment_method: 'cash' | 'card' | 'transfer'
}

interface PaymentStats {
  cash: { count: number; amount: number }
  transfer: { count: number; amount: number }
  card: { count: number; amount: number }
}

interface PaymentStatsCardsProps {
  orders: OrderWithDetails[]
  formatCurrency: (amount: number) => string
}


function calculatePaymentStats(orders: OrderWithDetails[]): PaymentStats {
  const stats: PaymentStats = {
    cash: { count: 0, amount: 0 },
    transfer: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
  }

  orders.forEach((order) => {
    const method = order.payment_method
    stats[method].count += 1
    stats[method].amount += Number(order.final_amount)
  })

  return stats
}


interface StatCardProps {
  icon: React.ReactNode
  title: string
  count: number
  amount: string
  bgColor: string
  borderColor: string
  iconColor: string
  textColor: string
}

function StatCard({
  icon,
  title,
  count,
  amount,
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
      <div className="flex items-baseline justify-between">
        <div className={`text-2xl font-bold ${textColor}`}>
          {amount}
        </div>
        <div className="text-lg text-gray-600">
          {count} đơn
        </div>
      </div>
    </div>
  )
}


export function PaymentStatsCards({ orders, formatCurrency }: PaymentStatsCardsProps) {
  const stats = calculatePaymentStats(orders)

  
  const totalAmount = stats.cash.amount + stats.transfer.amount + stats.card.amount
  const totalCount = stats.cash.count + stats.transfer.count + stats.card.count

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        title="Tổng bán hàng"
        count={totalCount}
        amount={formatCurrency(totalAmount)}
        bgColor="bg-orange-50"
        borderColor="border-orange-200"
        iconColor="text-orange-600"
        textColor="text-orange-900"
      />
      
      <StatCard
        icon={<Banknote className="h-5 w-5" />}
        title="Tiền mặt"
        count={stats.cash.count}
        amount={formatCurrency(stats.cash.amount)}
        bgColor="bg-green-50"
        borderColor="border-green-200"
        iconColor="text-green-600"
        textColor="text-green-900"
      />
      
      <StatCard
        icon={<Building2 className="h-5 w-5" />}
        title="Chuyển khoản"
        count={stats.transfer.count}
        amount={formatCurrency(stats.transfer.amount)}
        bgColor="bg-blue-50"
        borderColor="border-blue-200"
        iconColor="text-blue-600"
        textColor="text-blue-900"
      />
      
      <StatCard
        icon={<CreditCard className="h-5 w-5" />}
        title="Thẻ"
        count={stats.card.count}
        amount={formatCurrency(stats.card.amount)}
        bgColor="bg-purple-50"
        borderColor="border-purple-200"
        iconColor="text-purple-600"
        textColor="text-purple-900"
      />
    </div>
  )
}
